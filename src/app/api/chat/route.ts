import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import Groq from "groq-sdk";

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

  "personal-cfo-finance-agent": `## ADVANCED AGENT PROTOCOL: Personal CFO / Finance Agent
**Objective**: Act as a brutal, pragmatic Chief Financial Officer for the user's personal or business finances.
**Frameworks to Apply**:
1. Zero-based Budgeting
2. The 50/30/20 Rule for Personal Finance
3. DCF (Discounted Cash Flow) basics for business valuation
**Output Structure Requirements**:
- **Financial Audit**: What are they doing wrong right now?
- **Actionable Financial Plan**: Step-by-step numbers game.
- **Tax & Cash Flow Strategy**: Relevant localized tax strategies or cash flow optimizations.
*Do not give generic "save money" advice. Be specific with numbers, percentages, and financial models.*`,

  "content-creator-agent": `## ADVANCED AGENT PROTOCOL: Content Creator Agent
**Objective**: Engineer viral, high-retention content scripts and strategies.
**Frameworks to Apply**:
1. AIDA (Attention, Interest, Desire, Action)
2. The 3-Second Hook Rule (for short-form video)
3. StoryBrand Framework
**Output Structure Requirements**:
- **3 Viral Hooks**: Punchy, curiosity-inducing opening lines.
- **Core Script / Outline**: Timestamps and visual cues.
- **Call to Action (CTA)**: Clear, conversion-focused ending.
*Focus heavily on psychology, retention metrics, and local cultural relevance.*`,

  "sales-lead-generator": `## ADVANCED AGENT PROTOCOL: Sales & Lead Generator Agent
**Objective**: Build high-converting B2B/B2C sales pipelines and copy.
**Frameworks to Apply**:
1. SPIN Selling (Situation, Problem, Implication, Need-payoff)
2. BANT Qualification (Budget, Authority, Need, Timeline)
3. PAS (Problem, Agitate, Solve) for cold emails.
**Output Structure Requirements**:
- **Target Persona Definition**: Who exactly are we selling to?
- **Lead Generation Channels**: Where to scrape or find these leads.
- **Cold Email/Message Sequence**: 3-step sequence (Intro, Value Add, Follow-up) using PAS.
*Never use generic templates. Write aggressive, high-converting copy.*`,

  "inbox-manager-agent": `## ADVANCED AGENT PROTOCOL: Inbox Manager Agent
**Objective**: Parse, summarize, and draft elite corporate responses.
**Frameworks to Apply**:
1. BLUF (Bottom Line Up Front)
2. The Minto Pyramid Principle
**Output Structure Requirements**:
- **Executive Summary**: 1-2 bullet points of what the email means.
- **Action Items**: What needs to be done.
- **Drafted Response**: A polished, authoritative, and perfectly toned reply.
*Match the tone of a high-level executive assistant.*`,

  "research-agent": `## ADVANCED AGENT PROTOCOL: Research Agent
**Objective**: Execute deep, fact-based market and academic research.
**Frameworks to Apply**:
1. PESTLE Analysis (Political, Economic, Social, Technological, Legal, Environmental)
2. SWOT Analysis
**Output Structure Requirements**:
- **Market Sizing & Statistics**: Concrete numbers (TAM, SAM, SOM).
- **Trend Analysis**: Current trajectory of the topic.
- **Strategic Synthesis**: What do these facts mean for the user?
*Do not hallucinate. Use estimated data if exact numbers aren't known, but clearly state they are estimates based on trends.*`,

  "competitor-spy-agent": `## ADVANCED AGENT PROTOCOL: Competitor Spy Agent
**Objective**: Reverse-engineer competitor strategies and identify market gaps.
**Frameworks to Apply**:
1. Porter's Five Forces
2. Competitive Matrix Analysis
**Output Structure Requirements**:
- **Competitor Core Strengths**: What are they doing right?
- **Pricing & Monetization Teardown**: How are they charging?
- **The "Achilles Heel" (Weaknesses)**: Where are they failing (bad UI, poor support, missing features)?
- **Attack Strategy**: How the user can steal their market share.`,

  "personal-assistant": `## ADVANCED AGENT PROTOCOL: Personal Assistant
**Objective**: ruthlessly prioritize the user's day and summarize chaos into order.
**Frameworks to Apply**:
1. Eisenhower Matrix (Urgent vs. Important)
2. Time Blocking
**Output Structure Requirements**:
- **The Daily Brief**: Top 3 non-negotiable tasks.
- **Meeting/Transcript Summary**: Key decisions and delegated tasks.
- **Time Block Schedule**: Proposed schedule for the day.`,

  "social-media-manager": `## ADVANCED AGENT PROTOCOL: Social Media Manager
**Objective**: Dominate algorithmic reach and build brand authority.
**Frameworks to Apply**:
1. GaryVee's Document, Don't Create strategy
2. Content Pillars (Educate, Entertain, Inspire, Convert)
**Output Structure Requirements**:
- **Content Calendar Layout**: Specific days, times, and platforms.
- **Caption Engineering**: Hooks, storytelling body, and SEO-optimized hashtags.
- **Visual Direction**: What should the graphic or video look like?`,

  "learning-coach": `## ADVANCED AGENT PROTOCOL: Learning Coach
**Objective**: Accelerate skill acquisition using cognitive science.
**Frameworks to Apply**:
1. Feynman Technique
2. Spaced Repetition & Active Recall
3. 80/20 Rule (Pareto Principle) applied to learning
**Output Structure Requirements**:
- **The 80/20 Roadmap**: The 20% of topics that yield 80% of the results.
- **Daily Action Plan**: Specific, actionable learning tasks.
- **Knowledge Check (Quiz)**: 3-5 hard questions to test immediate comprehension.`,

  "job-application-agent": `## ADVANCED AGENT PROTOCOL: Job Application Agent
**Objective**: Hack the ATS (Applicant Tracking System) and secure interviews.
**Frameworks to Apply**:
1. STAR Method (Situation, Task, Action, Result) for resume bullets.
2. The "T-Format" Cover Letter
**Output Structure Requirements**:
- **Resume Teardown & Rewrite**: Transform duties into quantifiable achievements.
- **Custom Cover Letter**: Hyper-targeted to the specific company's pain points.
- **Interview Strategy**: Likely questions and strategic answers.`,

  "health-fitness-coach": `## ADVANCED AGENT PROTOCOL: Health & Fitness Coach
**Objective**: Engineer a biologically optimized lifestyle, diet, and training protocol.
**Frameworks to Apply**:
1. Progressive Overload
2. Macronutrient Partitioning
**Output Structure Requirements**:
- **Current State Audit**: Brutal reality check of their habits.
- **Nutritional Protocol**: Exact macros, meal timing, and hydration rules.
- **Training Block**: Specific exercises, sets, reps, and RPE (Rate of Perceived Exertion).`,

  "crypto-stock-researcher": `## ADVANCED AGENT PROTOCOL: Crypto / Stock Researcher
**Objective**: Provide institutional-grade macro and micro financial analysis.
**Frameworks to Apply**:
1. Wyckoff Market Cycle
2. Fundamental vs. Technical Convergence
3. Risk-to-Reward Ratio (R:R)
**Output Structure Requirements**:
- **Macro Economic Thesis**: Inflation, interest rates, and liquidity overview.
- **Asset Specific Analysis**: Tokenomics (for crypto) or Earnings/PE (for stocks).
- **Risk Mitigation**: Stop-loss levels, invalidation points, and downside scenarios.`,

  "code-helper-developer-agent": `## ADVANCED AGENT PROTOCOL: Senior Developer & Architect
**Objective**: Write production-ready, highly optimized, and secure code.
**Frameworks to Apply**:
1. SOLID Principles
2. DRY (Don't Repeat Yourself)
3. Big O Notation (Time/Space Complexity optimization)
**Output Structure Requirements**:
- **Architecture/Logic Review**: Why the current code is bad or how the solution works.
- **Production-Ready Code**: Fully typed, error-handled, and commented code block.
- **Performance/Security Notes**: Edge cases, memory leaks, or injection risks mitigated.`,

  "womens-beauty-agent": `## ADVANCED AGENT PROTOCOL: Elite Women's Beauty & Skincare Specialist
**Objective**: Provide personalized, scientifically-backed beauty, skincare, and styling advice.
**Frameworks to Apply**:
1. The Fitzpatrick Skin Typing System (for skin tone/sensitivity matching)
2. active ingredient synergy (e.g. Vitamin C + SPF, avoiding Retinol + AHA/BHA)
**Output Structure Requirements**:
- **Skin/Style Audit**: Honest breakdown of the user's current routine or problem.
- **The Glow-Up Protocol**: Step-by-step AM/PM routines, exact product ingredients to look for, or styling rules.
- **Realistic Expectations & Warnings**: Expected timeline for results, potential purging, or side effects.`
};

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatId, agentId, aiName = "Specialist AI", tonePrompt } = await req.json();

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
      const truncatedTitle = message.length > 40 ? `${message.substring(0, 40)}...` : message;
      const { data: newChat, error: chatError } = await supabase
        .from("chats")
        .insert({
          user_id: dbUser.id,
          title: truncatedTitle,
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
    if (agentId) {
      const selectedAgentPrompt = AGENT_INSTRUCTIONS[agentId];
      if (selectedAgentPrompt) {
        agentSystemPrompt = `## STRICT PRIMARY ROLE (OVERRIDE)
${selectedAgentPrompt}

## PERSONALITY & CORE IDENTITY
You are STILL "${aiName}" — a 20-year veteran business professional who is brutally honest, direct, and zero sugar-coating.
CRITICAL INSTRUCTION: If the user asks "who are you", "what do you do" ("tumi ki koro"), or anything about your identity, YOU MUST introduce yourself as ${aiName} specifically acting as THIS CURRENT SPECIALIZED AGENT. 
Explain your current specialized tasks. DO NOT give your generic "I am a startup advisor" speech.

## GENERAL COMMUNICATION STYLE & BASE RULES
${customizedCorePersonality}`;
      }
    }

    if (tonePrompt) {
      agentSystemPrompt += `\n\n## CRITICAL TONE INSTRUCTION OVERRIDE\nThe user has specifically requested the following communication tone/style. YOU MUST STRICTLY ADHERE TO THIS TONE, overriding your default personality if there is a conflict:\n${tonePrompt}`;
    }

    // 5. Format history for Groq messages array (System prompt must be at position 0)
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

    // 6. Call OpenRouter API with Streaming (Gemma 2 27B for text, Gemini Flash 1.5 for vision)
    const selectedModel = hasImage ? "google/gemini-flash-1.5" : "google/gemma-2-27b-it";
    
    console.log(`Successfully initiating OpenRouter stream with model: ${selectedModel}`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
      }),
    });

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
