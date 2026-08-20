import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { saveGeneration, uploadGeneratedImage } from "@/lib/generations";

export const Route = createFileRoute("/images")({
  head: () => ({
    meta: [
      { title: "Image Generator — Forge Studio" },
      {
        name: "description",
        content:
          "Describe any picture and generate it with AI, then keep it in your private Forge Studio archive.",
      },
      { property: "og:title", content: "Image Generator — Forge Studio" },
      {
        property: "og:description",
        content: "AI picture generation with style presets and a saved history of every image.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Images,
});

const STYLES = [
  "Photorealistic",
  "Digital illustration",
  "Watercolour",
  "3D render",
  "Flat vector",
  "Cinematic poster",
] as const;

const RATIOS = ["Square 1:1", "Landscape 16:9", "Portrait 4:5"] as const;

function Images() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>(STYLES[0]);
  const [ratio, setRatio] = useState<string>(RATIOS[0]);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finalPrompt = `${prompt.trim()}\n\nStyle: ${style}. Aspect ratio: ${ratio}. High detail, clean composition, no watermark or text overlay.`;

  async function generate() {
    if (!prompt.trim()) {
      toast.error("Describe the picture you want first.");
      return;
    }
    setBusy(true);
    setSrc(null);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });
      const data = (await res.json()) as { b64?: string; mime?: string; error?: string };
      if (!res.ok || !data.b64) {
        toast.error(data.error ?? "Image generation failed.");
        return;
      }
      const mime = data.mime ?? "image/png";
      setSrc(`data:${mime};base64,${data.b64}`);

      if (user) {
        const path = await uploadGeneratedImage(data.b64, mime);
        await saveGeneration({
          kind: "image",
          title: prompt.trim().slice(0, 90),
          prompt: finalPrompt,
          imagePath: path,
          metadata: { style, ratio },
        });
        toast.success("Saved to your archive");
      }
    } catch {
      toast.error("Something went wrong while generating the image.");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!src) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `forge-image-${Date.now()}.png`;
    a.click();
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10">
        <header>
          <p className="label-eyebrow">Picture generator</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Generate <span className="text-primary">images</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Describe the scene, pick a style and ratio, and Forge Studio renders it — then keeps
            it in your archive.
          </p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="panel space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="img-prompt">Description</Label>
              <Textarea
                id="img-prompt"
                rows={6}
                placeholder="e.g. a sunlit co-working loft with plants and warm wood desks"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ratio</Label>
                <Select value={ratio} onValueChange={setRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATIOS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {busy ? "Generating…" : "Generate image"}
            </Button>
            {!user && (
              <p className="text-xs text-muted-foreground">
                Sign in to save generated images to your archive.
              </p>
            )}
          </section>

          <section className="panel flex min-h-[420px] flex-col p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="label-eyebrow">Result</p>
              {src && (
                <Button size="sm" variant="ghost" onClick={download}>
                  <Download /> Download
                </Button>
              )}
            </div>
            <div className="mt-4 flex flex-1 items-center justify-center">
              {src ? (
                <img
                  src={src}
                  alt={prompt.slice(0, 120) || "Generated image"}
                  className="max-h-[540px] w-auto rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
                  {busy ? (
                    <Loader2 className="size-6 animate-spin text-primary" />
                  ) : (
                    <ImageIcon className="size-6 text-primary" />
                  )}
                  <p>{busy ? "Painting your picture…" : "Your generated image appears here."}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
