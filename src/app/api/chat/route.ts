import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import Groq from "groq-sdk";
import { needsWebSearch, performWebSearch, extractSearchQuery } from "@/lib/search";

const Kacha_Morich_CORE_PERSONALITY = `## IDENTITY
You are "Kacha Morich AI" — a brutally honest Personal Business Advisor who has seen it all.
20+ years of experience across 4 continents: Asia, Europe, North America, and the Middle East.
You have taken 80+ startups and SMEs from raw idea to profitable business across multiple markets and industries.
Deep expertise in: E-commerce, SaaS, F&B, Fashion, Logistics, EdTech, Fintech, and Local Service businesses.
You have a unique personality — your name makes people smile, but your advice makes them think.
You are funny when appropriate, but never at the cost of honesty.
You have witnessed dozens of failures firsthand — which makes your advice sharp, realistic, and battle-tested.
You do not work for everyone. You work for people serious about building something real.

## LANGUAGE RULE (NON-NEGOTIABLE)
Detect the language of the user's FIRST message.
Respond in that exact language for the ENTIRE conversation.
Bengali → Bengali | English → English | Arabic → Arabic | French → French | Any language → Same language.
Never mix languages in a single response.
Never switch unless the user explicitly switches first.

## PERSONALITY & TONE
- Mentor, not a cheerleader
- Direct, blunt, zero sugar-coating
- Occasionally dry humor — but never loses seriousness
- Bad idea = say it clearly in the FIRST line
- Identify problems BEFORE strengths
- Challenge vague assumptions — ask sharp questions
- No filler words, no empty praise
- Always consider the user's specific country/market before advising

## TOOLS
- Web Search → latest market data, news, trends for user's country
- Google Trends → validate demand before making any claim
- Browser Control → visit competitor websites, check real pricing
- News Fetcher → latest business/economic news for user's market

CRITICAL: Always identify user's country/market FIRST.
If unknown → ask before any analysis.
Never fabricate statistics.
If data unavailable → say so clearly.

## CORE RULES
1. Always identify country/market before analysis.
   If not mentioned → ask first.
2. No generic advice. Every answer market-specific.
3. No numbers without verified data.
4. Weak idea → say it in line 1.
5. Need more info → ask max 2 questions first.
6. Never repeat advice. Push conversation forward.

## ATTACHMENT & VISION HANDLING RULE (CRITICAL)
When the user provides an image, photo, or document attachment:
- You are a fully multimodal AI. You CAN visually see, inspect, and analyze the image perfectly!
- If the image contains a product, design, storefront, logo, kitchen, or any visual asset, analyze it directly and give your brutally honest, expert business and innovation insights on it!
- Never say "I am a text-based AI" or "I cannot visually see". You see the image perfectly.
- Analyze both the visual details in the image and any user typed text to give incredibly sharp, realistic, and battle-tested advice.`;

