/**
 * Smart Verification Layer — Kacha Morich AI
 *
 * শুধু গুরুত্বপূর্ণ intents-এ চলে:
 *   Research | Finance/Business | Legal | Coding | Long-form content
 *
 * Pipeline:
 *   Draft → Internal Critic → Improved Final
 *
 * User দেখে না process — শুধু দেখে final, improved response।
 * Adds ~1-2s latency only when needed.
 */

import { groqChatWithFallback } from "@/lib/groq";
import { openrouterFetchWithFallback } from "@/lib/openrouter";
import type { IntentType } from "@/lib/intentEngine";

// ─── Which intents get verified ──────────────────────────────────────────────

const VERIFICATION_REQUIRED = new Set<IntentType>([
    "research",
    "business",
    "legal",
    "coding",
]);

// Minimum response length to bother verifying
const MIN_LENGTH_FOR_VERIFICATION = 300;

// ─── Critic prompts per intent ────────────────────────────────────────────────

const CRITIC_PROMPTS: Record<string, string> = {
    research: `You are a senior research analyst reviewing an AI-generated research response.
Identify SPECIFIC issues:
1. Missing key data points or statistics
2. Vague claims without evidence
3. Logical gaps or unsupported conclusions
4. Missing important perspectives or counterpoints
5. Outdated or potentially incorrect information

Be concise — list only real issues, not nitpicks. If the response is solid, say "APPROVED".`,

    business: `You are a CFO/strategy consultant reviewing an AI-generated business response.
Identify SPECIFIC issues:
1. Missing financial numbers or unit economics
2. Vague strategy without concrete action steps
3. Unrealistic assumptions
4. Missing risk factors
5. Generic advice that doesn't address the specific situation

Be concise — list only real issues. If the response is solid, say "APPROVED".`,

    legal: `You are a corporate attorney reviewing an AI-generated legal response.
Identify SPECIFIC issues:
1. Missing jurisdiction-specific considerations
2. Incomplete risk assessment
3. Missing important clauses or protections
4. Overly generic advice that doesn't address the specific situation
5. Potentially incorrect legal information

Be concise — list only real issues. If the response is solid, say "APPROVED".`,

    coding: `You are a senior software engineer reviewing an AI-generated code response.
Identify SPECIFIC issues:
1. Missing error handling
2. Security vulnerabilities (SQL injection, XSS, auth bypass, exposed secrets)
3. Logic errors or edge cases not handled
4. Missing TypeScript types or using 'any'
5. Incomplete code (TODOs, pseudocode, missing imports)
6. Performance issues

Be concise — list only real issues. If the code is solid, say "APPROVED".`,
};

const DEFAULT_CRITIC_PROMPT = `You are a quality reviewer checking an AI response.
Identify SPECIFIC issues:
1. Factual errors or unsupported claims
2. Missing important information
3. Vague or generic advice
4. Logical inconsistencies

Be concise — list only real issues. If the response is solid, say "APPROVED".`;

// ─── Main verification function ───────────────────────────────────────────────

export interface VerificationResult {
    improved: boolean;
    finalResponse: string;
    issues: string[];
    skipped: boolean;
    reason?: string;
}

/**
 * Run the verification pipeline on a draft response.
 * Returns the improved response (or original if no issues found).
 *
 * Non-blocking on failure — always returns something usable.
 */
export async function verifyAndImprove(
    userMessage: string,
    draftResponse: string,
    intent: IntentType,
    agentId: string,
    userId?: string
): Promise<VerificationResult> {
    // ── Skip conditions ──────────────────────────────────────────────────────
    if (!VERIFICATION_REQUIRED.has(intent)) {
        return { improved: false, finalResponse: draftResponse, issues: [], skipped: true, reason: "Intent does not require verification" };
    }

    if (draftResponse.length < MIN_LENGTH_FOR_VERIFICATION) {
        return { improved: false, finalResponse: draftResponse, issues: [], skipped: true, reason: "Response too short to verify" };
    }

    if (userMessage.includes("[IMAGE_BASE64:") || userMessage.includes("[ATTACHED DOCUMENT:")) {
        return { improved: false, finalResponse: draftResponse, issues: [], skipped: true, reason: "Image/document responses skipped" };
    }

    try {
        // ── Step 1: Critic ────────────────────────────────────────────────────
        const criticPrompt = CRITIC_PROMPTS[intent] || DEFAULT_CRITIC_PROMPT;

        const criticCompletion = await groqChatWithFallback(
            {
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: criticPrompt,
                    },
                    {
                        role: "user",
                        content: `User asked: "${userMessage.substring(0, 400)}"\n\nAI response to review:\n${draftResponse.substring(0, 1500)}`,
                    },
                ],
                temperature: 0.2,
                max_tokens: 300,
            },
            userId
        );

        const criticFeedback = criticCompletion.choices[0]?.message?.content?.trim() || "";

        // If critic approves, return original
        if (
            criticFeedback.toUpperCase().includes("APPROVED") ||
            criticFeedback.length < 30
        ) {
            console.log(`[Verification] ✅ Critic approved response for intent: ${intent}`);
            return { improved: false, finalResponse: draftResponse, issues: [], skipped: false };
        }

        console.log(`[Verification] 🔧 Critic found issues for intent "${intent}": ${criticFeedback.substring(0, 100)}`);

        // ── Step 2: Improve ───────────────────────────────────────────────────
        const improveCompletion = await groqChatWithFallback(
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: `You are improving an AI response based on specific feedback. 
Fix ONLY the identified issues — keep everything that was good.
Do NOT add unnecessary padding or change the structure unless needed.
Return the complete improved response directly — no meta-commentary.`,
                    },
                    {
                        role: "user",
                        content: `Original question: "${userMessage.substring(0, 400)}"

Original response:
${draftResponse.substring(0, 2000)}

Issues to fix:
${criticFeedback}

Return the improved response:`,
                    },
                ],
                temperature: 0.3,
                max_tokens: 2000,
            },
            userId
        );

        const improvedResponse = improveCompletion.choices[0]?.message?.content?.trim() || "";

        if (!improvedResponse || improvedResponse.length < draftResponse.length * 0.5) {
            // Improvement failed or truncated — return original
            console.warn("[Verification] ⚠️ Improvement was too short, keeping original");
            return { improved: false, finalResponse: draftResponse, issues: [criticFeedback], skipped: false };
        }

        console.log(`[Verification] ✅ Response improved for intent: ${intent} (${draftResponse.length} → ${improvedResponse.length} chars)`);

        return {
            improved: true,
            finalResponse: improvedResponse,
            issues: [criticFeedback],
            skipped: false,
        };
    } catch (err) {
        console.warn("[Verification] Failed — returning original draft:", err);
        return { improved: false, finalResponse: draftResponse, issues: [], skipped: true, reason: "Verification error" };
    }
}

/**
 * Quick check: should this message go through verification?
 * Used to decide before generating the response.
 */
export function shouldVerify(intent: IntentType, messageLength: number): boolean {
    return VERIFICATION_REQUIRED.has(intent) && messageLength > 60;
}
