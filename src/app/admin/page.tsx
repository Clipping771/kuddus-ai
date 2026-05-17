"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Hash, 
  Clock, 
  Mail,
  Zap
} from "lucide-react";

interface UserStats {
  totalUsers: number;
  totalChats: number;
  totalMessages: number;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

interface ChatRow {
  id: string;
  title: string;
  created_at: string;
  userEmail: string;
}

interface AgentStat {
  id: string;
  count: number;
}

export default function AdminHub() {
  const { user, isLoaded } = useUser();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [latestUsers, setLatestUsers] = useState<UserRow[]>([]);
  const [latestChats, setLatestChats] = useState<ChatRow[]>([]);
  const [popularAgents, setPopularAgents] = useState<AgentStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStats = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) {
        if (res.status === 403) {
          setErrorMsg("Access Denied: You do not have administrator permissions.");
        } else {
          setErrorMsg("Failed to retrieve statistics. Please try again.");
        }
        return;
      }

      const data = await res.json();
      setStats(data.stats);
      setLatestUsers(data.latestUsers || []);
      setLatestChats(data.latestChats || []);
      setPopularAgents(data.popularAgents || []);
    } catch (err) {
      console.error("Error loading stats:", err);
      setErrorMsg("An unexpected connection glitch occurred.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchStats();
    }
  }, [isLoaded, user]);

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center text-neutral-400">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full w-12 h-12 border-2 border-emerald-500/10 border-t-emerald-500 animate-spin"></div>
          <ShieldCheck size={20} className="text-emerald-500 animate-pulse" />
        </div>
        <p className="text-xs font-semibold tracking-widest uppercase text-neutral-500">Securing Admin Session...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-[#020202] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.05)]">
          <ShieldCheck size={32} />
        </div>
        <h1 className="text-xl font-bold text-neutral-200 mb-2">Restricted Access Area</h1>
        <p className="text-sm text-neutral-500 max-w-sm mb-8 leading-relaxed">
          {errorMsg}
        </p>
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 bg-[#0A0A0A] hover:bg-[#111] hover:text-white text-xs font-bold text-neutral-400 transition duration-300"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020202] text-neutral-200 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Premium Header */}
      <header className="h-16 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard"
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition duration-200"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-400 animate-pulse" size={18} />
            <h1 className="text-sm font-black tracking-widest uppercase text-neutral-100">Kacha Morich AI Admin Panel</h1>
          </div>
        </div>
        
        <button 
          onClick={() => fetchStats(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-850 bg-neutral-900/40 text-xs text-neutral-400 hover:text-white hover:bg-neutral-850 transition duration-300 font-bold"
        >
          <RefreshCw size={12} className={`${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Live Reload"}
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Intro */}
        <div className="flex flex-col gap-1.5 text-left">
          <h2 className="text-2xl font-extrabold text-neutral-100">Real-time Platform Insights</h2>
          <p className="text-xs text-neutral-500">Monitor active user registrations, ongoing consulting chats, and AI agent workloads.</p>
        </div>

        {/* 1. Stats Counter Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Users */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#070707]/60 backdrop-blur-md p-6 flex items-center justify-between shadow-2xl transition duration-500 hover:border-emerald-500/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/2 blur-2xl group-hover:bg-emerald-500/5 transition duration-500 rounded-full"></div>
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase">Total User Registrations</span>
              <p className="text-3xl font-black text-white">{stats?.totalUsers || 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-400">
              <Users size={20} />
            </div>
          </div>

          {/* Card 2: Total Chats */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#070707]/60 backdrop-blur-md p-6 flex items-center justify-between shadow-2xl transition duration-500 hover:border-amber-500/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/2 blur-2xl group-hover:bg-amber-500/5 transition duration-500 rounded-full"></div>
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase">Consultations Started</span>
              <p className="text-3xl font-black text-white">{stats?.totalChats || 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-400">
              <MessageSquare size={20} />
            </div>
          </div>

          {/* Card 3: Total Messages */}
          <div className="relative group overflow-hidden rounded-2xl border border-white/5 bg-[#070707]/60 backdrop-blur-md p-6 flex items-center justify-between shadow-2xl transition duration-500 hover:border-rose-500/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/2 blur-2xl group-hover:bg-rose-500/5 transition duration-500 rounded-full"></div>
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black tracking-widest text-rose-400 uppercase">Total Exchanged Messages</span>
              <p className="text-3xl font-black text-white">{stats?.totalMessages || 0}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-400">
              <Zap size={20} />
            </div>
          </div>
        </div>

        {/* 2. Lists Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Latest Registered Users */}
          <div className="rounded-2xl border border-white/5 bg-[#050505]/40 backdrop-blur-md p-6 flex flex-col shadow-2xl">
            <div className="flex items-center gap-2 mb-6 text-left">
              <Users size={16} className="text-emerald-400" />
              <h3 className="text-sm font-black tracking-wider uppercase text-neutral-200">Latest Signed-Up Users</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[360px] space-y-3.5 pr-2 scrollbar-thin">
              {latestUsers.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-8">No registered users yet</p>
              ) : (
                latestUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border border-white/[0.02] bg-[#070707] hover:bg-[#0c0c0c] transition duration-200">
                    <div className="flex items-center gap-3 truncate text-left">
                      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-850 flex items-center justify-center text-neutral-500">
                        <Mail size={13} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-neutral-300 truncate">{u.email}</span>
                        <span className="text-[9px] text-neutral-600 font-medium tracking-wide">ID: {u.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(u.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Latest Chat Conversations */}
          <div className="rounded-2xl border border-white/5 bg-[#050505]/40 backdrop-blur-md p-6 flex flex-col shadow-2xl">
            <div className="flex items-center gap-2 mb-6 text-left">
              <MessageSquare size={16} className="text-amber-400" />
              <h3 className="text-sm font-black tracking-wider uppercase text-neutral-200">Recent User Conversations</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[360px] space-y-3.5 pr-2 scrollbar-thin">
              {latestChats.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-8">No conversation histories yet</p>
              ) : (
                latestChats.map((c) => (
                  <div key={c.id} className="flex flex-col gap-2 p-3.5 rounded-xl border border-white/[0.02] bg-[#070707] hover:bg-[#0c0c0c] transition duration-200 text-left">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-xs font-bold text-neutral-200 line-clamp-1 flex-1">{c.title}</span>
                      <span className="text-[9px] text-neutral-500 shrink-0 flex items-center gap-1 pt-0.5">
                        <Clock size={10} />
                        {new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Mail size={10} /> {c.userEmail}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 3. Popular AI Agent Leaderboard */}
        <div className="rounded-2xl border border-white/5 bg-[#050505]/40 backdrop-blur-md p-6 flex flex-col shadow-2xl text-left">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={16} className="text-rose-400 animate-pulse" />
            <h3 className="text-sm font-black tracking-wider uppercase text-neutral-200">AI Specialist Workload Rankings</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularAgents.length === 0 ? (
              <p className="text-xs text-neutral-600 text-center py-8 col-span-2">No active workload data available yet</p>
            ) : (
              popularAgents.map((agent, index) => {
                const percentage = stats?.totalChats ? Math.round((agent.count / stats.totalChats) * 100) : 0;
                
                // Capitalize and format name
                const formattedName = agent.id
                  .split("-")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ");

                return (
                  <div key={agent.id} className="p-4 rounded-xl border border-white/[0.02] bg-[#070707] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
                        <span className="text-[10px] text-neutral-500">#{index + 1}</span>
                        {formattedName}
                      </div>
                      <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                        {agent.count} Chats ({percentage}%)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
