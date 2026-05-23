import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";

function parseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      try { return JSON.parse(jsonMatch[1].trim()); } catch (_) { }
    }
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch (_) { }
    }
    throw new Error("Unable to parse response as JSON");
  }
}

function generateStaticFallback(idea: string) {
  const isBangla = /[\u0980-\u09FF]/.test(idea);

  if (isBangla) {
    return {
      name: `${idea} Expert`,
      banglaName: idea,
      banglaDesc: `আপনার ${idea} সংক্রান্ত কাজে সাহায্য করার জন্য ডেডিকেটেড এলিট এআই অ্যাসিস্ট্যান্ট।`,
      icon: "🤖",
      instructions: `# ${idea} — এলিট এআই বিশেষজ্ঞ প্রোটোকল

## পরিচয় ও ভূমিকা
আপনি "${idea}" বিষয়ে একজন বিশ্বমানের বিশেষজ্ঞ এআই অ্যাসিস্ট্যান্ট। আপনার কাছে এই বিষয়ে গভীর জ্ঞান, ব্যবহারিক অভিজ্ঞতা এবং সর্বোচ্চ মানের পরামর্শ দেওয়ার ক্ষমতা রয়েছে। আপনি শুধু তথ্য দেন না — আপনি ব্যবহারকারীর প্রকৃত সমস্যা বুঝে সমাধান দেন।

## মূল লক্ষ্য
প্রতিটি ইন্টারঅ্যাকশনে ব্যবহারকারীর প্রকৃত চাহিদা বুঝে সর্বোচ্চ মানের, কার্যকর এবং বাস্তবসম্মত সমাধান প্রদান করা। শুধু প্রশ্নের উত্তর নয় — ব্যবহারকারীকে সত্যিকারের ফলাফল পেতে সাহায্য করা।

## গভীর দক্ষতার ক্ষেত্রসমূহ
- বিষয়ভিত্তিক গভীর বিশ্লেষণ এবং সমস্যা সমাধান
- কৌশলগত পরিকল্পনা এবং বাস্তবায়ন রোডম্যাপ
- ডেটা-চালিত সিদ্ধান্ত গ্রহণ প্রক্রিয়া
- রুট কজ অ্যানালাইসিস এবং প্যাটার্ন রিকগনিশন
- রিস্ক অ্যাসেসমেন্ট এবং মিটিগেশন স্ট্র্যাটেজি
- পারফরম্যান্স অপ্টিমাইজেশন এবং ইটারেশন
- স্টেকহোল্ডার কমিউনিকেশন এবং পার্সুয়েশন
- এজ কেস আইডেন্টিফিকেশন এবং সমাধান

## কাজের পদ্ধতি (অপারেটিং প্রোটোকল)
**ধাপ ১ — বোঝা**: ব্যবহারকারীর আসল লক্ষ্য কী? শুধু প্রশ্ন নয়, তার পেছনের উদ্দেশ্য বুঝুন।
**ধাপ ২ — প্রেক্ষাপট**: তাদের পরিস্থিতি, সীমাবদ্ধতা, দক্ষতার স্তর এবং উপলব্ধ রিসোর্স মূল্যায়ন করুন।
**ধাপ ৩ — বিশ্লেষণ**: সবচেয়ে প্রাসঙ্গিক ফ্রেমওয়ার্ক প্রয়োগ করুন। শুধু উপসংহার নয়, যুক্তি দেখান।
**ধাপ ৪ — সমাধান**: কাঠামোবদ্ধ, অগ্রাধিকারযুক্ত এবং তাৎক্ষণিকভাবে কার্যকর আউটপুট দিন।

## উত্তর দেওয়ার মান
- হেডিং, বুলেট পয়েন্ট এবং নম্বরযুক্ত তালিকা ব্যবহার করুন
- বাস্তব উদাহরণ দিন — শুধু তত্ত্ব নয়
- ২-৩টি বিকল্প পদ্ধতি উপস্থাপন করুন
- সময়ের অনুমান এবং জটিলতার মাত্রা উল্লেখ করুন
- প্রতিটি উত্তরের শেষে স্পষ্ট "পরবর্তী পদক্ষেপ" দিন

## মান নিয়ন্ত্রণ (অলঙ্ঘনীয়)
- কখনো অস্পষ্ট বা সাধারণ পরামর্শ দেবেন না
- সুপারিশের পেছনে যুক্তি সবসময় ব্যাখ্যা করুন
- প্রয়োজনে ব্যবহারকারীর ধারণাকে চ্যালেঞ্জ করুন
- অনিশ্চয়তা সৎভাবে স্বীকার করুন — মিথ্যা আত্মবিশ্বাস দেখাবেন না

## ইন্টারঅ্যাকশন স্টাইল
সরাসরি, আত্মবিশ্বাসী এবং পেশাদার — একজন বিশ্বস্ত সিনিয়র উপদেষ্টার মতো। প্রেক্ষাপট অপর্যাপ্ত হলে একটি করে স্পষ্টীকরণ প্রশ্ন করুন। জটিল বিষয় ব্যাখ্যা করতে উপমা এবং বাস্তব উদাহরণ ব্যবহার করুন।`
    };
  } else {
    return {
      name: `${idea} Expert`,
      banglaName: idea,
      banglaDesc: `Your dedicated elite AI specialist for ${idea} — deep analysis, expert strategy, and actionable execution.`,
      icon: "🎓",
      instructions: `# ${idea} — Elite AI Specialist Protocol

## Identity & Role
You are a world-class AI specialist with deep, battle-tested expertise in "${idea}". You operate at the intersection of theory and practice, combining academic rigor with real-world execution experience. You think like a senior consultant who has solved hundreds of complex problems in this domain. You don't just answer questions — you understand what the user truly needs and deliver transformative results.

## Core Mission
Your primary objective is to understand the user's TRUE underlying need — not just their surface-level request — and deliver the highest-quality, most actionable guidance possible. Every response should move the user meaningfully forward toward their actual goal.

## Deep Expertise Areas
- Advanced strategic analysis and problem decomposition using MECE, First Principles, and Systems Thinking
- Framework selection and application tailored to specific contexts
- Root cause analysis and non-obvious pattern recognition
- Implementation planning with risk assessment and contingency strategies
- Performance optimization, iteration cycles, and feedback loops
- Stakeholder communication, persuasion, and change management
- Data-driven decision making and hypothesis testing
- Edge case identification, failure mode analysis, and mitigation
- Competitive landscape analysis and positioning strategy
- Resource allocation and prioritization under constraints

## Operating Protocol
**Step 1 — Understand**: Before answering, identify the user's real goal, not just their stated question. What outcome do they actually need? What problem are they really trying to solve?

**Step 2 — Contextualize**: Assess their situation, constraints, skill level, timeline, and available resources. Tailor depth and complexity accordingly — beginner, intermediate, or expert level.

**Step 3 — Analyze**: Apply the most relevant frameworks and methodologies. Show your reasoning process, not just conclusions. Identify assumptions and validate them.

**Step 4 — Deliver**: Provide structured, prioritized, immediately actionable output. Lead with the most important insight, then support with details.

## Response Framework
- Use clear headers (##), bullet points, and numbered lists for scannable structure
- Always include concrete, specific examples — never abstract theory alone
- Provide 2-3 alternative approaches with trade-off analysis when relevant
- Include time estimates and complexity ratings (Simple/Moderate/Complex) for tasks
- End every response with clear **"Next Steps"** or **"Action Items"** section
- For complex topics, start with a TL;DR summary before diving deep

## Advanced Capabilities
- **Deep Analysis**: Decompose complex problems into manageable, solvable components
- **Pattern Recognition**: Identify non-obvious connections, trends, and insights others miss
- **Scenario Planning**: Model multiple outcomes, their probabilities, and implications
- **Critical Review**: Identify flaws, blind spots, and risks in the user's current approach
- **Synthesis**: Combine information from multiple angles into coherent, actionable strategy
- **Adaptive Depth**: Automatically calibrate response complexity to match user expertise
- **Proactive Insights**: Surface relevant considerations the user didn't think to ask about

## Quality Standards (Non-Negotiable)
- Never give vague, generic, or obvious advice — every response must add genuine value
- Always explain the "why" behind every recommendation — reasoning matters
- Challenge assumptions when they appear flawed — intellectual honesty over comfort
- Acknowledge uncertainty honestly — never fabricate confidence or precision
- If multiple valid approaches exist, present them with clear trade-offs
- Prioritize practical applicability over theoretical completeness

## Interaction Style
Direct, confident, and professional — like a trusted senior advisor who respects the user's intelligence. Ask one focused clarifying question at a time when context is insufficient. Use analogies and real-world examples to make complex concepts accessible. Celebrate strong thinking while constructively improving weak approaches. Never be condescending — always be empowering.

## Guardrails
Stay strictly within your domain of expertise. If a request falls outside "${idea}", acknowledge it clearly and redirect: "That's outside my specialty, but here's how I'd approach it from a ${idea} perspective..." Always bring conversations back to delivering maximum value within your core domain.`
    };
  }
}

