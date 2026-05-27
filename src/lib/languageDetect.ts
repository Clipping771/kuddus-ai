/**
 * Advanced Language Detection for Kacha Morich AI
 *
 * Detects: Pure Bangla, Pure English, Banglish (Roman Bangla),
 * Mixed (Bangla + English), and gives confidence scores.
 *
 * This is the foundation for dynamic, language-aware responses.
 */

export type DetectedLanguage = "bangla" | "english" | "banglish" | "mixed" | "unknown";

export interface LanguageDetectionResult {
    primary: DetectedLanguage;
    hasBanglaScript: boolean;    // Unicode Bangla characters
    hasBanglish: boolean;        // Roman script Bangla words
    hasEnglish: boolean;
    banglaRatio: number;         // 0-1
    confidence: "high" | "medium" | "low";
    langInstruction: string;     // Ready-to-inject system prompt instruction
}

// Common Banglish words (Roman script Bangla)
const BANGLISH_PATTERNS = [
    /\b(ami|tumi|apni|amar|tomar|apnar|amra|tomra|apnara)\b/i,
    /\b(ki|kি|keno|kothay|kothai|kokhon|kobe|koto|kotokhon)\b/i,
    /\b(ache|achhe|achen|achhen|nei|nai|hobe|hoy|hoye|holo|hoyeche)\b/i,
    /\b(bhalo|valo|kharap|sundor|boro|choto|nতুন|purano)\b/i,
    /\b(dao|den|dao|nao|nen|jao|jan|aso|asen|bosho|bosen)\b/i,
    /\b(ekta|ekti|duita|duiti|tinta|tiniti|onek|kichhu|kichu)\b/i,
    /\b(thik|theek|theke|thekে|diye|niye|kore|kori|korbo|korben)\b/i,
    /\b(jani|janি|bujhi|bujhি|dekhi|dekhি|shuni|shunি)\b/i,
    /\b(startup|business|company|product|service|market|customer)\b/i, // common in Banglish business context
    /\b(apnar|apnader|amader|tomader|tader|oder)\b/i,
    /\b(lagbe|lagche|laglo|dorkar|proyojon|shomossa|problem)\b/i,
    /\b(khaichi|khacchi|jacchi|ashchi|korchi|bolchi|likhchi)\b/i,
];

// Bangla Unicode range
const BANGLA_UNICODE_REGEX = /[\u0980-\u09FF]/;
const BANGLA_UNICODE_GLOBAL = /[\u0980-\u09FF]/g;

/**
 * Detect language from user message with high accuracy.
 */
export function detectLanguage(message: string): LanguageDetectionResult {
    if (!message || message.trim().length === 0) {
        return {
            primary: "unknown",
            hasBanglaScript: false,
            hasBanglish: false,
            hasEnglish: false,
            banglaRatio: 0,
            confidence: "low",
            langInstruction: "",
        };
    }

    const clean = message.trim();
    const totalChars = clean.replace(/\s+/g, "").length;

    // Count Bangla Unicode characters
    const banglaMatches = clean.match(BANGLA_UNICODE_GLOBAL) || [];
    const banglaCharCount = banglaMatches.length;
    const banglaRatio = totalChars > 0 ? banglaCharCount / totalChars : 0;

    const hasBanglaScript = banglaCharCount > 0;

    // Check for Banglish patterns
    const hasBanglish = BANGLISH_PATTERNS.some((pattern) => pattern.test(clean));

    // Check for English (Latin characters)
    const latinChars = (clean.match(/[a-zA-Z]/g) || []).length;
    const hasEnglish = latinChars > 3;

    // Determine primary language
    let primary: DetectedLanguage;
    let confidence: "high" | "medium" | "low";

    if (banglaRatio > 0.6) {
        primary = "bangla";
        confidence = banglaRatio > 0.8 ? "high" : "medium";
    } else if (banglaRatio > 0.2 && hasEnglish) {
        primary = "mixed";
        confidence = "high";
    } else if (hasBanglish && !hasBanglaScript) {
        primary = "banglish";
        confidence = hasBanglish ? "medium" : "low";
    } else if (hasBanglaScript && banglaRatio <= 0.2) {
        primary = "mixed";
        confidence = "medium";
    } else {
        primary = "english";
        confidence = hasEnglish ? "high" : "low";
    }

    // Generate language instruction for system prompt
    const langInstruction = buildLangInstruction(primary, hasBanglaScript, hasBanglish);

    return {
        primary,
        hasBanglaScript,
        hasBanglish,
        hasEnglish,
        banglaRatio,
        confidence,
        langInstruction,
    };
}

/**
 * Build a precise language instruction for the LLM system prompt.
 */
function buildLangInstruction(
    primary: DetectedLanguage,
    hasBanglaScript: boolean,
    hasBanglish: boolean
): string {
    switch (primary) {
        case "bangla":
            return `LANGUAGE RULE: The user is writing in Bengali (Bangla). You MUST respond entirely in natural, fluent Bengali script (বাংলা). Do NOT use English except for technical terms that have no Bengali equivalent (e.g. API, SaaS, ROI). Write like a professional Bangladeshi business consultant.`;

        case "banglish":
            return `LANGUAGE RULE: The user is writing in Banglish (Bengali using Roman/English script). Respond in the SAME Banglish style — use Roman script to write Bengali words naturally. Mix English technical terms freely. Example style: "Apnar business er jonno ekta solid plan dorkar. First, market research koro..."`;

        case "mixed":
            return `LANGUAGE RULE: The user is mixing Bengali and English naturally. Match their exact style — respond with the same mix of Bengali script and English. Use Bengali for conversational parts, English for technical/business terms. This is natural Bangladeshi professional communication.`;

        case "english":
            return `LANGUAGE RULE: The user is writing in English. Respond entirely in clear, professional English.`;

        default:
            return `LANGUAGE RULE: Detect the language of the user's message and respond in the exact same language and script.`;
    }
}

/**
 * Quick check — is this message primarily Bangla/Banglish?
 * Used for fast decisions without full detection.
 */
export function isBanglaOrBanglish(message: string): boolean {
    if (!message) return false;
    if (BANGLA_UNICODE_REGEX.test(message)) return true;
    return BANGLISH_PATTERNS.some((p) => p.test(message));
}
