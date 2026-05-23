"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Zap } from "lucide-react";

export type BannerType = "api_key_exhausted" | "groq_rate_limit" | "info";

interface ApiKeyBannerProps {
    type: BannerType;
    message?: string;
    onDismiss: () => void;
}

export default function ApiKeyBanner({ type, message, onDismiss }: ApiKeyBannerProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 60);
        return () => clearTimeout(t);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(onDismiss, 250);
    };

    const defaultMessage =
        type === "groq_rate_limit"
            ? "Groq rate limit hit. System is retrying with OpenRouter. Add more keys if this persists."
            : "All API keys are exhausted or invalid. Add a new key to keep chatting.";

    return (
        <div
            className={`
        transition-all duration-250 ease-out mb-2
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}
      `}
        >
            <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-[#1a0a0a]">
                {/* Red glow bar on left */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-red-500 to-orange-500" />

                <div className="flex items-center gap-3 px-4 py-3 pl-5">
                    {/* Icon */}
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
                        <Zap size={13} className="text-red-400" fill="currentColor" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">
                                {type === "groq_rate_limit" ? "Rate Limit" : "API Key Exhausted"}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold uppercase tracking-wider border border-red-500/20">
                                Action Required
                            </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                            {message || defaultMessage}
                        </p>
                    </div>

                    {/* CTA */}
                    <a
                        href="/settings"
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 text-[11px] font-bold transition-all duration-200 whitespace-nowrap"
                    >
                        Add Key
                        <ExternalLink size={10} />
                    </a>

                    {/* Dismiss */}
                    <button
                        onClick={handleDismiss}
                        className="shrink-0 ml-1 text-neutral-600 hover:text-neutral-400 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
