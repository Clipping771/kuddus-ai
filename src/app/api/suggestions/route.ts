/**
 * Smart Suggestions API
 * POST /api/suggestions
 *
 * After each AI response, generates 3 context-aware follow-up questions
 * based on the conversation. Shows as clickable chips below the response.
 *
 * Uses Groq (fast) → OpenRouter fallback
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { groqChatWithFallback } from "@/lib/groq";
import { openrouterFetchWithFallback } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ suggestions: [] });
        }

        const { userMessage, assistantResponse, agentId, language } = await req.json();

        if (!userMessage || !assistantResponse) {
            return NextResponse.json({ suggestions: [] });
        }

        // Get DB user for key rotation
        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        const isBangla = language === "bn" || /[\u0980-\u09FF]/.test(userMessage);

        const systemPrompt = `You are a smart follow-up question generator for an AI business assistant.
Based on the conversation below, generate exactly 3 short, highly relevant follow-up questions the user might want to ask next.

Rules:
- Questions must be directly related to what was just discussed
- Each question should explore a different angle (deeper dive / related topic / practical next step)
- Keep each question SHORT — max 10 words
- ${isBangla ? "Write questions in Bangla (Bengali script)" : "Write questions in English"}
- Return ONLY a valid JSON array of 3 strings. No explanation, no markdown.

Example output:
["How do I calculate the break-even point?", "What funding options are available?", "Can you create a financial model for this?"]`;

        const userPrompt = `User asked: "${userMessage.substring(0, 300)}"
AI responded about: "${assistantResponse.substring(0, 400)}"
Agent type: ${agentId || "general"}

Generate 3 follow-up questions:`;

        let suggestions: string[] = [];

        // Tier 1: Groq — fast, no quota issues
        try {
            const completion = await groqChatWithFallback(
                {
                    model: "llama-3.1-8b-instant",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                    temperature: 0.8,
                    max_tokens: 200,
                },
                dbUser?.id
            );

            const raw = completion.choices[0]?.message?.content?.trim() || "";
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    suggestions = parsed.slice(0, 3).map((s: any) => String(s));
                }
            }
        } catch (groqErr) {
            console.warn("[Suggestions] Groq failed, trying OpenRouter:", groqErr);
        }

        // Tier 2: OpenRouter fallback
        if (suggestions.length === 0) {
            try {
                const { response: res } = await openrouterFetchWithFallback(
                    ["qwen/qwen3-8b:free", "mistralai/mistral-7b-instruct:free"],
                    {
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt },
                        ],
                        stream: false,
                        max_tokens: 200,
                        temperature: 0.8,
                    },
                    dbUser?.id
                );
                const data = await res.json();
                const raw = data.choices?.[0]?.message?.content?.trim() || "";
                const jsonMatch = raw.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(parsed)) {
                        suggestions = parsed.slice(0, 3).map((s: any) => String(s));
                    }
                }
            } catch (orErr) {
                console.warn("[Suggestions] OpenRouter also failed:", orErr);
            }
        }

        // Fallback: agent-specific static suggestions
        if (suggestions.length === 0) {
            suggestions = getStaticFallbackSuggestions(agentId, isBangla);
        }

        return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
    } catch (err) {
        console.error("[Suggestions] Error:", err);
        return NextResponse.json({ suggestions: [] });
    }
}

function getStaticFallbackSuggestions(agentId: string, isBangla: boolean): string[] {
    const fallbacks: Record<string, { en: string[]; bn: string[] }> = {
        "devmind-agent": {
            en: ["Can you show me the complete code?", "What are the security risks?", "How do I test this?"],
            bn: ["সম্পূর্ণ কোড দেখাও", "নিরাপত্তা ঝুঁকি কী?", "কীভাবে টেস্ট করব?"],
        },
        "personal-cfo-finance-agent": {
            en: ["Create a financial projection", "What's the break-even point?", "How to reduce costs?"],
            bn: ["আর্থিক প্রজেকশন তৈরি করো", "ব্রেক-ইভেন পয়েন্ট কত?", "খরচ কমানোর উপায়?"],
        },
        "investor-pitch-agent": {
            en: ["Draft the full pitch deck", "What valuation is realistic?", "Which investors to target?"],
            bn: ["পিচ ডেক তৈরি করো", "কত ভ্যালুয়েশন সঠিক?", "কোন বিনিয়োগকারীকে টার্গেট করব?"],
        },
        "research-agent": {
            en: ["Show market size data", "Who are the top competitors?", "What are the growth trends?"],
            bn: ["মার্কেট সাইজ দেখাও", "প্রধান প্রতিযোগী কারা?", "গ্রোথ ট্রেন্ড কী?"],
        },
    };

    const agentFallback = fallbacks[agentId];
    if (agentFallback) {
        return isBangla ? agentFallback.bn : agentFallback.en;
    }

    return isBangla
        ? ["আরো বিস্তারিত বলো", "একটা উদাহরণ দাও", "পরবর্তী পদক্ষেপ কী?"]
        : ["Tell me more details", "Give me a practical example", "What's the next step?"];
}
