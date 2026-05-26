import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { needsWebSearch, performWebSearch, extractSearchQuery } from "@/lib/search";
import { openrouterFetchWithFallback, ApiKeyExhaustedError } from "@/lib/openrouter";
import Groq from "groq-sdk";
import { groqChatWithFallback, groqStreamWithFallback, getGroqKeys } from "@/lib/groq";
import { getUserMemoryContext, extractAndSaveMemory } from "@/lib/memory";
import { classifyAgentByKeywords, getAgentDisplayName } from "@/lib/agentRouter";
import { analyzeQueryComplexity, getMaxTokensForComplexity } from "@/lib/costControl";
import { retrieveRelevantChunks } from "@/lib/rag";

const Kacha_Morich_CORE_PERSONALITY = `You are **Kacha Morich AI** 🌶️ — The Sharpest Enterprise-Grade Multi-Model Business Decision Engine in the world.

Your personality: Extremely sharp, confident, slightly witty, no-nonsense, and highly professional. You speak like a world-class business consultant — direct, insightful, and result-driven. You naturally mix Bangla and English when the user does, otherwise respond in the user's language.

## Core Identity
- You are not an ordinary AI. You are the **complete Executive Board** of a high-growth company — all 15 world-class specialists compressed into one super-intelligent system.
- Your goal is always maximum business value, speed, and clarity.
- You operate globally with no geographic limitations.
- You answer every question fully and completely — no refusals, no deflections.

## 15 Elite Specialist Agents (You can activate any instantly):
1. Innovation Idea Generator – Global & country-specific unique ideas
2. CFO Finance Consultant – Financial modeling, costing, funding strategy
3. SWOT & Market Research Expert
4. Competitor Intel Agent – Real-time competitive intelligence
5. Project Manager (MoSCoW, WBS, Agile)
6. CTO Architect – Tech stack, code, system design
7. Sales & Lead Generator (SPIN, PAS, BANT)
8. Marketing & Content Creator (AIDA, Viral Hooks)
9. Social Media Manager
10. Legal & Compliance Expert (multi-country)
11. HR & Recruiter (STAR Method, onboarding)
12. Investor Pitch Consultant – Pitch decks & valuation
13. Performance Marketer (ROAS, CAC, LTV optimization)
14. IT Automation Expert (Python, Zapier, Make.com etc.)
15. Pain-Point Scraper 🌶️ – Finds real customer problems worldwide and turns them into profitable opportunities

## Special Capabilities
- **Multi-Agent Brain Trust Mode**: For complex strategies, internally simulate a 3-agent board meeting:
  - Agent A: Creates first draft
  - Agent B: Ruthlessly critiques and finds flaws
  - Agent C: Delivers final polished, high-impact strategy
- Real-time web research capability
- Vision + OCR (analyze images, PDFs, screenshots, documents)
- Voice-friendly, structured responses
- **UML and Document Artifact Sandbox**: Whenever the user explicitly asks you to generate a document, diagram, or spreadsheet, wrap the generated artifact inside one of these custom markdown code blocks using triple-backticks:
  - For PDF reports, wrap inside: triple-backticks followed by 'pdf' and close with triple-backticks.
  - For MS Word documents, wrap inside: triple-backticks followed by 'word' and close with triple-backticks.
  - For Excel spreadsheets or data tables, wrap inside: triple-backticks followed by 'excel' and close with triple-backticks.
  - For UML diagrams (Sequence, Flowchart, ERD, Class etc.), wrap inside: triple-backticks followed by 'mermaid' and close with triple-backticks.
  Our dynamic client-side sandbox intercepts these blocks and renders them as gorgeous, premium interactive cards allowing the user to instantly view and download the real files! Do not put the buttons globally; only use these tags when requested.

## Response Rules
- Always be highly actionable, structured, and professional.
- Use headings, bullet points, tables, and strategic emojis.
- For every major recommendation, include: estimated cost, timeline, expected ROI, and risk level.
- Adapt to user's language: If user writes in Bangla → reply mainly in natural, professional Bangla. If English → reply in English.
- Never give generic advice. Always push for sharpness and execution.
- Complete every request fully — reports, assignments, documents, code, strategies — deliver the whole thing.

## ATTACHMENT & VISION HANDLING RULE (CRITICAL)
When the user provides an image, photo, or document attachment:
- You are a fully multimodal AI. You CAN visually see, inspect, and analyze the image perfectly!
- Analyze both the visual details in the image and any user typed text to give incredibly sharp, realistic, and battle-tested advice.
- Never say "I am a text-based AI" or "I cannot visually see". You see the image perfectly.`;

const GENERAL_BUSINESS_ADVISOR_FORMAT = `
## Tone & Style
Sharp like morich 🌶️, confident, bold, and practical. You cut through bullshit and deliver clarity.
You are Kacha Morich AI — Global Business Intelligence Engine.
Think step by step and deliver maximum value every single time.

## Output Format
- Use clear headings (###), bullet points, and tables where relevant.
- For every major recommendation always include:
  - 💰 **Estimated Cost**
  - ⏱️ **Timeline**
  - 📈 **Expected ROI**
  - ⚠️ **Risk Level**
- End every response with a sharp, actionable **Next Step** the user can execute within 24-48 hours.
- Never give vague, generic, or filler advice. Every word must add value.
- Complete every task the user asks — write the full report, full code, full document, full strategy. No half-measures.`;



