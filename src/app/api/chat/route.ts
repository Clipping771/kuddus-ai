import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import Groq from "groq-sdk";
import { needsWebSearch, performWebSearch, extractSearchQuery } from "@/lib/search";

const Kacha_Morich_CORE_PERSONALITY = `You are **Kacha Morich AI** 🌶️ — The Sharpest Enterprise-Grade Multi-Model Business Decision Engine in the world.

Your personality: Extremely sharp, confident, slightly witty, no-nonsense, and highly professional. You speak like a world-class business consultant — direct, insightful, and result-driven. You naturally mix Bangla and English when the user does, otherwise respond in the user's language.

## Core Identity
- You are not an ordinary AI. You are the **complete Executive Board** of a high-growth company — all 15 world-class specialists compressed into one super-intelligent system.
- Your goal is always maximum business value, speed, and clarity.
- You operate globally with no geographic limitations.

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
- **UML and Document Artifact Sandbox**: You can generate fully functional, complete UML diagrams (Sequence, Flowcharts, ERD, Class, State diagrams etc.) using clean and self-contained mermaid syntax code blocks. 
  When the user asks you to create/generate a PDF report, MS Word document, or Excel sheet, structure your response as a highly-formatted document or tabular table. The dashboard automatically wraps these into interactive Claude-style Artifact Cards where they can download the real PDF, DOCX, CSV/Excel, or high-resolution PNG/SVG images in one single click!

## Response Rules
- Always be highly actionable, structured, and professional.
- Use headings, bullet points, tables, and strategic emojis.
- For every major recommendation, include: estimated cost, timeline, expected ROI, and risk level.
- Adapt to user's language: If user writes in Bangla → reply mainly in natural, professional Bangla. If English → reply in English.
- Never give generic advice. Always push for sharpness and execution.

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
- Never give vague, generic, or filler advice. Every word must add value.`;



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

    const { message, chatId, agentId, toneId, aiName = "Specialist AI", tonePrompt, modelId, isBrainTrust } = await req.json();

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
    
    // 4b. Dynamic Tone Override Engine
    const isBrutallyHonest = !tonePrompt || tonePrompt.toLowerCase().includes("brutally honest") || tonePrompt.toLowerCase().includes("roast-heavy");
    
    if (!isBrutallyHonest && tonePrompt) {
      // Strip ALL aggressive/sharp language from the core personality for non-brutal tones
      let softPrompt = agentSystemPrompt
        .replace(/no-nonsense/gi, "supportive")
        .replace(/cut through bullshit/gi, "provide clear guidance")
        .replace(/Sharp like morich 🌶️, confident, bold, and practical\./gi, "Warm, supportive, and practical.")
        .replace(/Extremely sharp, confident, slightly witty, no-nonsense/gi, "Warm, friendly, professional")
        .replace(/Never give generic advice\. Always push for sharpness and execution\./gi, "Always give thoughtful, well-structured advice.");
      
      agentSystemPrompt = softPrompt;
    }

    // 4c. Assemble Agent-specific prompt with tone at ABSOLUTE TOP
    if (agentId) {
      const selectedAgentPrompt = AGENT_INSTRUCTIONS[agentId];
      if (selectedAgentPrompt) {
        const toneBlock = tonePrompt ? `## 🔒 TONE INSTRUCTION (ABSOLUTE HIGHEST PRIORITY — OVERRIDE EVERYTHING BELOW)
Your emotional tone for this ENTIRE response MUST be exactly:
**[ ${tonePrompt} ]**
${!isBrutallyHonest ? "You are STRICTLY FORBIDDEN from being harsh, blunt, sarcastic, or roasting. Adapt your ENTIRE personality to the requested tone. This overrides ALL other instructions below." : "Be direct, sharp, and brutally honest as requested."}\n\n` : "";

        agentSystemPrompt = `${toneBlock}## STRICT PRIMARY ROLE
${selectedAgentPrompt}

## PERSONALITY & CORE IDENTITY
You are "${aiName}", acting as this specialized agent.

## BASE GUIDELINES
${agentSystemPrompt}`;
      }
    } else if (tonePrompt && !isBrutallyHonest) {
      // No agent selected, but tone is non-brutal — still enforce tone
      agentSystemPrompt = `## 🔒 TONE INSTRUCTION (ABSOLUTE HIGHEST PRIORITY)
Your emotional tone for this ENTIRE response MUST be exactly:
**[ ${tonePrompt} ]**
You are STRICTLY FORBIDDEN from being harsh, blunt, sarcastic, or roasting. Adapt your ENTIRE personality to the requested tone.\n\n${agentSystemPrompt}`;
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

    // 6. Call OpenRouter API with Streaming OR Brain Trust Pipeline
    const primaryModel = modelId || "google/gemma-4-31b-it";
    
    // Brain Trust models hardcoded
    const draftModel = "arcee-ai/trinity-large-thinking:free";
    const critiqueModel = "google/gemma-4-31b-it";
    const synthModel = primaryModel; // The user's selected model synthesizes the final response

    const encoder = new TextEncoder();
    let assistantResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        // Enqueue activeChatId as metadata line so the frontend knows what chatId was resolved
        controller.enqueue(encoder.encode(`__CHAT_ID__:${activeChatId}\n`));

        // Helper for Brain Trust non-streaming calls
        const fetchSyncOpenRouter = async (model: string, msgs: any[]) => {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://kachamorich.vercel.app",
            },
            body: JSON.stringify({ model, messages: msgs, stream: false }),
          });
          if (!res.ok) throw new Error("Brain trust step failed");
          const data = await res.json();
          return data.choices[0]?.message?.content || "";
        };

        try {
          if (isBrainTrust && !hasImage) { 
            // MULTI-AGENT BRAIN TRUST PIPELINE

            // Detect user's language from their message
            const hasBangla = /[\u0980-\u09FF]/.test(message);
            const langInstruction = hasBangla
              ? "CRITICAL: You MUST respond entirely in Bengali (Bangla) script. Do NOT use English in your response."
              : "CRITICAL: Detect the language of the user's original message and respond ENTIRELY in that exact same language. Do NOT switch to English or any other language.";

            controller.enqueue(encoder.encode("\n\n> 🧠 **KACHA MORICH BRAIN TRUST ACTIVATED**\n> Assembling the 15-Agent Executive Board for Deep Analysis...\n\n"));
            
            // Readable model name helpers
            const draftModelName = draftModel.includes("trinity") ? "DeepSeek Trinity" : draftModel.split("/")[1];
            const critiqueModelName = critiqueModel.includes("gemma") ? "Google Gemma 4 31B" : critiqueModel.split("/")[1];
            const synthModelName = synthModel.includes("gemma") ? "Google Gemma 4 31B" : synthModel.includes("trinity") ? "DeepSeek Trinity" : synthModel.includes("deepseek-v4-flash") ? "DeepSeek Flash" : synthModel.split("/")[1];

            // Step 1: Draft by CFO & Project Manager
            controller.enqueue(encoder.encode(`> 📝 **[CFO & Project Manager]** *(powered by ${draftModelName})* is drafting the financial runway and operational roadmap...\n`));
            const draftMessages = [...formattedMessages, { role: "user", content: `Act as the CFO and Project Manager. Draft the initial business model, financial metrics, and week-by-week implementation roadmap. Focus strictly on numbers, execution timelines, and costs. ${langInstruction}` }];
            const draftText = await fetchSyncOpenRouter(draftModel, draftMessages);
            controller.enqueue(encoder.encode(`> ✅ **${draftModelName}** → Financial Runway & Roadmap Draft Completed.\n\n`));

            // Step 2: Critique by CTO & Marketing Specialists
            controller.enqueue(encoder.encode(`> 🕵️ **[CTO & Marketing Director]** *(powered by ${critiqueModelName})* is ruthlessly testing the tech-stack, product-market fit, and risk profile...\n`));
            const critiqueMessages = [
              ...formattedMessages, 
              { role: "assistant", content: `Here is the initial CFO & PM roadmap:\n\n${draftText}` }, 
              { role: "user", content: `Act as the CTO and Chief Marketing Officer. Critically review the draft above. Identify technical bottlenecks, marketing gaps, competitive threats, and structural loopholes. Be brutally honest, highly technical, and deeply analytical. ${langInstruction}` }
            ];
            const critiqueText = await fetchSyncOpenRouter(critiqueModel, critiqueMessages);
            controller.enqueue(encoder.encode(`> ✅ **${critiqueModelName}** → Tech-Stack & Market-Fit Peer Review Completed.\n\n`));

            // Step 3: Synthesis Stream by the CEO (Main Brain)
            controller.enqueue(encoder.encode(`> ✨ **[CEO Synthesizer]** *(powered by ${synthModelName})* is integrating all specialist insights into the final Master Strategy...\n\n---\n\n`));
            
            const synthMessages = [
              ...formattedMessages, 
              { role: "user", content: `You are the CEO (Chief Executive Officer) of this venture. Based on my original request, your specialized departments have submitted their reports.

Here is the CFO & Project Manager's operational draft:
<draft>
${draftText}
</draft>

Here is the CTO & CMO's critical peer-review of that draft:
<critique>
${critiqueText}
</critique>

As the CEO, combine the best parts of the operational draft, resolve all the tech/marketing flaws pointed out in the critique, and synthesize the ultimate, flawless master strategy. You MUST follow your specialized formatting rules. ${tonePrompt ? `CRITICAL: Your emotional tone MUST be exactly: [ ${tonePrompt} ]. Completely drop your default personality and speak entirely in this requested tone.` : ""} ${langInstruction} Do NOT mention the internal draft or critique directly; just provide the final polished, hyper-detailed answer as if it came directly from the CEO's office.` }
            ];
            
            const synthRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://kachamorich.vercel.app",
              },
              body: JSON.stringify({ model: synthModel, messages: synthMessages, stream: true, max_tokens: 3500 }),
            });
            if (!synthRes.ok) throw new Error("Synthesis failed");

            const reader = synthRes.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6));
                    const text = parsed.choices[0]?.delta?.content || "";
                    if (text) {
                      assistantResponse += text;
                      controller.enqueue(encoder.encode(text));
                    }
                  } catch (e) {}
                }
              }
            }
          } else {
            // NORMAL SINGLE-MODEL PIPELINE
            let selectedModel = hasImage ? "google/gemini-2.5-flash" : primaryModel;
            const fallbackModels = hasImage 
              ? ["google/gemini-2.5-flash"] 
              : [primaryModel, "google/gemma-4-26b-a4b-it:free", "google/gemini-2.5-flash"];

            let response: any;
            for (let i = 0; i < fallbackModels.length; i++) {
              selectedModel = fallbackModels[i];
              try {
                response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://kachamorich.vercel.app",
                  },
                  body: JSON.stringify({ model: selectedModel, messages: formattedMessages, stream: true, max_tokens: 3000 }),
                });
                if (response.ok) break;
                if (i === fallbackModels.length - 1) throw new Error("All fallback models failed");
              } catch (err) {
                if (i === fallbackModels.length - 1) throw err;
              }
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            while (reader) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6));
                    const text = parsed.choices[0]?.delta?.content || "";
                    if (text) {
                      assistantResponse += text;
                      controller.enqueue(encoder.encode(text));
                    }
                  } catch (e) {}
                }
              }
            }
          }

          // 7. Save completed assistant response to Supabase
          if (assistantResponse) {
            const finalSavedText = (isBrainTrust && !hasImage) ? `> 🧠 **BRAIN TRUST LOGS**\n> 📝 Trinity drafted -> 🕵️ Gemma critiqued -> ✨ ${synthModel.split("/")[1]} synthesized.\n\n---\n\n${assistantResponse}` : assistantResponse;
            const { error: assistantSaveError } = await supabase
              .from("messages")
              .insert({ chat_id: activeChatId, role: "assistant", content: finalSavedText });
            if (assistantSaveError) console.error("Save error:", assistantSaveError);
          }
        } catch (streamErr) {
          console.error("Stream Error:", streamErr);
          controller.enqueue(encoder.encode("\n[Error: Stream interrupted. Please try again.]"));
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
