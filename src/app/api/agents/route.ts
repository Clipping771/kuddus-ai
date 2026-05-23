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

    const systemPromptMsg = `You are an expert AI prompt engineer. Based on the document text below, write a concise but powerful system prompt for an AI agent that is a subject matter expert on this document's topic.

The system prompt must include:
- The agent's identity and expertise area (1-2 sentences)
- 5-8 key knowledge areas from the document
- How to answer questions: structured, cite document concepts, be specific
- Tone: professional, direct, expert

Keep it under 400 words. Return ONLY the system prompt text, no preamble.

Document Text:
====================
${pdfText.substring(0, 12000)}
====================`;

    // Try Groq first with key rotation
    let groqSuccess = false;
    try {
      const completion = await groqChatWithFallback(
        {
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: systemPromptMsg }],
          temperature: 0.3,
          max_tokens: 1000,
        },
        dbUser.id
      );
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) {
        generatedInstructions = content;
        groqSuccess = true;
        console.log("[Agents] Groq success");
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
            "deepseek/deepseek-v4-flash:free",
            "google/gemma-4-31b-it:free",
          ],
          {
            messages: [{ role: "user", content: systemPromptMsg }],
            temperature: 0.3,
            max_tokens: 1000,
          },
          dbUser.id
        );
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          generatedInstructions = content;
          console.log("[Agents] OpenRouter success");
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