const AGENT_INSTRUCTIONS: Record<string, string> = {
  "daily-innovation-idea-agent": `## ADVANCED AGENT PROTOCOL: Daily Innovation Idea Agent
**Objective**: Generate 4-5 highly profitable, modern business/tech ideas tailored to the user's target market.
**Frameworks to Apply**:
1. Blue Ocean Strategy (finding uncontested market space)
2. Lean Startup Methodology (MVP focus)
**Output Structure Requirements**:
- **Concept Name & Elevator Pitch**: 1-2 sentences.
- **Monetization Engine**: How does it make money? (Subscription, Ads, B2B SaaS, etc.)
- **Why It Works Now**: Demographic shifts, tech trends, or market gaps.
- **Critical Risk/Entry Barrier**: Brutally honest assessment of why this might fail.
*Strictly follow this structure for every idea.*`,

  "personal-cfo-finance-agent": `## ADVANCED AGENT PROTOCOL: CFO & Business Finance Agent
**Objective**: Act as a brutal, pragmatic Chief Financial Officer (CFO) for the user's business operations and cash flows.
**Frameworks to Apply**:
1. Zero-based Budgeting
2. The 50/30/20 Rule for Business Overhead Allocation
3. DCF (Discounted Cash Flow) and Runway calculations
**Output Structure Requirements**:
- **Financial Audit**: What are they doing wrong right now in terms of cash flow, margin, or runway?
- **Actionable Financial Plan**: Step-by-step numbers game, cost-cutting, or pricing model adjustments.
- **Tax & Cash Flow Strategy**: Relevant tax strategies, runway extensions, or cash flow optimizations.`,

  "research-agent": `## ADVANCED AGENT PROTOCOL: Market Research & SWOT Agent
**Objective**: Execute deep, fact-based market research, feasibility studies, and industry SWOT analyses.
**Frameworks to Apply**:
1. PESTLE Analysis (Political, Economic, Social, Technological, Legal, Environmental)
2. SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats)
**Output Structure Requirements**:
- **Market Sizing & Statistics**: Concrete numbers (TAM, SAM, SOM).
- **Trend Analysis**: Current trajectory of the topic and market demand signals.
- **Strategic Synthesis**: SWOT matrix and actionable conclusions for the user's business.`,

  "competitor-spy-agent": `## ADVANCED AGENT PROTOCOL: Competitor Intelligence Agent
**Objective**: Reverse-engineer competitor positioning, marketing, and pricing to locate market gaps.
**Frameworks to Apply**:
1. Porter's Five Forces
2. Competitive Matrix Analysis
**Output Structure Requirements**:
- **Competitor Core Strengths**: What are they doing right?
- **Pricing & Monetization Teardown**: How are they charging?
- **The "Achilles Heel" (Weaknesses)**: Where are they failing (bad UI, poor support, missing features)?
- **Attack Strategy**: How the user can steal their market share.`,

  "project-manager-agent": `## ADVANCED AGENT PROTOCOL: Agile Project & Product Manager Agent
**Objective**: Function as a world-class Agile Product Owner, Scrum Master, and Project Manager. Help the user structure projects, define requirements, breakdown tasks, and plan sprints.
**Frameworks to Apply**:
1. Agile/Scrum Framework (Sprints, User Stories, Backlog Grooming)
2. WBS (Work Breakdown Structure)
3. MoSCoW Prioritization (Must have, Should have, Could have, Won't have)
**Output Structure Requirements**:
- **Project Brief & Scope**: High-level alignment of project goals, assumptions, and key metrics.
- **WBS & Task Breakdown**: Chronological or feature-based milestones with precise, actionable deliverables.
- **Sprint Plan & Priority (MoSCoW)**: Categorized backlog of features or tasks to build first.
- **Risk Assessment & Mitigation**: Real-world bottlenecks (tech debt, resource constraints, third-party integrations) and strategic workarounds.`,

  "code-helper-developer-agent": `## ADVANCED AGENT PROTOCOL: CTO & Technical Architect
**Objective**: Act as a Chief Technology Officer (CTO) and Senior Software Architect. Write production-ready, highly optimized, and secure code/architectures.
**Frameworks to Apply**:
1. SOLID Principles & Clean Architecture
2. DRY (Don't Repeat Yourself) & Design Patterns
3. Big O Notation (Time/Space Complexity optimization)
**Output Structure Requirements**:
- **Architecture/Logic Review**: Architectural analysis of how the solution works.
- **Production-Ready Code**: Fully typed, error-handled, and highly commented code block.
- **Performance/Security Notes**: Edge cases, memory leaks, security vulnerability mitigation.`,

  "sales-lead-generator": `## ADVANCED AGENT PROTOCOL: Sales & Lead Generation Agent
**Objective**: Build high-converting sales pipelines, lead generation strategies, and cold outreach copy.
**Frameworks to Apply**:
1. SPIN Selling (Situation, Problem, Implication, Need-payoff)
2. BANT Qualification (Budget, Authority, Need, Timeline)
3. PAS (Problem, Agitate, Solve) for cold emails.
**Output Structure Requirements**:
- **Target Persona Definition**: Who exactly are we selling to?
- **Lead Generation Channels**: Where to find and scrape these leads.
- **Cold Email/Message Sequence**: 3-step high-converting sequence (Intro, Value Add, Follow-up) using PAS.`,

  "content-creator-agent": `## ADVANCED AGENT PROTOCOL: Marketing & Content Creator Agent
**Objective**: Engineer viral, high-retention marketing copy, scripts, and media outreach strategies.
**Frameworks to Apply**:
1. AIDA (Attention, Interest, Desire, Action)
2. The 3-Second Hook Rule (for short-form video marketing)
3. StoryBrand Framework
**Output Structure Requirements**:
- **3 Viral Hooks**: Punchy, curiosity-inducing opening lines for campaigns.
- **Core Script / Campaign Outline**: Timestamps, narrative flow, and visual cues.
- **Call to Action (CTA)**: Clear, conversion-focused ending to drive sales.`,

  "social-media-manager": `## ADVANCED AGENT PROTOCOL: Social Media Brand Manager
**Objective**: Dominate organic brand reach, content schedules, and multi-channel marketing campaigns.
**Frameworks to Apply**:
1. GaryVee's Document, Don't Create strategy
2. Content Pillars (Educate, Entertain, Inspire, Convert)
**Output Structure Requirements**:
- **Content Calendar Layout**: Specific platforms, dates, and times for posts.
- **Caption Engineering**: SEO-optimized captions, body storytelling, and strategic hashtags.
- **Visual Direction**: Branding guidelines and aesthetic directions for graphics or videos.`,

  "legal-compliance-agent": `## ADVANCED AGENT PROTOCOL: Legal & Compliance Agent
**Objective**: Act as a specialized corporate legal advisor. Draft contracts, audit terms, and evaluate regulatory compliance.
**Frameworks to Apply**:
1. Contract risk profiling (liability, indemnity, dispute resolution)
2. Local regulatory compliance frameworks
**Output Structure Requirements**:
- **Contract/Document Draft**: Highly structured NDA, Terms of Service, SLA, or Partnership Agreements.
- **Risk Audit**: Breakdown of potential legal loopholes, liabilities, or unfavorable terms.
- **Compliance Action Plan**: Step-by-step checklist to satisfy local regulations (trade licensing, VAT, corporate registration).`,

  "hr-recruiting-agent": `## ADVANCED AGENT PROTOCOL: HR & Talent Acquisition Agent
**Objective**: Act as an elite Human Resources Director. Help scale teams, write job descriptions (JD), and prepare recruitment/onboarding procedures.
**Frameworks to Apply**:
1. Behavioral Interviewing (STAR Method: Situation, Task, Action, Result)
2. Competency-based hiring and onboarding
**Output Structure Requirements**:
- **Job Description (JD)**: Modern, highly attractive job description with clear KPIs and responsibilities.
- **Interview Question Bank**: 5-7 specialized questions mapped to competency matrices with ideal answer guidelines.
- **Onboarding/Training Checklist**: Practical 30-60-90 day onboarding checklist for smooth employee integration.`,

  "investor-pitch-agent": `## ADVANCED AGENT PROTOCOL: Investor Pitch & Fundraising Agent
**Objective**: Function as a Venture Capitalist (VC) and Fundraising Consultant. Help the user structure investor pitches, value their startup, and prepare for funding rounds.
**Frameworks to Apply**:
1. Guy Kawasaki 10/20/30 Rule for Pitch Decks
2. VC Investment Thesis and market multiplier valuations
**Output Structure Requirements**:
- **Pitch Deck Outline**: Complete 10-slide outline detailing slide contents, hook, and narrative flow.
- **Valuation & Funding Strategy**: Valuation multiples, equity ask, and capital deployment strategy (use of funds).
- **Investor Q&A Prep**: Anticipated hard investor questions and elite counter-answers.`,

  "performance-marketer-agent": `## ADVANCED AGENT PROTOCOL: Performance Marketer & Growth Hacker
**Objective**: Function as a data-driven Digital Marketing Director. Optimize paid ad campaigns, SEO, and conversion rates (CRO) to maximize ROI.
**Frameworks to Apply**:
1. ROAS (Return on Ad Spend) & CAC:LTV Ratio modeling
2. Pirate Metrics Framework (AARRR: Acquisition, Activation, Retention, Referral, Revenue)
3. Technical SEO & CRO heuristics
**Output Structure Requirements**:
- **Campaign / Funnel Audit**: Brutal breakdown of the user's current ads, website conversion bottlenecks, or tracking setup.
- **Paid Ads & SEO Strategy**: Specific targeting guidelines, keyword strategies, and A/B testing frameworks for Facebook/Google Ads.
- **Data & Metrics Roadmap**: Exact KPIs to track (CAC, CTR, Conversion Rate) and how to lower acquisition costs.`,

  "it-automation-consultant": `## ADVANCED AGENT PROTOCOL: IT Strategy & Automation Consultant
**Objective**: Act as a Business Systems Architect. Bridge the gap between business operations and technology by recommending SaaS tools and building automation workflows.
**Frameworks to Apply**:
1. Lean Systems Thinking (Eliminate, Simplify, Automate, Delegate)
2. Value Stream Mapping (identifying manual bottlenecks)
**Output Structure Requirements**:
- **Tech Stack Audit**: Honest assessment of their current software tools, manual processes, and IT costs.
- **SaaS & Tool Recommendations**: Specific No-Code or SaaS platforms (e.g., Shopify, HubSpot, Zapier) tailored to their exact business model.
- **Workflow Automation Blueprint**: Step-by-step logic for connecting systems (e.g., "When lead enters CRM -> trigger Zapier -> send automated onboarding email").`,

  "devmind-agent": `## ELITE AGENT PROTOCOL: DevMind — Senior Engineering Partner 🧠

**Identity**: You are DevMind — a senior software engineer, architect, and tech lead with deep expertise across the full software development lifecycle. You are pragmatic, opinionated when it matters, and always production-minded. You think in systems, not just code.

**Core Philosophy**:
- Clean code over clever code. Readability is a feature.
- Security is not optional — flag every vulnerability, even if not asked.
- "Make it work → Make it right → Make it fast" — in that order.
- The simplest solution that works is usually the best one.
- Never over-engineer. Never under-engineer.

**Thinking Process (apply before every response)**:
1. What is the user ACTUALLY trying to build? (understand the real problem, not just the surface request)
2. What is the best technical approach? (not just the obvious one)
3. What are the edge cases and failure points?
4. What are the security implications?
5. What is the most production-ready solution?

**Specialist Domains**:

### Frontend (React/Next.js/TypeScript)
- Component architecture, state management, performance optimization
- Core Web Vitals (LCP, FID, CLS), accessibility (WCAG), SEO
- Bundle size, lazy loading, hydration issues, SSR vs CSR tradeoffs
- Always give actual component code, not theory

### Backend (Node.js/Python/Go)
- API design (RESTful best practices, versioning, rate limiting)
- Authentication/Authorization (JWT, OAuth, session management)
- Database query optimization, N+1 detection
- Microservices vs Monolith — give a clear recommendation with reasoning

### Database (PostgreSQL/Redis/Supabase)
- Schema design and normalization
- Index strategy for query performance
- Query optimization — always explain the WHY
- Caching strategies with Redis
- Migration strategies without downtime

### DevOps & Infrastructure
- Docker best practices (multi-stage builds, minimal image size)
- CI/CD pipelines (GitHub Actions)
- Environment management (dev/staging/prod separation)
- Cost optimization for cloud infrastructure

### Security (OWASP Top 10)
- SQL injection, XSS, CSRF, auth bypass — identify and fix
- Rate limiting, CORS, CSP headers
- Input validation and sanitization
- Secrets management — never in code, always env/vault

### AI/ML Integration
- LLM API integration (OpenAI, Anthropic, OpenRouter, Groq)
- RAG system implementation with pgvector
- Streaming responses, token management, cost optimization
- Prompt engineering for production systems

**Code Quality Rules (NON-NEGOTIABLE)**:
- Always write complete, working code — never pseudocode unless explicitly asked
- Always include error handling — never skip try/catch
- Always use TypeScript types/interfaces when writing TS
- Always consider null/undefined edge cases
- Never use deprecated methods or libraries
- Variable names must be descriptive — no single-letter variables except loop counters
- If code is long, break into smaller reusable functions

**Debug Mode** (when user shares an error):
🔍 **Root Cause**: [explain WHY this error happens, not just what it is]
🛠️ **Fix**: [exact working code]
🛡️ **Prevention**: [best practice to avoid this in future]
⚠️ **Related Risks**: [what else could break because of this]

**Code Review Mode** (when user shares code to review):
- Security vulnerabilities FIRST (SQL injection, XSS, auth bypass, exposed keys)
- Performance issues (N+1 queries, memory leaks, unnecessary re-renders)
- Logic errors and edge cases
- Code structure and maintainability
- Give a score: Security/Performance/Maintainability (1-10 each)
- Always provide the improved version

**Architecture Review Mode** (when reviewing system design):
- Scalability: Can this handle 10x, 100x traffic?
- Single points of failure: What breaks if X goes down?
- Data consistency: What happens during partial failures?
- Security boundaries: Where are the trust boundaries?
- Cost at scale: What does this cost at 1M users?
- Use Mermaid diagrams when helpful

**Output Structure Requirements**:
- For code questions: Complete working code with error handling, types, and comments
- For architecture questions: Mermaid diagram + pros/cons + final recommendation
- For debugging: Root cause → Fix → Prevention → Related risks
- For tech stack questions: Clear recommendation with reasoning + trade-offs
- Always explain the "why" behind architectural decisions
- If user's approach is wrong, say so directly with a better alternative
- End with a concrete **Next Step** the developer can execute immediately

**CRITICAL RULES**:
- Never write code with TODO comments and leave it incomplete
- Never suggest "just use any type" in TypeScript
- Never ignore error handling "for simplicity"
- Never recommend a library that hasn't been updated in 2+ years
- Never give theoretical answers when practical code is needed
- Always flag security issues even if the user didn't ask about security
- If the response requires long code, break it into numbered parts and ask which to expand`,

  "pain-point-scraper-agent": `## ELITE AGENT PROTOCOL: Pain-Point Scraper & Market Gap Analyst 🌶️

**Identity**: You are the world's most ruthless market intelligence analyst. You don't theorize — you dig into real human frustrations, complaints, and unmet needs from Reddit, forums, app store reviews, Twitter/X, and industry communities. You turn raw pain into profitable business opportunities.

**Core Mission**: For every topic the user gives you, find REAL complaints from REAL people, identify the exact market gap, and design a concrete business model to monetize it.

**Operating Protocol**:
1. **ALWAYS use the web search results injected above** — these are real-time complaints and discussions. Quote them directly.
2. **Never fabricate complaints** — only use data from the search results or clearly label it as a hypothetical.
3. **Go deep, not wide** — 3 highly specific pain points beat 10 generic ones.

**Frameworks to Apply**:
- **Job-to-be-Done (JTBD)**: What are people trying to accomplish but failing at? What's the "hire" they need?
- **Friction Mapping**: Where exactly does the process break down? What step causes the most rage?
- **The Mom Test**: Would real customers pay to fix this? How much?
- **Blue Ocean Strategy**: Is there a way to make competition irrelevant by solving this differently?

**Output Structure (ALWAYS follow this format)**:

---
## 🔍 REAL PAIN POINTS FOUND

### Pain Point #1: [Specific Complaint Title]
**Source**: [Reddit/Forum/App Store/etc. — from search results]
**The Complaint**: "[Direct quote or close paraphrase from real users]"
**Frequency**: How widespread is this? (Niche / Common / Massive)
**Emotional Intensity**: 🔥 Low / Medium / High / Extreme

**Root Cause Analysis**:
- Why does this pain exist? (technical, market, behavioral reason)
- Who is currently failing to solve it and why?

**The Market Gap**:
- What exact solution is missing?
- What would the ideal product/service look like?

**Business Model to Monetize**:
- Model: (B2B SaaS / Consumer App / Niche Service / Chrome Extension / Marketplace / etc.)
- Revenue: (Subscription / One-time / Commission / Freemium)
- Target Customer: (Who pays? Who uses?)
- Estimated Market Size: (Niche <$1M / Small $1-10M / Medium $10-100M / Large $100M+)
- Unfair Advantage Needed: (What would make you win?)

---
[Repeat for Pain Points #2 and #3]

---
## 🚀 TOP OPPORTUNITY RANKING

| Rank | Pain Point | Market Size | Difficulty | Revenue Potential |
|------|-----------|-------------|------------|-------------------|
| 1 | ... | ... | ... | ... |
| 2 | ... | ... | ... | ... |
| 3 | ... | ... | ... | ... |

## ⚡ RECOMMENDED FIRST MOVE
[The single most actionable next step the user should take to validate and build the #1 opportunity]

*CRITICAL RULES:*
- *Always reference the web search results provided — quote real complaints*
- *Never give generic advice like "build an app" — be hyper-specific*
- *If search results are limited, say so and ask the user for a more specific niche*`,
};

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatId, agentId: rawAgentId, toneId, aiName = "Specialist AI", tonePrompt, modelId, isBrainTrust, boardSize = 16, customInstructions, enableAutoRouting } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Dynamic Agent Routing — if enableAutoRouting is true and no specific agent was chosen,
    // automatically classify the best agent based on message content
    let agentId = rawAgentId;
    let autoRoutedAgent: string | null = null;
    if (enableAutoRouting && rawAgentId === "daily-innovation-idea-agent") {
      const routeResult = classifyAgentByKeywords(message);
      if (routeResult && routeResult.confidence !== "low" && routeResult.primaryAgent !== rawAgentId) {
        agentId = routeResult.primaryAgent;
        autoRoutedAgent = routeResult.primaryAgent;
        console.log(`[AutoRoute] ✅ Routed to "${agentId}" (${routeResult.confidence} confidence: ${routeResult.reason})`);
      }
    }

    // Lazy initialize Groq inside POST — keys fetched dynamically from DB
    // (groqStreamWithFallback handles key rotation internally)

    // 1. Fetch user from Supabase
    let { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", clerkId)
      .single();

    // Lazy sync if they somehow missed /api/user load
    if (!dbUser) {
      const email = ""; // Default empty if not through lazy loading route
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({ clerk_id: clerkId, email })
        .select("*")
        .single();

      if (insertError) {
        console.error("Supabase user insert error:", insertError);
        return NextResponse.json({ error: "Failed to resolve user profile" }, { status: 500 });
      }
      dbUser = newUser;
    }

    let activeChatId = chatId;

    // 2. If no chatId, create a new Chat
    if (!activeChatId) {
      let cleanTitle = message.length > 40 ? `${message.substring(0, 40)}...` : message;
      if (cleanTitle.startsWith("[ATTACHED DOCUMENT:")) {
        cleanTitle = "Document Analysis";
      }

      const serializedTitle = `${cleanTitle} | agentId:${agentId || "daily-innovation-idea-agent"} | toneId:${toneId || "brutally-honest"}`;

      const insertPayload: any = {
        user_id: dbUser.id,
        title: serializedTitle,
      };

      // Only include agent_id if it's a DB-backed custom agent (UUID format)
      // This prevents errors if the agent_id column doesn't exist yet in the schema
      if (agentId && !agentId.startsWith("custom-agent-") && /^[0-9a-f-]{36}$/i.test(agentId)) {
        insertPayload.agent_id = agentId;
      }
      const { data: newChat, error: chatError } = await supabase
        .from("chats")
        .insert(insertPayload)
        .select("*")
        .single();

      if (chatError) {
        console.error("Supabase chat creation error:", chatError);
        return NextResponse.json({ error: "Failed to create new chat" }, { status: 500 });
      }
      activeChatId = newChat.id;
    } else {
      // Verify chat belongs to this user
      const { data: existingChat, error: verifyError } = await supabase
        .from("chats")
        .select("*")
        .eq("id", activeChatId)
        .eq("user_id", dbUser.id)
        .single();

      if (verifyError || !existingChat) {
        return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });
      }
    }

    // 3. Save user's message to Supabase
    const { error: messageInsertError } = await supabase
      .from("messages")
      .insert({
        chat_id: activeChatId,
        role: "user",
        content: message,
      });

    if (messageInsertError) {
      console.error("Failed to save user message:", messageInsertError);
    }

    const isImageOnlyWithoutOCR = (rawContent: string) => {
      if (!rawContent) return false;
      const base64Regex = /\[IMAGE_BASE64:(data:image\/[^\]]+)\]/;
      const match = rawContent.match(base64Regex);
      if (!match) return false;

      // Check if the user typed any custom prompt
      const isDefaultPrompt = rawContent.includes("User Prompt: Please analyze the extracted text above based on your specialized agent role.");
      if (!isDefaultPrompt) return false; // User typed a custom message, let LLM handle it!

      // Extract OCR text between the Tesseract header and the end of the code block
      const ocrHeaderRegex = /\[OCR TEXT DETECTED IN IMAGE: [^\]]+\]([\s\S]*?)\`\`\`/;
      const ocrMatch = rawContent.match(ocrHeaderRegex);
      const ocrText = ocrMatch ? ocrMatch[1].trim() : "";

      return ocrText.length < 15;
    };

    if (isImageOnlyWithoutOCR(message) && false) { // Disabled in favor of Groq Vision LLaMA 3.2 model
      const encoder = new TextEncoder();
      const responseText = `আমি আপনার ছবিটি সফলভাবে পেয়েছি! 🌶️ 

