/**
 * Dynamic Agent Router
 *
 * Instead of the user manually selecting an agent,
 * this module analyzes the user's message and automatically
 * selects the best agent(s) for the job.
 *
 * Uses a fast keyword-based classifier first (zero latency),
 * with an optional LLM fallback for ambiguous queries.
 */

export interface AgentRouteResult {
    primaryAgent: string;
    confidence: "high" | "medium" | "low";
    reason: string;
}

// Keyword map — each agent has trigger keywords/phrases
// Ordered by specificity (more specific patterns first)
const AGENT_KEYWORD_MAP: Array<{
    agentId: string;
    keywords: string[];
    banglaKeywords: string[];
}> = [
        {
            agentId: "devmind-agent",
            keywords: [
                "code", "bug", "error", "debug", "function", "api", "database", "sql",
                "react", "next.js", "nextjs", "typescript", "javascript", "python", "node",
                "docker", "deploy", "server", "backend", "frontend", "component", "hook",
                "architecture", "system design", "microservice", "rest api", "graphql",
                "git", "github", "ci/cd", "devops", "kubernetes", "aws", "vercel",
                "supabase", "prisma", "orm", "migration", "schema", "index", "query",
                "performance", "optimization", "security", "vulnerability", "auth",
                "jwt", "oauth", "cors", "xss", "injection", "encrypt", "hash",
                "algorithm", "data structure", "complexity", "refactor", "review my code",
                "fix this", "what's wrong", "how to implement", "build a", "create a",
                "write a function", "write a component", "write an api", "tech stack",
                "which framework", "which library", "should i use", "best practice",
                "production ready", "scalable", "maintainable", "test", "unit test",
                "integration test", "playwright", "jest", "vitest", "tailwind", "css",
                "responsive", "mobile", "pwa", "websocket", "streaming", "rag", "vector",
                "embedding", "llm", "openai", "groq", "openrouter", "prompt engineering",
            ],
            banglaKeywords: [
                "কোড", "বাগ", "এরর", "ডিবাগ", "ফাংশন", "এপিআই", "ডেটাবেস",
                "রিঅ্যাক্ট", "নেক্সট", "টাইপস্ক্রিপ্ট", "জাভাস্ক্রিপ্ট", "পাইথন",
                "ডকার", "ডিপ্লয়", "সার্ভার", "ব্যাকএন্ড", "ফ্রন্টএন্ড",
                "আর্কিটেকচার", "সিস্টেম ডিজাইন", "সিকিউরিটি", "পারফরম্যান্স",
                "কোড রিভিউ", "ফিক্স করো", "কীভাবে বানাবো", "টেক স্ট্যাক",
            ],
        },
        {
            agentId: "personal-cfo-finance-agent",
            keywords: [
                "finance", "financial", "budget", "cash flow", "revenue", "profit",
                "loss", "expense", "cost", "pricing", "valuation", "runway", "burn rate",
                "tax", "vat", "accounting", "bookkeeping", "invoice", "payroll",
                "investment", "roi", "margin", "break even", "forecast", "p&l",
                "balance sheet", "income statement", "dcf", "unit economics",
            ],
            banglaKeywords: [
                "ফাইন্যান্স", "বাজেট", "আয়", "ব্যয়", "লাভ", "ক্ষতি", "ট্যাক্স",
                "ভ্যাট", "বিনিয়োগ", "মূল্য নির্ধারণ", "রানওয়ে", "ক্যাশ ফ্লো",
            ],
        },
        {
            agentId: "investor-pitch-agent",
            keywords: [
                "pitch", "investor", "funding", "raise", "seed", "series a", "vc",
                "venture capital", "angel", "deck", "pitch deck", "term sheet",
                "equity", "dilution", "cap table", "pre-money", "post-money",
                "fundraising", "accelerator", "y combinator", "startup valuation",
            ],
            banglaKeywords: [
                "পিচ", "বিনিয়োগকারী", "ফান্ডিং", "ভেঞ্চার ক্যাপিটাল", "পিচ ডেক",
                "ইকুইটি", "স্টার্টআপ ভ্যালুয়েশন",
            ],
        },
        {
            agentId: "research-agent",
            keywords: [
                "market research", "market size", "tam", "sam", "som", "swot",
                "industry analysis", "feasibility", "market trend", "consumer behavior",
                "survey", "report", "statistics", "data analysis", "pestle",
            ],
            banglaKeywords: [
                "মার্কেট রিসার্চ", "বাজার বিশ্লেষণ", "সোয়ট", "শিল্প বিশ্লেষণ",
                "সম্ভাব্যতা", "পরিসংখ্যান",
            ],
        },
        {
            agentId: "competitor-spy-agent",
            keywords: [
                "competitor", "competition", "rival", "vs", "versus", "compare",
                "competitive analysis", "market position", "pricing strategy",
                "competitor weakness", "steal market share", "differentiate",
            ],
            banglaKeywords: [
                "প্রতিযোগী", "প্রতিযোগিতা", "তুলনা", "প্রতিযোগিতামূলক বিশ্লেষণ",
            ],
        },
        {
            agentId: "sales-lead-generator",
            keywords: [
                "sales", "lead", "prospect", "cold email", "outreach", "pipeline",
                "crm", "conversion", "funnel", "b2b sales", "b2c sales", "spin selling",
                "bant", "follow up", "close deal", "objection handling",
            ],
            banglaKeywords: [
                "সেলস", "লিড", "কোল্ড ইমেইল", "আউটরিচ", "পাইপলাইন", "কনভার্সন",
            ],
        },
        {
            agentId: "content-creator-agent",
            keywords: [
                "content", "copywriting", "script", "hook", "viral", "youtube",
                "tiktok", "reel", "blog post", "article", "headline", "aida",
                "storybrand", "marketing copy", "ad copy", "email newsletter",
            ],
            banglaKeywords: [
                "কন্টেন্ট", "কপিরাইটিং", "স্ক্রিপ্ট", "হুক", "ভাইরাল", "ব্লগ",
            ],
        },
        {
            agentId: "social-media-manager",
            keywords: [
                "social media", "instagram", "facebook", "linkedin", "twitter", "x",
                "tiktok", "post", "caption", "hashtag", "content calendar", "engagement",
                "followers", "brand awareness", "organic reach",
            ],
            banglaKeywords: [
                "সোশ্যাল মিডিয়া", "ইনস্টাগ্রাম", "ফেসবুক", "লিংকডইন", "পোস্ট",
                "ক্যাপশন", "হ্যাশট্যাগ", "কন্টেন্ট ক্যালেন্ডার",
            ],
        },
        {
            agentId: "legal-compliance-agent",
            keywords: [
                "legal", "contract", "nda", "terms of service", "privacy policy",
                "compliance", "regulation", "gdpr", "license", "intellectual property",
                "trademark", "copyright", "lawsuit", "liability", "agreement",
            ],
            banglaKeywords: [
                "আইনি", "চুক্তি", "এনডিএ", "কমপ্লায়েন্স", "নিয়ন্ত্রণ", "লাইসেন্স",
            ],
        },
        {
            agentId: "hr-recruiting-agent",
            keywords: [
                "hire", "hiring", "recruit", "job description", "interview", "onboarding",
                "employee", "team", "hr", "human resources", "salary", "compensation",
                "performance review", "culture", "remote work", "star method",
            ],
            banglaKeywords: [
                "নিয়োগ", "চাকরির বিবরণ", "ইন্টারভিউ", "অনবোর্ডিং", "কর্মী", "টিম",
            ],
        },
        {
            agentId: "performance-marketer-agent",
            keywords: [
                "facebook ads", "google ads", "paid ads", "roas", "cac", "ltv",
                "ctr", "cpm", "cpc", "seo", "sem", "ppc", "retargeting", "lookalike",
                "conversion rate", "landing page", "a/b test", "funnel optimization",
            ],
            banglaKeywords: [
                "ফেসবুক অ্যাড", "গুগল অ্যাড", "পেইড অ্যাড", "এসইও", "কনভার্সন রেট",
            ],
        },
        {
            agentId: "project-manager-agent",
            keywords: [
                "project plan", "roadmap", "sprint", "agile", "scrum", "kanban",
                "milestone", "deadline", "task breakdown", "wbs", "moscow",
                "product roadmap", "backlog", "user story", "epic", "timeline",
            ],
            banglaKeywords: [
                "প্রজেক্ট প্ল্যান", "রোডম্যাপ", "স্প্রিন্ট", "এজাইল", "মাইলস্টোন",
                "টাস্ক ব্রেকডাউন",
            ],
        },
        {
            agentId: "it-automation-consultant",
            keywords: [
                "automation", "zapier", "make.com", "n8n", "workflow", "no-code",
                "low-code", "saas tools", "crm", "erp", "integration", "webhook",
                "airtable", "notion", "monday", "asana", "hubspot",
            ],
            banglaKeywords: [
                "অটোমেশন", "ওয়ার্কফ্লো", "নো-কোড", "ইন্টিগ্রেশন", "স্যাস টুলস",
            ],
        },
        {
            agentId: "pain-point-scraper-agent",
            keywords: [
                "pain point", "customer complaint", "frustration", "problem", "unmet need",
                "market gap", "what do people hate", "reddit complaints", "app reviews",
                "customer feedback", "user frustration",
            ],
            banglaKeywords: [
                "পেইন পয়েন্ট", "গ্রাহকের অভিযোগ", "সমস্যা", "মার্কেট গ্যাপ",
            ],
        },
        {
            agentId: "daily-innovation-idea-agent",
            keywords: [
                "idea", "business idea", "startup idea", "new business", "opportunity",
                "niche", "side hustle", "passive income", "innovative", "unique idea",
                "what business", "what startup", "suggest a business",
            ],
            banglaKeywords: [
                "আইডিয়া", "ব্যবসার আইডিয়া", "স্টার্টআপ আইডিয়া", "নতুন ব্যবসা",
                "সুযোগ", "নিশ", "সাইড হাসল",
            ],
        },
    ];