const GENERAL_BUSINESS_ADVISOR_FORMAT = `
## OUTPUT FORMAT (never break this structure)

### ⚡ VERDICT
Go / No-Go / Pivot
One brutally honest line. No softening.

### 📊 ANALYSIS
**Market**
- Size & growth trend (with source)
- Demand signal (Google Trends / news)
- Is the timing right for THIS specific market?

**Competition**
- Top 3-5 real competitors (local + global)
- Their strengths and weaknesses
- Real gap in the market (if any)

**Your Edge**
- Realistic Unfair Advantage — or honest admission that none exists
- Can you actually compete here?

### 🛠️ IMPLEMENTATION ROADMAP
Numbered steps by Week / Month.
Realistic timeline — no fantasy deadlines.
Tailored to user's country (regulations, platforms, costs).

### ⚠️ CRITICAL RISKS & MITIGATION
Minimum 3 real, market-specific risks.
Format: Risk → Why it matters → How to reduce it.

### ➡️ NEXT 7 DAYS ACTION PLAN
Maximum 7 items.
Each item completable within 24-48 hours.
Zero vague advice.

## OPENING MESSAGE
Detect language from user's first message.
Default to English if no message yet.

English:
"I'm Kacha Morich AI. Unusual name, unusual advice. But if you want to stop wasting time and actually grow, you're in the right place. What's the problem?"

Bengali:
"আমি Kacha Morich AI। নামটা একটু অন্যরকম, পরামর্শও তাই। সময় নষ্ট না করে আসল কাজে নামতে চাইলে বলো, সমস্যা কী?"

Arabic:
"أنا Kacha Morich AI. اسم غريب، ونصائح غريبة. لكن إذا كنت تريد التوقف عن إضاعة الوقت والنمو فعلياً، فأنت في المكان الصحيح. ما هي المشكلة؟"`;

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

  "pain-point-scraper-agent": `## ADVANCED AGENT PROTOCOL: Pain-Point Scraper & Market Gap Analyst
**Objective**: Function as a relentless web research analyst. You must actively search the web, Reddit, forums, and app reviews to find real-world complaints, frustrations, and unmet needs that can be turned into a business.
**Frameworks to Apply**:
1. Job-to-be-Done (JTBD) Theory (What are people trying to do but failing at?)
2. The Friction Mapping Framework (identifying high-friction points in daily life or B2B operations)
**Output Structure Requirements**:
- **Top Complaints & Frustrations**: Direct summaries of what people are actively complaining about online regarding the user's topic (e.g., "People on Reddit hate how hard it is to X").
- **The Market Gap**: The exact feature, service, or product that is missing in the current market.
- **Problem-to-Business Model**: How to monetize the solution to this specific complaint (e.g., B2B SaaS, Niche Service, Chrome Extension).
*CRITICAL: You MUST trigger a web search (Tavily) to find recent complaints and frustrations. Do not just guess. Find real data.*`
};

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatId, agentId, toneId, aiName = "Specialist AI", tonePrompt, modelId } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Lazy initialize Groq inside POST to satisfy compile-time build traces
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || "gsk_placeholder_compile_key_12345",
    });

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

      const { data: newChat, error: chatError } = await supabase
        .from("chats")
        .insert({
          user_id: dbUser.id,
          title: serializedTitle,
        })
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

    // 4. Retrieve historical messages for context
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("History fetch error:", historyError);
    }

    const customizedCorePersonality = Kacha_Morich_CORE_PERSONALITY.replace(/Nova AI/g, aiName).replace(/Kacha Morich AI/g, aiName);
    const customizedGeneralFormat = GENERAL_BUSINESS_ADVISOR_FORMAT.replace(/Nova AI/g, aiName).replace(/Kacha Morich AI/g, aiName);

    let agentSystemPrompt = `${customizedCorePersonality}\n${customizedGeneralFormat}`;
    
    // 4b. Dynamic Tone Override Engine (Deep string-manipulation for non-brutal tones)
    if (tonePrompt) {
      const isBrutallyHonest = tonePrompt.toLowerCase().includes("brutally honest") || tonePrompt.toLowerCase().includes("roast-heavy");
      
      if (isBrutallyHonest) {
        agentSystemPrompt = `## IDENTITY & PERSONALITY RULES
${customizedCorePersonality}

## CRITICAL TONE & STYLE OVERRIDE
The user has requested a specific communication style. YOU MUST ADHERE TO THIS STYLE in every response:
- **Requested Style**: ${tonePrompt}
- **Formatting Rule**: Always deliver your insights using your default structured business format:
${customizedGeneralFormat}`;
      } else {
        // NON-BRUTAL TONE: Actively strip and rewrite Kacha Morich's harsh identity rules to prevent prompt conflicts
        let relaxedPersonality = customizedCorePersonality
          .replace(/- Direct, blunt, zero sugar-coating/g, `- Direct but supportive, warm, and constructive`)
          .replace(/- Mentor, not a cheerleader/g, `- Supportive mentor and encouraging cheerleader`)
          .replace(/brutally honest/gi, `helpful and friendly`)
          .replace(/roast-heavy/gi, `supportive`)
          .replace(/bluntness/gi, `helpfulness`)
          .replace(/Weak idea → say it in line 1./g, `If an idea is weak, explain why kindly and offer solutions.`)
          .replace(/Bad idea = say it clearly in the FIRST line/g, `Help the user refine their ideas with positive reinforcement.`);

        agentSystemPrompt = `## IDENTITY & PERSONALITY RULES (DYNAMICS UPDATED)
${relaxedPersonality}

## STRICT STYLE OVERRIDE (CRITICAL - PRIORITY 1)
You MUST answer strictly using the following tone. YOU ARE FORBIDDEN FROM USING A HARSH, BLUNT, OR ROASTING STYLE. DO NOT use the rigid "VERDICT", "ANALYSIS", or "IMPLEMENTATION ROADMAP" headings unless the user explicitly asks for them. Speak naturally, fluidly, and beautifully as requested:
- **Requested Tone**: ${tonePrompt}
- **Formatting Requirement**: Speak in a highly natural, conversational, fluid style. Keep your paragraphs readable, friendly, and fully aligned with the requested tone.`;
      }
    }

    if (agentId) {
      const selectedAgentPrompt = AGENT_INSTRUCTIONS[agentId];
      if (selectedAgentPrompt) {
        const baseSystemPrompt = agentSystemPrompt;
        agentSystemPrompt = `## STRICT PRIMARY ROLE (OVERRIDE)
${selectedAgentPrompt}

## PERSONALITY & CORE IDENTITY
You are STILL "${aiName}" — a 20-year veteran business professional specifically acting as THIS CURRENT SPECIALIZED AGENT.
CRITICAL INSTRUCTION: If the user asks "who are you", "what do you do" ("tumi ki koro"), or anything about your identity, YOU MUST introduce yourself as ${aiName} acting as this agent!

## STYLE, TONE, AND FORMATTING INSTRUCTIONS
${baseSystemPrompt}`;
      }
    }

    // 5a. 🔍 Tavily Web Search — inject real-time data if query is time-sensitive
    if (needsWebSearch(message, agentId)) {
      const searchQuery = extractSearchQuery(message);
      console.log(`[WebSearch] Searching Tavily for: "${searchQuery}"`);
      const searchContext = await performWebSearch(searchQuery, agentId);
      if (searchContext) {
        agentSystemPrompt += `\n\n${searchContext}`;
        console.log("[WebSearch] ✅ Tavily results injected into system prompt.");
      }
    }

    // 5b. Format history for LLM messages array (System prompt must be at position 0)
    const formattedMessages: any[] = [
      {
        role: "system",
        content: agentSystemPrompt,
      },
    ];

    const hasImage = message.includes("[IMAGE_BASE64:") || (history && history.some((h: any) => h.content.includes("[IMAGE_BASE64:")));

    const parseMessageContent = (role: string, rawContent: string) => {
      if (role !== "user" || !rawContent) return rawContent;
      
      const base64Regex = /\[IMAGE_BASE64:(data:image\/[^\]]+)\]/;
      const match = rawContent.match(base64Regex);

      if (match && hasImage) {
        const imageUrl = match[1];
        const textPrompt = rawContent.replace(base64Regex, "").trim();
        return [
          {
            type: "text",
            text: textPrompt || "Analyze this image.",
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ];
      }

      return rawContent.replace(base64Regex, "").trim();
    };

    if (history && history.length > 0) {
      // Keep only the last 15 messages to prevent context window token limits (500 Invalid Request Error)
      const maxHistory = 15;
      const truncatedHistory = history.slice(-maxHistory);

      truncatedHistory.forEach((msg, idx) => {
        // Force the LLM to remember its current selected agent right before answering the latest query
        if (idx === truncatedHistory.length - 1 && agentId) {
          formattedMessages.push({
            role: "system",
            content: `[URGENT ROLE REMINDER: You are ${aiName} currently acting strictly in your specialized role. Do NOT fall back to your general persona from earlier in this chat. If the user asks what you do, explain your specialized agent role!]`
          });
        }

        formattedMessages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: parseMessageContent(msg.role, msg.content),
        });
      });
    } else {
      // Fallback if history query returns empty but we know we just saved the user message
      formattedMessages.push({
        role: "user",
        content: parseMessageContent("user", message),
      });
    }

    // 6. Call OpenRouter API with Streaming
    const primaryModel = modelId || "google/gemma-4-31b-it";
    let selectedModel = hasImage ? "google/gemini-2.5-flash" : primaryModel;
    const fallbackModels = hasImage 
      ? ["google/gemini-2.5-flash"] 
      : [primaryModel, "google/gemma-4-26b-a4b-it:free", "google/gemini-2.5-flash"];

    let response: any;
    for (let i = 0; i < fallbackModels.length; i++) {
      selectedModel = fallbackModels[i];
      try {
        console.log(`Successfully initiating OpenRouter stream with model: ${selectedModel}`);
        response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://kachamorich.vercel.app",
            "X-Title": "Kacha Morich AI",
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: formattedMessages,
            stream: true,
            max_tokens: 3000,
          }),
        });

        if (response.ok) {
          break; // Stream successfully opened!
        }

        const errText = await response.text();
        console.warn(`OpenRouter model ${selectedModel} failed with response: ${response.status} - ${errText}`);
        if (i === fallbackModels.length - 1) {
          throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
        }
      } catch (err: any) {
        console.warn(`Error connecting to model ${selectedModel}:`, err.message || err);
        if (i === fallbackModels.length - 1) {
          throw err; // All models failed, rethrow final error
        }
        console.log(`Attempting fallback to next OpenRouter model...`);
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errText}`);
    }

    const encoder = new TextEncoder();
    let assistantResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        // Enqueue activeChatId as metadata line so the frontend knows what chatId was resolved
        controller.enqueue(encoder.encode(`__CHAT_ID__:${activeChatId}\n`));

        try {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          if (!reader) {
            throw new Error("No reader stream available on OpenRouter response");
          }

          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              if (trimmed === "data: [DONE]") continue;

              if (trimmed.startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(trimmed.slice(6));
                  const text = parsed.choices[0]?.delta?.content || "";
                  if (text) {
                    assistantResponse += text;
                    controller.enqueue(encoder.encode(text));
                  }
                } catch (e) {
                  // Ignore parsing errors for heartbeats or incomplete chunks
                }
              }
            }
          }

          // Save completed assistant response to Supabase
          if (assistantResponse) {
            const { error: assistantSaveError } = await supabase
              .from("messages")
              .insert({
                chat_id: activeChatId,
                role: "assistant",
                content: assistantResponse,
              });

            if (assistantSaveError) {
              console.error("Failed to save Kacha Morich response:", assistantSaveError);
            }
          }
        } catch (streamErr) {
          console.error("Error while processing OpenRouter stream:", streamErr);
          controller.enqueue(encoder.encode("\n[Error: Stream interrupted]"));
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
