import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import Groq from "groq-sdk";
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

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "File and Agent Name are required" }, { status: 400 });
    }

    // 3. Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pdfText = "";
    try {
      // Import the lib file directly — pdf-parse's index.js has a bug where it reads a test
      // file at module load time when module.parent is undefined (Next.js webpack behavior).
      const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require("pdf-parse/lib/pdf-parse.js");
      const pdfData = await pdfParse(buffer);
      pdfText = pdfData.text;
    } catch (parseError) {
      console.error("PDF Parsing Error:", parseError);
      return NextResponse.json({ error: "Failed to parse PDF file. Please ensure it is a valid, text-based PDF." }, { status: 400 });
    }

    if (!pdfText.trim()) {
      // Scanned/image-based PDF — OCR not available
      console.log("[Agents] PDF text empty. This appears to be a scanned/image-based PDF.");
      return NextResponse.json({
        error: "This PDF appears to be a scanned image with no extractable text. Please upload a text-based PDF instead. OCR for scanned PDFs is currently not supported."
      }, { status: 400 });
    }

    if (!pdfText.trim()) {
      return NextResponse.json({ error: "Could not extract any text from this PDF, even with OCR." }, { status: 400 });
    }

    // 4. Send to AI to generate Expert System Prompt
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || "gsk_placeholder_compile_key_12345",
    });

    // Truncate to ~20k chars (~5k tokens) — safe for Groq free tier TPD limits
    // The first 20k chars contain the most important content (intro, key concepts)
    const truncatedText = pdfText.substring(0, 20000);

    const systemPromptMsg = `You are a world-class AI persona architect. 
I am providing you with the extracted text from a book or document.
Your task is to:
1. Identify the core topic, main themes, and crucial insights from this text.
2. Generate an extremely detailed and highly professional "System Prompt" for a new AI Agent.
3. This new AI Agent must become an absolute Subject Matter Expert on the themes of this document. It must act, speak, and advise entirely based on the profound understanding of this document's core topic.
4. DO NOT write an introductory or concluding message. RETURN ONLY the final System Prompt string. Make it powerful, structured, and ready to be fed directly into an LLM.

Document Text:
====================
${truncatedText}
====================

Output the System Prompt below:`;

    let generatedInstructions = truncatedText; // Fallback to truncated text

    // Try Groq first
    let groqSuccess = false;
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: systemPromptMsg }],
        temperature: 0.3,
        max_tokens: 3000,
      });
      const generatedContent = completion.choices[0]?.message?.content?.trim();
      if (generatedContent) {
        generatedInstructions = generatedContent;
        groqSuccess = true;
      }
    } catch (groqError: any) {
      console.error("Groq Persona Generation Error:", groqError?.message || groqError);
    }

    // Fallback to OpenRouter free models if Groq failed
    if (!groqSuccess) {
      const freeModels = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-v4-flash:free",
        "google/gemma-4-31b-it:free",
        "openai/gpt-oss-20b:free",
        "openrouter/free",
      ];
      try {
        const { response: res } = await openrouterFetchWithFallback(
          freeModels,
          {
            messages: [{ role: "user", content: systemPromptMsg }],
            temperature: 0.3,
            max_tokens: 3000,
          }
        );
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          generatedInstructions = content;
          console.log(`[Agents] OpenRouter success`);
        }
      } catch (orErr: any) {
        console.warn(`[Agents] OpenRouter fallback failed:`, orErr?.message);
        // generatedInstructions stays as truncatedText fallback
      }
    }

    // 5. Insert into Supabase
    const { data: newAgent, error: insertError } = await supabase
      .from("custom_agents")
      .insert({
        user_id: dbUser.id,
        name: name,
        description: description || "Custom PDF Agent",
        instructions: generatedInstructions,
        icon: "FileText"
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
