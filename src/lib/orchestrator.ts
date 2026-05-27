/**
 * Intelligent Agent Orchestrator
 *
 * Instead of routing to ONE agent, this analyzes user intent and decides:
 * 1. Which single agent is best (simple queries)
 * 2. Which multiple agents should collaborate (complex queries)
 * 3. Whether Brain Trust is needed (strategic/complex)
 *
 * Uses a fast LLM call (Groq llama-3.1-8b) for intent classification.
 * Falls back to keyword-based routing if LLM fails.
 */

import { groqChatWithFallback } from "@/lib/groq";
import { classifyAgentByKeywords } from "@/lib/agentRouter";

export interface OrchestrationResult {
    primaryAgent: string;
    collaboratingAgents: string[];  // additional agents to consult
    shouldUseBrainTrust: boolean;
    intent: string;                 // human-readable intent summary
    confidence: "high" | "medium" | "low";
    reasoning: string;
}

// Agent capability map — what each agent is best at
const AGENT_CAPABILITIES: Record<string, string> = {
    "daily-innovation-idea-agent": "business ideas, startup concepts, new ventures, opportunities",
    "personal-cfo-finance-agent": "finance, budget, cash flow, tax, pricing, revenue, costs, funding",
    "research-agent": "market research, industry analysis, SWOT, TAM SAM SOM, trends, statistics",
    "competitor-spy-agent": "competitor analysis, market positioning, pricing teardown, competitive intelligence",
    "project-manager-agent": "project planning, sprints, roadmap, WBS, milestones, agile, scrum",
    "code-helper-developer-agent": "code, programming, architecture, tech stack, debugging, APIs",
    "devmind-agent": "software engineering, code review, system design, security, DevOps, databases",
    "sales-lead-generator": "sales strategy, lead generation, cold outreach, pipeline, CRM",
    "content-creator-agent": "content writing, marketing copy, scripts, hooks, campaigns, viral content",
    "social-media-manager": "social media, Instagram, Facebook, LinkedIn, content calendar, hashtags",
    "legal-compliance-agent": "legal, contracts, NDA, compliance, regulations, terms of service",
    "hr-recruiting-agent": "hiring, job descriptions, interviews, onboarding, HR, team building",
    "investor-pitch-agent": "investor pitch, fundraising, valuation, pitch deck, VC, startup funding",
    "performance-marketer-agent": "paid ads, Facebook ads, Google ads, SEO, ROAS, CAC, conversion",
    "it-automation-consultant": "automation, Zapier, no-code, SaaS tools, workflows, integrations",
    "pain-point-scraper-agent": "customer pain points, market gaps, complaints, unmet needs, opportunities",
};

/**
 * Orchestrate: analyze intent and route to best agent(s).
 * Uses fast LLM for complex queries, keyword fallback for simple ones.
 */
export async function orchestrateAgents(
    message: string,
    currentAgentId: string,
    userId?: string
): Promise<OrchestrationResult> {
    // Default result
    const defaultResult: OrchestrationResult = {
        primaryAgent: currentAgentId,
        collaboratingAgents: [],
        shouldUseBrainTrust: false,
        intent: "general query",
        confidence: "low",
        reasoning: "Using current agent",
    };

    if (!message || message.length < 10) return defaultResult;

    // Fast keyword check first
    const keywordResult = classifyAgentByKeywords(message);

    // For short/simple messages, keyword routing is enough
    if (message.length < 80 && keywordResult?.confidence === "high") {
        return {
            primaryAgent: keywordResult.primaryAgent,
            collaboratingAgents: [],
            shouldUseBrainTrust: false,
            intent: "simple query",
            confidence: "high",
            reasoning: keywordResult.reason,
        };
    }

    // For complex messages, use LLM orchestration
    try {
        const agentList = Object.entries(AGENT_CAPABILITIES)
            .map(([id, cap]) => `- ${id}: ${cap}`)
            .join("\n");

        const prompt = `You are an AI agent orchestrator. Analyze this user message and decide which agent(s) should handle it.

User message: "${message.substring(0, 500)}"

Available agents:
${agentList}

Respond with ONLY a JSON object:
{
  "primaryAgent": "agent-id-here",
  "collaboratingAgents": ["agent-id-2", "agent-id-3"],
  "shouldUseBrainTrust": false,
  "intent": "one sentence describing what user wants",
  "confidence": "high|medium|low",
  "reasoning": "why you chose these agents"
}

Rules:
- primaryAgent: the SINGLE best agent for this query
- collaboratingAgents: 0-2 additional agents if the query spans multiple domains (e.g. startup plan needs CFO + Investor + Research)
- shouldUseBrainTrust: true ONLY for complex strategic questions needing deep multi-perspective analysis
- Keep collaboratingAgents empty for simple/focused queries
- Return ONLY the JSON, no explanation`;

        const completion = await groqChatWithFallback(
            {
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 200,
            },
            userId
        );

        const raw = completion.choices[0]?.message?.content?.trim() || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in response");

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate agent IDs
        const validAgents = new Set(Object.keys(AGENT_CAPABILITIES));
        const primaryAgent = validAgents.has(parsed.primaryAgent)
            ? parsed.primaryAgent
            : (keywordResult?.primaryAgent || currentAgentId);

        const collaboratingAgents = (parsed.collaboratingAgents || [])
            .filter((id: string) => validAgents.has(id) && id !== primaryAgent)
            .slice(0, 2);

        console.log(`[Orchestrator] Intent: "${parsed.intent}" → Primary: ${primaryAgent}, Collaborators: [${collaboratingAgents.join(", ")}]`);

        return {
            primaryAgent,
            collaboratingAgents,
            shouldUseBrainTrust: !!parsed.shouldUseBrainTrust,
            intent: parsed.intent || "general query",
            confidence: parsed.confidence || "medium",
            reasoning: parsed.reasoning || "",
        };
    } catch (err) {
        console.warn("[Orchestrator] LLM failed, using keyword fallback:", err);
        // Fallback to keyword routing
        return {
            primaryAgent: keywordResult?.primaryAgent || currentAgentId,
            collaboratingAgents: [],
            shouldUseBrainTrust: false,
            intent: "general query",
            confidence: keywordResult?.confidence || "low",
            reasoning: "Keyword fallback",
        };
    }
}

/**
 * Build a collaborative system prompt when multiple agents are involved.
 */
export function buildCollaborativePrompt(
    basePrompt: string,
    collaboratingAgents: string[],
    agentInstructions: Record<string, string>
): string {
    if (collaboratingAgents.length === 0) return basePrompt;

    const collaboratorSections = collaboratingAgents
        .map((agentId) => {
            const instructions = agentInstructions[agentId];
            if (!instructions) return null;
            // Extract just the objective line from each collaborator
            const objectiveLine = instructions.match(/\*\*Objective\*\*:([^\n]+)/)?.[1]?.trim() || agentId;
            return `- **${agentId}** perspective: ${objectiveLine}`;
        })
        .filter(Boolean)
        .join("\n");

    return `${basePrompt}

## 🤝 COLLABORATIVE MODE
You are the primary expert, but also incorporate insights from these additional perspectives:
${collaboratorSections}

Weave these perspectives naturally into your response without explicitly labeling them. The goal is a comprehensive answer that covers all relevant angles.`;
}
