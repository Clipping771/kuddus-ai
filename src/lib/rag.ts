/**
 * RAG System — Retrieval Augmented Generation
 *
 * Flow:
 * 1. INGEST: PDF/DOCX text → split into chunks → embed each chunk → store in pgvector
 * 2. RETRIEVE: User query → embed query → cosine similarity search → top-K chunks
 * 3. INJECT: Relevant chunks injected into system prompt before LLM call
 *
 * Embedding model: nomic-embed-text via OpenRouter (free, 768 dimensions)
 * Fallback: Simple TF-IDF keyword matching if embedding fails
 */

import { supabase } from "@/lib/supabase";

const CHUNK_SIZE = 400;       // tokens per chunk (approx 1600 chars)
const CHUNK_OVERLAP = 50;     // overlap between chunks to preserve context
const MAX_CHUNKS_PER_QUERY = 5; // top-K chunks to inject
const EMBEDDING_DIM = 768;

// ─── Text Chunking ────────────────────────────────────────────────────────────

/**
 * Split text into overlapping chunks for embedding.
 * Uses sentence-aware splitting to avoid cutting mid-sentence.
 */
export function chunkText(text: string): string[] {
    if (!text || text.trim().length === 0) return [];

    // Clean up whitespace
    const cleaned = text.replace(/\s+/g, " ").trim();

    // Split by sentences first
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];

    const chunks: string[] = [];
    let currentChunk = "";
    let currentWordCount = 0;

    for (const sentence of sentences) {
        const wordCount = sentence.split(" ").length;

        if (currentWordCount + wordCount > CHUNK_SIZE && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());

            // Overlap: keep last N words of previous chunk
            const words = currentChunk.split(" ");
            currentChunk = words.slice(-CHUNK_OVERLAP).join(" ") + " " + sentence;
            currentWordCount = CHUNK_OVERLAP + wordCount;
        } else {
            currentChunk += " " + sentence;
            currentWordCount += wordCount;
        }
    }

    if (currentChunk.trim().length > 20) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter((c) => c.length > 50); // filter out tiny chunks
}

// ─── Embedding ────────────────────────────────────────────────────────────────

/**
 * Generate embedding for a text using OpenRouter's nomic-embed-text model.
 * Returns null if embedding fails (graceful degradation to keyword search).
 */
export async function generateEmbedding(
    text: string,
    userId?: string
): Promise<number[] | null> {
    try {
        // Get OpenRouter API key
        let apiKey = process.env.OPENROUTER_API_KEY_1 || process.env.OPENROUTER_API_KEY;

        // Try DB keys if available
        if (userId) {
            const { data: keys } = await supabase
                .from("openrouter_keys")
                .select("api_key")
                .eq("user_id", userId)
                .eq("is_active", true)
                .limit(1)
                .single();
            if (keys?.api_key) apiKey = keys.api_key;
        }

        if (!apiKey) {
            console.warn("[RAG] No OpenRouter API key for embedding");
            return null;
        }

        const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "nomic-ai/nomic-embed-text-v1.5",
                input: text.substring(0, 2000), // max input length
            }),
        });

        if (!response.ok) {
            console.warn(`[RAG] Embedding API failed: ${response.status}`);
            return null;
        }

        const data = await response.json();
        const embedding = data.data?.[0]?.embedding;

        if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
            console.warn("[RAG] Invalid embedding dimensions:", embedding?.length);
            return null;
        }

        return embedding;
    } catch (err) {
        console.error("[RAG] generateEmbedding error:", err);
        return null;
    }
}

// ─── Ingestion ────────────────────────────────────────────────────────────────

/**
 * Ingest a document: chunk → embed → store in Supabase pgvector.
 * Called when user uploads a PDF/DOCX for a custom agent.
 */
