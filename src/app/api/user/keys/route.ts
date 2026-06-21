import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: keys, error } = await supabase
      .from("provider_keys")
      .select("provider, api_key")
      .eq("user_id", dbUser.id)
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to a simpler object
    const keyMap = keys?.reduce((acc: any, key) => {
      acc[key.provider] = key.api_key;
      return acc;
    }, {}) || {};

    return NextResponse.json({ keys: keyMap });
  } catch (error) {
    console.error("[GET /api/user/keys] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { keys } = await req.json();

    if (!keys || typeof keys !== "object") {
      return NextResponse.json({ error: "Invalid keys payload" }, { status: 400 });
    }

    // Process each key
    for (const [provider, apiKey] of Object.entries(keys)) {
      if (!apiKey) {
        // Deactivate empty keys
        await supabase
          .from("provider_keys")
          .update({ is_active: false })
          .eq("user_id", dbUser.id)
          .eq("provider", provider);
        continue;
      }

      // Upsert the key (deactivate old ones, insert new)
      await supabase
        .from("provider_keys")
        .update({ is_active: false })
        .eq("user_id", dbUser.id)
        .eq("provider", provider);

      await supabase
        .from("provider_keys")
        .insert({
          user_id: dbUser.id,
          provider,
          api_key: apiKey,
          is_active: true
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/user/keys] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
