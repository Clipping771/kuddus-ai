"use client";

import { useEffect, useState } from "react";
import { X, Key, AlertTriangle, ExternalLink } from "lucide-react";

export type BannerType = "api_key_exhausted" | "groq_rate_limit" | "info";

interface ApiKeyBannerProps {
    type: BannerType;
    message?: string; // optional server-provided reason override
    onDismiss: () => void;
}

const BANNER_CONFIG = {
    api_key_exhausted: {
        icon: <Key size={15} className="shrink-0" />,
        title: "API Key Exhausted",
        defaultMessage: "All your OpenRouter API keys have hit their rate limit or quota. Add a new key to continue.",
        actionLabel: "Add API Key →",
        actionHref: "/settings",
        bg: "bg-amber-500/10 border-amber-500/30",
        iconColor: "text-amber-400",
        titleColor: "text-amber-300",
        textColor: "text-amber-200/80",
        actionColor: "text-amber-300 hover:text-amber-100",
    },
    groq_rate_limit: {
        icon: <AlertTriangle size={15} className="shrink-0" />,
        title: "Rate Limit Hit",
        defaultMessage: "Groq API rate limit reached. The system will retry with OpenRouter. If this persists, add more API keys.",
        actionLabel: "Manage Keys →",
        actionHref: "/settings",
        bg: "bg-orange-500/10 border-orange-500/30",
        iconColor: "text-orange-400",
        titleColor: "text-orange-300",
        textColor: "text-orange-200/80",
        actionColor: "text-orange-300 hover:text-orange-100",
    },
    info: {
        icon: <AlertTriangle size={15} className="shrink-0" />,
        title: "Notice",
        defaultMessage: "Something needs your attention.",
        actionLabel: "Settings →",
        actionHref: "/settings",
        bg: "bg-blue-500/10 border-blue-500/30",
        iconColor: "text-blue-400",
        titleColor: "text-blue-300",
        textColor: "text-blue-200/80",
        actionColor: "text-blue-300 hover:text-blue-100",
    },
};

export default function ApiKeyBanner({ type, message, onDismiss }: ApiKeyBannerProps) {
    const [visible, setVisible] = useState(false);
    const config = BANNER_CONFIG[type];

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        setTimeout(onDismiss, 300);
    };

    return (
        <div
            className={`
        transition-all duration-300 ease-out
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
        mx-3 mb-2 rounded-xl border px-3.5 py-2.5 flex items-start gap-3
        ${config.bg}
      `}
        >
            {/* Icon */}
            <span className={`mt-0.5 ${config.iconColor}`}>{config.icon}</span>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-bold ${config.titleColor}`}>{config.title}</p>
                <p className={`text-[11px] mt-0.5 leading-relaxed ${config.textColor}`}>
                    {message || config.defaultMessage}
                </p>
                <a
                    href={config.actionHref}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold mt-1.5 transition-colors ${config.actionColor}`}
                >
                    {config.actionLabel}
                    <ExternalLink size={10} />
                </a>
            </div>

            {/* Dismiss */}
            <button
                onClick={handleDismiss}
                className="mt-0.5 text-neutral-500 hover:text-neutral-300 transition-colors shrink-0"
                aria-label="Dismiss"
            >
                <X size={13} />
            </button>
        </div>
    );
}
