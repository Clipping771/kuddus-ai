import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAILS = [
  "koishiquedhrubo@gmail.com",
  "rahmanmdkoishiqur@gmail.com",
  "aloniliark@gmail.com"
];

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    const user = await currentUser();

    if (!clerkId || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.emailAddresses[0]?.emailAddress;

    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Access Denied: Admin role required" }, { status: 403 });
    }

    // 1. Get total user count & list of latest users
    const { data: dbUsers, error: usersError } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (usersError) {
      console.error("Admin fetch users error:", usersError);
      return NextResponse.json({ error: "Failed to fetch users stats" }, { status: 500 });
    }

    // 2. Get total chats count & latest chats
    const { data: dbChats, error: chatsError } = await supabase
      .from("chats")
      .select("*")
      .order("created_at", { ascending: false });

    if (chatsError) {
      console.error("Admin fetch chats error:", chatsError);
      return NextResponse.json({ error: "Failed to fetch chats stats" }, { status: 500 });
    }

    // 3. Get total messages count
    const { count: totalMessages, error: messagesError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true });

    if (messagesError) {
      console.error("Admin fetch messages error:", messagesError);
      return NextResponse.json({ error: "Failed to fetch messages stats" }, { status: 500 });
    }

    // 4. Calculate popular agents
    const agentCounts: { [key: string]: number } = {};
    dbChats.forEach((chat) => {
      // Parse serialized agentId from title (format: "Title | agentId:X | toneId:Y")
      const match = chat.title.match(/agentId:([^\s|]+)/);
      const agentId = match ? match[1] : "daily-innovation-idea-agent";
      agentCounts[agentId] = (agentCounts[agentId] || 0) + 1;
    });

    const popularAgents = Object.entries(agentCounts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      stats: {
        totalUsers: dbUsers.length,
        totalChats: dbChats.length,
        totalMessages: totalMessages || 0,
      },
      latestUsers: dbUsers.slice(0, 10),
      latestChats: dbChats.slice(0, 10).map((chat) => {
        // Find corresponding user email
        const userObj = dbUsers.find((u) => u.id === chat.user_id);
        
        // Strip metadata for clean rendering
        let cleanTitle = chat.title.split(" | ")[0];
        if (cleanTitle.startsWith("[ATTACHED DOCUMENT:")) {
          cleanTitle = "Document Analysis";
        }

        return {
          id: chat.id,
          title: cleanTitle,
          created_at: chat.created_at,
          userEmail: userObj ? userObj.email : "Unknown User",
        };
      }),
      popularAgents,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
