import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { encryptText, decryptText } from "@/lib/encryption";

export const dynamic = "force-dynamic";

/**
 * GET /api/keys
 * Fetches all active keys for the user and decrypts them.
 * WARNING: Keys are sent back to the client only for UI state display/editing.
 * In a highly secure system, we wouldn't return full keys to the client.
 */
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("provider_keys")
      .select("provider, api_key")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      console.error("[GET /api/keys] DB error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    // Convert from [{provider: "openai", api_key: "..."}] to { openai: "...", gemini: "..." }
    const keys: Record<string, string> = {};
    if (data) {
      for (const row of data) {
        keys[row.provider] = decryptText(row.api_key);
      }
    }

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("[GET /api/keys] Server error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/keys
 * Encrypts and saves API keys for the user.
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { keys } = await req.json();
    if (!keys || typeof keys !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Start by marking all existing keys as inactive so we can safely upsert
    // (In case the user deleted a key from the UI)
    await supabase
      .from("provider_keys")
      .update({ is_active: false })
      .eq("user_id", userId);

    const validProviders = ['openai', 'anthropic', 'gemini', 'openrouter', 'groq'];
    const insertData = [];

    for (const [provider, plaintextKey] of Object.entries(keys)) {
      if (!plaintextKey || typeof plaintextKey !== "string" || plaintextKey.trim() === "") continue;
      if (!validProviders.includes(provider)) continue;

      const encryptedKey = encryptText(plaintextKey.trim());
      
      insertData.push({
        user_id: userId,
        provider: provider,
        api_key: encryptedKey,
        is_active: true
      });
    }

    if (insertData.length > 0) {
      // Upsert: If user_id + provider exists, update it instead of insert.
      // But we have a unique constraint on (user_id, provider, api_key).
      // So we just insert, and if there's a conflict on unique keys, it means they 
      // are entering the EXACT same key again.
      for (const row of insertData) {
        const { error } = await supabase
          .from("provider_keys")
          .upsert(row, { onConflict: "user_id, provider, api_key" });
          
        if (error) {
          console.error(`[POST /api/keys] Failed to insert for ${row.provider}:`, error);
        } else {
          // Make sure it's active in case it was UPSERTed
          await supabase
            .from("provider_keys")
            .update({ is_active: true })
            .eq("user_id", userId)
            .eq("provider", row.provider)
            .eq("api_key", row.api_key);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Keys encrypted and saved securely." });
  } catch (error) {
    console.error("[POST /api/keys] Server error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
