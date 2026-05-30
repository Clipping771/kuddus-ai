"use client";

import { useEffect, useState } from "react";
import { X, Key, Zap, AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";

export type BannerType =
    | "api_key_exhausted"      // All OR keys dead
    | "groq_rate_limit"        // Groq rate limited
    | "groq_invalid"           // Groq key invalid/expired
    | "partial_exhausted"      // Some keys dead, some alive
    | "no_keys_configured"     // No keys at all
    | "info";

export interface KeyStatus {
    groq: { ok: boolean; checked: boolean };
    openrouter: { ok: boolean; checked: boolean; activeKeys: number; exhaustedKeys: number };
    needsAttention: boolean;
    reason: string;
}

interface ApiKeyBannerProps {
    type: BannerType;
    message?: string;
    keyStatus?: KeyStatus;
    onDismiss: () => void;
    themeMode?: "black" | "light";
}

const CONFIGS: Record<BannerType, {
    icon: React.ElementType;
    iconColor: string;
    borderColor: string;
    bgColor: string;
    titleDark: string;
    titleLight: string;
    urgent: boolean;
}> = {
    api_key_exhausted: {
        icon: AlertTriangle,
        iconColor: "text-red-400",
        borderColor: "border-red-500/30",
        bgColor: "bg-red-500/8",
        titleDark: "API Keys Exhausted",
        titleLight: "API Keys Exhausted",
        urgent: true,
    },
    groq_rate_limit: {
        icon: Zap,
        iconColor: "text-orange-400",
        borderColor: "border-orange-500/30",
        bgColor: "bg-orange-500/8",
        titleDark: "Groq Rate Limited",
        titleLight: "Groq Rate Limited",
        urgent: false,
    },
    groq_invalid: {
        icon: Key,
        iconColor: "text-amber-400",
        borderColor: "border-amber-500/30",
        bgColor: "bg-amber-500/8",
        titleDark: "Groq Key Invalid",
        titleLight: "Groq Key Invalid",
        urgent: true,
    },
    partial_exhausted: {
        icon: AlertTriangle,
        iconColor: "text-yellow-400",
        borderColor: "border-yellow-500/25",
        bgColor: "bg-yellow-500/6",
        titleDark: "Some Keys Exhausted",
        titleLight: "Some Keys Exhausted",
        urgent: false,
    },
    no_keys_configured: {
        icon: Key,
        iconColor: "text-red-400",
        borderColor: "border-red-500/30",
        bgColor: "bg-red-500/8",
        titleDark: "No API Keys Found",
        titleLight: "No API Keys Found",
        urgent: true,
    },
    info: {
        icon: CheckCircle,
        iconColor: "text-emerald-400",
        borderColor: "border-emerald-500/20",
        bgColor: "bg-emerald-500/6",
        titleDark: "Info",
        titleLight: "Info",
        urgent: false,
    },
};

export default function ApiKeyBanner({ type, message, keyStatus, onDismiss, themeMode = "black" }: ApiKeyBannerProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 80);
        return () => clearTimeout(t);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(onDismiss, 250);
    };

    const cfg = CONFIGS[type] || CONFIGS.info;
    const Icon = cfg.icon;
    const isDark = themeMode === "black";

    const defaultMessages: Record<BannerType, string> = {
        api_key_exhausted: "All your OpenRouter API keys are exhausted. Add a new free key to keep chatting.",
        groq_rate_limit: "Groq hit its rate limit. Responses will fall back to OpenRouter until it resets.",
        groq_invalid: "Your Groq API key is invalid or expired. Add a new key for faster responses.",
        partial_exhausted: "Some API keys are exhausted. Add fresh keys to avoid interruptions.",
        no_keys_configured: "No API keys configured. Add an OpenRouter key to start using the AI.",
        info: message || "",
    };

    const displayMessage = message || defaultMessages[type];

    return (
        <div className={`transition-all duration-300 ease-out mb-3 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
            <div className={`rounded-2xl border px-4 py-3 ${cfg.borderColor} ${isDark ? cfg.bgColor : "bg-white"} ${isDark ? "" : "shadow-sm"}`}>
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg ${isDark ? "bg-white/5" : "bg-neutral-100"}`}>
                        <Icon size={13} className={cfg.iconColor} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[11px] font-black uppercase tracking-wider ${cfg.iconColor}`}>
                                {cfg.urgent ? "⚠️ " : ""}{isDark ? cfg.titleDark : cfg.titleLight}
                            </span>
                            {cfg.urgent && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isDark ? "bg-red-500/15 text-red-400" : "bg-red-50 text-red-600"}`}>
                                    Action Required
                                </span>
                            )}
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? "text-neutral-400" : "text-neutral-600"}`}>
                            {displayMessage}
                        </p>

                        {/* Key status pills */}
                        {keyStatus && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {keyStatus.groq.checked && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${keyStatus.groq.ok
                                        ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                                        : (isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-200")
                                        }`}>
                                        ⚡ Groq: {keyStatus.groq.ok ? "OK" : "Failed"}
                                    </span>
                                )}
                                {keyStatus.openrouter.checked && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${keyStatus.openrouter.ok
                                        ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200")
                                        : (isDark ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-600 border-red-200")
                                        }`}>
                                        🔑 OpenRouter: {keyStatus.openrouter.ok
                                            ? `${keyStatus.openrouter.activeKeys - keyStatus.openrouter.exhaustedKeys}/${keyStatus.openrouter.activeKeys} active`
                                            : `${keyStatus.openrouter.exhaustedKeys} exhausted`}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                        <Link
                            href="/settings"
                            className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all ${isDark
                                ? "bg-white/10 hover:bg-white/15 text-white"
                                : "bg-neutral-900 hover:bg-black text-white"
                                }`}
                        >
                            <Key size={10} />
                            Add Key
                            <ExternalLink size={9} />
                        </Link>
                        <button
                            onClick={handleDismiss}
                            className={`p-1.5 rounded-lg transition-colors ${isDark ? "text-neutral-600 hover:text-neutral-300 hover:bg-white/5" : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"}`}
                            aria-label="Dismiss"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
