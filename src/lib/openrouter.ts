/**
 * OpenRouter API Key Rotation Utility
 * 
 * Fetches API keys from database (user-specific) and rotates through them
 * when one hits 429 (rate limit) or 402 (no credits).
 * 
 * Falls back to env vars if no DB keys found.
 */

import { supabase } from "@/lib/supabase";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const HTTP_REFERER = "https://kachamorich.vercel.app";

/** Fetch active API keys from database for a specific user */
async function getDbKeys(userId: string): Promise<string[]> {
    try {
        const { data: keys, error } = await supabase
            .from("openrouter_keys")
            .select("api_key")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("[OpenRouter] DB fetch error:", error);
            return [];
        }

        return (keys || []).map((k) => k.api_key).filter(Boolean);
    } catch (err) {
        console.error("[OpenRouter] DB fetch exception:", err);
        return [];
    }
}

/** Collect all configured API keys from env vars (fallback) */
function getEnvKeys(): string[] {
    const keys: string[] = [];

    // Support up to 10 numbered keys
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`OPENROUTER_API_KEY_${i}`];
        if (key && key.trim() && !key.includes("placeholder")) {
            keys.push(key.trim());
        }
    }

    // Also include the legacy single key
    const legacyKey = process.env.OPENROUTER_API_KEY;
    if (legacyKey && legacyKey.trim() && !legacyKey.includes("placeholder")) {
        if (!keys.includes(legacyKey.trim())) {
            keys.push(legacyKey.trim());
        }
    }

    return keys;
}

/** Get all available keys (DB first, then env fallback) */
async function getApiKeys(userId?: string): Promise<string[]> {
    // Try DB first if userId provided
    if (userId) {
        const dbKeys = await getDbKeys(userId);
        if (dbKeys.length > 0) {
            return dbKeys;
        }
    }

    // Fallback to env vars
    return getEnvKeys();
}

/** Errors that mean "this key is exhausted, try the next one" */
function isKeyExhausted(status: number): boolean {
    return status === 429 || status === 402;
}

/**
 * Make a streaming request trying multiple models AND multiple keys.
 * For each model, tries all keys. If all keys fail for a model (rate limit),
 * moves to the next model.
 */
export async function openrouterFetchWithFallback(
    models: string[],
    body: Record<string, any>,
    userId?: string
): Promise<{ response: Response; usedKey: string; usedModel: string }> {
    const keys = await getApiKeys(userId);

    if (keys.length === 0) {
        throw new Error(
            "No OpenRouter API keys configured. Add keys via Settings or set OPENROUTER_API_KEY_1 in .env.local"
        );
    }

    let lastError: string = "";

    for (const model of models) {
        for (const key of keys) {
            try {
                const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${key}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": HTTP_REFERER,
                    },
                    body: JSON.stringify({ ...body, model }),
                });

                if (res.ok) {
                    const keyLabel = `...${key.slice(-6)}`;
                    console.log(`[OpenRouter] ✅ Key ${keyLabel} → model "${model}" OK`);
                    return { response: res, usedKey: key, usedModel: model };
                }

                const errText = await res.text();
                const keyLabel = `...${key.slice(-6)}`;
                console.warn(
                    `[OpenRouter] ❌ Key ${keyLabel} → model "${model}" (${res.status}): ${errText.slice(0, 150)}`
                );

                if (isKeyExhausted(res.status)) {
                    lastError = `Key ${keyLabel} exhausted (${res.status}) for model "${model}"`;
                    continue; // try next key for same model
                }

                // Model-level error (404, etc.) — skip remaining keys for this model
                lastError = `Model "${model}" failed (${res.status})`;
                break;
            } catch (err: any) {
                const keyLabel = `...${key.slice(-6)}`;
                console.warn(`[OpenRouter] ❌ Key ${keyLabel} network error:`, err.message);
                lastError = err.message;
                continue;
            }
        }
    }

    throw new Error(
        `All models and API keys exhausted. Last error: ${lastError}`
    );
}

/** Get count of configured keys (useful for logging/admin) */
export async function getKeyCount(userId?: string): Promise<number> {
    const keys = await getApiKeys(userId);
    return keys.length;
}

/** Get masked key list for display (last 6 chars only) */
export async function getMaskedKeys(userId?: string): Promise<string[]> {
    const keys = await getApiKeys(userId);
    return keys.map((k) => `sk-or-...${k.slice(-6)}`);
}
