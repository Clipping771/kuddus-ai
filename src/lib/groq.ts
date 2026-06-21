/**
 * Groq API Key Rotation Utility
 *
 * Fetches Groq API keys from DB (user-specific) and rotates through them
 * when one hits 429 (rate limit) or 401 (invalid/expired).
 * Falls back to GROQ_API_KEY env var if no DB keys found.
 */

import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";
import { decryptText } from "@/lib/encryption";

/** Fetch active Groq keys from DB for a user */
async function getDbGroqKeys(userId: string): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from("provider_keys")
            .select("api_key")
            .eq("user_id", userId)
            .eq("provider", "groq")
            .eq("is_active", true)
            .order("created_at", { ascending: true });

        if (error) return [];
        return (data || []).map((k) => decryptText(k.api_key)).filter(Boolean);
    } catch {
        return [];
    }
}

/** Get all available Groq keys (DB first, then env fallback) */
export async function getGroqKeys(userId?: string): Promise<string[]> {
    if (userId) {
        const dbKeys = await getDbGroqKeys(userId);
        if (dbKeys.length > 0) return dbKeys;
    }

    // Fallback: env vars (support GROQ_API_KEY_1 ... GROQ_API_KEY_10 + legacy GROQ_API_KEY)
    const keys: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const k = process.env[`GROQ_API_KEY_${i}`];
        if (k && k.trim() && !k.includes("placeholder")) keys.push(k.trim());
    }
    const legacy = process.env.GROQ_API_KEY;
    if (legacy && !legacy.includes("placeholder") && !keys.includes(legacy)) {
        keys.push(legacy);
    }
    return keys;
}

/**
 * Create a Groq client that auto-rotates keys on 429/401.
 * Returns the first working client, or throws if all keys fail.
 */
export async function getGroqClient(userId?: string): Promise<Groq> {
    const keys = await getGroqKeys(userId);
    if (keys.length === 0) {
        throw new Error("No Groq API keys configured. Add a key in Settings or set GROQ_API_KEY in .env.local");
    }
    // Return client with first key — rotation handled in groqChatWithFallback
    return new Groq({ apiKey: keys[0] });
}

/**
 * Make a Groq chat completion with automatic key rotation on 429/401.
 * Tries each key in order until one succeeds.
 */
export async function groqChatWithFallback(
    params: Parameters<Groq["chat"]["completions"]["create"]>[0],
    userId?: string
): Promise<Groq.Chat.ChatCompletion> {
    const keys = await getGroqKeys(userId);

    if (keys.length === 0) {
        throw new Error("No Groq API keys configured.");
    }

    let lastError: unknown;
    for (const key of keys) {
        try {
            const client = new Groq({ apiKey: key });
            const result = await client.chat.completions.create(params) as Groq.Chat.ChatCompletion;
            console.log(`[Groq] ✅ Key ...${key.slice(-6)} succeeded`);
            return result;
        } catch (err: unknown) {
            const status = (err as Record<string, unknown>)?.status || (err as Record<string, unknown>)?.statusCode;
            console.warn(`[Groq] ❌ Key ...${key.slice(-6)} failed (${status}): ${(err as Error)?.message}`);
            lastError = err;
            // Only rotate on rate limit or auth errors
            if (status !== 429 && status !== 401 && status !== 403) throw err;
        }
    }
    throw lastError || new Error("All Groq API keys exhausted.");
}

/**
 * Make a Groq streaming chat completion with automatic key rotation.
 */
export async function groqStreamWithFallback(
    params: Parameters<Groq["chat"]["completions"]["create"]>[0],
    userId?: string
): Promise<ReturnType<Groq["chat"]["completions"]["create"]>> {
    const keys = await getGroqKeys(userId);

    if (keys.length === 0) {
        throw new Error("No Groq API keys configured.");
    }

    let lastError: unknown;
    for (const key of keys) {
        try {
            const client = new Groq({ apiKey: key });
            const result = await client.chat.completions.create({ ...params, stream: true });
            console.log(`[Groq Stream] ✅ Key ...${key.slice(-6)} succeeded`);
            return result;
        } catch (err: unknown) {
            const status = (err as Record<string, unknown>)?.status || (err as Record<string, unknown>)?.statusCode;
            console.warn(`[Groq Stream] ❌ Key ...${key.slice(-6)} failed (${status}): ${(err as Error)?.message}`);
            lastError = err;
            if (status !== 429 && status !== 401 && status !== 403) throw err;
        }
    }
    throw lastError || new Error("All Groq API keys exhausted.");
}