export async function ingestDocument(
    userId: string,
    fileName: string,
    fileType: string,
    fullText: string,
    agentId?: string
): Promise<{ documentId: string; chunkCount: number } | null> {
    try {
        // 1. Create document record
        const { data: doc, error: docError } = await supabase
            .from("rag_documents")
            .insert({
                user_id: userId,
                agent_id: agentId || null,
                file_name: fileName,
                file_type: fileType,
            })
            .select("id")
            .single();

        if (docError || !doc) {
            console.error("[RAG] Failed to create document record:", docError);
            return null;
        }

        // 2. Chunk the text
        const chunks = chunkText(fullText);
        if (chunks.length === 0) {
            console.warn("[RAG] No chunks generated from document");
            return null;
        }

        console.log(`[RAG] Ingesting ${chunks.length} chunks for document: ${fileName}`);

        // 3. Embed and store each chunk (batch in groups of 5 to avoid rate limits)
        let storedCount = 0;
        const batchSize = 5;

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            const chunkRecords = await Promise.all(
                batch.map(async (chunkText, batchIdx) => {
                    const chunkIndex = i + batchIdx;
                    const embedding = await generateEmbedding(chunkText, userId);

                    return {
                        document_id: doc.id,
                        user_id: userId,
                        chunk_index: chunkIndex,
                        content: chunkText,
                        embedding: embedding ? JSON.stringify(embedding) : null,
                        token_count: Math.ceil(chunkText.length / 4),
                    };
                })
            );

            const { error: insertError } = await supabase
                .from("rag_chunks")
                .insert(chunkRecords);

            if (insertError) {
                console.error(`[RAG] Chunk insert error (batch ${i}):`, insertError);
            } else {
                storedCount += batch.length;
            }
        }

        // 4. Update chunk count on document
        await supabase
            .from("rag_documents")
            .update({ chunk_count: storedCount })
            .eq("id", doc.id);

        console.log(`[RAG] ✅ Ingested ${storedCount}/${chunks.length} chunks for: ${fileName}`);
        return { documentId: doc.id, chunkCount: storedCount };
    } catch (err) {
        console.error("[RAG] ingestDocument error:", err);
        return null;
    }
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

/**
 * Retrieve relevant chunks for a user query using vector similarity.
 * Falls back to keyword search if embeddings are unavailable.
 */
export async function retrieveRelevantChunks(
    userId: string,
    query: string,
    agentId?: string
): Promise<string | null> {
    try {
        // Check if user has any RAG documents
        const { count } = await supabase
            .from("rag_chunks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        if (!count || count === 0) return null;

        // Try vector similarity search first
        const queryEmbedding = await generateEmbedding(query, userId);

        let chunks: Array<{ content: string; similarity?: number }> = [];

        if (queryEmbedding) {
            // Vector search via RPC function
            const { data: vectorResults, error } = await supabase.rpc("match_chunks", {
                query_embedding: queryEmbedding,
                match_user_id: userId,
                match_count: MAX_CHUNKS_PER_QUERY,
                match_threshold: 0.3,
            });

            if (!error && vectorResults && vectorResults.length > 0) {
                chunks = vectorResults;
                console.log(`[RAG] ✅ Vector search found ${chunks.length} relevant chunks`);
            }
        }

        // Fallback: keyword search if vector search failed or returned nothing
        if (chunks.length === 0) {
            const keywords = query
                .toLowerCase()
                .split(/\s+/)
                .filter((w) => w.length > 3)
                .slice(0, 5);

            if (keywords.length > 0) {
                const { data: keywordResults } = await supabase
                    .from("rag_chunks")
                    .select("content")
                    .eq("user_id", userId)
                    .or(keywords.map((kw) => `content.ilike.%${kw}%`).join(","))
                    .limit(MAX_CHUNKS_PER_QUERY);

                if (keywordResults && keywordResults.length > 0) {
                    chunks = keywordResults;
                    console.log(`[RAG] ✅ Keyword fallback found ${chunks.length} chunks`);
                }
            }
        }

        if (chunks.length === 0) return null;

        // Format chunks for system prompt injection
        const formattedChunks = chunks
            .map((c, i) => `[Document Excerpt ${i + 1}]:\n${c.content}`)
            .join("\n\n");

        return `## 📄 RELEVANT DOCUMENT CONTEXT (RAG)
The following excerpts from the user's uploaded documents are directly relevant to their query.
Use this information to give precise, document-grounded answers. Always reference the document when using this information.

${formattedChunks}

---
INSTRUCTION: Base your answer on the document excerpts above when relevant. If the document doesn't contain enough information, say so clearly rather than hallucinating.`;
    } catch (err) {
        console.error("[RAG] retrieveRelevantChunks error:", err);
        return null;
    }
}

/**
 * Delete all RAG data for a specific document
 */
export async function deleteDocument(
    userId: string,
    documentId: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from("rag_documents")
            .delete()
            .eq("id", documentId)
            .eq("user_id", userId);

        return !error;
    } catch {
        return false;
    }
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(userId: string) {
    const { data, error } = await supabase
        .from("rag_documents")
        .select("id, file_name, file_type, chunk_count, created_at, agent_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) return [];
    return data || [];
}
