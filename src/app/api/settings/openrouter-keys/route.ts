import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET: Fetch all OpenRouter API keys for the current user
export async function GET() {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { data: keys, error: keysError } = await supabase
            .from("openrouter_keys")
            .select("*")
            .eq("user_id", dbUser.id)
            .order("created_at", { ascending: true });

        if (keysError) {
            console.error("Error fetching OpenRouter keys:", keysError);
            return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });
        }

        // Mask keys for security (show only last 6 chars)
        const maskedKeys = (keys || []).map((k) => ({
            id: k.id,
            label: k.label,
            key_masked: `sk-or-...${k.api_key.slice(-6)}`,
            is_active: k.is_active,
            created_at: k.created_at,
        }));

        return NextResponse.json({ keys: maskedKeys });
    } catch (error) {
        console.error("GET /api/settings/openrouter-keys error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Add a new OpenRouter API key
export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { api_key, label } = await req.json();

        if (!api_key || !api_key.startsWith("sk-or-")) {
            return NextResponse.json(
                { error: "Invalid OpenRouter API key format. Must start with 'sk-or-'" },
                { status: 400 }
            );
        }

        // Check if key already exists for this user
        const { data: existing } = await supabase
            .from("openrouter_keys")
            .select("id")
            .eq("user_id", dbUser.id)
            .eq("api_key", api_key)
            .single();

        if (existing) {
            return NextResponse.json({ error: "This API key is already added" }, { status: 400 });
        }

        const { data: newKey, error: insertError } = await supabase
            .from("openrouter_keys")
            .insert({
                user_id: dbUser.id,
                api_key: api_key.trim(),
                label: label || `Key ${Date.now()}`,
                is_active: true,
            })
            .select("*")
            .single();

        if (insertError) {
            console.error("Error inserting OpenRouter key:", insertError);
            return NextResponse.json({ error: "Failed to save key" }, { status: 500 });
        }

        return NextResponse.json({
            key: {
                id: newKey.id,
                label: newKey.label,
                key_masked: `sk-or-...${newKey.api_key.slice(-6)}`,
                is_active: newKey.is_active,
                created_at: newKey.created_at,
            },
        });
    } catch (error) {
        console.error("POST /api/settings/openrouter-keys error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Remove an OpenRouter API key
export async function DELETE(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Key ID is required" }, { status: 400 });
        }

        const { error: deleteError } = await supabase
            .from("openrouter_keys")
            .delete()
            .eq("id", id)
            .eq("user_id", dbUser.id);

        if (deleteError) {
            console.error("Error deleting OpenRouter key:", deleteError);
            return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/settings/openrouter-keys error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PATCH: Toggle key active status
export async function PATCH(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { id, is_active } = await req.json();

        if (!id || typeof is_active !== "boolean") {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        const { error: updateError } = await supabase
            .from("openrouter_keys")
            .update({ is_active })
            .eq("id", id)
            .eq("user_id", dbUser.id);

        if (updateError) {
            console.error("Error updating OpenRouter key:", updateError);
            return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/settings/openrouter-keys error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
