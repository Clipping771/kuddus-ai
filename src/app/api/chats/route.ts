import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user ID from Clerk ID
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ chats: [] }); // User profile doesn't exist yet, return empty
    }

    // 2. Fetch all chats for this user sorted by created_at DESC
    const { data: chats, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", dbUser.id)
      .order("created_at", { ascending: false });

    if (chatsError) {
      console.error("Fetch chats error:", chatsError);
      return NextResponse.json({ error: "Failed to fetch chats" }, { status: 500 });
    }

    return NextResponse.json({ chats });
  } catch (error) {
    console.error("Error in GET /api/chats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user ID from Clerk ID
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    // 2. Create a new chat
    const { data: newChat, error: chatError } = await supabase
      .from("chats")
      .insert({
        user_id: dbUser.id,
        title: "New Business Idea",
      })
      .select("*")
      .single();

    if (chatError) {
      console.error("Supabase chat creation error:", chatError);
      return NextResponse.json({ error: "Failed to create new chat" }, { status: 500 });
    }

    return NextResponse.json({ chat: newChat });
  } catch (error) {
    console.error("Error in POST /api/chats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
