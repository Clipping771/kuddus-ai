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
    let generatedInstructions = "";

    // Always embed the raw PDF text as the agent's knowledge base
    const embeddedKnowledge = `## 📄 DOCUMENT KNOWLEDGE BASE
The following is the full text of the document this agent is trained on.
You MUST use this as your primary source of truth for all answers.
Always cite specific sections, concepts, or quotes from this text when answering.

====================
${pdfText.substring(0, 10000)}
====================

`;

    const systemPromptMsg = `You are a world-class AI prompt engineer. Create a comprehensive system prompt for an AI agent that is a deep expert on the document below.

The system prompt MUST include:
1. **IDENTITY** — Who this agent is (e.g. "You are a dedicated expert on [book/document title]")
2. **CORE EXPERTISE** — 8-10 specific topics/concepts from the document
3. **HOW TO ANSWER** — Always reference specific parts of the document, quote directly when relevant
4. **OPERATING PROTOCOL** — Understand question → find relevant section → give structured answer with document references
5. **QUALITY STANDARDS** — Never hallucinate beyond the document content

Document Text (first 8000 chars):
${pdfText.substring(0, 8000)}

Return ONLY the system prompt. No preamble.`;

    // Try Groq first
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
        // Prepend the embedded knowledge base to the generated instructions
        generatedInstructions = embeddedKnowledge + content;
        groqSuccess = true;
        console.log("[Agents] Groq success — instructions length:", generatedInstructions.length);
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
            "google/gemma-3-27b-it:free",
            "nousresearch/hermes-3-llama-3.1-405b:free",
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
          generatedInstructions = embeddedKnowledge + content;
          console.log("[Agents] OpenRouter success — instructions length:", generatedInstructions.length);
        }
      } catch (orErr: any) {
        console.warn("[Agents] OpenRouter fallback failed:", orErr?.message);
      }
    }

    // Last resort — just embed the raw text directly
    if (!generatedInstructions) {
      generatedInstructions = embeddedKnowledge + `\nYou are an expert on the document above. Answer all questions based strictly on its content. Quote directly when relevant. If a question is outside the document's scope, say so clearly.`;
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
