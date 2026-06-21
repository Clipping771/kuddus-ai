import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function getOpenAIModels(apiKey: string) {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const chatModels = data.data.filter((m: any) => m.id.startsWith("gpt-") || m.id.startsWith("o1-") || m.id.startsWith("o3-"));
    return chatModels.map((m: any) => ({
      id: m.id,
      name: m.id,
      provider: "openai",
      isDirect: true
    }));
  } catch {
    return [];
  }
}

async function getAnthropicModels(apiKey: string) {
  if (!apiKey) return [];
  return [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", isDirect: true },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", isDirect: true },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "anthropic", isDirect: true },
  ];
}

async function getGeminiModels(apiKey: string) {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) return [];
    const data = await res.json();
    const chatModels = data.models.filter((m: any) => m.supportedGenerationMethods.includes("generateContent"));
    return chatModels.map((m: any) => ({
      id: m.name.replace("models/", ""),
      name: m.displayName || m.name.replace("models/", ""),
      provider: "gemini",
      isDirect: true
    }));
  } catch {
    return [];
  }
}

export async function POST(req: Request) {
  try {
    const { keys } = await req.json();
    if (!keys || typeof keys !== "object") {
      return NextResponse.json({ models: [], hasDirectKeys: false });
    }

    const modelPromises = [];
    if (keys.openai) modelPromises.push(getOpenAIModels(keys.openai));
    if (keys.anthropic) modelPromises.push(getAnthropicModels(keys.anthropic));
    if (keys.gemini) modelPromises.push(getGeminiModels(keys.gemini));

    const results = await Promise.all(modelPromises);
    const combinedModels = results.flat();

    return NextResponse.json({ models: combinedModels, hasDirectKeys: combinedModels.length > 0 });
  } catch (error) {
    console.error("[POST /api/models/providers] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