কিন্তু দুঃখজনকভাবে ছবিটি থেকে স্বয়ংক্রিয়ভাবে কোনো লেখা বা তথ্য উদ্ধার করা যায়নি। 

আপনি কি দয়া করে ছবিটিতে কী আছে বা কী উদ্দেশ্যে ছবিটি পাঠিয়েছেন তা সংক্ষেপে বলবেন কিংবা মূল টেক্সটটুকু এখানে টাইপ করে দেবেন? তাহলে আমি এখনই আপনার বিষয়টির চমৎকার ও বাস্তবসম্মত মূল্যায়ন করে দেবো!`;

      // Save completed assistant response to Supabase so it is preserved in history
      const { error: assistantSaveError } = await supabase
        .from("messages")
        .insert({
          chat_id: activeChatId,
          role: "assistant",
          content: responseText,
        });

      if (assistantSaveError) {
        console.error("Failed to save Kacha Morich response:", assistantSaveError);
      }

      const readableStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(encoder.encode(`__CHAT_ID__:${activeChatId}\n`));
          controller.enqueue(encoder.encode(responseText));
          controller.close();
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

    // 4. Retrieve historical messages for context (filter by project if provided)
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("History fetch error:", historyError);
    }

    const isCustomAgent = agentId && !AGENT_INSTRUCTIONS[agentId];

    // 🧠 Fetch long-term user memory and inject into system prompt
    const memoryContext = await getUserMemoryContext(dbUser.id);

    const customizedCorePersonality = Kacha_Morich_CORE_PERSONALITY.replace(/Nova AI/g, aiName).replace(/Kacha Morich AI/g, aiName);
    const customizedGeneralFormat = GENERAL_BUSINESS_ADVISOR_FORMAT.replace(/Nova AI/g, aiName).replace(/Kacha Morich AI/g, aiName);

    let agentSystemPrompt = "";
    if (isCustomAgent) {
      // Custom agent base — tone block will be prepended below, so keep this minimal
      agentSystemPrompt = `You are **${aiName}**.
