import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getDbUser(clerkId: string) {
    const { data, error } = await supabase
        .from("users").select("id").eq("clerk_id", clerkId).single();
    return error ? null : data;
}

export async function GET() {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getDbUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: keys, error } = await supabase
        .from("groq_keys")
        .select("*")
        .eq("user_id", dbUser.id)
        .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: "Failed to fetch keys" }, { status: 500 });

    const masked = (keys || []).map((k) => ({
        id: k.id,
        label: k.label,
        key_masked: `gsk_...${k.api_key.slice(-6)}`,
        is_active: k.is_active,
        created_at: k.created_at,
    }));

    return NextResponse.json({ keys: masked });
}

export async function POST(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getDbUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { api_key, label } = await req.json();

    if (!api_key || !api_key.startsWith("gsk_")) {
        return NextResponse.json(
            { error: "Invalid Groq API key format. Must start with 'gsk_'" },
            { status: 400 }
        );
    }

    const { data: existing } = await supabase
        .from("groq_keys").select("id")
        .eq("user_id", dbUser.id).eq("api_key", api_key).single();

    if (existing) return NextResponse.json({ error: "This key is already added" }, { status: 400 });

    const { data: newKey, error } = await supabase
        .from("groq_keys")
        .insert({ user_id: dbUser.id, api_key: api_key.trim(), label: label || `Groq Key ${Date.now()}`, is_active: true })
        .select("*").single();

    if (error) return NextResponse.json({ error: "Failed to save key" }, { status: 500 });

    return NextResponse.json({
        key: {
            id: newKey.id, label: newKey.label,
            key_masked: `gsk_...${newKey.api_key.slice(-6)}`,
            is_active: newKey.is_active, created_at: newKey.created_at,
        },
    });
}

export async function DELETE(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getDbUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

    const { error } = await supabase.from("groq_keys")
        .delete().eq("id", id).eq("user_id", dbUser.id);

    if (error) return NextResponse.json({ error: "Failed to delete key" }, { status: 500 });
    return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
    const { userId: clerkId } = await auth();
    if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await getDbUser(clerkId);
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { id, is_active } = await req.json();
    if (!id || typeof is_active !== "boolean")
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { error } = await supabase.from("groq_keys")
        .update({ is_active }).eq("id", id).eq("user_id", dbUser.id);

    if (error) return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
    return NextResponse.json({ success: true });
}
