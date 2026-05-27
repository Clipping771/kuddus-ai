/**
 * Response Confidence Check
 *
 * After generating a response, quickly evaluates its quality.
 * If confidence is low, signals the caller to retry or append a disclaimer.
 *
 * Uses fast Groq model — adds ~300ms max, non-blocking if it fails.
 */

import { groqChatWithFallback } from "@/lib/groq";

export interface ConfidenceResult {
    score: number;          // 0-10
    isWeak: boolean;        // true if score < 5
    issues: string[];       // what's wrong
    shouldRetry: boolean;   // true if score < 4 and retry is worth it
}

/**
 * Evaluate response quality quickly.
 * Returns null if check fails (non-critical — caller should proceed normally).
 */
export async function checkResponseConfidence(
    userMessage: string,
    assistantResponse: string,
    agentId: string,
    userId?: string
): Promise<ConfidenceResult | null> {
    // Skip check for very short responses (streaming still in progress)
    if (assistantResponse.length < 100) return null;

    // Skip for Brain Trust — already has self-reflection critic
    if (agentId === "brain-trust") return null;

    // Skip for image/document responses — hard to evaluate
    if (userMessage.includes("[IMAGE_BASE64:") || userMessage.includes("[ATTACHED DOCUMENT:")) return null;

    try {
        const prompt = `You are a response quality evaluator. Score this AI response on a scale of 0-10.

User asked: "${userMessage.substring(0, 200)}"
AI responded (first 600 chars): "${assistantResponse.substring(0, 600)}"

Evaluate:
- Does it actually answer the question? (0-3 points)
- Is it specific and actionable, not vague? (0-3 points)
- Is it complete, not cut off or generic? (0-2 points)
- Is it relevant to the user's context? (0-2 points)

Respond ONLY with JSON:
{"score": 7, "issues": ["too generic", "missing specific numbers"], "shouldRetry": false}

If score >= 5, issues can be empty. shouldRetry = true only if score < 4.`;

        const completion = await groqChatWithFallback(
            {
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                max_tokens: 80,
            },
            userId
        );

        const raw = completion.choices[0]?.message?.content?.trim() || "";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        const score = Math.min(10, Math.max(0, Number(parsed.score) || 5));

        return {
            score,
            isWeak: score < 5,
            issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
            shouldRetry: !!parsed.shouldRetry && score < 4,
        };
    } catch {
        return null; // Non-critical — always fail silently
    }
}