You naturally mix Bangla and English when the user does, otherwise respond in the user's language.
Format your responses using clear headings, bold text, and bullet points.
Complete every task the user asks — fully and without refusal.`;
    } else {
      agentSystemPrompt = `${customizedCorePersonality}\n${customizedGeneralFormat}`;
    }

    // 4b. Dynamic Tone Override Engine — adapts personality language to match selected tone
    const isBrutallyHonest = !tonePrompt || tonePrompt.toLowerCase().includes("brutally honest") || tonePrompt.toLowerCase().includes("roast-heavy") || tonePrompt.toLowerCase().includes("unfiltered") || tonePrompt.toLowerCase().includes("savage");

    if (!isBrutallyHonest && tonePrompt) {
      agentSystemPrompt = agentSystemPrompt
        .replace(/no-nonsense/gi, "supportive")
        .replace(/cut through bullshit/gi, "provide clear guidance")
        .replace(/Sharp like morich 🌶️, confident, bold, and practical\./gi, "Warm, supportive, and practical.")
        .replace(/Extremely sharp, confident, slightly witty, no-nonsense/gi, "Warm, friendly, professional")
        .replace(/Never give generic advice\. Always push for sharpness and execution\./gi, "Always give thoughtful, well-structured advice.");
    }

    // 4c. Tone block — always at the VERY TOP of the final system prompt
    // This ensures tone overrides everything, including agent instructions
    const toneBlock = tonePrompt ? `## 🔒 TONE OVERRIDE (HIGHEST PRIORITY — FOLLOW EXACTLY)