/**
 * Fast keyword-based agent classifier.
 * Returns the best matching agent based on keyword overlap.
 * Zero latency — no API call needed.
 */
export function classifyAgentByKeywords(message: string): AgentRouteResult | null {
    if (!message || message.length < 5) return null;

    const lowerMsg = message.toLowerCase();
    const scores: Record<string, number> = {};

    for (const agentDef of AGENT_KEYWORD_MAP) {
        let score = 0;

        // Check English keywords
        for (const kw of agentDef.keywords) {
            if (lowerMsg.includes(kw)) {
                // Longer keyword matches = higher confidence
                score += kw.split(" ").length > 1 ? 3 : 1;
            }
        }

        // Check Bangla keywords
        for (const kw of agentDef.banglaKeywords) {
            if (message.includes(kw)) {
                score += kw.length > 4 ? 3 : 1;
            }
        }

        if (score > 0) {
            scores[agentDef.agentId] = score;
        }
    }

    if (Object.keys(scores).length === 0) return null;

    // Find highest scoring agent
    const sortedAgents = Object.entries(scores).sort(([, a], [, b]) => b - a);
    const [topAgentId, topScore] = sortedAgents[0];

    // Determine confidence based on score
    let confidence: "high" | "medium" | "low";
    if (topScore >= 5) confidence = "high";
    else if (topScore >= 2) confidence = "medium";
    else confidence = "low";

    // Only route if confidence is at least medium
    if (confidence === "low" && topScore < 2) return null;

    return {
        primaryAgent: topAgentId,
        confidence,
        reason: `Matched ${topScore} keyword signals`,
    };
}

/**
 * Get a human-readable agent name from ID
 */
export function getAgentDisplayName(agentId: string): string {
    const nameMap: Record<string, string> = {
        "devmind-agent": "DevMind (Senior Engineer)",
        "daily-innovation-idea-agent": "Innovation Idea Agent",
        "personal-cfo-finance-agent": "CFO Finance Agent",
        "research-agent": "Market Research Agent",
        "competitor-spy-agent": "Competitor Intelligence Agent",
        "project-manager-agent": "Project Manager Agent",
        "code-helper-developer-agent": "CTO & Technical Architect",
        "sales-lead-generator": "Sales & Lead Generator",
        "content-creator-agent": "Content Creator Agent",
        "social-media-manager": "Social Media Manager",
        "legal-compliance-agent": "Legal & Compliance Agent",
        "hr-recruiting-agent": "HR & Recruiting Agent",
        "investor-pitch-agent": "Investor Pitch Agent",
        "performance-marketer-agent": "Performance Marketer",
        "it-automation-consultant": "IT Automation Consultant",
        "pain-point-scraper-agent": "Pain-Point Scraper",
    };
    return nameMap[agentId] || agentId;
}
