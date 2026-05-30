/**
 * Knowledge Graph Memory — Kacha Morich AI
 *
 * Upgrades flat key-value memory to a relationship-aware graph.
 *
 * Current (flat):
 *   Fact 1, Fact 2, Fact 3
 *
 * Future (graph):
 *   User
 *   ├── Studies → University
 *   ├── Works On → EcoGrid
 *   ├── Goal → Graduate
 *   └── Interested In → AI
 *
 * This becomes the proprietary intelligence layer.
 * Stored in user_memory with special relationship keys.
 */

import { supabase } from "@/lib/supabase";
import { groqChatWithFallback } from "@/lib/groq";

export interface KnowledgeNode {
    entity: string;       // e.g. "EcoGrid", "University of Dhaka"
    type: string;         // e.g. "company", "university", "goal", "skill"
    relationship: string; // e.g. "works_at", "studies_at", "wants_to", "knows"
    attributes: Record<string, string>; // additional facts about this entity
}

export interface KnowledgeGraph {
    nodes: KnowledgeNode[];
    summary: string;      // human-readable summary of what we know
}

/**
 * Extract knowledge graph nodes from a conversation.
 * Runs in background after each message — non-blocking.
 */
export async function extractKnowledgeGraph(
    userId: string,
    userMessage: string,
    assistantResponse: string
): Promise<void> {
    if (userMessage.length < 20) return;
    if (userMessage.startsWith("[IMAGE_BASE64:") || userMessage.startsWith("[ATTACHED DOCUMENT:")) return;

    try {
        const prompt = `Extract entity relationships from this conversation. Focus on WHO the user IS and what they're CONNECTED TO.

User message: "${userMessage.substring(0, 600)}"

Extract relationships in this format. Return ONLY JSON array:
[
  {"entity": "EcoGrid", "type": "company", "relationship": "works_on", "attributes": {"role": "founder", "stage": "startup"}},
  {"entity": "University of Dhaka", "type": "university", "relationship": "studies_at", "attributes": {"field": "Computer Science"}},
  {"entity": "Get software job", "type": "goal", "relationship": "wants_to", "attributes": {"timeline": "6 months"}},
  {"entity": "Python", "type": "skill", "relationship": "knows", "attributes": {"level": "intermediate"}}
]

Rules:
- Only extract entities the user explicitly mentioned
- relationship must be one of: works_at, works_on, studies_at, wants_to, knows, lives_in, founded, building, interested_in, has_goal
- Maximum 4 nodes per conversation
- If nothing to extract, return: []`;

        const completion = await groqChatWithFallback(
            {
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 400,
            },
            userId
        );

        const raw = completion.choices[0]?.message?.content?.trim() || "";
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return;

        const nodes: KnowledgeNode[] = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(nodes) || nodes.length === 0) return;

        // Save each node as a special memory entry with graph prefix
        const validRelationships = new Set([
            "works_at", "works_on", "studies_at", "wants_to", "knows",
            "lives_in", "founded", "building", "interested_in", "has_goal"
        ]);

        const upsertData = nodes
            .filter(n => n.entity && n.relationship && validRelationships.has(n.relationship))
            .map(n => ({
                user_id: userId,
                key: `graph_${n.relationship}_${n.entity.toLowerCase().replace(/\s+/g, "_").substring(0, 50)}`,
                value: JSON.stringify({
                    entity: n.entity,
                    type: n.type,
                    relationship: n.relationship,
                    attributes: n.attributes || {},
                }),
                category: "context",
                importance_score: 0.8, // Graph nodes are high importance
                updated_at: new Date().toISOString(),
            }));

        if (upsertData.length === 0) return;

        const { error } = await supabase
            .from("user_memory")
            .upsert(upsertData, { onConflict: "user_id,key" });

        if (error) {
            console.warn("[KnowledgeGraph] Upsert error:", error.message);
        } else {
            console.log(`[KnowledgeGraph] ✅ Saved ${upsertData.length} graph nodes for user ${userId}`);
        }
    } catch (err) {
        // Non-critical — silent fail
        console.warn("[KnowledgeGraph] Extraction failed:", err);
    }
}

/**
 * Build a knowledge graph context string for system prompt injection.
 * More structured than flat memory — shows relationships.
 */
export async function getKnowledgeGraphContext(userId: string): Promise<string | null> {
    try {
        const { data: graphMemories, error } = await supabase
            .from("user_memory")
            .select("key, value, updated_at")
            .eq("user_id", userId)
            .like("key", "graph_%")
            .order("updated_at", { ascending: false })
            .limit(20);

        if (error || !graphMemories || graphMemories.length === 0) return null;

        const nodes: KnowledgeNode[] = [];
        for (const mem of graphMemories) {
            try {
                const parsed = JSON.parse(mem.value);
                if (parsed.entity && parsed.relationship) {
                    nodes.push(parsed);
                }
            } catch { continue; }
        }

        if (nodes.length === 0) return null;

        // Group by relationship type for readable output
        const grouped: Record<string, string[]> = {};
        for (const node of nodes) {
            const label = relationshipLabel(node.relationship);
            if (!grouped[label]) grouped[label] = [];
            const attrs = Object.entries(node.attributes || {})
                .map(([k, v]) => `${k}: ${v}`)
                .join(", ");
            grouped[label].push(attrs ? `${node.entity} (${attrs})` : node.entity);
        }

        const lines = Object.entries(grouped)
            .map(([rel, entities]) => `• ${rel}: ${entities.join(", ")}`)
            .join("\n");

        return `## 🕸️ KNOWLEDGE GRAPH — User's World\n${lines}`;
    } catch (err) {
        return null;
    }
}

function relationshipLabel(rel: string): string {
    const labels: Record<string, string> = {
        works_at: "Works at",
        works_on: "Working on",
        studies_at: "Studies at",
        wants_to: "Goals",
        knows: "Skills",
        lives_in: "Location",
        founded: "Founded",
        building: "Building",
        interested_in: "Interested in",
        has_goal: "Goals",
    };
    return labels[rel] || rel;
}
