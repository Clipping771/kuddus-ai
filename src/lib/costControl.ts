/**
 * Cost Control — Smart Model Selection
 *
 * Analyzes query complexity and automatically selects the most cost-efficient
 * model that can handle the task. Saves API quota for complex queries.
 *
 * Tiers:
 * - SIMPLE:  Short factual questions, greetings, simple lookups → fast cheap model (Groq)
 * - MEDIUM:  Business advice, analysis, moderate length → mid-tier free model
 * - COMPLEX: Deep strategy, code architecture, Brain Trust → powerful model
 * - VISION:  Any image/file attached → vision-capable model
 */

export type QueryComplexity = "simple" | "medium" | "complex" | "vision";

export interface ModelRecommendation {
    complexity: QueryComplexity;
    recommendedModel: string;
    useGroq: boolean;
    groqModel?: string;
    reason: string;
    estimatedTokens: number;
}

// Signals that indicate a SIMPLE query (fast + cheap)
const SIMPLE_SIGNALS = [
    // Greetings
    /^(hi|hello|hey|salaam|assalamu|হ্যালো|হাই|কেমন আছ|কি খবর)\b/i,
    // Very short messages
];

// Keywords that indicate COMPLEX query (needs powerful model)
const COMPLEX_KEYWORDS = [
    "architecture", "system design", "microservice", "scalab", "enterprise",
    "full strategy", "comprehensive", "detailed plan", "complete roadmap",
    "financial model", "dcf", "valuation", "pitch deck", "investor",
    "legal contract", "compliance framework", "audit", "due diligence",
    "machine learning", "neural network", "deep learning", "transformer",
    "database schema", "api design", "security audit", "penetration",
    "বিস্তারিত", "সম্পূর্ণ পরিকল্পনা", "বিশ্লেষণ", "কৌশল",
];

// Keywords that indicate MEDIUM complexity
const MEDIUM_KEYWORDS = [
    "explain", "how to", "what is", "compare", "difference", "suggest",
    "recommend", "help me", "idea", "plan", "strategy", "analyze",
    "বলো", "কীভাবে", "কী", "তুলনা", "পরামর্শ", "আইডিয়া",
];

/**
 * Analyze message complexity and recommend the best model.
 * Zero latency — pure heuristic, no API call.
 */
export function analyzeQueryComplexity(
    message: string,
    hasImage: boolean,
    isBrainTrust: boolean,
    agentId?: string
): ModelRecommendation {
    // Vision always needs a vision-capable model
    if (hasImage) {
        return {
            complexity: "vision",
            recommendedModel: "meta-llama/llama-3.2-11b-vision-instruct:free",
            useGroq: false,
            reason: "Image attached — vision model required",
            estimatedTokens: 2000,
        };
    }

    // Brain Trust always uses complex pipeline
    if (isBrainTrust) {
        return {
            complexity: "complex",
            recommendedModel: "deepseek/deepseek-r1-0528:free",
            useGroq: true,
            groqModel: "llama-3.3-70b-versatile",
            reason: "Brain Trust mode — maximum intelligence",
            estimatedTokens: 8000,
        };
    }

    const msgLen = message.length;
    const lowerMsg = message.toLowerCase();

    // DevMind agent always gets complex treatment
    if (agentId === "devmind-agent") {
        return {
            complexity: "complex",
            recommendedModel: "meta-llama/llama-3.3-70b-instruct:free",
            useGroq: true,
            groqModel: "llama-3.3-70b-versatile",
            reason: "DevMind agent — engineering precision required",
            estimatedTokens: 4000,
        };
    }

    // SIMPLE: very short message or greeting pattern
    if (msgLen < 40 || SIMPLE_SIGNALS.some((r) => r.test(message))) {
        return {
            complexity: "simple",
            recommendedModel: "mistralai/mistral-7b-instruct:free", // Non-thinking, fast
            useGroq: true,
            groqModel: "llama-3.1-8b-instant",
            reason: "Short/simple query — fast model sufficient",
            estimatedTokens: 500,
        };
    }

    // COMPLEX: long message or complex keywords
    const hasComplexKeyword = COMPLEX_KEYWORDS.some((kw) => lowerMsg.includes(kw));
    if (hasComplexKeyword || msgLen > 500) {
        return {
            complexity: "complex",
            recommendedModel: "meta-llama/llama-3.3-70b-instruct:free", // Non-thinking, powerful
            useGroq: true,
            groqModel: "llama-3.3-70b-versatile",
            reason: hasComplexKeyword ? "Complex domain keywords detected" : "Long message — detailed response needed",
            estimatedTokens: 4000,
        };
    }

    // MEDIUM: default for most business queries
    return {
        complexity: "medium",
        recommendedModel: "meta-llama/llama-3.3-70b-instruct:free",
        useGroq: true,
        groqModel: "llama-3.3-70b-versatile",
        reason: "Standard business query",
        estimatedTokens: 2000,
    };
}

/**
 * Get max_tokens based on complexity — avoids wasting quota on simple queries
 */
export function getMaxTokensForComplexity(complexity: QueryComplexity): number {
    switch (complexity) {
        case "simple": return 800;
        case "medium": return 2000;
        case "complex": return 4000;
        case "vision": return 2500;
        default: return 2000;
    }
}
