"use client";

import React, { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { Key, Plus, Trash2, Power, PowerOff, ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";

interface ApiKey {
    id: string;
    label: string;
    key_masked: string;
    is_active: boolean;
    created_at: string;
}

export default function SettingsPage() {
    const { user } = useUser();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newKeyValue, setNewKeyValue] = useState("");
    const [newKeyLabel, setNewKeyLabel] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => {
        fetchKeys();
    }, []);

    const fetchKeys = async () => {
        try {
            setIsLoading(true);
            const res = await fetch("/api/settings/openrouter-keys");
            const data = await res.json();
            if (data.keys) {
                setKeys(data.keys);
            }
        } catch (err) {
            console.error("Failed to fetch keys:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddKey = async () => {
        if (!newKeyValue.trim() || !newKeyValue.startsWith("sk-or-")) {
            alert("Invalid key format. Must start with 'sk-or-'");
            return;
        }

        try {
            setIsAdding(true);
            const res = await fetch("/api/settings/openrouter-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    api_key: newKeyValue.trim(),
                    label: newKeyLabel.trim() || `Key ${keys.length + 1}`,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Failed to add key");
                return;
            }

            setKeys([...keys, data.key]);
            setShowAddModal(false);
            setNewKeyValue("");
            setNewKeyLabel("");
        } catch (err) {
            console.error("Failed to add key:", err);
            alert("Failed to add key");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteKey = async (id: string) => {
        if (!confirm("Are you sure you want to delete this API key?")) return;

        try {
            const res = await fetch("/api/settings/openrouter-keys", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (res.ok) {
                setKeys(keys.filter((k) => k.id !== id));
            } else {
                alert("Failed to delete key");
            }
        } catch (err) {
            console.error("Failed to delete key:", err);
            alert("Failed to delete key");
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch("/api/settings/openrouter-keys", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, is_active: !currentStatus }),
            });

            if (res.ok) {
                setKeys(
                    keys.map((k) => (k.id === id ? { ...k, is_active: !currentStatus } : k))
                );
            } else {
                alert("Failed to update key status");
            }
        } catch (err) {
            console.error("Failed to toggle key:", err);
            alert("Failed to update key status");
        }
    };

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Settings</h1>
                            <p className="text-xs text-neutral-400">Manage your OpenRouter API keys</p>
                        </div>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
                {/* Info Card */}
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-red-500/10 border border-amber-500/20">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-amber-500/20">
                            <Key size={24} className="text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-amber-400 mb-2">
                                Multi-Key Rotation System
                            </h2>
                            <p className="text-sm text-neutral-300 mb-3">
                                OpenRouter free tier has a <strong>50 requests/day</strong> limit per key.
                                Add multiple keys from different accounts to get unlimited requests. The
                                system automatically rotates to the next key when one is exhausted.
                            </p>
                            <div className="flex items-center gap-2 text-xs text-neutral-400">
                                <span className="px-2 py-1 rounded bg-white/5">
                                    {keys.filter((k) => k.is_active).length} Active Keys
                                </span>
                                <span className="px-2 py-1 rounded bg-white/5">
                                    ~{keys.filter((k) => k.is_active).length * 50} Requests/Day
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Keys List */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold">Your API Keys</h2>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center gap-2 transition-all"
                    >
                        <Plus size={16} />
                        Add New Key
                    </button>
                </div>

                {isLoading ? (
                    <div className="text-center py-12 text-neutral-500">Loading keys...</div>
                ) : keys.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                        <Key size={48} className="mx-auto mb-4 text-neutral-600" />
                        <p className="text-neutral-400 mb-4">No API keys added yet</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all"
                        >
                            Add Your First Key
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {keys.map((key) => (
                            <div
                                key={key.id}
                                className={`p-4 rounded-xl border transition-all ${key.is_active
                                        ? "bg-white/5 border-white/10 hover:border-white/20"
                                        : "bg-neutral-900/50 border-neutral-800 opacity-60"
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-white">{key.label}</h3>
                                            {key.is_active ? (
                                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-400 text-xs font-bold">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <code className="text-xs text-neutral-400 font-mono">
                                                {key.key_masked}
                                            </code>
                                            <button
                                                onClick={() => copyToClipboard(key.key_masked, key.id)}
                                                className="p-1 rounded hover:bg-white/10 transition-colors"
                                                title="Copy masked key"
                                            >
                                                {copiedId === key.id ? (
                                                    <Check size={14} className="text-green-400" />
                                                ) : (
                                                    <Copy size={14} className="text-neutral-500" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-xs text-neutral-500 mt-1">
                                            Added {new Date(key.created_at).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleActive(key.id, key.is_active)}
                                            className={`p-2 rounded-lg transition-all ${key.is_active
                                                    ? "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                                                    : "bg-neutral-800 hover:bg-neutral-700 text-neutral-400"
                                                }`}
                                            title={key.is_active ? "Disable key" : "Enable key"}
                                        >
                                            {key.is_active ? <Power size={18} /> : <PowerOff size={18} />}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteKey(key.id)}
                                            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                                            title="Delete key"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* How to Get Keys */}
                <div className="mt-8 p-6 rounded-2xl bg-white/5 border border-white/10">
                    <h3 className="font-bold mb-3">How to Get OpenRouter API Keys</h3>
                    <ol className="space-y-2 text-sm text-neutral-300">
                        <li className="flex gap-2">
                            <span className="font-bold text-red-400">1.</span>
                            <span>
                                Go to{" "}
                                <a
                                    href="https://openrouter.ai/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-400 hover:underline"
                                >
                                    openrouter.ai/keys
                                </a>
                            </span>
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold text-red-400">2.</span>
                            <span>Create multiple accounts (use different emails)</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold text-red-400">3.</span>
                            <span>Generate an API key from each account</span>
                        </li>
                        <li className="flex gap-2">
                            <span className="font-bold text-red-400">4.</span>
                            <span>Add all keys here for automatic rotation</span>
                        </li>
                    </ol>
                </div>
            </div>

            {/* Add Key Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full">
                        <h2 className="text-xl font-bold mb-4">Add New API Key</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2 text-neutral-300">
                                    Label (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={newKeyLabel}
                                    onChange={(e) => setNewKeyLabel(e.target.value)}
                                    placeholder="e.g., Account 1, Personal Key"
                                    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 focus:border-red-500 outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2 text-neutral-300">
                                    API Key <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newKeyValue}
                                    onChange={(e) => setNewKeyValue(e.target.value)}
                                    placeholder="sk-or-v1-..."
                                    className="w-full px-4 py-3 rounded-xl bg-black border border-white/10 focus:border-red-500 outline-none transition-colors font-mono text-sm"
                                />
                                <p className="text-xs text-neutral-500 mt-1">
                                    Must start with <code className="text-red-400">sk-or-</code>
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewKeyValue("");
                                    setNewKeyLabel("");
                                }}
                                className="flex-1 px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 font-bold transition-all"
                                disabled={isAdding}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddKey}
                                disabled={isAdding || !newKeyValue.trim()}
                                className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-neutral-700 disabled:cursor-not-allowed font-bold transition-all"
                            >
                                {isAdding ? "Adding..." : "Add Key"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
