import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

export async function executeDirectProviderStream(
  modelId: string,
  messages: any[],
  temperature: number,
  maxTokens: number,
  userId: string,
  providerKeys?: { openai?: string; anthropic?: string; gemini?: string }
): Promise<Response | null> {
  // Infer provider from modelId
  let provider = null;
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1-") || modelId.startsWith("o3-")) {
    provider = "openai";
  } else if (modelId.startsWith("claude-")) {
    provider = "anthropic";
  } else if (modelId.startsWith("gemini-") || modelId.includes("gemini")) {
    provider = "gemini";
  }

  if (!provider) return null; // Fallback to OpenRouter

  const apiKey = providerKeys?.[provider as keyof typeof providerKeys];
  if (!apiKey) return null; // Fallback if no direct key exists

  // Sanitize modelId for native SDKs (e.g., removing 'google/' prefix for Gemini)
  let nativeModelId = modelId;
  if (provider === "gemini" && nativeModelId.startsWith("google/")) {
    nativeModelId = nativeModelId.replace("google/", "");
  }

  if (provider === "openai") {
    const openai = new OpenAI({ apiKey });
    const stream = await openai.chat.completions.create({
      model: nativeModelId,
      messages: messages as any,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });
    
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });
    return new Response(readableStream, { headers: { "Content-Type": "text/event-stream" } });
  }

  if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const userMessages = messages.filter(m => m.role !== "system");

    const stream = await anthropic.messages.create({
      model: nativeModelId,
      messages: userMessages as any,
      system: systemMessage,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
              const content = chunk.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });
    return new Response(readableStream, { headers: { "Content-Type": "text/event-stream" } });
  }

  if (provider === "gemini") {
    const genai = new GoogleGenAI({ apiKey });
    const contents = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    
    const stream = await genai.models.generateContentStream({
      model: nativeModelId,
      contents: contents as any,
      config: {
        temperature,
        maxOutputTokens: maxTokens,
      }
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.text || "";
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });
    return new Response(readableStream, { headers: { "Content-Type": "text/event-stream" } });
  }

  return null;
}
