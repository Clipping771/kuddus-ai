// ============================================================
// Tavily Web Search Utility for Kacha Morich AI
// Provides real-time market data, news, trends to the LLM
// ============================================================

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
  query: string;
}

// Agents that ALWAYS perform web search
const ALWAYS_SEARCH_AGENTS = new Set([
  "crypto-stock-researcher",
  "daily-innovation-idea-agent",
  "personal-cfo-finance-agent",
  "sales-lead-generator",
]);

// Keywords that trigger web search in any agent
const SEARCH_TRIGGER_KEYWORDS_EN = [
  "latest", "current", "today", "news", "now", "recent", "2024", "2025", "2026",
  "price", "trend", "market", "rate", "update", "new", "best", "top", "ranking",
  "how much", "cost", "salary", "revenue", "growth", "statistics", "data",
  "competitor", "compare", "vs", "versus", "review", "available", "popular",
];

const SEARCH_TRIGGER_KEYWORDS_BN = [
  "বর্তমান", "আজকের", "এখন", "সর্বশেষ", "নতুন", "কত", "দাম", "মূল্য",
  "ট্রেন্ড", "বাজার", "খবর", "আপডেট", "তথ্য", "পরিসংখ্যান", "জনপ্রিয়",
  "সেরা", "তুলনা", "রিভিউ", "প্রতিযোগী", "আয়", "বেতন", "খরচ",
];

/**
 * Determines if a user message needs a web search
 */
export function needsWebSearch(message: string, agentId?: string): boolean {
  if (!message) return false;

  // Always search for specific agents
  if (agentId && ALWAYS_SEARCH_AGENTS.has(agentId)) return true;

  const lowerMsg = message.toLowerCase();

  // Check English trigger keywords
  if (SEARCH_TRIGGER_KEYWORDS_EN.some(kw => lowerMsg.includes(kw))) return true;

  // Check Bengali trigger keywords
  if (SEARCH_TRIGGER_KEYWORDS_BN.some(kw => message.includes(kw))) return true;

  return false;
}

/**
 * Calls Tavily API and returns formatted search context for LLM injection
 */
export async function performWebSearch(
  query: string,
  agentId?: string
): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set — skipping web search.");
    return null;
  }

  // Customize search depth for research-heavy agents
  const searchDepth = agentId === "crypto-stock-researcher" ? "advanced" : "basic";
  const maxResults = agentId === "crypto-stock-researcher" ? 7 : 5;

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: query,
        search_depth: searchDepth,
        include_answer: true,
        include_raw_content: false,
        max_results: maxResults,
        include_domains: [],
        exclude_domains: [],
      }),
    });

    if (!response.ok) {
      console.warn(`Tavily search failed: ${response.status}`);
      return null;
    }

    const data: TavilyResponse = await response.json();

    if (!data.results || data.results.length === 0) return null;

    // Format results for LLM injection
    const formattedResults = data.results
      .slice(0, maxResults)
      .map((r, i) => `[${i + 1}] **${r.title}**\nSource: ${r.url}\n${r.content}`)
      .join("\n\n");

    const tavilyContext = `## 🔍 REAL-TIME WEB SEARCH RESULTS
Query: "${query}"
Retrieved: ${new Date().toUTCString()}

${data.answer ? `**Quick Answer:** ${data.answer}\n\n` : ""}**Detailed Sources:**
${formattedResults}

---
INSTRUCTION: Use the above real-time data to ground your response with accurate, current information. Always cite sources when using specific facts, prices, or statistics from these results.`;

    return tavilyContext;
  } catch (err) {
    console.error("Tavily search error:", err);
    return null;
  }
}

/**
 * Extracts a clean search query from the user's full message
 * (strips file attachments and base64 images)
 */
export function extractSearchQuery(message: string): string {
  // Remove base64 image tags
  let clean = message.replace(/\[IMAGE_BASE64:[^\]]+\]/g, "");
  // Remove attached document blocks
  clean = clean.replace(/\[ATTACHED DOCUMENT:[^\]]+\][\s\S]*?```[\s\S]*?```/g, "");
  // Remove "User Prompt:" prefix
  clean = clean.replace(/User Prompt:\s*/g, "");
  // Trim and limit length for search query
  return clean.trim().slice(0, 300);
}
