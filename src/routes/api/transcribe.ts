import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 24 * 1024 * 1024;

const EXT_BY_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "video/mp4": "mp4",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json({ error: "AI is not configured." }, 500);

        let file: File | null = null;
        try {
          const form = await request.formData();
          const value = form.get("audio");
          if (value instanceof File) file = value;
        } catch {
          return json({ error: "Invalid upload." }, 400);
        }

        if (!file || file.size === 0) return json({ error: "No audio file received." }, 400);
        if (file.size < 2048)
          return json({ error: "That recording is empty — please record again." }, 400);
        if (file.size > MAX_BYTES)
          return json({ error: "Audio is too large (max 24 MB). Trim or split it." }, 400);

        const mime = (file.type || "").split(";")[0]!.toLowerCase();
        const ext = EXT_BY_TYPE[mime];
        if (!ext)
          return json(
            { error: `Unsupported audio format${mime ? ` (${mime})` : ""}. Use mp3, m4a, wav or webm.` },
            400,
          );

        const upstreamForm = new FormData();
        upstreamForm.append("model", "openai/gpt-4o-transcribe");
        upstreamForm.append("file", file, `recording.${ext}`);

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstreamForm,
        });

        if (!upstream.ok) {
          const detail = await upstream.text().catch(() => "");
          const message =
            upstream.status === 429
              ? "Rate limit reached. Please wait a moment and try again."
              : upstream.status === 402
                ? "AI credits exhausted. Add credits in your Lovable workspace to keep transcribing."
                : upstream.status === 404
                  ? "Transcription is not enabled for this workspace."
                  : `Transcription failed (${upstream.status}). ${detail.slice(0, 300)}`;
          return json({ error: message }, upstream.status);
        }

        const data = (await upstream.json().catch(() => null)) as { text?: string } | null;
        const text = data?.text?.trim();
        if (!text) return json({ error: "No speech was detected in that recording." }, 422);

        return json({ text }, 200);
      },
    },
  },
});
