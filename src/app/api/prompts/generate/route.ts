import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Groq from "groq-sdk";
import { openrouterFetchWithFallback } from "@/lib/openrouter";
import { supabase } from "@/lib/supabase";

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
  let isCustom = false;
  let instructions = "";
  let dbUserId: string | undefined;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    agentId = body.agentId || "generic";
    agentName = body.agentName || "Specialist AI";
    agentDesc = body.agentDesc || "Business consultant";
    isCustom = body.isCustom || false;
    instructions = body.instructions || "";

    // Fetch DB user id for key rotation
    const { data: dbUser } = await supabase
      .from("users").select("id").eq("clerk_id", userId).single();
    if (dbUser) dbUserId = dbUser.id;
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
  // For custom agents, generate instruction-aware fallbacks instead of generic ones
  let responseSuggestions;
  if (isCustom && instructions) {
    const snippet = instructions.substring(0, 150).replace(/\n/g, " ");
    // Generate fallbacks that are specific to the agent name + instructions snippet
    responseSuggestions = shuffleArray([
      { title: `${agentName} Core Task`, prompt: `Please ${agentName.toLowerCase().includes("humaniz") ? "humanize this AI-generated text for me" : `help me with a task related to ${agentName}`}: [paste your content here]`, tag: "Strategy", level: "Intermediate" },
      { title: "Step-by-Step Guide", prompt: `Give me a detailed step-by-step guide on how to best use your capabilities as ${agentName}.`, tag: "Operations", level: "Advanced" },
      { title: "Quick Analysis", prompt: `Analyze this and give me your expert feedback based on your specialization in ${agentName}: [paste your content here]`, tag: "Analysis", level: "Expert" },
      { title: "Best Practices", prompt: `What are the top 5 best practices I should follow when working with ${agentName}?`, tag: "Innovation", level: "Advanced" },
    ]).slice(0, 4);
  } else {
    responseSuggestions = shuffleArray(fallbacks[agentId] || genericFallbacks).slice(0, 4);
  }

  // AI-driven live generation block
  try {
    // For custom PDF agents, use their actual instructions to generate relevant prompts
    const agentContext = isCustom && instructions
      ? `This is a custom AI agent trained on a specific document. Here are its core instructions/expertise:\n\n${instructions}\n\nAgent Name: "${agentName}"`
      : `Agent: "${agentName}" (${agentDesc})`;

    const systemPrompt = `You are the ultimate Prompt Engineering Expert for Kacha Morich AI 🌶️.
Your job is to generate exactly 4 highly creative, extremely realistic, specific, and high-value consultation prompts or case scenarios tailored specifically to this agent's expertise.

${agentContext}

Rules for prompts:
- Each prompt must be a direct, 1st-person inquiry/request that is SPECIFICALLY relevant to this agent's actual knowledge and expertise (based on the instructions above).
- Do NOT generate generic business prompts — they must be deeply tied to the specific topics, concepts, and domain of this agent.
- Keep them action-oriented, engaging, and modern.
- You MUST respond with ONLY a valid JSON array of 4 objects. No explanation, no markdown backticks like \`\`\`json, no introductory text. Just the raw JSON array.

Each object in the array MUST have the exact following structure:
{
  "title": "Short catchy title (3-5 words max)",
  "prompt": "The actual detailed first-person prompt matching rules above",
  "tag": "A single relevant tag like 'Finance', 'Growth', 'Coding', 'Legal', 'Innovation', 'Strategy'",
  "level": "One of: 'Intermediate', 'Advanced', 'Expert'"
}`;

    const userMessage = isCustom && instructions
      ? `Generate 4 brand new, highly specific consultation prompts for the custom agent "${agentName}" based on its actual document expertise above. Random salt: ${Math.random() * 100000}. Make them deeply relevant to the specific content and topics in the agent's instructions.`
      : `Generate 4 brand new dynamic, structured case suggestions for "${agentName}". Random salt: ${Math.random() * 100000}. Ensure these business ideas are completely unique and cover different angles.`;

    const parseAndReturn = (rawContent: string) => {
      try {
        let cleanJSON = rawContent.trim();
        // Strip markdown code fences
        cleanJSON = cleanJSON.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        // Extract JSON array if wrapped in other text
        const arrMatch = cleanJSON.match(/\[[\s\S]*\]/);
        if (arrMatch) cleanJSON = arrMatch[0];
        const parsedArray = JSON.parse(cleanJSON);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
          return NextResponse.json({ suggestions: parsedArray });
        }
      } catch (parseErr: any) {
        console.warn("[Prompts Generate] JSON parse failed:", parseErr.message?.slice(0, 60));
      }
      return null;
    };

    // Tier 1: Try Groq with DB user keys first, then env key
    const groqKeysToTry: string[] = [];
    if (dbUserId) {
      try {
        const { data: groqKeys } = await supabase
          .from("groq_keys").select("api_key")
          .eq("user_id", dbUserId).eq("is_active", true);
        if (groqKeys) groqKeysToTry.push(...groqKeys.map((k: any) => k.api_key).filter(Boolean));
      } catch { /* silent */ }
    }
    if (process.env.GROQ_API_KEY) groqKeysToTry.push(process.env.GROQ_API_KEY);

    for (const groqKey of groqKeysToTry) {
      try {
        console.log("[Prompts Generate] Trying Groq llama-3.3-70b-versatile...");
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.9,
          max_tokens: 700,
        });
        const rawContent = completion.choices[0]?.message?.content?.trim() || "";
        if (rawContent) {
          const result = parseAndReturn(rawContent);
          if (result) {
            console.log("[Prompts Generate] ✅ Groq succeeded.");
            return result;
          }
        }
      } catch (groqErr: any) {
        console.warn("[Prompts Generate] Groq key failed:", groqErr.message?.slice(0, 80));
      }
    }

    // Tier 2: OpenRouter fallback — only working free models
    try {
      const { response } = await openrouterFetchWithFallback(
        [
          "meta-llama/llama-3.3-70b-instruct:free",
          "google/gemma-3-27b-it:free",
          "nousresearch/hermes-3-llama-3.1-405b:free",
        ],
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          temperature: 0.9,
          max_tokens: 700,
        },
        dbUserId
      );

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content?.trim() || "";
        if (rawContent) {
          const result = parseAndReturn(rawContent);
          if (result) return result;
        }
      }
    } catch (orErr: any) {
      console.warn("[Prompts Generate] OpenRouter failed:", orErr.message?.slice(0, 80));
    }
  } catch (error) {
    console.warn("AI generation failed, timed out, or rate-limited. Returning dynamically shuffled static fallbacks instantly:", error);
  }

  // Gracefully fallback to shuffled static suggestions INSTANTLY
  return NextResponse.json({ suggestions: responseSuggestions });
}
