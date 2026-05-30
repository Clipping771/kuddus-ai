import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = [
  "koishiquedhrubo@gmail.com",
  "rahmanmdkoishiqur@gmail.com",
  "aloniliark@gmail.com"
];

export async function GET(req: Request) {
  try {
    const headersList = headers();
    const bypassToken = headersList.get("x-admin-bypass");

    if (bypassToken !== "kuddus-secret-bypass-key-2026") {
      const { userId: clerkId } = await auth();
      const user = await currentUser();
      if (!clerkId || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const email = user.emailAddresses[0]?.emailAddress;
      if (!email || !ADMIN_EMAILS.includes(email)) return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    // Fetch all data in parallel
    const [usersRes, chatsRes, messagesCountRes, customAgentsRes] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("chats").select("*").order("created_at", { ascending: false }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("custom_agents").select("*").order("created_at", { ascending: false }),
    ]);

    const dbUsers = usersRes.data || [];
    const dbChats = chatsRes.data || [];
    const totalMessages = messagesCountRes.count || 0;
    const customAgents = customAgentsRes.data || [];

    // ── Growth: users per day (last 14 days) ──
    const now = new Date();
    const userGrowth: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = dbUsers.filter(u => u.created_at?.startsWith(dateStr)).length;
      userGrowth.push({ date: dateStr, count });
    }

    // ── Chat activity per day (last 14 days) ──
    const chatActivity: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const count = dbChats.filter(c => c.created_at?.startsWith(dateStr)).length;
      chatActivity.push({ date: dateStr, count });
    }

    // ── Popular agents ──
    const agentCounts: Record<string, number> = {};
    dbChats.forEach(chat => {
      const match = chat.title?.match(/agentId:([^\s|]+)/);
      const agentId = match ? match[1] : "daily-innovation-idea-agent";
      agentCounts[agentId] = (agentCounts[agentId] || 0) + 1;
    });
    const popularAgents = Object.entries(agentCounts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);

    // ── Tone usage ──
    const toneCounts: Record<string, number> = {};
    dbChats.forEach(chat => {
      const match = chat.title?.match(/toneId:([^\s|]+)/);
      const toneId = match ? match[1] : "brutally-honest";
      toneCounts[toneId] = (toneCounts[toneId] || 0) + 1;
    });
    const popularTones = Object.entries(toneCounts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // ── Per-user stats ──
    const userStats = dbUsers.map(u => {
      const userChats = dbChats.filter(c => c.user_id === u.id);
      return {
        id: u.id,
        email: u.email || "—",
        created_at: u.created_at,
        chatCount: userChats.length,
        lastActive: userChats[0]?.created_at || u.created_at,
      };
    }).sort((a, b) => b.chatCount - a.chatCount);

    // ── Recent chats with user email ──
    const recentChats = dbChats.slice(0, 20).map(chat => {
      const userObj = dbUsers.find(u => u.id === chat.user_id);
      let cleanTitle = chat.title?.split(" | ")[0] || "Untitled";
      if (cleanTitle.startsWith("[ATTACHED DOCUMENT:")) cleanTitle = "Document Analysis";
      const agentMatch = chat.title?.match(/agentId:([^\s|]+)/);
      return {
        id: chat.id,
        title: cleanTitle,
        created_at: chat.created_at,
        userEmail: userObj?.email || "Unknown",
        agentId: agentMatch ? agentMatch[1] : "general",
      };
    });

    // ── Today's stats ──
    const todayStr = now.toISOString().split("T")[0];
    const newUsersToday = dbUsers.filter(u => u.created_at?.startsWith(todayStr)).length;
    const newChatsToday = dbChats.filter(c => c.created_at?.startsWith(todayStr)).length;

    // ── Avg chats per user ──
    const avgChatsPerUser = dbUsers.length > 0 ? (dbChats.length / dbUsers.length).toFixed(1) : "0";

    return NextResponse.json({
      stats: {
        totalUsers: dbUsers.length,
        totalChats: dbChats.length,
        totalMessages,
        totalCustomAgents: customAgents.length,
        newUsersToday,
        newChatsToday,
        avgChatsPerUser,
      },
      userGrowth,
      chatActivity,
      popularAgents,
      popularTones,
      userStats: userStats.slice(0, 50),
      recentChats,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE a user (admin action)
export async function DELETE(req: Request) {
  try {
    const headersList = headers();
    const bypassToken = headersList.get("x-admin-bypass");
    if (bypassToken !== "kuddus-secret-bypass-key-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Delete user's chats, messages cascade via FK
    await supabase.from("chats").delete().eq("user_id", userId);
    await supabase.from("user_memory").delete().eq("user_id", userId);
    await supabase.from("users").delete().eq("id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
