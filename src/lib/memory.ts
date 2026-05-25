/**
 * Long-Term User Memory System
 *
 * How it works:
 * 1. After each AI response, extractMemoryFromConversation() runs silently in background
 * 2. It asks a fast Groq model to extract key facts from the conversation
 * 3. Facts are stored in user_memory table (key-value pairs)
 * 4. On next chat, getUserMemoryContext() fetches and formats them for system prompt injection
 *
 * Memory categories:
 * - business: company name, industry, revenue, team size
 * - preferences: language preference, tone preference, tools they use
 * - context: ongoing projects, goals, decisions made
 * - personal: name, role, location (if shared)
 */

import { supabase } from "@/lib/supabase";
import { groqChatWithFallback } from "@/lib/groq";
import { openrouterFetchWithFallback } from "@/lib/openrouter";

export interface MemoryEntry {
    id: string;
    user_id: string;
    key: string;
    value: string;
    category: "business" | "preferences" | "context" | "personal" | "general";
    updated_at: string;
}

/**
 * Fetch all memory entries for a user and format as system prompt context block.
 * Returns null if no memories exist (avoids adding empty block to prompt).
 */
export async function getUserMemoryContext(userId: string): Promise<string | null> {
    try {
        const { data: memories, error } = await supabase
            .from("user_memory")
            .select("key, value, category")
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(40);

        if (error || !memories || memories.length === 0) {
            return null;
        }

        // Group by category for cleaner prompt injection
        const grouped: Record<string, string[]> = {};
        for (const mem of memories) {
            const cat = mem.category || "general";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(`• ${mem.key}: ${mem.value}`);
        }

        const sections: string[] = [];

        if (grouped.personal?.length) {
            sections.push(`**About the User:**\n${grouped.personal.join("\n")}`);
        }
        if (grouped.business?.length) {
            sections.push(`**Their Business:**\n${grouped.business.join("\n")}`);
        }
        if (grouped.context?.length) {
            sections.push(`**Ongoing Projects & Goals:**\n${grouped.context.join("\n")}`);
        }
        if (grouped.preferences?.length) {
            sections.push(`**User Preferences:**\n${grouped.preferences.join("\n")}`);
        }
        if (grouped.general?.length) {
            sections.push(`**Other Known Facts:**\n${grouped.general.join("\n")}`);
        }

        if (sections.length === 0) return null;

        return `## 🧠 LONG-TERM MEMORY (What you already know about this user)
This user has interacted with you before. Use this context to personalize your response — reference their business, goals, and preferences naturally without being robotic about it.

${sections.join("\n\n")}

---
INSTRUCTION: Incorporate this context naturally. If the user's question relates to their known business or goals, reference it. Do NOT list these facts back to the user — just use them to give more relevant, personalized advice.`;
    } catch (err) {
        console.error("[Memory] getUserMemoryContext error:", err);
        return null;
    }
}

/**
 * Extract key facts from a conversation turn and save to user_memory.
 * Runs silently in background — does NOT block the streaming response.
 *
 * Called after assistant response is saved to DB.
 */
