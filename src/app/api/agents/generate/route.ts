import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

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

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kachamorich.vercel.app",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
        max_tokens: 1500
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API error: ${res.statusText}`);
    }

    const data = await res.json();
    let textContent = data.choices[0]?.message?.content || "{}";
    
    // Clean markdown json blocks if model ignored response_format constraints
    textContent = textContent.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsedAgent = JSON.parse(textContent);

    return NextResponse.json(parsedAgent, { status: 200 });
  } catch (error: any) {
    console.error("Agent Auto-Gen Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
