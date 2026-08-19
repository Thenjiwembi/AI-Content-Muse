import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  prompt: z.string().min(1).max(4000),
});

export const Route = createFileRoute("/api/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) {
          return Response.json({ error: "AI is not configured." }, { status: 500 });
        }

        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image",
            messages: [{ role: "user", content: parsed.prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          const message =
            upstream.status === 429
              ? "Rate limit reached. Please wait a moment and try again."
              : upstream.status === 402
                ? "AI credits exhausted. Add credits in your Lovable workspace to keep generating."
                : `Image generation failed (${upstream.status}). ${text.slice(0, 200)}`;
          return Response.json({ error: message }, { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          data?: { b64_json?: string; url?: string }[];
        };
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) {
          return Response.json({ error: "The model returned no image. Try again." }, { status: 502 });
        }

        return Response.json({ b64, mime: "image/png" });
      },
    },
  },
});