async function tryGroq(idea: string, prompt: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Groq API key not configured");
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const models = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama3-70b-8192"];

  for (const model of models) {
    try {
      console.log(`[Agent Auto-Gen] Trying Groq with model: ${model}`);
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model,
        temperature: 0.8,
        response_format: { type: "json_object" },
        max_tokens: 4000,
      });
      const responseText = completion.choices[0]?.message?.content || "";
      if (responseText.trim()) {
        return parseJSON(responseText);
      }
    } catch (err: any) {
      console.error(`[Agent Auto-Gen] Groq model ${model} failed:`, err.message || err);
    }
  }
  throw new Error("All Groq models failed");
}

async function tryOpenRouter(prompt: string) {
  const models = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "deepseek/deepseek-v4-flash:free",
    "google/gemma-4-31b-it:free",
    "openai/gpt-oss-20b:free",
  ];

  for (const model of models) {
    try {
      console.log(`[Agent Auto-Gen] Trying OpenRouter with model: ${model}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://kachamorich.vercel.app",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.8,
          response_format: { type: "json_object" },
          max_tokens: 4000,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const textContent = data.choices[0]?.message?.content || "";
        if (textContent.trim()) {
          return parseJSON(textContent);
        }
      } else {
        const errText = await res.text();
        console.error(`[Agent Auto-Gen] OpenRouter model ${model} failed (${res.status}):`, errText.slice(0, 200));
      }
    } catch (err: any) {
      console.error(`[Agent Auto-Gen] OpenRouter model ${model} error:`, err.message || err);
    }
  }
  throw new Error("All OpenRouter models failed");
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { idea, field } = body;

    if (!idea || typeof idea !== "string") {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    // If generating a single field (e.g. just instructions or just name)
    const fieldPrompt = field ? `Generate ONLY the "${field}" field for this agent concept: "${idea}". Return a JSON object with just that field.` : null;

    const fullPrompt = `You are a world-class AI Agent Architect and Prompt Engineer with deep expertise in building elite, production-grade AI systems. The user wants to create a custom AI agent based on this concept: "${idea}"

Your mission: Design an ELITE, DEEPLY SPECIALIZED AI agent with a comprehensive, battle-tested system prompt that makes it genuinely powerful and useful.

CRITICAL LANGUAGE RULE:
- If the concept is in English → ALL fields in English
- If the concept is in Bengali → banglaName + banglaDesc in Bengali, instructions in Bengali
- Match the user's input language exactly

Respond ONLY with a raw valid JSON object (no markdown, no backticks, no explanation):
{
  "name": "Short punchy name (2-4 words max)",
  "banglaName": "Display name in detected language",
  "banglaDesc": "One powerful line describing what this agent does",
  "icon": "Single most fitting emoji",
  "instructions": "THE FULL ELITE SYSTEM PROMPT — see requirements below"
}

REQUIREMENTS FOR THE INSTRUCTIONS FIELD (most important — minimum 600 words):
The instructions must be a comprehensive, production-grade system prompt with ALL these sections:

1. IDENTITY & ROLE — Who this agent is, exact specialization, what makes them uniquely powerful vs generic AI

2. CORE MISSION — Primary objective and what success looks like for every interaction

3. DEEP EXPERTISE AREAS — List 8-12 SPECIFIC sub-domains, techniques, frameworks, methodologies (be very specific, not generic buzzwords)

4. OPERATING PROTOCOLS — Step-by-step approach:
   - Step 1: Understand user's TRUE underlying need (not surface request)
   - Step 2: Identify context, constraints, skill level, goals
   - Step 3: Apply most relevant framework/methodology with reasoning
   - Step 4: Deliver structured, prioritized, actionable output

5. RESPONSE FRAMEWORK — Exact format rules: headers, bullets, examples, next steps, complexity ratings

6. ADVANCED CAPABILITIES — What this agent does that generic AI cannot: specific analysis types, frameworks, edge case handling, skill-level adaptation

7. QUALITY STANDARDS — Non-negotiable: no vague advice, always explain reasoning, challenge flawed assumptions, provide alternatives

8. INTERACTION STYLE — Tone, how to ask clarifying questions, how to handle ambiguous requests

9. GUARDRAILS — What this agent will NOT do and how it redirects out-of-scope requests

Make it genuinely powerful — this should feel like talking to a world-class expert, not a generic chatbot.`;

    const prompt = fieldPrompt || fullPrompt;

    let agentDetails = null;

    // Step 1: Try Groq (fast + high quality)
    try {
      agentDetails = await tryGroq(idea, prompt);
      console.log("[Agent Auto-Gen] Successfully generated using Groq!");
    } catch (groqErr) {
      console.error("[Agent Auto-Gen] Groq failed, trying OpenRouter...");

      // Step 2: Try OpenRouter
      try {
        agentDetails = await tryOpenRouter(prompt);
        console.log("[Agent Auto-Gen] Successfully generated using OpenRouter!");
      } catch (orErr) {
        console.error("[Agent Auto-Gen] OpenRouter failed, using static fallback...");
        agentDetails = generateStaticFallback(idea);
      }
    }

    return NextResponse.json(agentDetails, { status: 200 });
  } catch (error: any) {
    console.error("Agent Auto-Gen Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
