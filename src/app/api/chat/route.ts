import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import Groq from "groq-sdk";

const KUDDUS_ALI_SYSTEM_PROMPT = `## IDENTITY
You are "Kuddus Ali" — a brutally honest Personal Business Advisor who has seen it all.
20+ years of experience across 4 continents: Asia, Europe, North America, and the Middle East.
You have taken 80+ startups and SMEs from raw idea to profitable business across multiple markets and industries.
Deep expertise in: E-commerce, SaaS, F&B, Fashion, Logistics, EdTech, Fintech, and Local Service businesses.
You have a unique personality — your name makes people smile, but your advice makes them think.
You are funny when appropriate, but never at the cost of honesty.
You have witnessed dozens of failures firsthand — which makes your advice sharp, realistic, and battle-tested.
You do not work for everyone. You work for people serious about building something real.

## LANGUAGE RULE (NON-NEGOTIABLE)
Detect the language of the user's FIRST message.
Respond in that exact language for the ENTIRE conversation.
Bengali → Bengali | English → English | Arabic → Arabic | French → French | Any language → Same language.
Never mix languages in a single response.
Never switch unless the user explicitly switches first.

## PERSONALITY & TONE
- Mentor, not a cheerleader
- Direct, blunt, zero sugar-coating
- Occasionally dry humor — but never loses seriousness
- Bad idea = say it clearly in the FIRST line
- Identify problems BEFORE strengths
- Challenge vague assumptions — ask sharp questions
- No filler words, no empty praise
- Always consider the user's specific country/market before advising

## TOOLS
- Web Search → latest market data, news, trends for user's country
- Google Trends → validate demand before making any claim
- Browser Control → visit competitor websites, check real pricing
- News Fetcher → latest business/economic news for user's market

CRITICAL: Always identify user's country/market FIRST.
If unknown → ask before any analysis.
Never fabricate statistics.
If data unavailable → say so clearly.

## OUTPUT FORMAT (never break this structure)

### ⚡ VERDICT
Go / No-Go / Pivot
One brutally honest line. No softening.

### 📊 ANALYSIS
**Market**
- Size & growth trend (with source)
- Demand signal (Google Trends / news)
- Is the timing right for THIS specific market?

**Competition**
- Top 3-5 real competitors (local + global)
- Their strengths and weaknesses
- Real gap in the market (if any)

**Your Edge**
- Realistic Unfair Advantage — or honest admission that none exists
- Can you actually compete here?

### 🛠️ IMPLEMENTATION ROADMAP
Numbered steps by Week / Month.
Realistic timeline — no fantasy deadlines.
Tailored to user's country (regulations, platforms, costs).

### ⚠️ CRITICAL RISKS & MITIGATION
Minimum 3 real, market-specific risks.
Format: Risk → Why it matters → How to reduce it.

### ➡️ NEXT 7 DAYS ACTION PLAN
Maximum 7 items.
Each item completable within 24-48 hours.
Zero vague advice.

## CORE RULES
1. Always identify country/market before analysis.
   If not mentioned → ask first.
2. No generic advice. Every answer market-specific.
3. No numbers without verified data.
4. Weak idea → say it in line 1.
5. Need more info → ask max 2 questions first.
6. Never repeat advice. Push conversation forward.

## OPENING MESSAGE
Detect language from user's first message.
Default to English if no message yet.

English:
"I'm Kuddus Ali. Unusual name, unusual advice.
20 years across 4 continents — I've seen brilliant ideas fail and stupid ideas make millions.
I'll tell you what's real, not what you want to hear.
What's your business idea — and which market are you targeting?"

Bengali:
"আমি Kuddus Ali। নামটা একটু অন্যরকম, পরামর্শও তাই।
২০ বছর ধরে ৪টা মহাদেশে বিজনেস করেছি — ভালো আইডিয়া ফেল হতে দেখেছি, বাজে আইডিয়া কোটি টাকা বানাতেও দেখেছি।
আমি সত্যি কথা বলব, সুন্দর কথা না।
তোমার বিজনেস আইডিয়া বলো — আর কোন মার্কেটে করতে চাও?"

Arabic:
"أنا Kuddus Ali. اسم غريب، ونصائح غريبة.
٢٠ عاماً في ٤ قارات — رأيت أفكاراً رائعة تفشل وأفكاراً سخيفة تجني الملايين.
سأخبرك بالحقيقة، لا بما تريد سماعه.
ما هي فكرة عملك — وأي سوق تستهدف?"`;

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatId } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Lazy initialize Groq inside POST to satisfy compile-time build traces
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY || "gsk_placeholder_compile_key_12345",
    });

    // 1. Fetch user from Supabase
    let { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", clerkId)
      .single();

    // Lazy sync if they somehow missed /api/user load
    if (!dbUser) {
      const email = ""; // Default empty if not through lazy loading route
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({ clerk_id: clerkId, email })
        .select("*")
        .single();

      if (insertError) {
        console.error("Supabase user insert error:", insertError);
        return NextResponse.json({ error: "Failed to resolve user profile" }, { status: 500 });
      }
      dbUser = newUser;
    }

    let activeChatId = chatId;

    // 2. If no chatId, create a new Chat
    if (!activeChatId) {
      const truncatedTitle = message.length > 40 ? `${message.substring(0, 40)}...` : message;
      const { data: newChat, error: chatError } = await supabase
        .from("chats")
        .insert({
          user_id: dbUser.id,
          title: truncatedTitle,
        })
        .select("*")
        .single();

      if (chatError) {
        console.error("Supabase chat creation error:", chatError);
        return NextResponse.json({ error: "Failed to create new chat" }, { status: 500 });
      }
      activeChatId = newChat.id;
    } else {
      // Verify chat belongs to this user
      const { data: existingChat, error: verifyError } = await supabase
        .from("chats")
        .select("*")
        .eq("id", activeChatId)
        .eq("user_id", dbUser.id)
        .single();

      if (verifyError || !existingChat) {
        return NextResponse.json({ error: "Chat not found or access denied" }, { status: 404 });
      }
    }

    // 3. Save user's message to Supabase
    const { error: messageInsertError } = await supabase
      .from("messages")
      .insert({
        chat_id: activeChatId,
        role: "user",
        content: message,
      });

    if (messageInsertError) {
      console.error("Failed to save user message:", messageInsertError);
    }

    // 4. Retrieve historical messages for context
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", activeChatId)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("History fetch error:", historyError);
    }

    // 5. Format history for Groq messages array (System prompt must be at position 0)
    const formattedMessages: any[] = [
      {
        role: "system",
        content: KUDDUS_ALI_SYSTEM_PROMPT,
      },
    ];

    if (history && history.length > 0) {
      history.forEach((msg) => {
        formattedMessages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });
    } else {
      // Fallback if history query returns empty but we know we just saved the user message
      formattedMessages.push({
        role: "user",
        content: message,
      });
    }

    // 6. Call Groq Llama 3.3 API with Streaming
    const responseStream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: formattedMessages,
      stream: true,
    });

    const encoder = new TextEncoder();
    let assistantResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        // Enqueue activeChatId as metadata line so the frontend knows what chatId was resolved
        controller.enqueue(encoder.encode(`__CHAT_ID__:${activeChatId}\n`));

        try {
          for await (const chunk of responseStream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              assistantResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          // Save completed assistant response to Supabase
          if (assistantResponse) {
            const { error: assistantSaveError } = await supabase
              .from("messages")
              .insert({
                chat_id: activeChatId,
                role: "assistant",
                content: assistantResponse,
              });

            if (assistantSaveError) {
              console.error("Failed to save Kuddus response:", assistantSaveError);
            }
          }
        } catch (streamErr) {
          console.error("Error while processing Groq stream:", streamErr);
          controller.enqueue(encoder.encode("\n[Error: Stream interrupted]"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in /api/chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
