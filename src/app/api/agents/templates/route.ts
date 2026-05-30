import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Static fallback pool — shuffled and sampled when AI fails
const FALLBACK_POOL = [
    { icon: "💼", label: "Sales Coach", idea: "A high-performance B2B sales coach who helps craft cold emails, handle objections, build pipelines, and close deals faster." },
    { icon: "⚖️", label: "Contract Reviewer", idea: "A corporate legal expert who reviews contracts, spots risky clauses, and drafts NDAs and service agreements." },
    { icon: "🏋️", label: "Fitness Coach", idea: "A certified personal trainer who creates personalised workout plans, tracks progress, and gives nutrition advice." },
    { icon: "📈", label: "Growth Hacker", idea: "A data-driven growth strategist who designs viral loops, optimises funnels, and scales user acquisition." },
    { icon: "🎨", label: "Brand Designer", idea: "A senior brand strategist who defines brand identity, creates visual guidelines, and positions products in competitive markets." },
    { icon: "🧑‍💻", label: "Code Reviewer", idea: "A senior software engineer who reviews code for security vulnerabilities, performance issues, and best practices." },
    { icon: "📊", label: "Data Analyst", idea: "A data scientist who interprets complex datasets, builds dashboards, identifies trends, and turns raw data into business decisions." },
    { icon: "🎬", label: "YouTube Strategist", idea: "A YouTube growth expert who crafts viral hooks, optimises thumbnails and titles, and builds content strategies for channel growth." },
    { icon: "🧘", label: "Life Coach", idea: "A certified life coach who helps users set goals, overcome limiting beliefs, build habits, and achieve personal transformation." },
    { icon: "🍕", label: "Restaurant Consultant", idea: "A hospitality expert who helps restaurant owners optimise menus, reduce costs, improve customer experience, and grow revenue." },
    { icon: "🌍", label: "SEO Expert", idea: "An SEO specialist who audits websites, builds keyword strategies, creates link-building plans, and drives organic traffic growth." },
    { icon: "💊", label: "Health Advisor", idea: "A wellness expert who provides evidence-based health advice, interprets symptoms, suggests lifestyle changes, and guides preventive care." },
    { icon: "🎓", label: "Study Tutor", idea: "An academic tutor who explains complex subjects simply, creates study plans, quizzes students, and helps them ace exams." },
    { icon: "🏠", label: "Real Estate Advisor", idea: "A property investment expert who analyses markets, evaluates deals, advises on buy-to-let strategies, and guides first-time buyers." },
    { icon: "🤝", label: "Negotiation Coach", idea: "A negotiation expert who teaches proven tactics, role-plays scenarios, and helps users win better deals in business and life." },
    { icon: "📱", label: "App Idea Validator", idea: "A product strategist who validates app ideas, identifies target users, maps out MVP features, and assesses market viability." },
    { icon: "✈️", label: "Travel Planner", idea: "A travel expert who creates personalised itineraries, finds hidden gems, optimises budgets, and handles visa and logistics advice." },
    { icon: "🎵", label: "Music Producer", idea: "A music production coach who advises on beat-making, mixing, mastering, music marketing, and building a fanbase from scratch." },
];

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export async function POST(req: Request) {
    try {
        const { userId: clerkId } = await auth();
        if (!clerkId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get Groq keys — DB first, then env
        const groqKeys: string[] = [];
        try {
            const { data: dbUser } = await supabase.from("users").select("id").eq("clerk_id", clerkId).single();
            if (dbUser) {
                const { data: keys } = await supabase.from("groq_keys").select("api_key")
                    .eq("user_id", dbUser.id).eq("is_active", true);
                if (keys) groqKeys.push(...keys.map((k: any) => k.api_key).filter(Boolean));
            }
        } catch { /* silent */ }
        if (process.env.GROQ_API_KEY) groqKeys.push(process.env.GROQ_API_KEY);

        const prompt = `Generate 6 creative and diverse AI agent template ideas. Each should be a unique specialist role that someone might want to create as a custom AI agent.

Return ONLY a valid JSON array of exactly 6 objects. No explanation, no markdown.
Each object must have:
- "icon": single relevant emoji
- "label": 2-3 word name (e.g. "Sales Coach", "Tax Advisor")  
- "idea": 1-2 sentence description of what this agent does

Make them varied — mix business, creative, technical, personal, and niche domains.
Avoid: Sales Coach, Contract Reviewer, Fitness Coach, Growth Hacker, Brand Designer, Code Reviewer (already shown as defaults).

Example format:
[{"icon":"🧠","label":"Memory Coach","idea":"A cognitive performance expert who teaches memory techniques, speed reading, and mental models to boost learning and retention."}]`;

        for (const key of groqKeys) {
            try {
                const groq = new Groq({ apiKey: key });
                const completion = await groq.chat.completions.create({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.95,
                    max_tokens: 600,
                });
                const raw = completion.choices[0]?.message?.content?.trim() || "";
                // Extract JSON array
                const match = raw.match(/\[[\s\S]*\]/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    if (Array.isArray(parsed) && parsed.length >= 4) {
                        return NextResponse.json({ templates: parsed.slice(0, 6) });
                    }
                }
            } catch (err: any) {
                console.warn("[Templates] Groq key failed:", err.message?.slice(0, 60));
            }
        }

        // Fallback — return 6 random from pool
        return NextResponse.json({ templates: shuffle(FALLBACK_POOL).slice(0, 6) });
    } catch (error) {
        return NextResponse.json({ templates: shuffle(FALLBACK_POOL).slice(0, 6) });
    }
}
