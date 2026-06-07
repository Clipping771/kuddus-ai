"use client";

import React, { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Key, Plus, Trash2, Power, PowerOff, ArrowLeft, Copy, Check, Zap, AlertTriangle, Brain, FileText, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

interface ApiKey {
    id: string;
    label: string;
    key_masked: string;
    is_active: boolean;
    created_at: string;
}

type Tab = "openrouter" | "groq" | "response" | "danger";

// ── Moved outside component to prevent remount on every keystroke ──
const AddModal = ({
    show, onClose, value, onValue, label, onLabel, onAdd, adding,
    placeholder, prefix, hint,
}: {
    show: boolean; onClose: () => void; value: string; onValue: (v: string) => void;
    label: string; onLabel: (v: string) => void; onAdd: () => void; adding: boolean;
    placeholder: string; prefix: string; hint: string;
}) => {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                <h2 className="text-lg font-bold mb-5">Add New API Key</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold mb-1.5 text-neutral-400 uppercase tracking-wider">Label (optional)</label>
                        <input
                            type="text"
                            value={label}
                            onChange={e => onLabel(e.target.value)}
                            placeholder="e.g. Account 1"
                            className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 focus:border-white/30 outline-none text-sm transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-1.5 text-neutral-400 uppercase tracking-wider">API Key <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={value}
                            onChange={e => onValue(e.target.value)}
                            placeholder={placeholder}
                            className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/10 focus:border-white/30 outline-none font-mono text-sm transition-colors"
                        />
                        <p className="text-[11px] text-neutral-500 mt-1.5">Must start with <code className="text-amber-400">{prefix}</code> — {hint}</p>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} disabled={adding} className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-bold text-sm transition-all">Cancel</button>
                    <button onClick={onAdd} disabled={adding || !value.trim()} className="flex-1 py-2.5 rounded-xl bg-white hover:bg-neutral-100 disabled:bg-neutral-700 disabled:cursor-not-allowed text-black font-bold text-sm transition-all">
                        {adding ? "Adding..." : "Add Key"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function SettingsPage() {
    const { user } = useUser();
    const [activeTab, setActiveTab] = useState<Tab>("openrouter");

    // Token limit state — loaded from localStorage
    const [tokenLimit, setTokenLimit] = useState<number>(4096);
    const [tokenSaved, setTokenSaved] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("kacha_max_tokens");
            if (saved) {
                const parsed = parseInt(saved);
                if (!isNaN(parsed) && parsed >= 256 && parsed <= 32000) setTokenLimit(parsed);
            }
        } catch { }
    }, []);

    const handleSaveTokenLimit = () => {
        try {
            localStorage.setItem("kacha_max_tokens", String(tokenLimit));
            setTokenSaved(true);
            setTimeout(() => setTokenSaved(false), 2000);
        } catch { }
    };

    // OpenRouter state
    const [orKeys, setOrKeys] = useState<ApiKey[]>([]);
    const [orLoading, setOrLoading] = useState(true);
    const [orShowAdd, setOrShowAdd] = useState(false);
    const [orNewValue, setOrNewValue] = useState("");
    const [orNewLabel, setOrNewLabel] = useState("");
    const [orAdding, setOrAdding] = useState(false);

    // Groq state
    const [groqKeys, setGroqKeys] = useState<ApiKey[]>([]);
    const [groqLoading, setGroqLoading] = useState(true);
    const [groqShowAdd, setGroqShowAdd] = useState(false);
    const [groqNewValue, setGroqNewValue] = useState("");
    const [groqNewLabel, setGroqNewLabel] = useState("");
    const [groqAdding, setGroqAdding] = useState(false);
    const [groqTableReady, setGroqTableReady] = useState(true);

    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Danger zone state
    const [deletingChats, setDeletingChats] = useState(false);
    const [deletingMemory, setDeletingMemory] = useState(false);
    const [deletingRag, setDeletingRag] = useState(false);
    const [deletingAgents, setDeletingAgents] = useState(false);
    const [dangerConfirm, setDangerConfirm] = useState<string | null>(null);

    useEffect(() => {
        fetchOrKeys();
        fetchGroqKeys();
    }, []);

    // ── OpenRouter ──────────────────────────────────────────────────────────────
    const fetchOrKeys = async () => {
        try {
            setOrLoading(true);
            const res = await fetch("/api/settings/openrouter-keys");
            const data = await res.json();
            if (data.keys) setOrKeys(data.keys);
        } catch { } finally { setOrLoading(false); }
    };

    const handleOrAdd = async () => {
        if (!orNewValue.trim() || !orNewValue.startsWith("sk-or-")) {
            alert("Invalid key. Must start with 'sk-or-'");
            return;
        }
        try {
            setOrAdding(true);
            const res = await fetch("/api/settings/openrouter-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: orNewValue.trim(), label: orNewLabel.trim() || `Key ${orKeys.length + 1}` }),
            });
            const data = await res.json();
            if (!res.ok) { alert(data.error || "Failed to add key"); return; }
            setOrKeys([...orKeys, data.key]);
            setOrShowAdd(false); setOrNewValue(""); setOrNewLabel("");
        } catch { alert("Failed to add key"); } finally { setOrAdding(false); }
    };

    const handleOrDelete = async (id: string) => {
        if (!confirm("Delete this key?")) return;
        const res = await fetch("/api/settings/openrouter-keys", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        if (res.ok) setOrKeys(orKeys.filter(k => k.id !== id));
    };

    const handleOrToggle = async (id: string, current: boolean) => {
        const res = await fetch("/api/settings/openrouter-keys", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, is_active: !current }),
        });
        if (res.ok) setOrKeys(orKeys.map(k => k.id === id ? { ...k, is_active: !current } : k));
    };

    // ── Groq ────────────────────────────────────────────────────────────────────
    const fetchGroqKeys = async () => {
        try {
            setGroqLoading(true);
            const res = await fetch("/api/settings/groq-keys");
            const data = await res.json();
            if (data.keys) setGroqKeys(data.keys);
            if (data.tableNotReady) setGroqTableReady(false);
        } catch { } finally { setGroqLoading(false); }
    };

    const handleGroqAdd = async () => {
        if (!groqNewValue.trim() || !groqNewValue.startsWith("gsk_")) {
            alert("Invalid key. Must start with 'gsk_'");
            return;
        }
        try {
            setGroqAdding(true);
            const res = await fetch("/api/settings/groq-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ api_key: groqNewValue.trim(), label: groqNewLabel.trim() || `Groq Key ${groqKeys.length + 1}` }),
            });
            const data = await res.json();
            if (!res.ok) { alert(data.error || "Failed to add key"); return; }
            setGroqKeys([...groqKeys, data.key]);
            setGroqShowAdd(false); setGroqNewValue(""); setGroqNewLabel("");
        } catch { alert("Failed to add key"); } finally { setGroqAdding(false); }
    };

    const handleGroqDelete = async (id: string) => {
        if (!confirm("Delete this key?")) return;
        const res = await fetch("/api/settings/groq-keys", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
        if (res.ok) setGroqKeys(groqKeys.filter(k => k.id !== id));
    };

    const handleGroqToggle = async (id: string, current: boolean) => {
        const res = await fetch("/api/settings/groq-keys", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, is_active: !current }),
        });
        if (res.ok) setGroqKeys(groqKeys.map(k => k.id === id ? { ...k, is_active: !current } : k));
    };

    // ── Danger Zone Handlers ────────────────────────────────────────────────────
    const handleDeleteAllChats = async () => {
        if (dangerConfirm !== "delete-chats") return;
        try {
            setDeletingChats(true);
            const res = await fetch("/api/chats", { method: "DELETE" });
            if (res.ok) { alert("✅ All chats and messages deleted."); setDangerConfirm(null); }
            else alert("Failed to delete chats.");
        } catch { alert("Error deleting chats."); } finally { setDeletingChats(false); }
    };

    const handleDeleteMemory = async () => {
        if (dangerConfirm !== "delete-memory") return;
        try {
            setDeletingMemory(true);
            const res = await fetch("/api/memory", { method: "DELETE" });
            if (res.ok) { alert("✅ All memory data cleared."); setDangerConfirm(null); }
            else alert("Failed to clear memory.");
        } catch { alert("Error clearing memory."); } finally { setDeletingMemory(false); }
    };

    const handleDeleteRagFiles = async () => {
        if (dangerConfirm !== "delete-rag") return;
        try {
            setDeletingRag(true);
            const res = await fetch("/api/rag/documents", { method: "DELETE" });
            if (res.ok) { alert("✅ All uploaded documents and embeddings deleted."); setDangerConfirm(null); }
            else alert("Failed to delete documents.");
        } catch { alert("Error deleting documents."); } finally { setDeletingRag(false); }
    };

    const handleDeleteAllAgents = async () => {
        if (dangerConfirm !== "delete-agents") return;
        try {
            setDeletingAgents(true);
            const res = await fetch("/api/agents/all", { method: "DELETE" });
            if (res.ok) { alert("✅ All custom agents deleted."); setDangerConfirm(null); }
            else alert("Failed to delete agents.");
        } catch { alert("Error deleting agents."); } finally { setDeletingAgents(false); }
    };

    // ── Shared ──────────────────────────────────────────────────────────────────
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const KeyCard = ({ k, onDelete, onToggle }: { k: ApiKey; onDelete: () => void; onToggle: () => void }) => (
        <div className={`p-4 rounded-xl border transition-all ${k.is_active ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-neutral-900/50 border-neutral-800 opacity-50"}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-sm text-white">{k.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${k.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-700 text-neutral-400"}`}>
                            {k.is_active ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <code className="text-xs text-neutral-400 font-mono">{k.key_masked}</code>
                        <button onClick={() => copyToClipboard(k.key_masked, k.id)} className="p-1 rounded hover:bg-white/10 transition-colors">
                            {copiedId === k.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-neutral-500" />}
                        </button>
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1">Added {new Date(k.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                    <button onClick={onToggle} className={`p-2 rounded-lg transition-all ${k.is_active ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400" : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"}`}>
                        {k.is_active ? <Power size={15} /> : <PowerOff size={15} />}
                    </button>
                    <button onClick={onDelete} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#080808] text-white">
            {/* Header */}
            <div className="border-b border-white/[0.06] bg-[#080808]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="p-2 rounded-lg hover:bg-white/5 transition-colors text-neutral-400 hover:text-white">
                            <ArrowLeft size={18} />
                        </Link>
                        <div>
                            <h1 className="text-base font-bold">Settings</h1>
                            <p className="text-[11px] text-neutral-500">Manage your API keys</p>
                        </div>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-8 w-fit flex-wrap">
                    {([
                        { id: "openrouter", label: "OpenRouter", icon: <Key size={13} />, color: "text-amber-400" },
                        { id: "groq", label: "Groq", icon: <Zap size={13} />, color: "text-purple-400" },
                        { id: "response", label: "Response", icon: <SlidersHorizontal size={13} />, color: "text-sky-400" },
                        { id: "danger", label: "Data", icon: <AlertTriangle size={13} />, color: "text-red-400" },
                    ] as { id: Tab; label: string; icon: React.ReactNode; color: string }[]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeTab === tab.id
                                ? "bg-white/10 text-white"
                                : "text-neutral-500 hover:text-neutral-300"
                            }`}
                        >
                            <span className={activeTab === tab.id ? tab.color : ""}>{tab.icon}</span>
                            {tab.label}
                            {(tab.id === "openrouter" || tab.id === "groq") && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? "bg-white/10" : "bg-white/5"}`}>
                                    {tab.id === "openrouter" ? orKeys.filter(k => k.is_active).length : groqKeys.filter(k => k.is_active).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── OpenRouter Tab ── */}
                {activeTab === "openrouter" && (
                    <div>
                        {/* Info */}
                        <div className="mb-6 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/10 mt-0.5"><Key size={16} className="text-amber-400" /></div>
                                <div>
                                    <h2 className="font-bold text-amber-400 mb-1">OpenRouter Key Rotation</h2>
                                    <p className="text-xs text-neutral-400 leading-relaxed">
                                        Free tier: <strong className="text-neutral-300">50 req/day per key</strong>. Add multiple keys from different accounts — the system auto-rotates when one is exhausted.
                                    </p>
                                    <div className="flex gap-2 mt-2.5">
                                        <span className="px-2 py-1 rounded-lg bg-white/5 text-[11px] text-neutral-400">{orKeys.filter(k => k.is_active).length} active keys</span>
                                        <span className="px-2 py-1 rounded-lg bg-white/5 text-[11px] text-neutral-400">~{orKeys.filter(k => k.is_active).length * 50} req/day</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Keys list */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-sm">Your OpenRouter Keys</h3>
                            <button onClick={() => setOrShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold transition-all">
                                <Plus size={13} /> Add Key
                            </button>
                        </div>

                        {orLoading ? (
                            <div className="text-center py-10 text-neutral-600 text-sm">Loading...</div>
                        ) : orKeys.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-white/[0.06] rounded-2xl">
                                <Key size={36} className="mx-auto mb-3 text-neutral-700" />
                                <p className="text-neutral-500 text-sm mb-4">No OpenRouter keys yet</p>
                                <button onClick={() => setOrShowAdd(true)} className="px-5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-bold text-sm transition-all">Add First Key</button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {orKeys.map(k => <KeyCard key={k.id} k={k} onDelete={() => handleOrDelete(k.id)} onToggle={() => handleOrToggle(k.id, k.is_active)} />)}
                            </div>
                        )}

                        {/* How to get keys */}
                        <div className="mt-8 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <h3 className="font-bold text-sm mb-3">How to get OpenRouter keys</h3>
                            <ol className="space-y-2 text-xs text-neutral-400">
                                <li className="flex gap-2"><span className="text-amber-400 font-bold">1.</span> Go to <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">openrouter.ai/keys</a></li>
                                <li className="flex gap-2"><span className="text-amber-400 font-bold">2.</span> Create multiple accounts with different emails</li>
                                <li className="flex gap-2"><span className="text-amber-400 font-bold">3.</span> Generate a key from each account</li>
                                <li className="flex gap-2"><span className="text-amber-400 font-bold">4.</span> Add all keys here — system rotates automatically</li>
                            </ol>
                        </div>
                    </div>
                )}

                {/* ── Groq Tab ── */}
                {activeTab === "groq" && (
                    <div>
                        {/* Info */}
                        <div className="mb-6 p-5 rounded-2xl bg-purple-500/5 border border-purple-500/15">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 mt-0.5"><Zap size={16} className="text-purple-400" /></div>
                                <div>
                                    <h2 className="font-bold text-purple-400 mb-1">Groq Key Rotation</h2>
                                    <p className="text-xs text-neutral-400 leading-relaxed">
                                        Groq free tier has rate limits per key. Add multiple keys — the system auto-rotates on 429 errors for uninterrupted fast inference.
                                    </p>
                                    <div className="flex gap-2 mt-2.5">
                                        <span className="px-2 py-1 rounded-lg bg-white/5 text-[11px] text-neutral-400">{groqKeys.filter(k => k.is_active).length} active keys</span>
                                        <span className="px-2 py-1 rounded-lg bg-white/5 text-[11px] text-neutral-400">Used for Brain Trust + fast inference</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Keys list */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-sm">Your Groq Keys</h3>
                            <button onClick={() => setGroqShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-bold transition-all">
                                <Plus size={13} /> Add Key
                            </button>
                        </div>

                        {groqLoading ? (
                            <div className="text-center py-10 text-neutral-600 text-sm">Loading...</div>
                        ) : !groqTableReady ? (
                            <div className="p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5">
                                <p className="text-sm font-bold text-orange-400 mb-2">⚠️ Database migration required</p>
                                <p className="text-xs text-neutral-400 mb-3">Run this SQL in your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Supabase SQL Editor</a> to enable Groq key storage:</p>
                                <pre className="text-[11px] bg-black/40 border border-white/10 rounded-xl p-3 overflow-x-auto text-neutral-300 leading-relaxed">{`CREATE TABLE IF NOT EXISTS groq_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Groq Key',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_groq_keys_user_id ON groq_keys(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_groq_keys_unique ON groq_keys(user_id, api_key);`}</pre>
                                <button onClick={fetchGroqKeys} className="mt-3 px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-400 text-xs font-bold transition-all">
                                    Retry after running SQL →
                                </button>
                            </div>
                        ) : groqKeys.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-white/[0.06] rounded-2xl">
                                <Zap size={36} className="mx-auto mb-3 text-neutral-700" />
                                <p className="text-neutral-500 text-sm mb-4">No Groq keys yet</p>
                                <button onClick={() => setGroqShowAdd(true)} className="px-5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 font-bold text-sm transition-all">Add First Key</button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {groqKeys.map(k => <KeyCard key={k.id} k={k} onDelete={() => handleGroqDelete(k.id)} onToggle={() => handleGroqToggle(k.id, k.is_active)} />)}
                            </div>
                        )}

                        {/* How to get keys */}
                        <div className="mt-8 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <h3 className="font-bold text-sm mb-3">How to get Groq keys</h3>
                            <ol className="space-y-2 text-xs text-neutral-400">
                                <li className="flex gap-2"><span className="text-purple-400 font-bold">1.</span> Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">console.groq.com/keys</a></li>
                                <li className="flex gap-2"><span className="text-purple-400 font-bold">2.</span> Create multiple accounts with different emails</li>
                                <li className="flex gap-2"><span className="text-purple-400 font-bold">3.</span> Generate an API key from each account</li>
                                <li className="flex gap-2"><span className="text-purple-400 font-bold">4.</span> Add all keys here — auto-rotates on rate limit</li>
                            </ol>
                        </div>
                    </div>
                )}

                {/* ── Response Tab ── */}
                {activeTab === "response" && (
                    <div>
                        {/* Info card */}
                        <div className="mb-6 p-5 rounded-2xl bg-sky-500/5 border border-sky-500/15">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-sky-500/10 mt-0.5"><SlidersHorizontal size={16} className="text-sky-400" /></div>
                                <div>
                                    <h2 className="font-bold text-sky-400 mb-1">Response Token Limit</h2>
                                    <p className="text-xs text-neutral-400 leading-relaxed">
                                        Token limit controls how long the AI response can be. More tokens = longer, more complete responses — but slightly slower.
                                        <br /><span className="text-neutral-500 mt-1 block">1 token ≈ 0.75 words. A full page ≈ 500 tokens.</span>
                                    </p>
                                    <div className="flex gap-2 mt-2.5">
                                        <span className="px-2 py-1 rounded-lg bg-white/5 text-[11px] text-neutral-400">Current: <strong className="text-sky-400">{tokenLimit.toLocaleString()} tokens</strong></span>
                                        <span className="px-2 py-1 rounded-lg bg-white/5 text-[11px] text-neutral-400">≈ {Math.round(tokenLimit * 0.75).toLocaleString()} words</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Slider */}
                        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-bold">Max Output Tokens</label>
                                <span className="text-lg font-black text-sky-400 tabular-nums">{tokenLimit.toLocaleString()}</span>
                            </div>

                            <input
                                type="range"
                                min={256}
                                max={32000}
                                step={256}
                                value={tokenLimit}
                                onChange={e => setTokenLimit(Number(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-sky-400 bg-white/10"
                                style={{ accentColor: "#38bdf8" }}
                            />

                            <div className="flex justify-between text-[10px] text-neutral-600 mt-1.5">
                                <span>256</span>
                                <span>8K</span>
                                <span>16K</span>
                                <span>32K</span>
                            </div>

                            {/* Quick presets */}
                            <div className="flex flex-wrap gap-2 mt-5">
                                {[
                                    { label: "Short", value: 1024, desc: "Quick answers", color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20" },
                                    { label: "Medium", value: 4096, desc: "Standard (default)", color: "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20" },
                                    { label: "Long", value: 8192, desc: "Full reports", color: "bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20" },
                                    { label: "Maximum", value: 16000, desc: "Huge outputs", color: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" },
                                ].map(preset => (
                                    <button
                                        key={preset.value}
                                        onClick={() => setTokenLimit(preset.value)}
                                        className={`flex flex-col items-start px-3 py-2 rounded-xl border transition-all text-left ${
                                            tokenLimit === preset.value ? preset.color + " ring-1 ring-current" : "bg-white/5 border-white/10 text-neutral-400 hover:border-white/20"
                                        }`}
                                    >
                                        <span className="text-xs font-black">{preset.label}</span>
                                        <span className="text-[10px] opacity-70">{preset.value.toLocaleString()} · {preset.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* What does this mean */}
                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] mb-6">
                            <h3 className="font-bold text-sm mb-3">What do these limits mean?</h3>
                            <div className="space-y-2">
                                {[
                                    { range: "256–1K", use: "Greetings, one-liners, quick facts", color: "text-emerald-400" },
                                    { range: "1K–4K", use: "Short explanations, brief plans, summaries", color: "text-sky-400" },
                                    { range: "4K–8K", use: "Full business plans, complete code, detailed analysis", color: "text-violet-400" },
                                    { range: "8K–16K", use: "Long research reports, full documents, extensive strategies", color: "text-amber-400" },
                                    { range: "16K–32K", use: "Maximum output — very long content, may be slower", color: "text-red-400" },
                                ].map(row => (
                                    <div key={row.range} className="flex items-start gap-3">
                                        <code className={`text-[11px] font-bold w-20 shrink-0 ${row.color}`}>{row.range}</code>
                                        <span className="text-xs text-neutral-500">{row.use}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveTokenLimit}
                            className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
                                tokenSaved
                                    ? "bg-emerald-500 text-white"
                                    : "bg-sky-500 hover:bg-sky-400 text-white"
                            }`}
                        >
                            {tokenSaved ? "✅ Saved!" : "Save Token Limit"}
                        </button>
                    </div>
                )}

                {activeTab === "danger" && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 mb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle size={15} className="text-red-400" />
                                <span className="text-sm font-bold text-red-400">Danger Zone</span>
                            </div>
                            <p className="text-xs text-neutral-400">These actions are permanent and cannot be undone. Click once to arm, click again within 5 seconds to confirm.</p>
                        </div>

                        {[
                            {
                                key: "delete-chats",
                                icon: <Trash2 size={16} className="text-red-400" />,
                                title: "Delete All Chats",
                                desc: "Permanently deletes all your chat history and messages.",
                                loading: deletingChats,
                                onConfirm: handleDeleteAllChats,
                            },
                            {
                                key: "delete-memory",
                                icon: <Brain size={16} className="text-orange-400" />,
                                title: "Clear AI Memory",
                                desc: "Removes all long-term memory the AI has learned about you.",
                                loading: deletingMemory,
                                onConfirm: handleDeleteMemory,
                            },
                            {
                                key: "delete-rag",
                                icon: <FileText size={16} className="text-yellow-400" />,
                                title: "Delete All Uploaded Files",
                                desc: "Removes all uploaded documents and their vector embeddings from RAG.",
                                loading: deletingRag,
                                onConfirm: handleDeleteRagFiles,
                            },
                            {
                                key: "delete-agents",
                                icon: <Zap size={16} className="text-purple-400" />,
                                title: "Delete All Custom Agents",
                                desc: "Permanently deletes all your custom PDF agents.",
                                loading: deletingAgents,
                                onConfirm: handleDeleteAllAgents,
                            },
                        ].map((item) => (
                            <div key={item.key} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                    <div className="p-2 rounded-lg bg-white/5 mt-0.5 flex-shrink-0">{item.icon}</div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white">{item.title}</p>
                                        <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (dangerConfirm === item.key) {
                                            item.onConfirm();
                                        } else {
                                            setDangerConfirm(item.key);
                                            setTimeout(() => setDangerConfirm(null), 5000);
                                        }
                                    }}
                                    disabled={item.loading}
                                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${dangerConfirm === item.key
                                            ? "bg-red-500 hover:bg-red-400 text-white animate-pulse"
                                            : "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {item.loading ? "Deleting..." : dangerConfirm === item.key ? "⚠️ Confirm" : "Delete"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modals */}
            <AddModal
                show={orShowAdd} onClose={() => { setOrShowAdd(false); setOrNewValue(""); setOrNewLabel(""); }}
                value={orNewValue} onValue={setOrNewValue} label={orNewLabel} onLabel={setOrNewLabel}
                onAdd={handleOrAdd} adding={orAdding}
                placeholder="sk-or-v1-..." prefix="sk-or-" hint="Get from openrouter.ai/keys"
            />
            <AddModal
                show={groqShowAdd} onClose={() => { setGroqShowAdd(false); setGroqNewValue(""); setGroqNewLabel(""); }}
                value={groqNewValue} onValue={setGroqNewValue} label={groqNewLabel} onLabel={setGroqNewLabel}
                onAdd={handleGroqAdd} adding={groqAdding}
                placeholder="gsk_..." prefix="gsk_" hint="Get from console.groq.com/keys"
            />
        </div>
    );
}
