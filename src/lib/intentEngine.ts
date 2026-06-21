/**
 * Intent Engine — Kacha Morich AI
 *
 * প্রতিটি user message classify করে:
 *   Question | Research | Coding | Writing | Business Analysis | Planning | Casual
 *
 * তারপর সেই intent অনুযায়ী:
 *   Intent → Best Agent → Best Model → Best Tool
 *
 * Zero-latency keyword path + LLM fallback for ambiguous messages.
 */

import { groqChatWithFallback } from "@/lib/groq";

// ─── Intent Types ────────────────────────────────────────────────────────────

export type IntentType =
    | "question"        // factual / how-to / what-is
    | "research"        // market research, analysis, data
    | "coding"          // code, debug, architecture
    | "writing"         // content, copy, scripts, emails
    | "business"        // strategy, finance, pitch, sales
    | "planning"        // roadmap, project, sprint, goals
    | "casual"          // greetings, small talk, thanks
    | "creative"        // brainstorming, ideas, innovation
    | "legal"           // contracts, compliance, legal advice
    | "hr"              // hiring, team, HR
    | "marketing"       // ads, SEO, social media, campaigns
    | "unknown";

export interface IntentResult {
    intent: IntentType;
    confidence: "high" | "medium" | "low";
    suggestedAgent: string;
    suggestedModel: string;
    needsWebSearch: boolean;
    needsVerification: boolean;   // should run draft → critic → fix pipeline
    reasoning: string;
}

// ─── Intent → Agent mapping ──────────────────────────────────────────────────

const INTENT_TO_AGENT: Record<IntentType, string> = {
    question: "daily-innovation-idea-agent",   // general fallback
    research: "research-agent",
    coding: "devmind-agent",
    writing: "content-creator-agent",
    business: "personal-cfo-finance-agent",
    planning: "project-manager-agent",
    casual: "daily-innovation-idea-agent",
    creative: "daily-innovation-idea-agent",
    legal: "legal-compliance-agent",
    hr: "hr-recruiting-agent",
    marketing: "performance-marketer-agent",
    unknown: "daily-innovation-idea-agent",
};

// ─── Intent → Model mapping ──────────────────────────────────────────────────
// Fast models for simple intents, powerful models for complex ones

const INTENT_TO_MODEL: Record<IntentType, string> = {
    question: "meta-llama/llama-3.3-70b-instruct:free",
    research: "meta-llama/llama-3.3-70b-instruct:free",
    coding: "meta-llama/llama-3.3-70b-instruct:free",   // free, strong for code
    writing: "meta-llama/llama-3.3-70b-instruct:free",
    business: "meta-llama/llama-3.3-70b-instruct:free",
    planning: "meta-llama/llama-3.3-70b-instruct:free",
    casual: "meta-llama/llama-3.1-8b-instruct:free",   // fast for casual
    creative: "meta-llama/llama-3.3-70b-instruct:free",
    legal: "meta-llama/llama-3.3-70b-instruct:free",
    hr: "meta-llama/llama-3.3-70b-instruct:free",
    marketing: "meta-llama/llama-3.3-70b-instruct:free",
    unknown: "meta-llama/llama-3.3-70b-instruct:free",
};

// ─── Intents that need verification (draft → critic → fix) ──────────────────

const VERIFICATION_INTENTS = new Set<IntentType>([
    "research",
    "business",
    "legal",
    "coding",
]);

// ─── Intents that benefit from web search ────────────────────────────────────

const SEARCH_INTENTS = new Set<IntentType>([
    "research",
    "question",
    "business",
    "marketing",
]);

// ─── Keyword patterns for fast classification ────────────────────────────────

