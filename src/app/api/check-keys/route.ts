import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/check-keys
 * Checks the live status of all configured API keys (Groq + OpenRouter).
 * Returns a status object the dashboard uses to show/hide the notification banner.
 *
 * Lightweight check — uses a minimal test request, not a full chat completion.
 */
export async function GET() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = {
            groq: { ok: false, checked: false },
            openrouter: { ok: false, checked: false, activeKeys: 0, exhaustedKeys: 0 },
            needsAttention: false,
            reason: "" as string,
        };

        // ── 1. Check Groq ──────────────────────────────────────────────────────────
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey && !groqKey.includes("placeholder")) {
            result.groq.checked = true;
            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
                    headers: { Authorization: `Bearer ${groqKey}` },
                });
                result.groq.ok = groqRes.ok;
                if (!groqRes.ok) {
                    result.needsAttention = true;
                    result.reason = groqRes.status === 401
                        ? "Groq API key is invalid or expired."
                        : `Groq returned status ${groqRes.status}.`;
                }
            } catch {
                result.groq.ok = false;
            }
        }

        // ── 2. Check OpenRouter DB keys ────────────────────────────────────────────
        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (dbUser) {
            const { data: keys } = await supabase
                .from("openrouter_keys")
                .select("api_key, is_active")
                .eq("user_id", dbUser.id)
                .eq("is_active", true);

            const activeKeys = (keys || []).map((k) => k.api_key);
            result.openrouter.activeKeys = activeKeys.length;

            if (activeKeys.length > 0) {
                result.openrouter.checked = true;
                let anyOk = false;
                let exhausted = 0;

                // Check each key with a lightweight /models ping (no tokens consumed)
                await Promise.all(
                    activeKeys.map(async (key) => {
                        try {
                            const res = await fetch("https://openrouter.ai/api/v1/models", {
                                headers: { Authorization: `Bearer ${key}` },
                            });
                            if (res.ok) {
                                anyOk = true;
                            } else if (res.status === 401 || res.status === 402 || res.status === 429) {
                                exhausted++;
                            }
                        } catch {
                            exhausted++;
                        }
                    })
                );

                result.openrouter.ok = anyOk;
                result.openrouter.exhaustedKeys = exhausted;

                if (!anyOk && exhausted > 0) {
                    result.needsAttention = true;
                    result.reason = `All ${exhausted} OpenRouter key${exhausted > 1 ? "s" : ""} are exhausted or invalid. Add a new key to continue.`;
                } else if (exhausted > 0 && anyOk) {
                    // Some keys exhausted but at least one works — soft warning
                    result.reason = `${exhausted} of ${activeKeys.length} OpenRouter key${exhausted > 1 ? "s" : ""} exhausted. Consider adding a fresh key.`;
                }
            }
        }

        // ── 3. Check env-var OpenRouter key (fallback) ─────────────────────────────
        if (!result.openrouter.checked) {
            const envKey = process.env.OPENROUTER_API_KEY;
            if (envKey && !envKey.includes("placeholder")) {
                result.openrouter.checked = true;
                try {
                    const res = await fetch("https://openrouter.ai/api/v1/models", {
                        headers: { Authorization: `Bearer ${envKey}` },
                    });
                    result.openrouter.ok = res.ok;
                    if (!res.ok) {
                        result.needsAttention = true;
                        result.reason = "OpenRouter API key is invalid or exhausted. Update it in your environment variables.";
                    }
                } catch {
                    result.openrouter.ok = false;
                }
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("GET /api/check-keys error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
