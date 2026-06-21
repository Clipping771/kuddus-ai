/**
 * Smart Suggestions API — Intent-Aware
 * POST /api/suggestions
 *
 * After each AI response, generates 3 context-aware follow-up questions
 * based on the conversation AND detected intent.
 *
 * Uses Groq (fast) → OpenRouter fallback
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { groqChatWithFallback } from "@/lib/groq";
import { openrouterFetchWithFallback } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

// Intent-specific suggestion templates — used when AI generation fails
const INTENT_SUGGESTIONS: Record<string, { en: string[]; bn: string[] }> = {
    research: {
        en: ["Show me the TAM/SAM/SOM breakdown", "Who are the top 3 competitors?", "What are the key market trends?"],
        bn: ["TAM/SAM/SOM বিশ্লেষণ দেখাও", "শীর্ষ ৩ প্রতিযোগী কারা?", "মূল মার্কেট ট্রেন্ড কী?"],
    },
    business: {
        en: ["Build a financial projection model", "What's the break-even point?", "Create a go-to-market strategy"],
        bn: ["আর্থিক প্রজেকশন মডেল তৈরি করো", "ব্রেক-ইভেন পয়েন্ট কত?", "গো-টু-মার্কেট স্ট্র্যাটেজি তৈরি করো"],
    },
    coding: {
        en: ["Show me the complete working code", "What are the security vulnerabilities?", "How do I test this properly?"],
        bn: ["সম্পূর্ণ কোড দেখাও", "নিরাপত্তা দুর্বলতা কী?", "কীভাবে টেস্ট করব?"],
    },
    legal: {
        en: ["Draft the full contract", "What are the key risk clauses?", "What jurisdiction applies here?"],
        bn: ["সম্পূর্ণ চুক্তি তৈরি করো", "মূল ঝুঁকির ধারাগুলো কী?", "কোন আইনি এখতিয়ার প্রযোজ্য?"],
    },
    marketing: {
        en: ["Create a 30-day content calendar", "What's the optimal ad budget allocation?", "Write 3 ad copy variations"],
        bn: ["৩০ দিনের কন্টেন্ট ক্যালেন্ডার তৈরি করো", "সর্বোত্তম বিজ্ঞাপন বাজেট বরাদ্দ কী?", "৩টি বিজ্ঞাপন কপি লেখো"],
    },
    planning: {
        en: ["Create a detailed sprint plan", "What are the top 3 risks?", "Build a RACI matrix for this"],
        bn: ["বিস্তারিত স্প্রিন্ট প্ল্যান তৈরি করো", "শীর্ষ ৩ ঝুঁকি কী?", "RACI ম্যাট্রিক্স তৈরি করো"],
    },
    writing: {
        en: ["Write 3 different hook variations", "Optimize this for LinkedIn", "Create a content repurposing plan"],
        bn: ["৩টি ভিন্ন হুক লেখো", "LinkedIn-এর জন্য অপ্টিমাইজ করো", "কন্টেন্ট রিপার্পোজিং প্ল্যান তৈরি করো"],
    },
    hr: {
        en: ["Write the full job description", "Create interview questions", "Build a 30-60-90 day plan"],
        bn: ["সম্পূর্ণ জব ডেসক্রিপশন লেখো", "ইন্টারভিউ প্রশ্ন তৈরি করো", "৩০-৬০-৯০ দিনের প্ল্যান তৈরি করো"],
    },
};

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) {
            return NextResponse.json({ suggestions: [] });
        }

        const { userMessage, assistantResponse, agentId, language, intent } = await req.json();

        if (!userMessage || !assistantResponse) {
            return NextResponse.json({ suggestions: [] });
        }

        const { data: dbUser } = await supabase
            .from("users")
            .select("id")
            .eq("clerk_id", clerkId)
            .single();

        const isBangla = language === "bn" || /[\u0980-\u09FF]/.test(userMessage);

        // Intent-aware prompt — generates more relevant suggestions
        const intentContext = intent && intent !== "unknown"
            ? `The conversation is about: ${intent}. Generate suggestions that go DEEPER into this specific domain.`
            : "";

        const systemPrompt = `You are a tactical follow-up question generator.
Based on the conversation below, generate exactly 3 short, HIGHLY CONTEXTUAL follow-up questions.

Rules:
1. CRITICAL: NEVER ask generic starter questions (e.g. "What's your top priority?", "What's the biggest problem?", "Tell me more"). 
2. Questions MUST be based on specific entities, numbers, or concepts mentioned in the assistant's response.
3. Keep each question SHORT — max 12 words.
4. Make them ACTIONABLE (e.g., "Draft the code for the X function", "Calculate the ROI if we change Y").
5. ${isBangla ? "Write questions in Bangla (Bengali script)" : "Write questions in English"}
6. ${intentContext}
7. Return ONLY a valid JSON array of 3 strings. No explanation.

Example of GOOD output:
["Show me the exact CSS for the dark mode", "What is the CAC payback period?", "Draft a cold email for the CTO persona"]

Example of BAD output (DO NOT DO THIS):
["What's your biggest problem?", "What is your business strategy?", "Can you tell me more?"]`;

        const userPrompt = `User asked: "${userMessage.substring(0, 300)}"
AI responded: "${assistantResponse.substring(0, 400)}"
Agent: ${agentId || "general"}
Intent: ${intent || "general"}

Generate 3 follow-up questions:`;

        let suggestions: string[] = [];

        // Tier 1: Groq
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
            console.warn("[Suggestions] Groq failed:", groqErr);
        }

        // Tier 2: OpenRouter fallback
        if (suggestions.length === 0) {
            try {
                const { response: res } = await openrouterFetchWithFallback(
                    ["mistralai/mistral-7b-instruct:free", "meta-llama/llama-3.1-8b-instruct:free"],
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

        // Tier 3: Intent-based static fallback
        if (suggestions.length === 0) {
            suggestions = getIntentFallback(intent, agentId, isBangla);
        }

        return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
    } catch (err) {
        console.error("[Suggestions] Error:", err);
        return NextResponse.json({ suggestions: [] });
    }
}

function getIntentFallback(intent: string, agentId: string, isBangla: boolean): string[] {
    // Try intent-based first
    const intentFallback = INTENT_SUGGESTIONS[intent];
    if (intentFallback) {
        return isBangla ? intentFallback.bn : intentFallback.en;
    }

    // Agent-based fallback
    const agentFallbacks: Record<string, { en: string[]; bn: string[] }> = {
        "devmind-agent": {
            en: ["Show me the complete code", "What are the security risks?", "How do I test this?"],
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
    };

    const agentFallback = agentFallbacks[agentId];
    if (agentFallback) return isBangla ? agentFallback.bn : agentFallback.en;

    return isBangla
        ? ["আরো বিস্তারিত বলো", "একটা উদাহরণ দাও", "পরবর্তী পদক্ষেপ কী?"]
        : ["Tell me more details", "Give me a practical example", "What's the next step?"];
}
