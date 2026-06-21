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
  "pain-point-scraper-agent",   // always needs real complaints data
  "research-agent",             // always needs current market data
  "competitor-spy-agent",       // always needs current competitor info
  "ethical-hacker-agent",       // always needs latest CVEs, tools, techniques
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

  // Check explicit trigger keywords
  if (SEARCH_TRIGGER_KEYWORDS_EN.some(kw => lowerMsg.includes(kw))) return true;
  if (SEARCH_TRIGGER_KEYWORDS_BN.some(kw => message.includes(kw))) return true;

  // Check fact-seeking patterns (who, what, founder, ceo, etc.)
  const factSeekingEn = /\b(who is|who are|what is|what are|where is|when did|how many|founder|ceo|creator|owner|director|president|history|biography|weather|temperature)\b/i;
  const factSeekingBn = /(কে|কী|কোথায়|কবে|কেন|কিভাবে|প্রতিষ্ঠাতা|মালিক|আবিষ্কারক|ইতিহাস|আবহাওয়া)/;
  const factSeekingBanglish = /\b(ke|kothay|kobe|kivabe|founder|ceo|owner|history)\b/i;

  if (factSeekingEn.test(lowerMsg)) return true;
  if (factSeekingBn.test(message)) return true;
  // Make sure it's a question format for Banglish to avoid false positives
  if (factSeekingBanglish.test(lowerMsg) && lowerMsg.includes("?")) return true;

  return false;
}

/**
 * Calls Tavily API and returns formatted search context for LLM injection
 */
export async function performWebSearch(
  query: string,
  agentId?: string
): Promise<string | null> {
  // Intercept for Pain Point Scraper Agent using actual Reddit JSON endpoint
  if (agentId === "pain-point-scraper-agent") {
    return scrapeReddit(query);
  }

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set — skipping web search.");
    return null;
  }

  // Customize search depth for research-heavy agents
  const searchDepth = (agentId === "crypto-stock-researcher" || agentId === "pain-point-scraper-agent" || agentId === "research-agent" || agentId === "ethical-hacker-agent") ? "advanced" : "basic";
  const maxResults = (agentId === "crypto-stock-researcher" || agentId === "pain-point-scraper-agent" || agentId === "research-agent" || agentId === "ethical-hacker-agent") ? 8 : 5;

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

    // Format results for LLM injection — prioritize high-score results
    const sortedResults = data.results
      .slice(0, maxResults)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const formattedResults = sortedResults
      .map((r, i) => `[${i + 1}] **${r.title}**\nSource: ${r.url}\n${r.content.substring(0, 600)}`)
      .join("\n\n");

    const tavilyContext = `## 🔍 REAL-TIME WEB DATA (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})
${data.answer ? `**Direct Answer:** ${data.answer}\n\n` : ""}**Sources:**
${formattedResults}

---
INSTRUCTION: Integrate this real-time data naturally into your response. Use specific numbers, names, and facts from these sources. Cite sources inline as [1], [2] etc. when quoting specific data points. Do NOT just list the sources — weave the data into your analysis.`;

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
export function extractSearchQuery(message: string, agentId?: string): string {
  // Remove base64 image tags
  let clean = message.replace(/\[IMAGE_BASE64:[^\]]+\]/g, "");
  // Remove attached document blocks
  clean = clean.replace(/\[ATTACHED DOCUMENT:[^\]]+\][\s\S]*?```[\s\S]*?```/g, "");
  // Remove "User Prompt:" prefix
  clean = clean.replace(/User Prompt:\s*/g, "");
  clean = clean.trim().slice(0, 300);

  // For pain point scraper, add Reddit/forum context to get real complaints
  if (agentId === "pain-point-scraper-agent") {
    return `${clean} complaints problems frustrations Reddit forum reviews`;
  }

  // For ethical hacker, focus on latest CVEs, tools, and security research
  if (agentId === "ethical-hacker-agent") {
    return `${clean} CVE exploit vulnerability pentest 2025 security research`;
  }

  // For competitor spy, add competitor-specific context
  if (agentId === "competitor-spy-agent") {
    return `${clean} competitor analysis pricing reviews alternatives`;
  }

  // For research agent, add market data context
  if (agentId === "research-agent") {
    return `${clean} market size trends statistics 2025 2026`;
  }

  return clean;
}

/**
 * Scrapes Reddit directly using the public JSON endpoints.
 * Specifically pulls real user complaints and frustrations for the Pain Point Scraper agent.
 */
async function scrapeReddit(query: string): Promise<string | null> {
  try {
    // We clean the query to remove generic words and focus on the product/topic
    const cleanQuery = query.replace(/(complaints|problems|frustrations|Reddit|forum|reviews)/gi, "").trim();
    if (!cleanQuery) return null;

    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(cleanQuery + " issue OR problem OR complain OR suck")}&sort=relevance&limit=8`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "KachaMorichAI/1.0 (Web Scraper for Pain Point Analysis)"
      }
    });

    if (!response.ok) {
      console.warn(`Reddit scraper failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const posts = data?.data?.children || [];

    if (posts.length === 0) return null;

    const formattedResults = posts.map((post: any, i: number) => {
      const p = post.data;
      const desc = p.selftext ? p.selftext.substring(0, 500) + (p.selftext.length > 500 ? "..." : "") : "No text (Title only/Link)";
      return `[${i + 1}] **r/${p.subreddit}**: ${p.title}\nUpvotes: ${p.score} | Comments: ${p.num_comments}\n${desc}`;
    }).join("\n\n---\n\n");

    return `## 🔴 RAW REDDIT PAIN POINT DATA (${new Date().toLocaleDateString()})
**Source:** Direct Reddit Scrape for query "${cleanQuery}"

${formattedResults}

---
INSTRUCTION: These are REAL, unfiltered complaints and discussions from Reddit users. Use this raw qualitative data to identify genuine pain points, user frustrations, and unmet needs. Quote specific frustrations (anonymously) to prove your points.`;
  } catch (err) {
    console.error("Reddit scrape error:", err);
    return null;
  }
}
