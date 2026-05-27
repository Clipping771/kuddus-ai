/**
 * User Behavior Tracking — for Adaptive UI
 *
 * Tracks which agents user uses most, preferred tone, message complexity.
 * Used to personalize: agent suggestions, default tone, UI complexity level.
 */

import { supabase } from "@/lib/supabase";

export interface UserBehaviorProfile {
    topAgents: Array<{ agentId: string; useCount: number }>;
    preferredTone: string;
    complexityLevel: "simple" | "medium" | "complex";
    avgMessageLength: number;
}

/**
 * Record a chat interaction for behavior tracking.
 * Fire-and-forget — non-blocking.
 */
export async function trackAgentUsage(
    userId: string,
    agentId: string,
    messageLength: number,
    toneId: string
): Promise<void> {
    try {
        const complexity: "simple" | "medium" | "complex" =
            messageLength < 50 ? "simple" : messageLength < 200 ? "medium" : "complex";

        await supabase.from("user_behavior").upsert(
            {
                user_id: userId,
                agent_id: agentId,
                use_count: 1,
                last_used: new Date().toISOString(),
                avg_message_length: messageLength,
                preferred_tone: toneId || "brutally-honest",
                complexity_level: complexity,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: "user_id,agent_id",
                // Increment use_count and update other fields
                ignoreDuplicates: false,
            }
        );

        // Increment use_count separately (upsert doesn't support increment)
        try {
            await (supabase.rpc as any)("increment_agent_use_count", {
                p_user_id: userId,
                p_agent_id: agentId,
                p_message_length: messageLength,
                p_tone: toneId || "brutally-honest",
                p_complexity: complexity,
            });
        } catch {
            // RPC might not exist yet — silent fail
        }
    } catch (err) {
        // Non-critical — silent fail
    }
}

/**
 * Get user's behavior profile for adaptive UI.
 */
export async function getUserBehaviorProfile(
    userId: string
): Promise<UserBehaviorProfile | null> {
    try {
        const { data, error } = await supabase
            .from("user_behavior")
            .select("agent_id, use_count, preferred_tone, complexity_level, avg_message_length")
            .eq("user_id", userId)
            .order("use_count", { ascending: false })
            .limit(10);

        if (error || !data || data.length === 0) return null;

        const topAgents = data.map((d) => ({
            agentId: d.agent_id,
            useCount: d.use_count,
        }));

        // Most used tone
        const toneCounts: Record<string, number> = {};
        data.forEach((d) => {
            toneCounts[d.preferred_tone] = (toneCounts[d.preferred_tone] || 0) + d.use_count;
        });
        const preferredTone = Object.entries(toneCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "brutally-honest";

        // Average complexity
        const complexityCounts = { simple: 0, medium: 0, complex: 0 };
        data.forEach((d) => {
            complexityCounts[d.complexity_level as keyof typeof complexityCounts] += d.use_count;
        });
        const complexityLevel = (Object.entries(complexityCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "medium") as "simple" | "medium" | "complex";

        const avgMessageLength = data.reduce((sum, d) => sum + (d.avg_message_length || 0), 0) / data.length;

        return { topAgents, preferredTone, complexityLevel, avgMessageLength };
    } catch {
        return null;
    }
}

/**
 * Update memory importance score based on access patterns.
 * Called when a memory entry is used in a response.
 */
export async function boostMemoryImportance(
    userId: string,
    memoryKeys: string[]
): Promise<void> {
    if (!memoryKeys.length) return;
    try {
        // Boost importance score for accessed memories
        for (const key of memoryKeys) {
            await supabase
                .from("user_memory")
                .update({
                    access_count: supabase.rpc("increment" as any, { row_id: key }),
                    last_accessed: new Date().toISOString(),
                    importance_score: 0.9, // Boost to high importance when accessed
                })
                .eq("user_id", userId)
                .eq("key", key);
        }
    } catch {
        // Non-critical
    }
}

/**
 * Get scored memories — important ones first, decayed ones filtered out.
 * Replaces the flat memory fetch in getUserMemoryContext.
 */
export async function getScoredMemories(userId: string): Promise<Array<{
    key: string;
    value: string;
    category: string;
    importance_score: number;
}>> {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from("user_memory")
            .select("key, value, category, importance_score, last_accessed, access_count")
            .eq("user_id", userId)
            .or(`importance_score.gte.0.7,last_accessed.gte.${thirtyDaysAgo}`) // Keep high-importance OR recent
            .order("importance_score", { ascending: false })
            .limit(30);

        if (error || !data) return [];

        // Apply time-based decay: reduce score for old, unaccessed memories
        return data.map((mem) => {
            const daysSinceAccess = (Date.now() - new Date(mem.last_accessed || mem.key).getTime()) / (1000 * 60 * 60 * 24);
            const decayFactor = Math.max(0.1, 1 - daysSinceAccess / 90); // Decay over 90 days
            const effectiveScore = (mem.importance_score || 0.5) * decayFactor * (1 + Math.log1p(mem.access_count || 0) * 0.1);

            return {
                key: mem.key,
                value: mem.value,
                category: mem.category,
                importance_score: effectiveScore,
            };
        }).sort((a, b) => b.importance_score - a.importance_score);
    } catch {
        return [];
    }
}
