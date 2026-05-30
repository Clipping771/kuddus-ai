"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users, MessageSquare, TrendingUp, ArrowLeft, RefreshCw, ShieldCheck,
  Clock, Mail, Zap, Lock, Eye, EyeOff, Trash2, Search, BarChart2,
  Activity, Bot, Palette, ChevronUp, ChevronDown, AlertTriangle, X,
  User as UserIcon, Download, Filter
} from "lucide-react";

interface Stats {
  totalUsers: number; totalChats: number; totalMessages: number;
  totalCustomAgents: number; newUsersToday: number; newChatsToday: number;
  avgChatsPerUser: string;
}
interface GrowthPoint { date: string; count: number; }
interface UserStat { id: string; email: string; created_at: string; chatCount: number; lastActive: string; }
interface ChatRow { id: string; title: string; created_at: string; userEmail: string; agentId: string; }
interface AgentStat { id: string; count: number; }
interface ToneStat { id: string; count: number; }

const SECRET_USERNAME = "kuddus_admin";
const SECRET_PASSWORD = "kacha_morich_secret_2026";
const BYPASS = "kuddus-secret-bypass-key-2026";

const AGENT_LABELS: Record<string, string> = {
  "daily-innovation-idea-agent": "💡 Innovation", "personal-cfo-finance-agent": "💰 CFO",
  "research-agent": "🔍 Research", "competitor-spy-agent": "🕵️ Competitor",
  "project-manager-agent": "📋 PM", "code-helper-developer-agent": "⚙️ CTO",
  "devmind-agent": "🧠 DevMind", "sales-lead-generator": "🎯 Sales",
  "content-creator-agent": "✍️ Content", "social-media-manager": "📱 Social",
  "legal-compliance-agent": "⚖️ Legal", "hr-recruiting-agent": "👥 HR",
  "investor-pitch-agent": "💼 Investor", "performance-marketer-agent": "📈 Marketing",
  "it-automation-consultant": "🤖 Automation", "pain-point-scraper-agent": "🌶️ Pain-Point",
  "general-purpose-agent": "✨ General",
};

const TONE_LABELS: Record<string, string> = {
  "brutally-honest": "🌶️ Brutally Honest", "friendly-casual": "😊 Friendly",
  "professional": "👔 Professional", "humorous": "😂 Humorous",
  "helpful-empathetic": "💖 Empathetic", "straightforward": "🎯 Straight",
  "enthusiastic": "🚀 Enthusiastic", "educational": "📚 Educational",
  "witty-clever": "🧠 Witty", "short-direct": "⚡ Short",
  "detailed": "📝 Detailed", "unfiltered-savage": "💀 Savage",
};

