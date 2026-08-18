import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  prompt: z.string().min(1).max(8000),
  system: z.string().max(2000).optional(),
});

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "AI is not configured." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Invalid request." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            stream: true,
            messages: [
              {
                role: "system",
                content:
                  parsed.system ??
                  "You are an expert content generator. Follow the user's structure requirements exactly. Return only the requested content in clean markdown, with no preamble or meta commentary.",
              },
              { role: "user", content: parsed.prompt },
            ],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const message =
            upstream.status === 429
              ? "Rate limit reached. Please wait a moment and try again."
              : upstream.status === 402
                ? "AI credits exhausted. Add credits in your Lovable workspace to keep generating."
                : `Generation failed (${upstream.status}).`;
          return new Response(JSON.stringify({ error: message }), {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data:")) continue;
                  const data = trimmed.slice(5).trim();
                  if (data === "[DONE]") continue;
                  try {
                    const json = JSON.parse(data);
                    const delta = json?.choices?.[0]?.delta?.content;
                    if (typeof delta === "string" && delta.length > 0) {
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch {
                    /* ignore partial chunks */
                  }
                }
              }
            } finally {
              controller.close();
              reader.releaseLock();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
