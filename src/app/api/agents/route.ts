import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { groqChatWithFallback } from "@/lib/groq";
import { openrouterFetchWithFallback } from "@/lib/openrouter";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: "User not found in db" }, { status: 404 });
    }

    const { data: agents, error: agentsError } = await supabase
      .from("custom_agents")
      .select("*")
      .eq("user_id", dbUser.id)
      .order("created_at", { ascending: false });

    if (agentsError) {
      console.error("Error fetching custom agents:", agentsError);
      return NextResponse.json({ error: "Failed to fetch custom agents" }, { status: 500 });
    }

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Agents GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch user
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: "User not found in db" }, { status: 404 });
    }

    // 2. Parse JSON body — text extraction is done client-side now
    const { name, description, pdfText } = await req.json();

    if (!name || !pdfText) {
      return NextResponse.json({ error: "Name and PDF text are required" }, { status: 400 });
    }

    // 3. Generate Expert System Prompt via LLM
    let generatedInstructions = pdfText.substring(0, 12000); // Fallback

    const systemPromptMsg = `You are a world-class AI prompt engineer specializing in building elite, production-grade AI agents from documents.

Based on the document text below, create a COMPREHENSIVE, POWERFUL system prompt for an AI agent that is a deep subject matter expert on this document's content.

The system prompt MUST include ALL these sections (minimum 600 words):

1. **IDENTITY & ROLE** — Who this agent is, what document they mastered, their exact expertise
2. **CORE KNOWLEDGE AREAS** — 8-10 specific topics/concepts extracted directly from the document
3. **HOW TO ANSWER** — Always cite specific sections/concepts from the document, be precise, structured
4. **OPERATING PROTOCOL** — Step-by-step: understand question → find relevant doc section → give structured answer with document references
5. **RESPONSE FORMAT** — Use headers, bullet points, quote document concepts directly
6. **QUALITY STANDARDS** — Never hallucinate beyond the document, say "the document states..." when citing
7. **GUARDRAILS** — If question is outside document scope, say so clearly

Make this agent feel like talking to someone who has memorized and deeply understood every word of this document.

Document Text:
====================
${pdfText.substring(0, 12000)}
====================

Return ONLY the system prompt text. No preamble, no explanation.`;

    // Try Groq first with key rotation
    let groqSuccess = false;
    try {
      const completion = await groqChatWithFallback(
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: systemPromptMsg }],
          temperature: 0.3,
          max_tokens: 2000,
        },
        dbUser.id
      );
      const content = completion.choices[0]?.message?.content?.trim();
      if (content && content.length > 200) {
        generatedInstructions = content;
        groqSuccess = true;
        console.log("[Agents] Groq success — instructions length:", content.length);
      }
    } catch (groqError: any) {
      console.error("Groq Persona Generation Error:", groqError?.message || groqError);
    }

    // Fallback to OpenRouter
    if (!groqSuccess) {
      try {
        const { response: res } = await openrouterFetchWithFallback(
          [
            "meta-llama/llama-3.3-70b-instruct:free",
            "deepseek/deepseek-r1-0528:free",
            "qwen/qwen3-8b:free",
            "mistralai/mistral-7b-instruct:free",
          ],
          {
            messages: [{ role: "user", content: systemPromptMsg }],
            temperature: 0.3,
            max_tokens: 2000,
          },
          dbUser.id
        );
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content && content.length > 200) {
          generatedInstructions = content;
          console.log("[Agents] OpenRouter success — instructions length:", content.length);
        }
      } catch (orErr: any) {
        console.warn("[Agents] OpenRouter fallback failed:", orErr?.message);
        // Falls back to raw truncated text — agent still gets created
      }
    }

    // 4. Insert into Supabase
    const { data: newAgent, error: insertError } = await supabase
      .from("custom_agents")
      .insert({
        user_id: dbUser.id,
        name,
        description: description || "Custom PDF Agent",
        instructions: generatedInstructions,
        icon: "FileText",
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return NextResponse.json({ error: "Failed to save agent to database" }, { status: 500 });
    }

    return NextResponse.json({ agent: newAgent });

  } catch (error) {
    console.error("Agents POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    // Verify the agent belongs to this user before deleting
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("custom_agents")
      .delete()
      .eq("id", id)
      .eq("user_id", dbUser.id); // ensures user can only delete their own agents

    if (deleteError) {
      console.error("Supabase delete error:", deleteError);
      return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agents DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
