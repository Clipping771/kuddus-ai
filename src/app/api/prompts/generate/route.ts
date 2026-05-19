import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

// Fisher-Yates shuffle helper to ensure randomized high-quality suggestions on every single fall back
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function POST(req: Request) {
  let agentId = "generic";
  let agentName = "Specialist AI";
  let agentDesc = "Business consultant";

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    agentId = body.agentId || "generic";
    agentName = body.agentName || "Specialist AI";
    agentDesc = body.agentDesc || "Business consultant";
  } catch (authError) {
    console.error("Auth/body read error:", authError);
  }

  // Predefined structured fallback suggestions pools (shuffled dynamically)
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
      },
      {
        title: "Micro-SaaS Newsletter Engine",
        prompt: "Propose a curated newsletter micro-SaaS business concept that automates tech trend aggregation.",
        tag: "Growth",
        level: "Intermediate"
      },
      {
        title: "Sustainable Packaging Concept",
        prompt: "Suggest 3 low-cost eco-friendly packaging alternatives for small direct-to-consumer cosmetic brands.",
        tag: "Innovation",
        level: "Advanced"
      },
      {
        title: "B2B AI Sourcing Consultant",
        prompt: "Outline a profitable B2B agency business model providing custom AI workflow integrations for manufacturing.",
        tag: "Strategy",
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
      },
      {
        title: "Bootstrap SaaS Pricing Design",
        prompt: "Draft a dynamic pricing tier matrix for a self-funded productivity app to maximize average contract value.",
        tag: "Growth",
        level: "Advanced"
      },
      {
        title: "Freelancer Tax Setup Guide",
        prompt: "Draft an optimal cash flow management guide for an independent consultant earning over £80,000.",
        tag: "Finance",
        level: "Intermediate"
      },
      {
        title: "Direct Merchant Fee Optimization",
        prompt: "What cost cutting strategies can an e-commerce brand implement to reduce Stripe merchant transaction fees?",
        tag: "Operations",
        level: "Advanced"
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
    },
    {
      title: "Competitive Landscape Review",
      prompt: `Analyze the main competitive entry barriers and growth blockers for my startup under ${agentName}.`,
      tag: "Growth",
      level: "Advanced"
    },
    {
      title: "Bottleneck Process Analysis",
      prompt: `How can I identify and debug process blockages in my operational workflows for ${agentName}?`,
      tag: "Operations",
      level: "Intermediate"
    },
    {
      title: "AI Integration Workflow Audit",
      prompt: `What core workflows in my daily business can be automated using LLMs overseen by ${agentName}?`,
      tag: "Innovation",
      level: "Expert"
    }
  ];

  // Randomly shuffle fallback pools on every single request
  const responseSuggestions = shuffleArray(fallbacks[agentId] || genericFallbacks).slice(0, 4);

  // AI-driven live generation block
  try {
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

    // 4.5 second hard timeout for OpenRouter API call to guarantee 0-lag UX
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY || "gsk_placeholder"}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://kachamorich.vercel.app",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free", // Extremely fast, highly responsive, superb JSON parser
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate 4 brand new dynamic, structured case suggestions for "${agentName}". Random salt: ${Math.random() * 100000}. Ensure these business ideas are completely unique and cover different angles.` }
        ],
        temperature: 0.9, // Higher temperature for rich diversity and variety
        max_tokens: 600,
      }),
    });

    clearTimeout(timeoutId);

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

    const parsedArray = JSON.parse(cleanJSON);
    if (Array.isArray(parsedArray) && parsedArray.length > 0) {
      return NextResponse.json({ suggestions: parsedArray });
    }
  } catch (error) {
    console.warn("AI generation failed, timed out, or rate-limited. Returning dynamically shuffled static fallbacks instantly:", error);
  }

  // Gracefully fallback to shuffled static suggestions INSTANTLY
  return NextResponse.json({ suggestions: responseSuggestions });
}
