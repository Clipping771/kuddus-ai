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
- Keep them action-oriented, engaging, and modern.
- You MUST respond with ONLY a valid JSON array of 4 objects. No explanation, no markdown backticks like \`\`\`json, no introductory text. Just the raw JSON array.

Each object in the array MUST have the exact following structure:
{
  "title": "Short catchy title (3-5 words max, e.g. 'Shopify WBS Architect')",
  "prompt": "The actual detailed first-person prompt matching rules above",
  "tag": "A single business tag like 'Finance', 'Growth', 'Coding', 'Legal', 'Innovation'",
  "level": "One of: 'Intermediate', 'Advanced', 'Expert'"
}

Example Output:
[
  {
    "title": "Remote Onboarding Roadmap",
    "prompt": "Create a 30-60-90 day onboarding roadmap for a remote marketing lead.",
    "tag": "HR",
    "level": "Advanced"
  },
  {
    "title": "React Developer Audit",
    "prompt": "What behavioral interview questions should I ask to test a React developer's architecture skills?",
    "tag": "Tech",
    "level": "Expert"
  }
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
          { role: "user", content: `Generate 4 brand new dynamic, structured case suggestions for "${agentName}".` }
        ],
        temperature: 0.85,
        max_tokens: 800,
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

    // High quality fallback structured suggestions in case of JSON parse failure
    const fallbacks: Record<string, any[]> = {
      "daily-innovation-idea-agent": [
        {
          title: "B2B SaaS Compliance Ideator",
          prompt: "Generate 4 highly profitable B2B SaaS ideas targeting remote workforce compliance.",
          tag: "Innovation",
          level: "Advanced"
        },
        {
          title: "Gemini Micro-SaaS Models",
          prompt: "What are some unique micro-SaaS business opportunities using the brand new Gemini Flash model?",
          tag: "Tech",
          level: "Intermediate"
        },
        {
          title: "UK High-Margin Delivery Concept",
          prompt: "Suggest 3 high-margin localized food delivery business concepts for a medium-sized UK city.",
          tag: "Strategy",
          level: "Advanced"
        },
        {
          title: "Blue Ocean CX Support Automator",
          prompt: "Draft a Blue Ocean strategy for an automated customer support solution targeting e-commerce stores.",
          tag: "Operations",
          level: "Expert"
        }
      ],
      "personal-cfo-finance-agent": [
        {
          title: "Zero-Based SaaS Budget Plan",
          prompt: "Create a zero-based monthly budget draft for a newly launched B2B consultancy.",
          tag: "Finance",
          level: "Advanced"
        },
        {
          title: "Burn-Rate Runway Audit",
          prompt: "How do I calculate and optimize my startup runway if our monthly burn is $12,000?",
          tag: "Finance",
          level: "Expert"
        },
        {
          title: "UK Small-Biz VAT Compliance Checklist",
          prompt: "Provide a checklist of critical tax compliance and VAT requirements for small UK companies.",
          tag: "Compliance",
          level: "Intermediate"
        },
        {
          title: "CRM Tool ROI Sourcing Analysis",
          prompt: "What are the best cost-saving alternatives to expensive enterprise CRMs like Salesforce?",
          tag: "Operations",
          level: "Intermediate"
        }
      ]
    };

    const genericFallbacks = [
      {
        title: "Strategic Growth Roadmap",
        prompt: `Give me a detailed strategic plan for my business regarding ${agentName}.`,
        tag: "Strategy",
        level: "Advanced"
      },
      {
        title: "Operational Best Practices Check",
        prompt: `How can I implement best practices in my business using ${agentName}?`,
        tag: "Operations",
        level: "Intermediate"
      },
      {
        title: "Risk Mitigation Audit",
        prompt: `What are the most critical risks and metrics to track in ${agentName}?`,
        tag: "Risk",
        level: "Expert"
      },
      {
        title: "Actionable Revenue Drivers",
        prompt: `Provide 3 highly actionable tips to grow my operation today under the supervision of ${agentName}.`,
        tag: "Revenue",
        level: "Intermediate"
      }
    ];

    return NextResponse.json({ 
      suggestions: fallbacks[agentId] || genericFallbacks
    });

  } catch (error) {
    console.error("Error generating dynamic prompts:", error);
    return NextResponse.json({ error: "Failed to generate prompt suggestions" }, { status: 500 });
  }
}
