import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

// Cache models for 10 minutes to avoid hammering OpenRouter API
let cachedModels: any[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Icon mapping based on provider/model name
function getModelIcon(modelId: string): string {
    if (modelId.includes("google") || modelId.includes("gemma") || modelId.includes("gemini")) return "💎";
    if (modelId.includes("deepseek")) return "⚡";
    if (modelId.includes("llama") || modelId.includes("meta")) return "🦙";
    if (modelId.includes("mistral") || modelId.includes("mixtral")) return "🌪️";
    if (modelId.includes("claude") || modelId.includes("anthropic")) return "🎭";
    if (modelId.includes("gpt") || modelId.includes("openai")) return "🤖";
    if (modelId.includes("nvidia") || modelId.includes("nemotron")) return "🐲";
    if (modelId.includes("qwen") || modelId.includes("alibaba")) return "🐉";
    if (modelId.includes("hermes") || modelId.includes("nous")) return "🧠";
    if (modelId.includes("trinity") || modelId.includes("arcee")) return "🔮";
    if (modelId.includes("liquid") || modelId.includes("lfm")) return "💧";
    if (modelId.includes("baidu") || modelId.includes("cobuddy")) return "🐼";
    if (modelId.includes("owl")) return "🦉";
    if (modelId.includes("phi") || modelId.includes("microsoft")) return "🔷";
    if (modelId.includes("command") || modelId.includes("cohere")) return "🌊";
    if (modelId.includes("solar") || modelId.includes("upstage")) return "☀️";
    if (modelId.includes("yi") || modelId.includes("01-ai")) return "🌸";
    if (modelId.includes("falcon")) return "🦅";
    if (modelId.includes("wizard")) return "🧙";
    return "✨";
}

// Badge based on model characteristics
function getModelBadge(model: any): string {
    const id = model.id || "";
    const name = (model.name || "").toLowerCase();
    const contextLength = model.context_length || 0;
    const isFree = id.endsWith(":free") || (model.pricing?.prompt === "0" && model.pricing?.completion === "0");

    if (isFree) return "Free";
    if (name.includes("thinking") || name.includes("reasoning") || name.includes("r1")) return "Reasoning";
    if (name.includes("flash") || name.includes("fast") || name.includes("turbo")) return "Fast";
    if (contextLength >= 200000) return "200K ctx";
    if (contextLength >= 128000) return "128K ctx";
    if (name.includes("vision") || name.includes("vl")) return "Vision";
    if (name.includes("instruct")) return "Instruct";
    return "Chat";
}

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const freeOnly = searchParams.get("free") === "true";
        const search = searchParams.get("search")?.toLowerCase() || "";

        // Return cached models if still fresh
        const now = Date.now();
        if (cachedModels && now - cacheTime < CACHE_TTL) {
            let models = cachedModels;
            if (freeOnly) models = models.filter((m: any) => m.isFree);
            if (search) models = models.filter((m: any) =>
                m.name.toLowerCase().includes(search) || m.id.toLowerCase().includes(search)
            );
            return NextResponse.json({ models, cached: true });
        }

        // Fetch from OpenRouter
        const res = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
                "Content-Type": "application/json",
            },
        });

        if (!res.ok) {
            throw new Error(`OpenRouter models API failed: ${res.status}`);
        }

        const data = await res.json();
        const rawModels = data.data || [];

        // Transform and enrich model data
        const models = rawModels
            .filter((m: any) => m.id && m.name) // filter out invalid entries
            .map((m: any) => {
                const isFree = m.id.endsWith(":free") ||
                    (m.pricing?.prompt === "0" && m.pricing?.completion === "0");
                return {
                    id: m.id,
                    name: m.name,
                    icon: getModelIcon(m.id),
                    badge: getModelBadge(m),
                    isFree,
                    contextLength: m.context_length || 0,
                    description: m.description || "",
                    provider: m.id.split("/")[0] || "unknown",
                    pricing: {
                        prompt: m.pricing?.prompt || "0",
                        completion: m.pricing?.completion || "0",
                    },
                    supportsVision: (m.architecture?.modality || "").includes("image") ||
                        (m.description || "").toLowerCase().includes("vision"),
                };
            })
            // Sort: free first, then by context length desc
            .sort((a: any, b: any) => {
                if (a.isFree && !b.isFree) return -1;
                if (!a.isFree && b.isFree) return 1;
                return b.contextLength - a.contextLength;
            });

        // Cache the result
        cachedModels = models;
        cacheTime = now;

        let filtered = models;
        if (freeOnly) filtered = filtered.filter((m: any) => m.isFree);
        if (search) filtered = filtered.filter((m: any) =>
            m.name.toLowerCase().includes(search) || m.id.toLowerCase().includes(search)
        );

        return NextResponse.json({ models: filtered, total: models.length });

    } catch (error: any) {
        console.error("Models API error:", error);
        // Return fallback hardcoded models if OpenRouter fails
        return NextResponse.json({
            models: [
                { id: "google/gemma-4-31b-it", name: "Google Gemma 31B", icon: "💎", badge: "Primary", isFree: false },
                { id: "arcee-ai/trinity-large-thinking:free", name: "Trinity Large", icon: "🔮", badge: "Free", isFree: true },
                { id: "deepseek/deepseek-v4-flash", name: "DeepSeek V4 Flash", icon: "⚡", badge: "Fast", isFree: false },
                { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", icon: "🦙", badge: "Free", isFree: true },
                { id: "openai/gpt-oss-120b:free", name: "GPT OSS 120B", icon: "🤖", badge: "Free", isFree: true },
                { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nvidia Nemotron 120B", icon: "🐲", badge: "Free", isFree: true },
                { id: "nousresearch/hermes-3-llama-3.1-405b", name: "Hermes 3 405B", icon: "🧠", badge: "Max Reasoning", isFree: false },
                { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash", icon: "💎", badge: "Fast", isFree: false },
            ],
            fallback: true,
            error: error.message,
        });
    }
}