function MiniBar({ value, max, color = "emerald" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors: Record<string, string> = {
    emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500",
    violet: "bg-violet-500", blue: "bg-blue-500", orange: "bg-orange-500",
  };
  return (
    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colors[color] || "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SparkLine({ data, color = "#10b981" }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const w = 80; const h = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export default function AdminHub() {
  const [auth, setAuth] = useState(false);
  const [user, setUser] = useState(""); const [pass, setPass] = useState(""); const [showPw, setShowPw] = useState(false); const [loginErr, setLoginErr] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [userGrowth, setUserGrowth] = useState<GrowthPoint[]>([]);
  const [chatActivity, setChatActivity] = useState<GrowthPoint[]>([]);
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [recentChats, setRecentChats] = useState<ChatRow[]>([]);
  const [popularAgents, setPopularAgents] = useState<AgentStat[]>([]);
  const [popularTones, setPopularTones] = useState<ToneStat[]>([]);
  const [loading, setLoading] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"overview" | "users" | "chats" | "agents">("overview");
  const [userSearch, setUserSearch] = useState(""); const [chatSearch, setChatSearch] = useState("");
  const [userSort, setUserSort] = useState<"chats" | "date">("chats");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { if (sessionStorage.getItem("kuddus_admin_auth") === "true") setAuth(true); }, []);
  useEffect(() => { if (auth) fetchData(); }, [auth]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: { "x-admin-bypass": BYPASS } });
      if (!res.ok) throw new Error("Failed");
      const d = await res.json();
      setStats(d.stats); setUserGrowth(d.userGrowth || []); setChatActivity(d.chatActivity || []);
      setUserStats(d.userStats || []); setRecentChats(d.recentChats || []);
      setPopularAgents(d.popularAgents || []); setPopularTones(d.popularTones || []);
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); setLoginErr("");
    if (user === SECRET_USERNAME && pass === SECRET_PASSWORD) {
      sessionStorage.setItem("kuddus_admin_auth", "true"); setAuth(true);
    } else setLoginErr("Invalid credentials. Access denied.");
  };

  const handleLogout = () => { sessionStorage.removeItem("kuddus_admin_auth"); setAuth(false); };

  const handleDeleteUser = async (userId: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-admin-bypass": BYPASS },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        setUserStats(prev => prev.filter(u => u.id !== userId));
        setConfirmDelete(null);
        showToast("User deleted successfully", "success");
        fetchData(true);
      } else showToast("Delete failed", "error");
    } catch { showToast("Delete failed", "error"); }
    finally { setDeleteLoading(false); }
  };

  const exportCSV = () => {
    const rows = [["Email", "Chats", "Joined", "Last Active"]];
    userStats.forEach(u => rows.push([u.email, String(u.chatCount), u.created_at?.split("T")[0], u.lastActive?.split("T")[0]]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `users_${Date.now()}.csv`; a.click();
  };

  // ── LOGIN ──
  if (!auth) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#050505] border border-white/8 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <ShieldCheck size={26} className="text-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-base font-black tracking-widest uppercase text-white">Admin Access</h1>
          <p className="text-[10px] text-neutral-600 mt-1 uppercase tracking-wider">Kacha Morich Control Panel</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {loginErr && <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-xs text-center font-bold">{loginErr}</div>}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Username</label>
            <div className="relative">
              <UserIcon size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input type="text" required value={user} onChange={e => setUser(e.target.value)} placeholder="admin username"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/6 bg-black/40 text-xs text-white placeholder-neutral-700 outline-none focus:border-emerald-500/30 transition" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Password</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />
              <input type={showPw ? "text" : "password"} required value={pass} onChange={e => setPass(e.target.value)} placeholder="secret password"
                className="w-full h-11 pl-10 pr-10 rounded-xl border border-white/6 bg-black/40 text-xs text-white placeholder-neutral-700 outline-none focus:border-emerald-500/30 transition" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition flex items-center justify-center gap-2 mt-2">
            <ShieldCheck size={14} /> Authorize Access
          </button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-[10px] text-neutral-600 hover:text-white transition flex items-center justify-center gap-1.5">
            <ArrowLeft size={10} /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );

  // ── LOADING ──
  if (loading) return (
    <div className="min-h-screen bg-[#020202] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-neutral-600 uppercase tracking-widest">Loading analytics...</p>
      </div>
    </div>
  );

  const filteredUsers = userStats
    .filter(u => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    .sort((a, b) => userSort === "chats" ? b.chatCount - a.chatCount : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredChats = recentChats.filter(c =>
    !chatSearch || c.title.toLowerCase().includes(chatSearch.toLowerCase()) || c.userEmail.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const TABS = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "users", label: `Users (${stats?.totalUsers || 0})`, icon: Users },
    { id: "chats", label: `Chats (${stats?.totalChats || 0})`, icon: MessageSquare },
    { id: "agents", label: "Agents & Tones", icon: Bot },
  ] as const;

  return (
    <div className="min-h-screen bg-[#020202] text-neutral-200 flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold shadow-2xl transition-all ${toast.type === "success" ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-300" : "bg-red-950/80 border-red-500/30 text-red-300"}`}>
          {toast.type === "success" ? "✓" : "✗"} {toast.msg}
          <button onClick={() => setToast(null)}><X size={12} /></button>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0A0A0A] border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="font-black text-sm text-red-400">Delete User</span>
            </div>
            <p className="text-xs text-neutral-400 mb-5">This will permanently delete the user and all their chats, messages, and memory. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-white/10 text-xs font-bold text-neutral-400 hover:text-white transition">Cancel</button>
              <button onClick={() => handleDeleteUser(confirmDelete)} disabled={deleteLoading}
                className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                {deleteLoading ? <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Deleting...</> : <><Trash2 size={12} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 border-b border-white/5 bg-[#050505]/90 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/5 transition">
            <ArrowLeft size={15} />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-xs font-black tracking-widest uppercase text-white">Admin Panel</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchData(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 bg-white/[0.02] text-xs text-neutral-400 hover:text-white transition font-bold">
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 hover:bg-red-500/10 transition font-bold">
            Logout
          </button>
        </div>
      </header>

      {/* Tab nav */}
      <div className="border-b border-white/5 bg-[#030303] px-6">
        <div className="flex gap-1 max-w-7xl mx-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold border-b-2 transition-all ${tab === t.id ? "border-emerald-500 text-emerald-400" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}>
                <Icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* ══ OVERVIEW TAB ══ */}
        {tab === "overview" && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats?.totalUsers || 0, sub: `+${stats?.newUsersToday || 0} today`, icon: Users, color: "emerald", spark: userGrowth.map(d => d.count) },
                { label: "Total Chats", value: stats?.totalChats || 0, sub: `+${stats?.newChatsToday || 0} today`, icon: MessageSquare, color: "amber", spark: chatActivity.map(d => d.count) },
                { label: "Total Messages", value: stats?.totalMessages || 0, sub: "all time", icon: Zap, color: "rose", spark: [] },
                { label: "Custom Agents", value: stats?.totalCustomAgents || 0, sub: `${stats?.avgChatsPerUser || 0} avg chats/user`, icon: Bot, color: "violet", spark: [] },
              ].map(card => {
                const Icon = card.icon;
                const colors: Record<string, { border: string; icon: string; text: string; bg: string }> = {
                  emerald: { border: "border-emerald-500/15", icon: "text-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/8" },
                  amber: { border: "border-amber-500/15", icon: "text-amber-400", text: "text-amber-400", bg: "bg-amber-500/8" },
                  rose: { border: "border-rose-500/15", icon: "text-rose-400", text: "text-rose-400", bg: "bg-rose-500/8" },
                  violet: { border: "border-violet-500/15", icon: "text-violet-400", text: "text-violet-400", bg: "bg-violet-500/8" },
                };
                const c = colors[card.color];
                return (
                  <div key={card.label} className={`rounded-2xl border ${c.border} bg-[#070707] p-5 flex flex-col gap-3`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>{card.label}</span>
                      <div className={`p-2 rounded-xl ${c.bg}`}><Icon size={14} className={c.icon} /></div>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white">{card.value.toLocaleString()}</div>
                      <div className="text-[10px] text-neutral-600 mt-0.5">{card.sub}</div>
                    </div>
                    {card.spark.length > 0 && <SparkLine data={card.spark} color={card.color === "emerald" ? "#10b981" : card.color === "amber" ? "#f59e0b" : "#f43f5e"} />}
                  </div>
                );
              })}
            </div>

            {/* Growth charts (simple bar) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "User Signups — Last 14 Days", data: userGrowth, color: "emerald" },
                { title: "Chat Activity — Last 14 Days", data: chatActivity, color: "amber" },
              ].map(chart => {
                const maxVal = Math.max(...chart.data.map(d => d.count), 1);
                return (
                  <div key={chart.title} className="rounded-2xl border border-white/5 bg-[#050505] p-5">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400 mb-4">{chart.title}</h3>
                    <div className="flex items-end gap-1 h-20">
                      {chart.data.map((d, i) => {
                        const h = maxVal > 0 ? Math.max(2, (d.count / maxVal) * 80) : 2;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                            <div className={`w-full rounded-sm transition-all ${chart.color === "emerald" ? "bg-emerald-500/60 group-hover:bg-emerald-500" : "bg-amber-500/60 group-hover:bg-amber-500"}`} style={{ height: `${h}px` }} />
                            {d.count > 0 && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black border border-white/10 text-[9px] px-1.5 py-0.5 rounded font-bold text-white opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10">
                                {d.count} · {d.date.slice(5)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[9px] text-neutral-700">{chart.data[0]?.date?.slice(5)}</span>
                      <span className="text-[9px] text-neutral-700">{chart.data[chart.data.length - 1]?.date?.slice(5)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top users quick view */}
            <div className="rounded-2xl border border-white/5 bg-[#050505] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Top Power Users</h3>
                <button onClick={() => setTab("users")} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold">View all →</button>
              </div>
              <div className="space-y-2">
                {userStats.slice(0, 5).map((u, i) => (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.02] transition">
                    <span className="text-[10px] text-neutral-600 w-4 font-bold">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-neutral-300 truncate">{u.email}</div>
                      <MiniBar value={u.chatCount} max={userStats[0]?.chatCount || 1} color="emerald" />
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 flex-shrink-0">{u.chatCount} chats</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ USERS TAB ══ */}
        {tab === "users" && (
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input type="text" placeholder="Search by email..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl border border-white/8 bg-white/[0.02] text-xs text-white placeholder-neutral-600 outline-none focus:border-emerald-500/30 transition" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-600 font-bold uppercase">Sort:</span>
                <button onClick={() => setUserSort("chats")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${userSort === "chats" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/8 text-neutral-500 hover:text-white"}`}>
                  Most Chats
                </button>
                <button onClick={() => setUserSort("date")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${userSort === "date" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/8 text-neutral-500 hover:text-white"}`}>
                  Newest
                </button>
              </div>
              <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/8 text-[10px] font-bold text-neutral-400 hover:text-white hover:border-white/15 transition">
                <Download size={11} /> Export CSV
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Users", value: stats?.totalUsers || 0, color: "text-emerald-400" },
                { label: "New Today", value: stats?.newUsersToday || 0, color: "text-amber-400" },
                { label: "Avg Chats/User", value: stats?.avgChatsPerUser || "0", color: "text-violet-400" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/5 bg-[#070707] p-3 text-center">
                  <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[9px] text-neutral-600 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Users table */}
            <div className="rounded-2xl border border-white/5 bg-[#050505] overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_100px_100px_44px] gap-0 px-4 py-2.5 border-b border-white/5 bg-white/[0.01]">
                {["Email", "Chats", "Joined", "Last Active", ""].map(h => (
                  <span key={h} className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-600">No users found</div>
                ) : filteredUsers.map(u => (
                  <div key={u.id} className="grid grid-cols-[1fr_80px_100px_100px_44px] gap-0 px-4 py-3 hover:bg-white/[0.015] transition items-center group">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center flex-shrink-0">
                        <Mail size={11} className="text-neutral-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-neutral-300 truncate">{u.email || "—"}</div>
                        <div className="text-[9px] text-neutral-700 font-mono">{u.id.substring(0, 12)}...</div>
                      </div>
                    </div>
                    <div>
                      <span className={`text-xs font-black ${u.chatCount > 10 ? "text-emerald-400" : u.chatCount > 3 ? "text-amber-400" : "text-neutral-500"}`}>
                        {u.chatCount}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-600 flex items-center gap-1">
                      <Clock size={9} /> {u.created_at?.split("T")[0]}
                    </div>
                    <div className="text-[10px] text-neutral-600">{u.lastActive?.split("T")[0]}</div>
                    <div>
                      <button onClick={() => setConfirmDelete(u.id)}
                        className="p-1.5 rounded-lg text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition opacity-0 group-hover:opacity-100">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ CHATS TAB ══ */}
        {tab === "chats" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input type="text" placeholder="Search chats or email..." value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-xl border border-white/8 bg-white/[0.02] text-xs text-white placeholder-neutral-600 outline-none focus:border-amber-500/30 transition" />
              </div>
              <div className="text-[10px] text-neutral-600 font-bold">
                Showing {filteredChats.length} of {recentChats.length} recent
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Chats", value: stats?.totalChats || 0, color: "text-amber-400" },
                { label: "New Today", value: stats?.newChatsToday || 0, color: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/5 bg-[#070707] p-3 text-center">
                  <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[9px] text-neutral-600 uppercase tracking-wider mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#050505] overflow-hidden">
              <div className="grid grid-cols-[1fr_140px_100px_100px] gap-0 px-4 py-2.5 border-b border-white/5 bg-white/[0.01]">
                {["Chat Title", "User", "Agent", "Date"].map(h => (
                  <span key={h} className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{h}</span>
                ))}
              </div>
              <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-600">No chats found</div>
                ) : filteredChats.map(c => (
                  <div key={c.id} className="grid grid-cols-[1fr_140px_100px_100px] gap-0 px-4 py-3 hover:bg-white/[0.015] transition items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare size={11} className="text-amber-500/60 flex-shrink-0" />
                      <span className="text-xs text-neutral-300 truncate font-medium">{c.title}</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate flex items-center gap-1">
                      <Mail size={9} className="flex-shrink-0" /> {c.userEmail}
                    </div>
                    <div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-neutral-400 font-bold">
                        {AGENT_LABELS[c.agentId] || c.agentId?.split("-")[0] || "—"}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-600 flex items-center gap-1">
                      <Clock size={9} /> {c.created_at?.split("T")[0]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ AGENTS & TONES TAB ══ */}
        {tab === "agents" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agent leaderboard */}
              <div className="rounded-2xl border border-white/5 bg-[#050505] p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Bot size={14} className="text-emerald-400" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Agent Usage Ranking</h3>
                </div>
                <div className="space-y-3">
                  {popularAgents.slice(0, 12).map((a, i) => {
                    const total = popularAgents.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((a.count / total) * 100) : 0;
                    const colors = ["emerald", "amber", "violet", "rose", "blue", "orange"];
                    const color = colors[i % colors.length];
                    return (
                      <div key={a.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-neutral-700 w-4 font-bold">#{i + 1}</span>
                            <span className="text-[11px] font-semibold text-neutral-300">
                              {AGENT_LABELS[a.id] || a.id.split("-").slice(0, 2).join(" ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-neutral-600">{pct}%</span>
                            <span className="text-[10px] font-black text-neutral-400">{a.count}</span>
                          </div>
                        </div>
                        <MiniBar value={a.count} max={popularAgents[0]?.count || 1} color={color} />
                      </div>
                    );
                  })}
                  {popularAgents.length === 0 && <p className="text-xs text-neutral-600 text-center py-6">No data yet</p>}
                </div>
              </div>

              {/* Tone leaderboard */}
              <div className="rounded-2xl border border-white/5 bg-[#050505] p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Palette size={14} className="text-violet-400" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-neutral-400">Tone Preferences</h3>
                </div>
                <div className="space-y-3">
                  {popularTones.map((t, i) => {
                    const total = popularTones.reduce((s, x) => s + x.count, 0);
                    const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                    const colors = ["violet", "emerald", "amber", "rose", "blue", "orange"];
                    return (
                      <div key={t.id} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-neutral-300">
                            {TONE_LABELS[t.id] || t.id}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-neutral-600">{pct}%</span>
                            <span className="text-[10px] font-black text-neutral-400">{t.count}</span>
                          </div>
                        </div>
                        <MiniBar value={t.count} max={popularTones[0]?.count || 1} color={colors[i % colors.length]} />
                      </div>
                    );
                  })}
                  {popularTones.length === 0 && <p className="text-xs text-neutral-600 text-center py-6">No data yet</p>}
                </div>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Unique Agents Used", value: popularAgents.length, icon: Bot, color: "emerald" },
                { label: "Most Popular Agent", value: AGENT_LABELS[popularAgents[0]?.id] || "—", icon: TrendingUp, color: "amber" },
                { label: "Tones Used", value: popularTones.length, icon: Palette, color: "violet" },
                { label: "Top Tone", value: TONE_LABELS[popularTones[0]?.id]?.split(" ").slice(1).join(" ") || "—", icon: Activity, color: "rose" },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-xl border border-white/5 bg-[#070707] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={12} className={`text-${s.color}-400`} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">{s.label}</span>
                    </div>
                    <div className="text-sm font-black text-white truncate">{s.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
