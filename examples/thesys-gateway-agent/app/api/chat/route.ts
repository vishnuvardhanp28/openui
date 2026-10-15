import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.length <= 20_000
  );
}

export async function POST(request: NextRequest) {
  if (!process.env.THESYS_API_KEY) {
    return NextResponse.json(
      { error: "Gateway is not configured. Set THESYS_API_KEY on the server and restart the app." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const rawMessages = (body as { messages?: unknown } | null)?.messages;
  if (
    !Array.isArray(rawMessages) ||
    rawMessages.length < 1 ||
    rawMessages.length > 40 ||
    !rawMessages.every(isChatMessage) ||
    !rawMessages.some((message) => message.role === "user")
  ) {
    return NextResponse.json({ error: "Provide between 1 and 40 valid chat messages." }, { status: 400 });
  }

  const client = new OpenAI({
    apiKey: process.env.THESYS_API_KEY,
    baseURL: "https://api.thesys.dev/v1/embed",
    timeout: 60_000,
    maxRetries: 1,
  });

  try {
    const stream = await client.chat.completions.create({
      model: "openai/gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a helpful, precise AI assistant. Answer clearly, structure complex explanations, and state uncertainty when appropriate.",
        },
        ...rawMessages,
      ],
      stream: true,
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content;
            if (typeof text === "string" && text.length > 0) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch {
          controller.error(new Error("Gateway stream failed."));
        }
      },
      cancel() {
        void stream.controller.abort();
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    // Deliberately avoid logging request content or environment variables.
    return NextResponse.json(
      {
        error:
          status === 401 || status === 403
            ? "Gateway authentication failed. Check the server-side Thesys key and model access."
            : "The Gateway request failed. Check the server configuration and Thesys Console.",
      },
      { status: 502 },
    );
  }
}
