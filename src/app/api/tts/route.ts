import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voiceId: customVoiceId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text content is required" }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ElevenLabs API key not configured" }, { status: 500 });
    }

    // Default custom voice ID provided by the user (Sm1seazb4gs7RSlUVw7c).
    // Can be overridden dynamically by customVoiceId passed from request body.
    let voiceId = customVoiceId || "Sm1seazb4gs7RSlUVw7c";

    let response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2", // Multilingual handles English and Bengali seamlessly
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    // Graceful Fallback: If voice fails or is not found (404), fall back to default premade 'Adam' voice
    if (!response.ok && voiceId !== "pNInz6obpgDQGcFmaJgB") {
      const errText = await response.text();
      console.warn(`Voice ID ${voiceId} failed or not found:`, errText, `Falling back to default 'Adam' voice.`);
      voiceId = "pNInz6obpgDQGcFmaJgB";
      response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error("ElevenLabs API Error:", errorData);
      return NextResponse.json({ error: "Failed to generate audio" }, { status: 500 });
    }

    // Stream the audio blob directly to the client
    const audioBlob = await response.blob();

    return new NextResponse(audioBlob, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("TTS API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
