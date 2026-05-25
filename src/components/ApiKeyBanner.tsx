"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, AlertCircle } from "lucide-react";

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

    const isRateLimit = type === "groq_rate_limit";

    const defaultMessage = isRateLimit
        ? "Groq rate limit reached. Add more Groq API keys if this keeps happening."
        : "Your OpenRouter API keys are exhausted. Add a new OpenRouter key to continue.";

    return (
        <div
            className={`transition-all duration-300 ease-out mb-3 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
        >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] backdrop-blur-sm">
                {/* Icon */}
                <AlertCircle
                    size={14}
                    className={isRateLimit ? "text-orange-400 shrink-0" : "text-amber-400 shrink-0"}
                />

                {/* Message */}
                <p className="flex-1 text-[11.5px] text-neutral-400 leading-snug">
                    <span className={`font-semibold mr-1 ${isRateLimit ? "text-orange-300" : "text-amber-300"}`}>
                        {isRateLimit ? "Rate limit hit." : "OpenRouter key exhausted."}
                    </span>
                    {message || defaultMessage}
                </p>

                {/* CTA */}
                <a
                    href="/settings"
                    className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold transition-colors ${isRateLimit
                        ? "text-orange-400 hover:text-orange-300"
                        : "text-amber-400 hover:text-amber-300"
                        }`}
                >
                    Add key
                    <ExternalLink size={10} />
                </a>

                {/* Divider */}
                <div className="w-px h-3.5 bg-white/10 shrink-0" />

                {/* Dismiss */}
                <button
                    onClick={handleDismiss}
                    className="shrink-0 text-neutral-600 hover:text-neutral-400 transition-colors"
                    aria-label="Dismiss"
                >
                    <X size={13} />
                </button>
            </div>
        </div>
    );
}