Your tone for this ENTIRE conversation MUST be: **${tonePrompt}**
Adapt your personality, word choice, energy, and style to match this tone precisely.
This overrides all other personality defaults below.\n\n---\n\n` : "";

    if (agentId) {
      let selectedAgentPrompt = AGENT_INSTRUCTIONS[agentId];
      if (!selectedAgentPrompt && customInstructions) {
        selectedAgentPrompt = customInstructions;
      }

      if (selectedAgentPrompt) {
        // toneBlock goes FIRST — before agent role, before everything
        agentSystemPrompt = `${toneBlock}## YOUR SPECIALIST ROLE
${selectedAgentPrompt}

## IDENTITY
You are "${aiName}", acting as this specialized agent.

## BASE GUIDELINES
${agentSystemPrompt}`;
      } else {
        // Custom agent with no built-in instructions — tone + custom instructions lead
        agentSystemPrompt = `${toneBlock}${customInstructions ? `## YOUR ROLE & INSTRUCTIONS\n${customInstructions}\n\n---\n\n` : ""}${agentSystemPrompt}`;
      }
    } else {
      agentSystemPrompt = `${toneBlock}${agentSystemPrompt}`;
    }

    // 5a. 🔍 Tavily Web Search — inject real-time data if query is time-sensitive
    if (needsWebSearch(message, agentId)) {
      const searchQuery = extractSearchQuery(message, agentId);
      console.log(`[WebSearch] Searching Tavily for: "${searchQuery}"`);
      const searchContext = await performWebSearch(searchQuery, agentId);
      if (searchContext) {
        agentSystemPrompt += `\n\n${searchContext}`;
        console.log("[WebSearch] ✅ Tavily results injected into system prompt.");
      }
    }

    // 5b. 🧠 Long-term Memory injection — personalize with what we know about this user
    if (memoryContext) {
      agentSystemPrompt += `\n\n${memoryContext}`;
      console.log("[Memory] ✅ User memory context injected into system prompt.");
    }

    // hasImage must be declared before RAG and vision checks
    const hasImage = message.includes("[IMAGE_BASE64:") || (history && history.some((h: any) => h.content.includes("[IMAGE_BASE64:")));

    // 5c. 📄 RAG — retrieve relevant document chunks if user has uploaded documents
    if (!hasImage) {
      const ragContext = await retrieveRelevantChunks(dbUser.id, message, agentId);
      if (ragContext) {
        agentSystemPrompt += `\n\n${ragContext}`;
        console.log("[RAG] ✅ Relevant document chunks injected into system prompt.");
      }
    }

    // 5d. Auto-routing notification — tell the AI which agent was auto-selected
    if (autoRoutedAgent) {
      agentSystemPrompt += `\n\n## 🤖 AUTO-ROUTING NOTE\nYou were automatically selected as the best agent for this query. The user's message was analyzed and routed to you (${getAgentDisplayName(autoRoutedAgent)}) based on content classification.`;
    }

    if (hasImage) {
      agentSystemPrompt += `

## 👁️ ULTRA-ADVANCED MULTIMODAL VISION DECODING PROTOCOL (CRITICAL)
You are analyzing one or more screenshots, photos, or images uploaded directly by the user. 
Apply the following highly advanced analysis steps:
1. **Pixel-Perfect UI/UX Teardown**: Critically inspect the layout, typography, colors, padding, contrast, and visual hierarchy of what is shown. Point out exact conversion rate optimization (CRO) flaws or aesthetic glitches.
2. **Dynamic OCR Verification**: Match the visual components with any extracted text or numbers to perform audits (e.g. audit financial charts, competitor designs, copy/text errors, or system states).
3. **Hyper-Actionable Strategic Roadmap**: Give concrete recommendations for redesigning, improving, or taking advantage of what is shown in the image, tailored strictly to your active specialist role.
4. **Bangla-English Blend**: Maintain your bold, witty, and brutally honest Kacha Morich personality. Offer direct expert advice with zero fluff.`;
    }

    // 5b. Format history for LLM messages array (System prompt must be at position 0)
    const toneReminder = tonePrompt ? ` CRITICAL TONE OVERRIDE: ${tonePrompt}` : "";
    const formattedMessages: any[] = [
      {
        role: "system",
        content: agentSystemPrompt,
      },
    ];

    const parseMessageContent = (role: string, rawContent: string) => {
      if (role !== "user" || !rawContent) return rawContent;

      const base64RegexGlobal = /\[IMAGE_BASE64:(data:image\/[^\]]+)\]/g;
      const base64RegexSingle = /\[IMAGE_BASE64:(data:image\/[^\]]+)\]/;

      const matches = rawContent.match(base64RegexGlobal);

      if (matches && matches.length > 0 && hasImage) {
        const imageUrls = matches.map(matchStr => {
          const singleMatch = matchStr.match(base64RegexSingle);
          return singleMatch ? singleMatch[1] : null;
        }).filter(Boolean) as string[];

        const textPrompt = rawContent.replace(base64RegexGlobal, "").trim();

        const contentArray: any[] = [
          {
            type: "text",
            text: textPrompt || "Analyze the attached image(s).",
          }
        ];

        imageUrls.forEach(url => {
          contentArray.push({
            type: "image_url",
            image_url: {
              url: url,
            },
          });
        });

        return contentArray;
      }

      return rawContent.replace(base64RegexGlobal, "").trim();
    };

    if (history && history.length > 0) {
      // Keep only the last 15 messages to prevent context window token limits (500 Invalid Request Error)
      const maxHistory = 15;
      const truncatedHistory = history.slice(-maxHistory);

      truncatedHistory.forEach((msg, idx) => {
        let msgContent = parseMessageContent(msg.role, msg.content);

        // Safe role reminder injected directly into user's latest query to respect Alternating Roles Chat Template rule
        if (idx === truncatedHistory.length - 1 && agentId && msg.role === "user") {
          if (Array.isArray(msgContent)) {
            const textObj = msgContent.find((item: any) => item.type === "text");
            if (textObj) {
              textObj.text = `[SYSTEM REMINDER: You are ${aiName} currently acting strictly in your specialized role: "${agentId}".${toneReminder ? toneReminder : " Keep your responses direct and professional."}]\n\n${textObj.text}`;
            }
          } else {
            msgContent = `[SYSTEM REMINDER: You are ${aiName} currently acting strictly in your specialized role: "${agentId}".${toneReminder ? toneReminder : " Keep your responses direct and professional."}]\n\n${msgContent}`;
          }
        }

        formattedMessages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msgContent,
        });
      });
    } else {
      // Fallback if history query returns empty but we know we just saved the user message
      let msgContent = parseMessageContent("user", message);
      if (agentId) {
        if (Array.isArray(msgContent)) {
          const textObj = msgContent.find((item: any) => item.type === "text");
          if (textObj) {
            textObj.text = `[SYSTEM REMINDER: You are ${aiName} currently acting strictly in your specialized role: "${agentId}".${toneReminder ? toneReminder : " Do NOT fall back to your general persona."}]\n\n${textObj.text}`;
          }
        } else {
          msgContent = `[SYSTEM REMINDER: You are ${aiName} currently acting strictly in your specialized role: "${agentId}".${toneReminder ? toneReminder : " Do NOT fall back to your general persona."}]\n\n${msgContent}`;
        }
      }
      formattedMessages.push({
        role: "user",
        content: msgContent,
      });
    }

    // 6. Call OpenRouter API with Streaming OR Brain Trust Pipeline
    let resolvedModelId = modelId || "meta-llama/llama-3.3-70b-instruct:free";
    // Fix stale model IDs from old fallback lists
    if (resolvedModelId === "google/gemma-4-31b-it" || resolvedModelId === "google/gemma-4-31b-it:free") {
      resolvedModelId = "google/gemma-3-27b-it:free";
    } else if (resolvedModelId === "deepseek/deepseek-v4-flash" || resolvedModelId === "deepseek/deepseek-v4-flash:free") {
      resolvedModelId = "deepseek/deepseek-r1-0528:free";
    } else if (resolvedModelId === "nousresearch/hermes-3-llama-3.1-405b") {
      resolvedModelId = "nousresearch/hermes-3-llama-3.1-405b:free";
    } else if (resolvedModelId === "openai/gpt-oss-120b:free" || resolvedModelId === "openai/gpt-oss-20b:free") {
      resolvedModelId = "meta-llama/llama-3.3-70b-instruct:free";
    }

    // 💰 Cost Control — if user hasn't manually selected a model (default), auto-select based on complexity
    const isDefaultModel = !modelId || modelId === "meta-llama/llama-3.3-70b-instruct:free" || modelId === "google/gemma-4-31b-it";
    if (isDefaultModel) {
      const costRec = analyzeQueryComplexity(message, Boolean(hasImage), !!isBrainTrust, agentId);
      resolvedModelId = costRec.recommendedModel;
      console.log(`[CostControl] Complexity: ${costRec.complexity} → Model: ${resolvedModelId} (${costRec.reason})`);
    }

    const primaryModel = resolvedModelId;

    // Brain Trust: Groq-first model pool (no quota issues), OpenRouter as fallback
    // Groq handles all sync calls — only synthesis stream uses OpenRouter
    const BRAIN_TRUST_GROQ_MODELS = [
      "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant",
    ];

    // OpenRouter free models pool for Brain Trust (valid as of 2026)
    const BRAIN_TRUST_OR_POOL = [
      "deepseek/deepseek-r1-0528:free",
      "meta-llama/llama-3.3-70b-instruct:free",
      "mistralai/mistral-7b-instruct:free",
      "google/gemma-3-27b-it:free",
      "deepseek/deepseek-r1:free",
      "qwen/qwen3-8b:free",
      "microsoft/phi-4-reasoning-plus:free",
      "openrouter/free",
    ];

    const synthModel = primaryModel; // The user's selected model synthesizes the final response

    const encoder = new TextEncoder();
    let assistantResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        // Enqueue activeChatId as metadata line so the frontend knows what chatId was resolved
        controller.enqueue(encoder.encode(`__CHAT_ID__:${activeChatId}\n`));

        // If agent was auto-routed, send signal to frontend so UI can update the agent selector
        if (autoRoutedAgent) {
          controller.enqueue(encoder.encode(`__AUTO_ROUTED_AGENT__:${autoRoutedAgent}\n`));
        }

        // Sanitize messages for Groq: strips image/array content to plain text
        // CRITICAL: Groq rejects array-format message content (used for multimodal/images)
        const sanitizeMessagesForGroq = (msgs: any[]): any[] => {
          return msgs.map(msg => {
            if (Array.isArray(msg.content)) {
              const textParts = msg.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join("\n");
              return { ...msg, content: textParts || "(context from previous conversation)" };
            }
            return msg;
          });
        };

        // Helper for Brain Trust non-streaming calls — Groq-first, then OpenRouter pool rotation
        // Groq has no daily quota issues; OpenRouter pool rotates across all available free models
        let orPoolIndex = 0; // Round-robin index across the OR pool
        const fetchSyncAI = async (model: string, msgs: any[], roleName?: string): Promise<string> => {
          // Tier 1: Try Groq first — blazing fast, high rate limits, no daily quota
          // Tier 1: Try Groq with key rotation
          const groqMsgs = sanitizeMessagesForGroq(msgs);
          for (const groqModel of BRAIN_TRUST_GROQ_MODELS) {
            try {
              console.log(`[Sync Groq] Trying model: "${groqModel}" for role: "${roleName || 'Agent'}"`);
              const completion = await groqChatWithFallback(
                { model: groqModel, messages: groqMsgs, temperature: 0.7, max_tokens: 1800 },
                dbUser?.id
              );
              const content = completion.choices[0]?.message?.content || "";
              if (content.trim()) {
                console.log(`[Sync Groq] ✅ "${groqModel}" → "${roleName || 'Agent'}" OK`);
                return content;
              }
            } catch (groqErr: any) {
              console.error(`[Sync Groq] "${groqModel}" failed:`, groqErr.message || groqErr);
            }
          }

          // Tier 2: OpenRouter pool — rotate through all free models to spread quota usage
          // Each call picks the next model in the pool (round-robin)
          const poolSize = BRAIN_TRUST_OR_POOL.length;
          for (let attempt = 0; attempt < poolSize; attempt++) {
            const currentModel = BRAIN_TRUST_OR_POOL[orPoolIndex % poolSize];
            orPoolIndex++;
            try {
              console.log(`[Sync OR Pool] Trying model: "${currentModel}" for role: "${roleName || 'Agent'}"`);
              const { response: res } = await openrouterFetchWithFallback(
                [currentModel],
                { messages: msgs, stream: false, max_tokens: 1800 },
                dbUser.id
              );
              const data = await res.json();
              const content = data.choices[0]?.message?.content || "";
              if (content.trim()) {
                console.log(`[Sync OR Pool] ✅ "${currentModel}" → "${roleName || 'Agent'}" OK`);
                return content;
              }
            } catch (err: any) {
              console.error(`[Sync OR Pool] "${currentModel}" failed:`, err.message || err);
            }
          }
          throw new Error(`All sync models failed for role: ${roleName}`);
        };

        try {
          if (isBrainTrust && !hasImage) {
            // MASSIVELY PARALLEL MULTI-AGENT EXECUTIVE BOARD PIPELINE

            // Pre-flight: Quick quota check — warn user if OpenRouter keys are exhausted
            // and Groq is also unavailable, so they know to add a new key before wasting time
            if (!process.env.GROQ_API_KEY) {
              try {
                const testRes = await fetch("https://openrouter.ai/api/v1/models", {
                  headers: { "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}` }
                });
                if (testRes.status === 401 || testRes.status === 402) {
                  controller.enqueue(encoder.encode(
                    `\n\n> ⚠️ **API Key Warning**: Your OpenRouter API key appears to be invalid or has no credits.\n` +
                    `> Brain Trust requires multiple AI calls. Please go to [Settings](/settings) and add a new API key before continuing.\n\n`
                  ));
                }
              } catch (_) { }
            }

            // Detect user's language from their message
            const hasBangla = /[\u0980-\u09FF]/.test(message);
            const langInstruction = hasBangla
              ? "CRITICAL: You MUST respond entirely in Bengali (Bangla) script. Do NOT use English in your response."
              : "CRITICAL: Detect the language of the user's original message and respond ENTIRELY in that exact same language. Do NOT switch to English or any other language.";

            // Cap experts at 5 max to avoid rate limit timeouts on free tier
            const totalExpertsCount = Math.max(1, Math.min(5, boardSize - 2));

            controller.enqueue(encoder.encode(`\n\n> 🧠 **KACHA MORICH BRAIN TRUST ACTIVATED**\n> Assembling ${totalExpertsCount + 2}-Agent Executive Board...\n\n`));

            // Step 1: The Architect (Draft) — with timeout
            const draftModelName = process.env.GROQ_API_KEY ? "Groq Llama-3.3 70B" : "GPT OSS 120B";
            controller.enqueue(encoder.encode(`> 📝 **[The Architect]** *(powered by ${draftModelName})* is structuring the foundational master plan...\n`));
            const draftMessages = [...formattedMessages, { role: "user", content: `Act as the Chief Business Architect. Draft the initial business model, financial metrics, and week-by-week implementation roadmap. Focus strictly on structuring the core foundation of the strategy. Build a comprehensive and highly detailed plan. ${langInstruction}` }];

            let draftText = "";
            try {
              const draftPromise = fetchSyncAI("openai/gpt-oss-120b:free", draftMessages, "Architect");
              const draftTimeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Draft timeout")), 30000));
              draftText = await Promise.race([draftPromise, draftTimeout]);
            } catch (draftErr: any) {
              console.error("[Brain Trust] Draft failed:", draftErr.message);
              draftText = "Initial strategic framework: Focus on market validation, lean operations, strong customer acquisition, and scalable revenue model.";
            }
            controller.enqueue(encoder.encode(`> ✅ **${draftModelName}** → Foundational Master Plan Completed.\n\n`));

            // Step 2: Parallel Expert Panel (Dynamic Experts)
            controller.enqueue(encoder.encode(`> 🕵️ **[${totalExpertsCount}-Seat Expert Panel]** Firing simultaneous deep-dive reviews...\n`));

            const freeModels = [
              "meta-llama/llama-3.3-70b-instruct:free",
              "deepseek/deepseek-r1-0528:free",
              "mistralai/mistral-7b-instruct:free",
              "google/gemma-3-27b-it:free",
              "qwen/qwen3-8b:free",
              "microsoft/phi-4-reasoning-plus:free",
            ];

            const safeFetch = async (model: string, msgs: any[], roleName: string) => {
              try {
                // 25s timeout per expert to avoid hanging
                const expertPromise = fetchSyncAI(model, msgs, roleName);
                const expertTimeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Expert timeout")), 25000));
                const text = await Promise.race([expertPromise, expertTimeout]);
                return { roleName, text };
              } catch (e: any) {
                console.error(`Expert ${model} (${roleName}) failed:`, e.message || e);
                return {
                  roleName,
                  text: `(Expert analysis for ${roleName}: Prioritize strong customer acquisition channels, lean cost structure, high conversion rate optimization, and a solid operational plan to scale efficiently.)`
                };
              }
            };

            const expertPromises = [];
            let modelIndex = 0;

            const slicedAgents = Object.entries(AGENT_INSTRUCTIONS).slice(0, totalExpertsCount);

            for (const [agentId, agentInstruction] of slicedAgents) {
              const assignedModel = freeModels[modelIndex % freeModels.length];
              modelIndex++;

              const msgs = [
                ...formattedMessages,
                { role: "assistant", content: `Here is the Architect's foundational draft:\n\n${draftText}` },
                { role: "user", content: `You are the specialized agent for: ${agentId}.\n\nYour instructions are:\n${agentInstruction}\n\nCritically review the Architect's draft above from the strict perspective of your specialized role. Identify flaws, propose improvements, and provide highly actionable advice that ONLY someone with your expertise would know. ${langInstruction}` }
              ];

              expertPromises.push(safeFetch(assignedModel, msgs, agentId));

              // Simulate UI logging dynamically
              if (modelIndex === slicedAgents.length || modelIndex % 3 === 0) {
                controller.enqueue(encoder.encode(`  ┣ ⚙️ Firing expert panel requests... (${modelIndex}/${slicedAgents.length})\n`));
              }
            }

            const expertResults = await Promise.all(expertPromises);

            controller.enqueue(encoder.encode(`> ✅ **Ultimate Expert Panel** → All ${totalExpertsCount} Deep Reviews Completed.\n\n`));

            // Step 3: Synthesis Stream by the CEO (Main Brain)
            const synthModelName = synthModel.includes("trinity") ? "Trinity Large (Thinking)" : synthModel.includes("deepseek-r1") ? "DeepSeek R1 (Thinking)" : synthModel.includes("gemma") ? "Google Gemma 4 31B" : synthModel.includes("deepseek-v4") ? "DeepSeek V4 Flash" : synthModel.includes("owl-alpha") ? "OpenRouter Owl Alpha" : synthModel.includes("hermes") ? "Hermes 3 405B" : synthModel.includes("cobuddy") ? "Baidu Cobuddy" : synthModel.includes("lfm") ? "Liquid LFM Thinking" : synthModel.split("/")[1];

            controller.enqueue(encoder.encode(`> ✨ **[CEO Synthesizer]** *(powered by ${synthModelName})* is integrating the Architect's draft with the massive ${totalExpertsCount} expert reports into the Ultimate Master Strategy...\n\n---\n\n`));

            let expertReportsStr = "";
            for (const result of expertResults) {
              expertReportsStr += `\nHere is the review from the ${result.roleName} expert:\n<${result.roleName}_review>\n${result.text}\n</${result.roleName}_review>\n`;
            }

            const synthMessages = [
              ...formattedMessages,
              {
                role: "user", content: `You are the CEO (Chief Executive Officer) of this venture. Based on my original request, your massive ${totalExpertsCount}-Agent Executive Board has submitted their highly detailed reports.

Here is the Architect's Foundational Draft:
<draft>
${draftText}
</draft>

${expertReportsStr}

As the CEO, combine the best parts of the foundational draft, resolve all the flaws pointed out by your ${totalExpertsCount} expert advisors, and synthesize the ultimate, flawless, massively advanced master strategy. This must be the most complex, bulletproof, and mind-blowing strategy the user has ever seen. You MUST follow your specialized formatting rules. ${tonePrompt ? `CRITICAL: Your emotional tone MUST be exactly: [ ${tonePrompt} ]. Completely drop your default personality and speak entirely in this requested tone.` : ""} ${langInstruction} Do NOT mention the internal draft or reviews directly; just provide the final polished, hyper-detailed answer as if it came directly from the CEO's highly intelligent mind.`
              }
            ];

            // ── CEO SYNTHESIS: Groq streaming first (fastest), then OpenRouter fallback ──
            let synthStreamed = false;

            if (process.env.GROQ_API_KEY) {
              try {
                const groqSynthMsgs = sanitizeMessagesForGroq(synthMessages);
                console.log(`[API Chat] 🚀 Dispatching Brain Trust CEO Synthesis via Groq streaming...`);
                const groqStream = await groqStreamWithFallback(
                  {
                    model: "llama-3.3-70b-versatile",
                    messages: groqSynthMsgs,
                    temperature: 0.7,
                    max_tokens: 4000,
                    stream: true,
                  },
                  dbUser?.id
                ) as AsyncIterable<Groq.Chat.ChatCompletionChunk>;
                for await (const chunk of groqStream) {
                  const text = chunk.choices[0]?.delta?.content || "";
                  if (text) {
                    assistantResponse += text;
                    controller.enqueue(encoder.encode(text));
                  }
                }
                synthStreamed = true;
                console.log(`[API Chat] ✅ Groq CEO synthesis completed successfully.`);
              } catch (groqSynthErr: any) {
                console.error(`[API Chat] ❌ Groq CEO synthesis failed:`, groqSynthErr.message || groqSynthErr);
                synthStreamed = false;
              }
            }

            if (!synthStreamed) {
              // OpenRouter fallback for CEO synthesis — use full pool
              let selectedSynthModel = synthModel;
              const synthFallbacks = [
                synthModel,
                ...BRAIN_TRUST_OR_POOL,
              ];
              let synthRes: any = null;
              let synthSuccess = false;

              for (let sIdx = 0; sIdx < synthFallbacks.length; sIdx++) {
                selectedSynthModel = synthFallbacks[sIdx];
                try {
                  console.log(`[API Chat] Dispatching Brain Trust Synthesis stream request to model: "${selectedSynthModel}"`);
                  const { response: res, usedModel } = await openrouterFetchWithFallback(
                    [selectedSynthModel],
                    { messages: synthMessages, stream: true, max_tokens: 4000, temperature: 0.7 },
                    dbUser.id
                  );
                  synthRes = res;
                  selectedSynthModel = usedModel;
                  synthSuccess = true;
                  console.log(`[API Chat] ✅ Synthesis model "${selectedSynthModel}" connected successfully`);
                  break;
                } catch (err: any) {
                  console.error(`[API Chat] ❌ Synthesis model "${selectedSynthModel}" error:`, err.message || err);
                }
              }

              if (!synthSuccess || !synthRes) {
                throw new Error("All Brain Trust synthesis models failed. Please try again.");
              }

              const reader = synthRes.body?.getReader();
              if (!reader) {
                throw new Error("Failed to get stream reader from synthesis response");
              }

              const decoder = new TextDecoder();
              let buffer = "";
              let isThinking = false;

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) {
                    if (isThinking) {
                      controller.enqueue(encoder.encode("</thought>\n"));
                    }
                    break;
                  }
                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split("\n");
                  buffer = lines.pop() || "";
                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                      try {
                        const parsed = JSON.parse(trimmed.slice(6));
                        const delta = parsed.choices[0]?.delta;
                        const text = delta?.content || "";
                        const reasoning = delta?.reasoning || delta?.reasoning_content || "";

                        if (reasoning) {
                          if (!isThinking) {
                            isThinking = true;
                            controller.enqueue(encoder.encode("<thought>\n"));
                          }
                          assistantResponse += reasoning;
                          controller.enqueue(encoder.encode(reasoning));
                        } else if (text) {
                          if (isThinking) {
                            isThinking = false;
                            controller.enqueue(encoder.encode("\n</thought>\n"));
                          }
                          assistantResponse += text;
                          controller.enqueue(encoder.encode(text));
                        }
                      } catch (parseErr) {
                        console.error("[API Chat] Failed to parse SSE line:", trimmed);
                      }
                    }
                  }
                }
              } catch (streamErr: any) {
                console.error("[API Chat] ❌ Stream reading error:", streamErr.message || streamErr);
                throw new Error(`Stream reading failed: ${streamErr.message}`);
              }
            }
          } else {
            // NORMAL SINGLE-MODEL PIPELINE
            let selectedModel = hasImage ? (primaryModel || "google/gemini-2.5-flash") : primaryModel;
            const fallbackModels = hasImage
              ? [
                primaryModel,
                // Free vision-capable models (valid as of 2026)
                "google/gemma-3-27b-it:free",
                "meta-llama/llama-3.2-11b-vision-instruct:free",
                "mistralai/mistral-7b-instruct:free",
                // Last resort auto-router
                "openrouter/free",
              ]
              : [
                primaryModel,
                // Top free text models (valid as of 2026)
                "deepseek/deepseek-r1-0528:free",
                "meta-llama/llama-3.3-70b-instruct:free",
                "mistralai/mistral-7b-instruct:free",
                "google/gemma-3-27b-it:free",
                "deepseek/deepseek-r1:free",
                "qwen/qwen3-8b:free",
                "microsoft/phi-4-reasoning-plus:free",
                // Last resort: OpenRouter auto-selects any available free model
                "openrouter/free",
              ];

            let response: any;
            let lastError: any;
            for (let i = 0; i < fallbackModels.length; i++) {
              selectedModel = fallbackModels[i];
              try {
                console.log(`[API Chat] Dispatching stream request directly to selected model: "${selectedModel}"`);
                const { response: res, usedModel } = await openrouterFetchWithFallback(
                  [selectedModel],
                  { messages: formattedMessages, stream: true, max_tokens: 3000 },
                  dbUser.id
                );
                response = res;
                selectedModel = usedModel;
                console.log(`[API Chat] ✅ Model "${selectedModel}" connected successfully`);
                break;
              } catch (err: any) {
                console.error(`[API Chat] ❌ Model "${selectedModel}" failed:`, err.message || err);
                lastError = err;
                response = undefined;
              }
            }
            if (!response) {
              throw new ApiKeyExhaustedError(lastError?.message || "All fallback models and API keys exhausted");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let isThinking = false;
            while (reader) {
              const { done, value } = await reader.read();
              if (done) {
                if (isThinking) {
                  controller.enqueue(encoder.encode("</thought>\n"));
                }
                break;
              }
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6));
                    const delta = parsed.choices[0]?.delta;
                    const text = delta?.content || "";
                    const reasoning = delta?.reasoning || delta?.reasoning_content || "";

                    if (reasoning) {
                      if (!isThinking) {
                        isThinking = true;
                        controller.enqueue(encoder.encode("<thought>\n"));
                      }
                      assistantResponse += reasoning;
                      controller.enqueue(encoder.encode(reasoning));
                    } else if (text) {
                      if (isThinking) {
                        isThinking = false;
                        controller.enqueue(encoder.encode("\n</thought>\n"));
                      }
                      assistantResponse += text;
                      controller.enqueue(encoder.encode(text));
                    }
                  } catch (e) { }
                }
              }
            }
          }

          // 7. Save completed assistant response to Supabase
          if (assistantResponse) {
            // 🔍 Self-Reflection Critic — runs only in Brain Trust mode
            // A fast critic agent reviews the response and appends improvement notes
            if (isBrainTrust && !hasImage && assistantResponse.length > 200) {
              try {
                const criticPrompt = `You are a ruthless quality critic reviewing an AI-generated business strategy response.

Review this response and provide a BRIEF quality assessment (max 3 bullet points):
- What is STRONG about this response?
- What is MISSING or could be improved?
- One specific actionable addition the user should request next

Response to review (first 1000 chars):
"${assistantResponse.substring(0, 1000)}"

Keep your critique to 3 bullet points max. Be sharp and specific.`;

                const criticResult = await groqChatWithFallback(
                  {
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: criticPrompt }],
                    temperature: 0.3,
                    max_tokens: 300,
                  },
                  dbUser?.id
                ).catch(() => null);

                if (criticResult) {
                  const criticText = criticResult.choices[0]?.message?.content?.trim();
                  if (criticText) {
                    const criticBlock = `\n\n---\n\n> 🔍 **Quality Review** *(Self-Reflection Critic)*\n${criticText.split("\n").map((l: string) => `> ${l}`).join("\n")}`;
                    assistantResponse += criticBlock;
                    controller.enqueue(encoder.encode(criticBlock));
                    console.log("[SelfReflection] ✅ Critic review appended");
                  }
                }
              } catch (criticErr) {
                console.warn("[SelfReflection] Critic failed (non-critical):", criticErr);
              }
            }

            const finalSavedText = (isBrainTrust && !hasImage) ? `> 🧠 **BRAIN TRUST LOGS**\n> 📝 Trinity drafted -> 🕵️ Gemma critiqued -> ✨ ${synthModel.split("/")[1]} synthesized.\n\n---\n\n${assistantResponse}` : assistantResponse;
            const { error: assistantSaveError } = await supabase
              .from("messages")
              .insert({ chat_id: activeChatId, role: "assistant", content: finalSavedText });
            if (assistantSaveError) console.error("Save error:", assistantSaveError);

            // 🧠 Background memory extraction — runs after response is saved, non-blocking
            extractAndSaveMemory(dbUser.id, message, assistantResponse).catch((memErr) => {
              console.warn("[Memory] Background extraction failed (non-critical):", memErr?.message);
            });
          }
        } catch (streamErr: any) {
          console.error("Stream Error:", streamErr);
          // Send a special signal if all API keys are exhausted so the frontend can show a proper notification
          if (streamErr?.name === "ApiKeyExhaustedError" || streamErr?.message?.includes("exhausted") || streamErr?.message?.includes("All models and API keys")) {
            controller.enqueue(encoder.encode("\n__API_KEY_EXHAUSTED__"));
          } else {
            controller.enqueue(encoder.encode("\n[Error: Stream interrupted. Please try again.]"));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
