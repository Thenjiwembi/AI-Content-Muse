import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PROMPT_LIBRARY, KIND_LABELS, type ContentKind } from "@/lib/prompt-library";

export const Route = createFileRoute("/prompts")({
  head: () => ({
    meta: [
      { title: "Prompt Library — Forge Studio" },
      {
        name: "description",
        content:
          "Nine optimized, reusable prompt templates for blog posts, emails and code, with the prompt-engineering principles behind each one.",
      },
      { property: "og:title", content: "Prompt Library — Forge Studio" },
      {
        property: "og:description",
        content: "Optimized prompt templates for blogs, emails and code generation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Prompts,
});

const PRINCIPLES = [
  {
    title: "Assign a role",
    body: "\"Act as a senior content strategist\" narrows vocabulary, depth and defaults far more than adjectives do.",
  },
  {
    title: "Name the audience",
    body: "Audience is the single highest-leverage variable: it fixes reading level, examples and objections.",
  },
  {
    title: "Specify structure",
    body: "Section counts, word limits and output format remove the model's freedom to ramble.",
  },
  {
    title: "State refusals",
    body: "Telling it what not to do (no buzzwords, no generic openers) removes the most common AI tells.",
  },
];

function Prompts() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = PROMPT_LIBRARY.filter(
    (t) =>
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q)),
  );

  const kinds: ContentKind[] = ["blog", "email", "code"];

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">
          <ArrowLeft /> Back to studio
        </Link>
      </Button>

      <header className="mt-6">
        <p className="label-eyebrow">Prompt engineering</p>
        <h1 className="mt-3 text-4xl font-bold">Prompt library</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Every template here was iterated from a one-line prompt into a structured scaffold with
          a role, an audience, explicit structure and refusals. Copy any of them, or run them in
          the studio.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="panel p-5">
            <h2 className="text-base font-semibold text-primary">{p.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 max-w-sm">
        <Input
          placeholder="Search templates or tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {kinds.map((kind) => {
        const items = filtered.filter((t) => t.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind} className="mt-10">
            <p className="label-eyebrow">{KIND_LABELS[kind]}</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {items.map((t) => (
                <article key={t.id} className="panel flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">{t.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(t.template);
                        toast.success("Template copied");
                      }}
                    >
                      <Copy />
                    </Button>
                  </div>
                  <pre className="mt-4 max-h-64 flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed text-secondary-foreground">
                    {t.template}
                  </pre>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
