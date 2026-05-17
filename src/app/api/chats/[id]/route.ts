import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatUUID = params.id;

    // 1. Fetch user ID from Clerk ID
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 2. Verify chat belongs to user
    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatUUID)
      .eq("user_id", dbUser.id)
      .single();

    if (chatError || !chat) {
      return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });
    }

    // 3. Fetch all messages for this chat in chronological order
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatUUID)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Fetch messages error:", messagesError);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error in GET /api/chats/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chatUUID = params.id;

    // 1. Fetch user ID from Clerk ID
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 2. Delete the chat (Supabase cascade deletes messages)
    const { error: deleteError } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatUUID)
      .eq("user_id", dbUser.id);

    if (deleteError) {
      console.error("Delete chat error:", deleteError);
      return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/chats/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