const INTENT_KEYWORDS: Array<{ intent: IntentType; patterns: RegExp[] }> = [
    {
        intent: "coding",
        patterns: [
            /\b(code|bug|error|debug|function|api|database|sql|react|next\.?js|typescript|javascript|python|node|docker|deploy|backend|frontend|component|hook|architecture|system design|git|github|ci\/cd|devops|aws|vercel|supabase|prisma|migration|schema|algorithm|refactor|test|jest|vitest|tailwind|css|responsive|pwa|websocket|streaming|rag|vector|embedding|llm|openai|groq|openrouter|prompt engineering)\b/i,
            /\b(কোড|বাগ|এরর|ডিবাগ|ফাংশন|এপিআই|ডেটাবেস|রিঅ্যাক্ট|নেক্সট|টাইপস্ক্রিপ্ট|জাভাস্ক্রিপ্ট|পাইথন|ডকার|ডিপ্লয়|সার্ভার|ব্যাকএন্ড|ফ্রন্টএন্ড)\b/i,
        ],
    },
    {
        intent: "research",
        patterns: [
            /\b(market research|market size|tam|sam|som|swot|industry analysis|feasibility|market trend|consumer behavior|survey|report|statistics|data analysis|pestle|competitive landscape|benchmark|case study)\b/i,
            /\b(মার্কেট রিসার্চ|বাজার বিশ্লেষণ|সোয়ট|শিল্প বিশ্লেষণ|সম্ভাব্যতা|পরিসংখ্যান|গবেষণা)\b/i,
        ],
    },
    {
        intent: "legal",
        patterns: [
            /\b(legal|contract|nda|terms of service|privacy policy|compliance|regulation|gdpr|license|intellectual property|trademark|copyright|lawsuit|liability|agreement|clause|attorney|lawyer)\b/i,
            /\b(আইনি|চুক্তি|এনডিএ|কমপ্লায়েন্স|নিয়ন্ত্রণ|লাইসেন্স|আইনজীবী)\b/i,
        ],
    },
    {
        intent: "hr",
        patterns: [
            /\b(hire|hiring|recruit|job description|interview|onboarding|employee|team building|hr|human resources|salary|compensation|performance review|culture|remote work|star method|job post)\b/i,
            /\b(নিয়োগ|চাকরির বিবরণ|ইন্টারভিউ|অনবোর্ডিং|কর্মী|টিম|বেতন)\b/i,
        ],
    },
    {
        intent: "marketing",
        patterns: [
            /\b(facebook ads|google ads|paid ads|roas|cac|ltv|ctr|cpm|cpc|seo|sem|ppc|retargeting|lookalike|conversion rate|landing page|a\/b test|funnel|social media|instagram|tiktok|content calendar|hashtag|engagement|followers|brand awareness|viral|campaign)\b/i,
            /\b(ফেসবুক অ্যাড|গুগল অ্যাড|পেইড অ্যাড|এসইও|কনভার্সন রেট|সোশ্যাল মিডিয়া|ইনস্টাগ্রাম|ফেসবুক|পোস্ট|ক্যাপশন|হ্যাশট্যাগ)\b/i,
        ],
    },
    {
        intent: "writing",
        patterns: [
            /\b(write|writing|content|copywriting|script|hook|viral|blog post|article|headline|aida|storybrand|marketing copy|ad copy|email newsletter|caption|post|draft|essay|letter|proposal)\b/i,
            /\b(লেখো|লিখুন|কন্টেন্ট|কপিরাইটিং|স্ক্রিপ্ট|হুক|ভাইরাল|ব্লগ|আর্টিকেল|ইমেইল|প্রস্তাব)\b/i,
        ],
    },
    {
        intent: "planning",
        patterns: [
            /\b(project plan|roadmap|sprint|agile|scrum|kanban|milestone|deadline|task breakdown|wbs|moscow|product roadmap|backlog|user story|epic|timeline|schedule|gantt|okr|goal setting)\b/i,
            /\b(প্রজেক্ট প্ল্যান|রোডম্যাপ|স্প্রিন্ট|এজাইল|মাইলস্টোন|টাস্ক ব্রেকডাউন|লক্ষ্য|পরিকল্পনা)\b/i,
        ],
    },
    {
        intent: "business",
        patterns: [
            /\b(business|startup|revenue|profit|loss|pricing|valuation|runway|burn rate|tax|accounting|invoice|payroll|investment|roi|margin|break even|forecast|p&l|balance sheet|pitch|investor|funding|raise|seed|series|vc|venture capital|angel|deck|equity|fundraising|sales|lead|prospect|cold email|outreach|pipeline|crm|conversion|funnel|b2b|b2c)\b/i,
            /\b(ব্যবসা|স্টার্টআপ|আয়|ব্যয়|লাভ|ক্ষতি|ট্যাক্স|ভ্যাট|বিনিয়োগ|মূল্য নির্ধারণ|রানওয়ে|ক্যাশ ফ্লো|পিচ|বিনিয়োগকারী|ফান্ডিং|সেলস|লিড|পাইপলাইন)\b/i,
        ],
    },
    {
        intent: "creative",
        patterns: [
            /\b(idea|ideas|brainstorm|innovate|creative|invent|imagine|concept|new business|startup idea|side hustle|opportunity|niche|unique|original)\b/i,
            /\b(আইডিয়া|ব্রেইনস্টর্ম|উদ্ভাবন|সৃজনশীল|নতুন ব্যবসা|স্টার্টআপ আইডিয়া|সুযোগ|নিশ)\b/i,
        ],
    },
    {
        intent: "casual",
        patterns: [
            /^(hi|hello|hey|thanks|thank you|ok|okay|got it|sure|great|nice|cool|wow|lol|haha|bye|goodbye|see you|good morning|good night|good afternoon|salam|assalamu alaikum|ধন্যবাদ|হ্যালো|হাই|ঠিক আছে|ভালো|সালাম)[\s!.?]*$/i,
        ],
    },
];

