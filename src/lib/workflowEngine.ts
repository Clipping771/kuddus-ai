/**
 * Workflow Engine — Kacha Morich AI
 *
 * User defines a workflow:
 *   New PDF → Summarize → Research → Create Slides → Export
 *
 * AI executes each step sequentially, passing output as input to next step.
 * This is actual execution, not suggestions.
 *
 * Workflows are stored in user_memory with "workflow_" prefix.
 */

import { groqChatWithFallback } from "@/lib/groq";
import { openrouterFetchWithFallback } from "@/lib/openrouter";

export interface WorkflowStep {
    id: string;
    name: string;
    action: string;       // what to do: "summarize" | "research" | "write" | "analyze" | "extract" | "format"
    agentId?: string;     // which agent handles this step
    prompt?: string;      // custom prompt for this step
    status: "pending" | "running" | "completed" | "failed";
    output?: string;      // result of this step
    error?: string;
}

export interface Workflow {
    id: string;
    name: string;
    trigger: string;      // what starts this workflow
    steps: WorkflowStep[];
    status: "idle" | "running" | "completed" | "failed";
    createdAt: string;
}

// Predefined workflow templates
export const WORKFLOW_TEMPLATES: Omit<Workflow, "id" | "createdAt">[] = [
    {
        name: "PDF Intelligence Pipeline",
        trigger: "New PDF uploaded",
        status: "idle",
        steps: [
            { id: "1", name: "Extract & Summarize", action: "summarize", agentId: "research-agent", status: "pending" },
            { id: "2", name: "Market Research", action: "research", agentId: "research-agent", status: "pending" },
            { id: "3", name: "Key Insights", action: "analyze", agentId: "personal-cfo-finance-agent", status: "pending" },
            { id: "4", name: "Action Plan", action: "write", agentId: "project-manager-agent", status: "pending" },
        ],
    },
    {
        name: "Startup Validation Pipeline",
        trigger: "New business idea",
        status: "idle",
        steps: [
            { id: "1", name: "Market Research", action: "research", agentId: "research-agent", status: "pending" },
            { id: "2", name: "Competitor Analysis", action: "analyze", agentId: "competitor-spy-agent", status: "pending" },
            { id: "3", name: "Financial Model", action: "analyze", agentId: "personal-cfo-finance-agent", status: "pending" },
            { id: "4", name: "Pitch Deck Draft", action: "write", agentId: "investor-pitch-agent", status: "pending" },
        ],
    },
    {
        name: "Content Creation Pipeline",
        trigger: "New content topic",
        status: "idle",
        steps: [
            { id: "1", name: "Research Topic", action: "research", agentId: "research-agent", status: "pending" },
            { id: "2", name: "Write Content", action: "write", agentId: "content-creator-agent", status: "pending" },
            { id: "3", name: "Social Media Adaptation", action: "format", agentId: "social-media-manager", status: "pending" },
        ],
    },
];

/**
 * Execute a single workflow step.
 * Takes the previous step's output as context.
 */
export async function executeWorkflowStep(
    step: WorkflowStep,
    input: string,
    previousOutputs: string[],
    userId: string
): Promise<string> {
    const context = previousOutputs.length > 0
        ? `\n\nPrevious step outputs:\n${previousOutputs.slice(-2).join("\n\n---\n\n")}`
        : "";

    const actionPrompts: Record<string, string> = {
        summarize: `Summarize the following content concisely. Extract key points, main themes, and important data.\n\nContent:\n${input}${context}`,
        research: `Based on the following, conduct market research and provide data-backed insights.\n\nTopic/Content:\n${input}${context}`,
        analyze: `Analyze the following from a business/financial perspective. Identify opportunities, risks, and recommendations.\n\nContent:\n${input}${context}`,
        write: `Create a structured, actionable document based on the following information.\n\nContent:\n${input}${context}`,
        extract: `Extract all key data points, facts, numbers, and actionable items from the following.\n\nContent:\n${input}${context}`,
        format: `Reformat and adapt the following content for the target platform/audience.\n\nContent:\n${input}${context}`,
    };

    const prompt = step.prompt || actionPrompts[step.action] || `Process the following:\n${input}${context}`;

    try {
        // Try Groq first
        const completion = await groqChatWithFallback(
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `You are executing step "${step.name}" in an automated workflow. Be thorough and structured. Output should be ready to pass to the next step.`,
                    },
                    { role: "user", content: prompt },
                ],
                temperature: 0.4,
                max_tokens: 1500,
            },
            userId
        );
        return completion.choices[0]?.message?.content?.trim() || "";
    } catch (groqErr) {
        // Fallback to OpenRouter
        const { response: res } = await openrouterFetchWithFallback(
            ["meta-llama/llama-3.3-70b-instruct:free", "mistralai/mistral-7b-instruct:free"],
            {
                messages: [
                    {
                        role: "system",
                        content: `You are executing step "${step.name}" in an automated workflow. Be thorough and structured.`,
                    },
                    { role: "user", content: prompt },
                ],
                stream: false,
                max_tokens: 1500,
                temperature: 0.4,
            },
            userId
        );
        const data = await res.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
    }
}

/**
 * Parse a natural language workflow description into structured steps.
 * "New PDF → Summarize → Research → Create Slides → Export"
 */
export async function parseWorkflowFromText(
    description: string,
    userId: string
): Promise<Omit<Workflow, "id" | "createdAt"> | null> {
    try {
        const prompt = `Parse this workflow description into structured steps.

Workflow: "${description}"

Return ONLY JSON:
{
  "name": "Workflow name",
  "trigger": "What starts this workflow",
  "steps": [
    {"id": "1", "name": "Step name", "action": "summarize|research|write|analyze|extract|format", "agentId": "agent-id-or-null", "status": "pending"},
    {"id": "2", "name": "Step name", "action": "research", "agentId": null, "status": "pending"}
  ]
}

Available agents: research-agent, personal-cfo-finance-agent, competitor-spy-agent, project-manager-agent, content-creator-agent, social-media-manager, devmind-agent, investor-pitch-agent
Use null for agentId if no specific agent fits.`;

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
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        return {
            name: parsed.name || "Custom Workflow",
            trigger: parsed.trigger || "Manual trigger",
            steps: (parsed.steps || []).map((s: any, i: number) => ({
                id: String(i + 1),
                name: s.name || `Step ${i + 1}`,
                action: s.action || "analyze",
                agentId: s.agentId || undefined,
                status: "pending" as const,
            })),
            status: "idle" as const,
        };
    } catch {
        return null;
    }
}