export async function extractAndSaveMemory(
    userId: string,
    userMessage: string,
    assistantResponse: string
): Promise<void> {
    // Skip extraction for very short exchanges — not enough signal
    if (userMessage.length < 30 || assistantResponse.length < 50) return;

    // Skip if message is just an image or document attachment
    if (userMessage.startsWith("[IMAGE_BASE64:") || userMessage.startsWith("[ATTACHED DOCUMENT:")) return;

    try {
        const extractionPrompt = `You are a memory extraction system. Analyze this conversation snippet and extract ONLY concrete, reusable facts about the USER (not the AI's advice).

Extract facts in these categories:
- personal: user's name, role/title, location, age (if mentioned)
- business: company name, industry, product/service, revenue, team size, stage (startup/growth/etc)
- context: current projects, goals, problems they're solving, decisions they've made
- preferences: language preference, tools/tech stack they use, communication style

RULES:
- Only extract facts the user explicitly stated — never infer or assume
- Skip generic questions — only extract facts about THEIR specific situation
- Maximum 5 facts per conversation turn
- Each fact must be specific and reusable in future conversations
- If no concrete facts exist, return empty array

User message: "${userMessage.substring(0, 800)}"
Assistant response (first 400 chars for context): "${assistantResponse.substring(0, 400)}"

Return ONLY a JSON array. Example:
[
  {"key": "company_name", "value": "TechCorp BD", "category": "business"},
  {"key": "industry", "value": "SaaS / B2B software", "category": "business"},
  {"key": "current_goal", "value": "Raising seed funding of $500K", "category": "context"}
]

If no facts to extract, return: []`;

        // Tier 1: Try Groq first — fast and cheap
        let rawContent: string | null = null;

        try {
            const completion = await groqChatWithFallback(
                {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: extractionPrompt }],
                    temperature: 0.1,
                    max_tokens: 500,
                },
                userId
            );
            rawContent = completion.choices[0]?.message?.content?.trim() || null;
            if (rawContent) {
                console.log("[Memory] ✅ Groq extraction succeeded");
            }
        } catch (groqErr: any) {
            console.warn("[Memory] Groq extraction failed, trying OpenRouter fallback:", groqErr?.message);
        }

        // Tier 2: OpenRouter fallback — if Groq failed or returned empty
        if (!rawContent) {
            try {
                const { response: res } = await openrouterFetchWithFallback(
                    [
                        "meta-llama/llama-3.3-70b-instruct:free",
                        "mistralai/mistral-7b-instruct:free",
                        "qwen/qwen3-8b:free",
                    ],
                    {
                        messages: [{ role: "user", content: extractionPrompt }],
                        stream: false,
                        max_tokens: 500,
                        temperature: 0.1,
                    },
                    userId
                );
                const data = await res.json();
                rawContent = data.choices?.[0]?.message?.content?.trim() || null;
                if (rawContent) {
                    console.log("[Memory] ✅ OpenRouter extraction fallback succeeded");
                }
            } catch (orErr: any) {
                console.warn("[Memory] OpenRouter extraction fallback also failed:", orErr?.message);
                return; // Both failed — skip silently, non-critical
            }
        }

        if (!rawContent) return;

        // Parse JSON — handle cases where model wraps in markdown code blocks
        let facts: Array<{ key: string; value: string; category: string }> = [];
        try {
            const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                facts = JSON.parse(jsonMatch[0]);
            }
        } catch (parseErr) {
            console.warn("[Memory] Failed to parse extraction JSON:", rawContent.substring(0, 100));
            return;
        }

        if (!Array.isArray(facts) || facts.length === 0) return;

        // Validate and save each fact
        const validCategories = new Set(["business", "preferences", "context", "personal", "general"]);
        const validFacts = facts.filter(
            (f) =>
                f.key &&
                f.value &&
                typeof f.key === "string" &&
                typeof f.value === "string" &&
                f.key.length < 100 &&
                f.value.length < 500
        );

        if (validFacts.length === 0) return;

        // Batch upsert all facts
        const upsertData = validFacts.map((f) => ({
            user_id: userId,
            key: f.key.toLowerCase().replace(/\s+/g, "_").substring(0, 80),
            value: f.value.substring(0, 400),
            category: validCategories.has(f.category) ? f.category : "general",
            updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
            .from("user_memory")
            .upsert(upsertData, { onConflict: "user_id,key" });

        if (error) {
            console.error("[Memory] Batch upsert error:", error);
        } else {
            console.log(`[Memory] ✅ Saved ${validFacts.length} memory facts for user ${userId}`);
        }
    } catch (err) {
        // Memory extraction is non-critical — log and continue
        console.error("[Memory] extractAndSaveMemory error:", err);
    }
}

/**
 * Get memory count for a user (used in settings UI)
 */
export async function getMemoryCount(userId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from("user_memory")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        if (error) return 0;
        return count || 0;
    } catch {
        return 0;
    }
}