// ─── Main classify function ───────────────────────────────────────────────────

/**
 * Classify user intent from message.
 * Fast keyword path first, LLM fallback for ambiguous messages.
 */
export async function classifyIntent(
    message: string,
    currentAgentId?: string,
    userId?: string
): Promise<IntentResult> {
    const defaultResult: IntentResult = {
        intent: "unknown",
        confidence: "low",
        suggestedAgent: currentAgentId || "daily-innovation-idea-agent",
        suggestedModel: INTENT_TO_MODEL["unknown"],
        needsWebSearch: false,
        needsVerification: false,
        reasoning: "Default fallback",
    };

    if (!message || message.trim().length < 3) return defaultResult;

    const trimmed = message.trim();

    // ── Fast keyword classification ──────────────────────────────────────────
    const scores: Record<IntentType, number> = {} as Record<IntentType, number>;

    for (const { intent, patterns } of INTENT_KEYWORDS) {
        let score = 0;
        for (const pattern of patterns) {
            const matches = trimmed.match(pattern);
            if (matches) {
                score += matches.length * 2;
            }
        }
        if (score > 0) scores[intent] = score;
    }

    const sortedIntents = Object.entries(scores).sort(([, a], [, b]) => b - a);

    if (sortedIntents.length > 0) {
        const [topIntent, topScore] = sortedIntents[0] as [IntentType, number];
        const confidence: "high" | "medium" | "low" =
            topScore >= 6 ? "high" : topScore >= 2 ? "medium" : "low";

        if (confidence !== "low") {
            const suggestedAgent = currentAgentId && currentAgentId !== "daily-innovation-idea-agent"
                ? currentAgentId  // respect user's explicit agent choice
                : INTENT_TO_AGENT[topIntent];

            return {
                intent: topIntent,
                confidence,
                suggestedAgent,
                suggestedModel: INTENT_TO_MODEL[topIntent],
                needsWebSearch: SEARCH_INTENTS.has(topIntent) && trimmed.length > 30,
                needsVerification: VERIFICATION_INTENTS.has(topIntent) && trimmed.length > 60,
                reasoning: `Keyword match: ${topScore} signals for "${topIntent}"`,
            };
        }
    }

    // ── LLM fallback for ambiguous messages (REMOVED FOR API OPTIMIZATION) ─────────────
    // Instead of burning an API call to classify the intent, we default to "question".
    return {
        ...defaultResult,
        intent: "question",
        suggestedAgent: currentAgentId || INTENT_TO_AGENT["question"],
        suggestedModel: INTENT_TO_MODEL["question"],
        reasoning: "Keyword matching failed — defaulted to question to save API credits",
    };
}

/**
 * Build an intent-aware system prompt prefix.
 * Tells the AI exactly what mode it's in and what the user needs.
 */
export function buildIntentPrefix(intent: IntentResult): string {
    if (intent.intent === "casual" || intent.intent === "unknown") return "";

    const intentLabels: Record<IntentType, string> = {
        question: "📌 ANSWER MODE — Give a direct, accurate answer.",
        research: "🔍 RESEARCH MODE — Provide data-backed analysis with sources and insights.",
        coding: "💻 CODE MODE — Write complete, production-ready code with error handling.",
        writing: "✍️ WRITING MODE — Create compelling, polished content ready to publish.",
        business: "📊 BUSINESS MODE — Give strategic, numbers-driven business advice.",
        planning: "🗓️ PLANNING MODE — Build a structured, executable plan with clear milestones.",
        casual: "",
        creative: "💡 CREATIVE MODE — Generate bold, specific, validated ideas.",
        legal: "⚖️ LEGAL MODE — Provide precise legal guidance with risk assessment.",
        hr: "👥 HR MODE — Give practical talent and team-building advice.",
        marketing: "📈 MARKETING MODE — Deliver data-driven marketing strategy and tactics.",
        unknown: "",
    };

    const label = intentLabels[intent.intent];
    if (!label) return "";

    return `## 🎯 DETECTED INTENT: ${label}\n\n`;
}
