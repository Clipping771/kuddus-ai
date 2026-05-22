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
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (innerErr) {}
    }
    
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (innerErr) {}
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
      banglaDesc: `আপনার ${idea} সংক্রান্ত কাজে সাহায্য করার জন্য ডেডিকেটেড এআই অ্যাসিস্ট্যান্ট।`,
      icon: "🤖",
      instructions: `## ${idea} এআই এজেন্ট প্রোটোকল
আপনি একজন বিশেষজ্ঞ এআই অ্যাসিস্ট্যান্ট। আপনার মূল কাজ হলো ব্যবহারকারীকে "${idea}" সংক্রান্ত যাবতীয় বিষয়ে সাহায্য করা।

### আপনার আচরণ ও নিয়মাবলী:
১. অত্যন্ত নম্র, পেশাদার এবং সহায়ক আচরণ করুন।
২. উত্তর দেওয়ার সময় বাংলা এবং ইংরেজি মিশ্রণ (বাংলিশ বা স্পষ্ট বাংলা) ব্যবহার করতে পারেন।
৩. স্পষ্ট এবং পয়েন্ট আকারে উত্তর দিন যাতে ব্যবহারকারীর বুঝতে সুবিধা হয়।`
    };
  } else {
    return {
      name: `${idea} Expert`,
      banglaName: idea,
      banglaDesc: `Your dedicated AI specialist for ${idea} and related business tasks.`,
      icon: "🎓",
      instructions: `## ${idea} Specialist Agent Protocol
You are an elite AI specialist dedicated strictly to "${idea}". Your primary objective is to provide high-fidelity strategy, execution plans, and accurate guidance.

### Rules & Guardrails:
1. **Directness**: Cut through fluff and provide direct, actionable answers.
2. **Frameworks**: Use relevant industry-standard business frameworks (e.g. MECE, SWOT, Porter's).
3. **Structure**: Format all responses clearly using headings, bold text, and bullet points.`
    };
  }
}

async function tryGroq(idea: string, prompt: string) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Groq API key not configured");
  }
  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
  
  const models = ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "llama3-70b-8192"];
  
  for (const model of models) {
    try {
      console.log(`[Agent Auto-Gen] Trying Groq with model: ${model}`);
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 1500,
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
    "google/gemma-4-31b-it:free",
    "deepseek/deepseek-v4-flash:free",
    "google/gemini-2.5-flash"
  ];
  
  for (const model of models) {
    try {
      console.log(`[Agent Auto-Gen] Trying OpenRouter with model: ${model}`);
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://kachamorich.vercel.app",
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          response_format: { type: "json_object" },
          max_tokens: 1500
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
        console.error(`[Agent Auto-Gen] OpenRouter model ${model} failed with status ${res.status}:`, errText);
      }
    } catch (err: any) {
      console.error(`[Agent Auto-Gen] OpenRouter model ${model} failed:`, err.message || err);
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

    const { idea } = await req.json();
    if (!idea || typeof idea !== "string") {
      return NextResponse.json({ error: "Idea is required" }, { status: 400 });
    }

    const prompt = `You are an expert AI Agent Architect. The user wants to create a custom AI agent based on the following concept/idea: "${idea}"

Your job is to design the perfect system instructions and identity for this agent.

CRITICAL INSTRUCTION FOR LANGUAGE MATCHING:
Detect the language/style of the user's concept idea: "${idea}".
- If the user wrote the idea in English (e.g., "Personal Assistance", "Startup Pitch Analyst"), then ALL fields (including "name", "banglaName", "banglaDesc", and "instructions") MUST be generated in English! Do not use Bengali script or translations.
- If the user wrote the idea in Bengali (e.g., "ব্যক্তিগত সহকারী"), then generate "banglaName" and "banglaDesc" in Bengali script, and instructions in Bengali.
- Ensure the language of the output fields matches the user's input concept language style.

Respond ONLY with a raw, valid JSON object (no markdown, no backticks) with the following exactly matching keys:
{
  "name": "A short, punchy English name for the agent (e.g. 'Viral Marketer')",
  "banglaName": "The Display Name in the detected language (e.g. 'Personal Assistant' if English, 'ব্যক্তিগত সহকারী' if Bengali)",
  "banglaDesc": "A short 1-line description of the agent's core capability in the detected language (e.g. 'Your dedicated assistant for daily tasks' if English, 'আপনার দৈনন্দিন কাজ করার সহকারী' if Bengali)",
  "icon": "A single suitable emoji that represents the agent",
  "instructions": "The highly detailed system prompt/instructions for the agent in the detected language. Must include tone, framework, and rules for how it should respond."
}`;

    let agentDetails = null;
    
    // Step 1: Try Groq (extremely fast and high quality)
    try {
      agentDetails = await tryGroq(idea, prompt);
      console.log("[Agent Auto-Gen] Successfully generated using Groq!");
    } catch (groqErr) {
      console.error("[Agent Auto-Gen] Groq pipeline failed, trying OpenRouter fallback...");
      
      // Step 2: Try OpenRouter (with free model fallbacks)
      try {
        agentDetails = await tryOpenRouter(prompt);
        console.log("[Agent Auto-Gen] Successfully generated using OpenRouter!");
      } catch (orErr) {
        console.error("[Agent Auto-Gen] OpenRouter pipeline failed, generating static fallback...");
        
        // Step 3: Trigger static fallback so it NEVER fails in the UI
        agentDetails = generateStaticFallback(idea);
      }
    }

    return NextResponse.json(agentDetails, { status: 200 });
  } catch (error: any) {
    console.error("Agent Auto-Gen Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
