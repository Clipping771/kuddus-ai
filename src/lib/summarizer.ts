/**
 * Conversation Summarization System
 *
 * When a chat exceeds SUMMARY_THRESHOLD messages, older messages are
 * compressed into a rolling summary. This preserves context without
 * hitting token limits.
 *
 * Flow:
 * - history > 15 messages → summarize oldest 10 → keep summary + last 8
 * - Summary is stored in Supabase as a special "summary" role message
 * - On next load, summary is injected at the top of the context window
 */

import { groqChatWithFallback } from "@/lib/groq";
import { openrouterFetchWithFallback } from "@/lib/openrouter";
import { supabase } from "@/lib/supabase";

const SUMMARY_THRESHOLD = 16; // summarize when history exceeds this
const MESSAGES_TO_SUMMARIZE = 10; // compress this many old messages
const MESSAGES_TO_KEEP = 8; // always keep this many recent messages

export interface ConversationSummary {
    summary: string;
    messageCount: number;
    createdAt: string;
}

/**
 * Check if a chat needs summarization and return the summary if it exists.
 * Returns null if no summary needed or exists.
 */
export async function getOrCreateSummary(
    chatId: string,
    history: Array<{ role: string; content: string }>,
    userId?: string
): Promise<{ summary: string | null; trimmedHistory: Array<{ role: string; content: string }> }> {
    // Not enough messages to need summarization
    if (history.length <= SUMMARY_THRESHOLD) {
        return { summary: null, trimmedHistory: history };
    }

    // Check if a summary already exists for this chat
    const { data: existingSummary } = await supabase
        .from("chat_summaries")
        .select("summary, message_count")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const messagesToSummarize = history.slice(0, MESSAGES_TO_SUMMARIZE);
    const recentMessages = history.slice(-MESSAGES_TO_KEEP);

    // If we have a recent summary that covers enough messages, use it
    if (existingSummary && existingSummary.message_count >= MESSAGES_TO_SUMMARIZE) {
        return {
            summary: existingSummary.summary,
            trimmedHistory: recentMessages,
        };
    }

    // Generate a new summary
    const summaryText = await generateSummary(messagesToSummarize, userId);
    if (!summaryText) {
        // Fallback: just truncate without summary
        return { summary: null, trimmedHistory: recentMessages };
    }

    // Store the summary
    await supabase.from("chat_summaries").upsert(
        {
            chat_id: chatId,
            summary: summaryText,
            message_count: messagesToSummarize.length,
            updated_at: new Date().toISOString(),
        },
        { onConflict: "chat_id" }
    );

    console.log(`[Summarizer] ✅ Generated summary for chat ${chatId} (${messagesToSummarize.length} messages compressed)`);

    return { summary: summaryText, trimmedHistory: recentMessages };
}

/**
 * Generate a concise summary of a conversation segment.
 */
async function generateSummary(
    messages: Array<{ role: string; content: string }>,
    userId?: string
): Promise<string | null> {
    const conversationText = messages
        .map((m) => {
            const role = m.role === "user" ? "User" : "AI";
            // Strip base64 images and long document blocks
            const clean = m.content
                .replace(/\[IMAGE_BASE64:[^\]]+\]/g, "[image]")
                .replace(/\[ATTACHED DOCUMENT:[^\]]+\][\s\S]*?```[\s\S]*?```/g, "[document attached]")
                .substring(0, 600);
            return `${role}: ${clean}`;
        })
        .join("\n\n");

    const prompt = `Summarize this conversation segment concisely. Capture:
- Key topics discussed
- Important decisions or conclusions reached
- Specific facts mentioned (numbers, names, business details)
- What the user is trying to accomplish

Keep it under 200 words. Write in the same language as the conversation.

Conversation:
${conversationText}

Summary:`;

    // Try Groq first (fast)
    try {
        const completion = await groqChatWithFallback(
            {
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 300,
            },
            userId
        );
        const text = completion.choices[0]?.message?.content?.trim();
        if (text && text.length > 20) return text;
    } catch (err) {
        console.warn("[Summarizer] Groq failed:", err);
    }

    // OpenRouter fallback
    try {
        const { response: res } = await openrouterFetchWithFallback(
            ["qwen/qwen3-8b:free", "mistralai/mistral-7b-instruct:free"],
            { messages: [{ role: "user", content: prompt }], stream: false, max_tokens: 300 },
            userId
        );
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text && text.length > 20) return text;
    } catch (err) {
        console.warn("[Summarizer] OpenRouter fallback failed:", err);
    }

    return null;
}

/**
 * Format summary as a system context block for injection into messages array.
 */
export function formatSummaryForContext(summary: string): string {
    return `## 📋 CONVERSATION SUMMARY (Earlier Context)
The following is a summary of the earlier part of this conversation. Use it to maintain continuity:

${summary}

---
NOTE: The above is a compressed summary. The recent messages below are the actual conversation.`;
}
