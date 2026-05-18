import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, agentName, agentDesc } = await req.json();

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const systemPrompt = `You are the ultimate Prompt Engineering Expert for Kacha Morich AI 🌶️.
Your job is to generate exactly 4 highly creative, extremely realistic, specific, and high-value business consultation prompts or case scenarios for our specialized agent: "${agentName}" (${agentDesc}).

Rules for prompts:
- Each prompt must be a direct, 1st-person inquiry/request a business owner or startup founder would ask this specialist agent (e.g., "Draft a detailed WBS for my new Shopify store...").
- Keep them action-oriented, engaging, and modern (incorporate AI tools, current trends like SaaS, e-commerce, automated workflows).
- Vary the complexity (2 short prompts, 2 slightly more comprehensive prompts).
- You MUST respond with ONLY a valid JSON array of 4 strings. No explanation, no markdown backticks like \`\`\`json, no introductory text. Just the raw JSON array.

Example Output:
[
  "Create a 30-60-90 day onboarding roadmap for a remote marketing lead.",
  "What behavioral interview questions should I ask to test a React developer's architecture skills?",
  "Write a highly engaging LinkedIn Job Description for a growth-focused Product Manager.",
  "Draft a hiring pipeline SLA agreement template for my startup team."
]`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kachamorich.vercel.app",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate 4 brand new dynamic prompt suggestions for "${agentName}".` }
        ],
        temperature: 0.85,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0]?.message?.content?.trim() || "";

    // Clean any potential markdown wrapping
    let cleanJSON = rawContent;
    if (cleanJSON.startsWith("```")) {
      cleanJSON = cleanJSON.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    try {
      const parsedArray = JSON.parse(cleanJSON);
      if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        return NextResponse.json({ suggestions: parsedArray });
      }
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON. Raw response was:", rawContent);
    }

    // High quality fallback prompt suggestions in case of JSON parse failure
    const fallbacks: Record<string, string[]> = {
      "daily-innovation-idea-agent": [
        "Generate 4 highly profitable B2B SaaS ideas targeting remote workforce compliance.",
        "What are some unique micro-SaaS business opportunities using the brand new Gemini Flash model?",
        "Suggest 3 high-margin localized food delivery business concepts for a medium-sized UK city.",
        "Draft a Blue Ocean strategy for an automated customer support solution targeting e-commerce stores."
      ],
      "personal-cfo-finance-agent": [
        "Create a zero-based monthly budget draft for a newly launched B2B consultancy.",
        "How do I calculate and optimize my startup runway if our monthly burn is $12,000?",
        "Provide a checklist of critical tax compliance and VAT requirements for small UK companies.",
        "What are the best cost-saving alternatives to expensive enterprise CRMs like Salesforce?"
      ]
    };

    return NextResponse.json({ 
      suggestions: fallbacks[agentId] || [
        `Give me a detailed strategic plan for my business regarding ${agentName}.`,
        `How can I implement best practices in my business using ${agentName}?`,
        `What are the most critical risks and metrics to track in ${agentName}?`,
        `Provide 3 highly actionable tips to grow my operation today.`
      ] 
    });

  } catch (error) {
    console.error("Error generating dynamic prompts:", error);
    return NextResponse.json({ error: "Failed to generate prompt suggestions" }, { status: 500 });
  }
}
