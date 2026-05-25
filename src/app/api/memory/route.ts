/**
 * User Long-Term Memory API
 *
 * GET  /api/memory — fetch user's memory entries (for system prompt injection)
 * POST /api/memory — save/update a memory entry
 * DELETE /api/memory — clear all memory for user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET — fetch all memory entries for the current user
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
            return NextResponse.json({ memories: [] });
        }

        const { data: memories, error } = await supabase
            .from("user_memory")
            .select("*")
            .eq("user_id", dbUser.id)
            .order("updated_at", { ascending: false })
            .limit(50);

        if (error) {
            console.error("[Memory] Fetch error:", error);
            return NextResponse.json({ memories: [] });
        }

        return NextResponse.json({ memories: memories || [] });
    } catch (err) {
        console.error("[Memory] GET error:", err);
        return NextResponse.json({ memories: [] });
    }
}

// POST — upsert a memory entry (key + value)
export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { key, value, category } = await req.json();

        if (!key || !value) {
            return NextResponse.json({ error: "key and value are required" }, { status: 400 });
        }

        const { data: dbUser, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        if (userError || !dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Upsert — update if key exists, insert if not
        const { data, error } = await supabase
            .from("user_memory")
            .upsert(
                {
                    user_id: dbUser.id,
                    key,
                    value,
                    category: category || "general",
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id,key" }
            )
            .select()
            .single();

        if (error) {
            console.error("[Memory] Upsert error:", error);
            return NextResponse.json({ error: "Failed to save memory" }, { status: 500 });
        }

        return NextResponse.json({ memory: data });
    } catch (err) {
        console.error("[Memory] POST error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE — clear all memory for user
export async function DELETE() {
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

        const { error } = await supabase
            .from("user_memory")
            .delete()
            .eq("user_id", dbUser.id);

        if (error) {
            console.error("[Memory] Delete error:", error);
            return NextResponse.json({ error: "Failed to clear memory" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Memory] DELETE error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
