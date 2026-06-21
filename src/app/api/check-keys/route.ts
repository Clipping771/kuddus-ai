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
            directKeys: { ok: false, checked: false },
            needsAttention: false,
            reason: "" as string,
        };

        // ── 1. Check Groq — DB keys first, env var as fallback ────────────────────
        const { data: dbUserForGroq } = await supabase
            .from("users").select("id").eq("clerk_id", clerkId).single();

        if (dbUserForGroq) {
            const { data: groqDbKeys } = await supabase
                .from("groq_keys").select("api_key")
                .eq("user_id", dbUserForGroq.id).eq("is_active", true);

            const activeGroqKeys = (groqDbKeys || []).map(k => k.api_key);
            if (activeGroqKeys.length > 0) {
                result.groq.checked = true;
                let anyGroqOk = false;
                await Promise.all(activeGroqKeys.map(async (key) => {
                    try {
                        const r = await fetch("https://api.groq.com/openai/v1/models", {
                            headers: { Authorization: `Bearer ${key}` },
                        });
                        if (r.ok) anyGroqOk = true;
                    } catch { }
                }));
                result.groq.ok = anyGroqOk;
                if (!anyGroqOk) {
                    // Don't set needsAttention here — wait for final cross-provider evaluation
                    result.reason = "All Groq API keys are invalid or expired.";
                }
            }
        }

        // Only check env var if no DB keys were found
        if (!result.groq.checked) {
            const groqKey = process.env.GROQ_API_KEY;
            if (groqKey && !groqKey.includes("placeholder")) {
                result.groq.checked = true;
                try {
                    const groqRes = await fetch("https://api.groq.com/openai/v1/models", {
                        headers: { Authorization: `Bearer ${groqKey}` },
                    });
                    result.groq.ok = groqRes.ok;
                    if (!groqRes.ok) {
                        // Don't set needsAttention here — wait for final cross-provider evaluation
                        result.reason = groqRes.status === 401
                            ? "Groq API key is invalid or expired."
                            : `Groq returned status ${groqRes.status}.`;
                    }
                } catch {
                    result.groq.ok = false;
                }
            }
        }

        // ── 1.5. Check Direct Provider DB keys ─────────────────────────────────────
        if (dbUserForGroq) {
            const { data: directDbKeys } = await supabase
                .from("provider_keys")
                .select("provider")
                .eq("user_id", dbUserForGroq.id)
                .in("provider", ["openai", "anthropic", "gemini"])
                .eq("is_active", true);

            if (directDbKeys && directDbKeys.length > 0) {
                result.directKeys.checked = true;
                result.directKeys.ok = true; // Assume true if configured
            }
        }

        // ── 2. Check OpenRouter DB keys ────────────────────────────────────────────
        // Reuse the same dbUser fetched above
        const dbUser = dbUserForGroq;

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
                    // Don't set needsAttention here — wait for final cross-provider evaluation
                    result.reason = `All ${exhausted} OpenRouter key${exhausted > 1 ? "s" : ""} are exhausted or invalid.`;
                } else if (exhausted > 0 && anyOk) {
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
                        // Don't set needsAttention here — wait for final cross-provider evaluation
                        result.reason = "OpenRouter API key is invalid or exhausted.";
                    }
                } catch {
                    result.openrouter.ok = false;
                }
            }
        }

        // ── Final evaluation ───────────────────────────────────────────────────────
        // Only show banner if ALL checked providers are failing.
        // If OpenRouter is OK, the app works fine even without Groq.
        const groqFailing = result.groq.checked && !result.groq.ok;
        const openrouterFailing = result.openrouter.checked && !result.openrouter.ok;
        const groqNotConfigured = !result.groq.checked;
        const openrouterNotConfigured = !result.openrouter.checked;

        // App is functional if at least one provider is OK OR direct keys are configured
        const appFunctional = result.groq.ok || result.openrouter.ok || result.directKeys.ok;

        if (!appFunctional) {
            result.needsAttention = true;
            if (groqFailing && openrouterFailing) {
                result.reason = "All API keys (Groq + OpenRouter) are exhausted or invalid. Add a new key to continue.";
            } else if (openrouterFailing && groqNotConfigured) {
                result.reason = "Your OpenRouter API keys are exhausted. Add a new key to continue.";
            } else if (groqFailing && openrouterNotConfigured) {
                result.reason = "Groq API key is invalid or expired. Add a new key or configure OpenRouter.";
            } else {
                result.reason = "No working API keys found. Add a key in Settings to continue.";
            }
        } else {
            // App is functional — clear any previously set needsAttention flags from individual checks
            result.needsAttention = false;
            // Soft warning: some keys exhausted but app still works
            if (result.openrouter.exhaustedKeys > 0 && result.openrouter.ok && !result.directKeys.ok) {
                result.reason = `${result.openrouter.exhaustedKeys} OpenRouter key${result.openrouter.exhaustedKeys > 1 ? "s" : ""} exhausted — consider adding a fresh key.`;
            } else {
                result.reason = "";
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("GET /api/check-keys error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}