import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Copy, Loader2, Sparkles, Square, Wand2, Download, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PROMPT_LIBRARY,
  KIND_LABELS,
  TONES,
  LENGTHS,
  CODE_LANGUAGES,
  buildPrompt,
  withLanguage,
  type ContentKind,
} from "@/lib/prompt-library";
import { saveGeneration } from "@/lib/generations";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — AI Blog, Email & Code Generator" },
      {
        name: "description",
        content:
          "Generate blog posts, emails and code in your preferred programming language with an optimized prompt library.",
      },
      { property: "og:title", content: "Studio — AI Blog, Email & Code Generator" },
      {
        property: "og:description",
        content: "Multi-purpose AI content generator with a prompt library and saved archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Studio,
});

function Studio() {
  const { user } = useAuth();
  const [kind, setKind] = useState<ContentKind>("blog");
  const templates = useMemo(() => PROMPT_LIBRARY.filter((t) => t.kind === kind), [kind]);
  const [templateId, setTemplateId] = useState(templates[0]!.id);
  const template = useMemo(
    () => templates.find((t) => t.id === templateId) ?? templates[0]!,
    [templates, templateId],
  );

  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<string>(TONES[0]);
  const [length, setLength] = useState<string>(LENGTHS[1]);
  const [language, setLanguage] = useState<string>(CODE_LANGUAGES[0]);
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const finalPrompt = withLanguage(
    buildPrompt({ template, topic, audience, tone, length }),
    kind,
    language,
  );

  function switchKind(next: ContentKind) {
    setKind(next);
    setTemplateId(PROMPT_LIBRARY.filter((t) => t.kind === next)[0]!.id);
  }

  async function generate() {
    if (!topic.trim()) {
      toast.error("Add a brief first — what should this be about?");
      return;
    }
    setBusy(true);
    setOutput("");
    const controller = new AbortController();
    abortRef.current = controller;

    let full = "";
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Generation failed. Try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setOutput((prev) => prev + chunk);
      }

      if (user && full.trim()) {
        await saveGeneration({
          kind,
          title: topic.trim().slice(0, 90),
          prompt: finalPrompt,
          output: full,
          language: kind === "code" ? language : null,
          metadata: { template: template.id, tone, length, audience },
        });
        toast.success("Saved to your archive");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Something went wrong while generating.");
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function copy(text: string, what: string) {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  }

  function download() {
    if (!output.trim()) return;
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.id}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label-eyebrow">Content generator</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
              Forge <span className="text-primary">Studio</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Blogs, emails and code in any language. Pick an optimized prompt, tune the
              variables, watch the prompt build itself, then generate.
            </p>
          </div>
          {!user && (
            <p className="text-xs text-muted-foreground">
              Sign in to save every generation to your archive.
            </p>
          )}
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <section className="panel space-y-6 p-6">
            <div>
              <p className="label-eyebrow mb-3">1 · Content type</p>
              <Tabs value={kind} onValueChange={(v) => switchKind(v as ContentKind)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="blog">Blog</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                  <TabsTrigger value="code">Code</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-2">
              <p className="label-eyebrow">2 · Prompt template</p>
              <Select value={template.id} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{template.summary}</p>
            </div>

            {kind === "code" && (
              <div className="space-y-2">
                <Label>Programming language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CODE_LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-4">
              <p className="label-eyebrow">3 · Variables</p>
              <div className="space-y-2">
                <Label htmlFor="topic">Brief</Label>
                <Textarea
                  id="topic"
                  rows={4}
                  placeholder="e.g. How small teams use AI to cut reporting time in half"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Audience</Label>
                <Input
                  id="audience"
                  placeholder="e.g. operations managers at mid-size retailers"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Length</Label>
                  <Select value={length} onValueChange={setLength}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LENGTHS.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {busy ? (
                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => abortRef.current?.abort()}
                >
                  <Square /> Stop
                </Button>
              ) : (
                <Button className="flex-1" onClick={generate}>
                  <Sparkles /> Generate
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setTopic("");
                  setAudience("");
                  setOutput("");
                }}
                aria-label="Reset inputs"
              >
                <RotateCcw />
              </Button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="panel p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="label-eyebrow">Compiled prompt</p>
                <Button size="sm" variant="ghost" onClick={() => copy(finalPrompt, "Prompt")}>
                  <Copy /> Copy prompt
                </Button>
              </div>
              <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed text-secondary-foreground">
                {finalPrompt}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
                {kind === "code" && <Badge variant="outline">{language}</Badge>}
              </div>
            </div>

            <div className="panel min-h-[420px] p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="label-eyebrow">{KIND_LABELS[kind]} output</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => copy(output, "Output")}>
                    <Copy /> Copy
                  </Button>
                  <Button size="sm" variant="ghost" onClick={download}>
                    <Download /> .md
                  </Button>
                  {user && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!output.trim()}
                      onClick={async () => {
                        await saveGeneration({
                          kind,
                          title: topic.trim().slice(0, 90) || "Untitled",
                          prompt: finalPrompt,
                          output,
                          language: kind === "code" ? language : null,
                        });
                        toast.success("Saved to archive");
                      }}
                    >
                      <Save /> Save
                    </Button>
                  )}
                </div>
              </div>

              {output ? (
                <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {output}
                  {busy && <span className="ml-1 animate-pulse text-primary">▍</span>}
                </pre>
              ) : (
                <div className="mt-16 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
                  {busy ? (
                    <Loader2 className="size-6 animate-spin text-primary" />
                  ) : (
                    <Wand2 className="size-6 text-primary" />
                  )}
                  <p>{busy ? "Drafting your content…" : "Your generated content appears here."}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
