/**
 * RAG Documents API
 * DELETE /api/rag/documents — delete ALL documents + chunks for the current user
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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

        // Delete all documents — chunks cascade delete via FK
        const { error } = await supabase
            .from("rag_documents")
            .delete()
            .eq("user_id", dbUser.id);

        if (error) {
            console.error("[RAG] Delete all documents error:", error);
            return NextResponse.json({ error: "Failed to delete documents" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[RAG] DELETE error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
