/**
 * User Long-Term Memory API
 *
 * GET  /api/memory         — fetch user's memory entries
 * GET  /api/memory?search= — semantic search through memories
 * POST /api/memory         — save/update a memory entry
 * DELETE /api/memory       — clear all memory for user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { groqChatWithFallback } from "@/lib/groq";

export const dynamic = "force-dynamic";

// GET — fetch all memory entries, or semantic search if ?search= provided
export async function GET(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ memories: [] });
        }

        // Semantic search mode
        const url = new URL(req.url);
        const searchQuery = url.searchParams.get("search");

        if (searchQuery && searchQuery.trim().length > 2) {
            // Fetch all memories then use LLM to find relevant ones
            const { data: allMemories } = await supabase
                .from("user_memory")
                .select("key, value, category, updated_at")
                .eq("user_id", dbUser.id)
                .order("updated_at", { ascending: false })
                .limit(100);

            if (!allMemories || allMemories.length === 0) {
                return NextResponse.json({ memories: [], searchResult: null });
            }

            // Format memories for LLM search
            const memoryText = allMemories
                .map((m: any) => `[${m.category}] ${m.key}: ${m.value}`)
                .join("\n");

            try {
                const searchPrompt = `You are a memory search assistant. Find memories relevant to the user's query.

User query: "${searchQuery}"

All stored memories:
${memoryText}

Return ONLY a JSON object:
{
  "relevantMemories": ["key1", "key2"],
  "summary": "Brief answer to the query based on stored memories",
  "found": true
}

If nothing relevant found, return: {"relevantMemories": [], "summary": "No relevant memories found.", "found": false}`;

                const result = await groqChatWithFallback(
                    {
                        model: "llama-3.1-8b-instant",
                        messages: [{ role: "user", content: searchPrompt }],
                        temperature: 0.1,
                        max_tokens: 300,
                    },
                    dbUser.id
                );

                const raw = result.choices[0]?.message?.content?.trim() || "";
                const jsonMatch = raw.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const relevantMemories = allMemories.filter((m: any) =>
                        parsed.relevantMemories?.includes(m.key)
                    );
                    return NextResponse.json({
                        memories: relevantMemories,
                        searchResult: parsed.summary,
                        found: parsed.found,
                    });
                }
            } catch (searchErr) {
                console.warn("[Memory] Semantic search failed, returning all:", searchErr);
            }

            // Fallback: simple keyword match
            const lowerQuery = searchQuery.toLowerCase();
            const matched = allMemories.filter((m: any) =>
                m.key.toLowerCase().includes(lowerQuery) ||
                m.value.toLowerCase().includes(lowerQuery)
            );
            return NextResponse.json({ memories: matched, searchResult: null });
        }

        // Normal fetch — all memories
        const { data: memories, error } = await supabase
            .from("user_memory")
            .select("*")
            .eq("user_id", dbUser.id)
            .order("updated_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("[Memory] Fetch error:", error);
            return NextResponse.json({ memories: [] });
        }

        return NextResponse.json({ memories: memories || [] });
    } catch (err) {
        console.error("[Memory] GET error:", err);
        return NextResponse.json({ memories: [] });
    }
}

// POST — upsert a memory entry (key + value)
export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { key, value, category } = await req.json();

        if (!key || !value) {
            return NextResponse.json({ error: "key and value are required" }, { status: 400 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Upsert — update if key exists, insert if not
        const { data, error } = await supabase
            .from("user_memory")
            .upsert(
                {
                    user_id: dbUser.id,
                    key,
                    value,
                    category: category || "general",
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,key" }
            )
            .select()
            .single();

        if (error) {
            console.error("[Memory] Upsert error:", error);
            return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
        }

        return NextResponse.json({ memory: data });
    } catch (err) {
        console.error("[Memory] POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE — clear all memory for user
export async function DELETE() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { error } = await supabase
            .from("user_memory")
            .delete()
            .eq("user_id", dbUser.id);

        if (error) {
            console.error("[Memory] Delete error:", error);
            return NextResponse.json({ error: "Failed to clear memory" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Memory] DELETE error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
