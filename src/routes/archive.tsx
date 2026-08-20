import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import {
  GENERATION_LABELS,
  deleteGeneration,
  listGenerations,
  signedImageUrl,
  type GenerationRow,
} from "@/lib/generations";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive — Forge Studio history" },
      {
        name: "description",
        content:
          "Browse every blog, email, code snippet, image and meeting minute you generated in Forge Studio.",
      },
      { property: "og:title", content: "Archive — Forge Studio history" },
      {
        property: "og:description",
        content: "Your saved AI generations with prompts, outputs and images in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ArchivePage,
});

const FILTERS = ["all", "blog", "email", "code", "image", "minutes"] as const;

function ArchivePage() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<GenerationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [q, setQ] = useState("");
  const [images, setImages] = useState<Record<string, string>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    listGenerations()
      .then(async (data) => {
        if (!alive) return;
        setRows(data);
        setLoading(false);
        const entries = await Promise.all(
          data
            .filter((r) => r.image_path)
            .map(async (r) => [r.id, await signedImageUrl(r.image_path!)] as const),
        );
        if (!alive) return;
        setImages(Object.fromEntries(entries.filter(([, u]) => u) as [string, string][]));
      })
      .catch(() => {
        if (alive) {
          setLoading(false);
          toast.error("Couldn't load your archive.");
        }
      });
    return () => {
      alive = false;
    };
  }, [user]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filter === "all" || r.kind === filter) &&
          (q.trim() === "" ||
            `${r.title} ${r.prompt} ${r.output ?? ""}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, filter, q],
  );

  async function remove(id: string) {
    try {
      await deleteGeneration(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Couldn't delete that item.");
    }
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-eyebrow">History</p>
            <h1 className="mt-3 text-4xl font-bold">Your archive</h1>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">
              Every generation — prompt, output and image — saved to your account.
            </p>
          </div>
        </header>

        {authLoading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="panel mt-10 p-10 text-center">
            <p className="text-sm text-muted-foreground">Sign in to see your saved generations.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                <TabsList>
                  {FILTERS.map((f) => (
                    <TabsTrigger key={f} value={f} className="capitalize">
                      {f}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative ml-auto w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search your history"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="mt-16 flex justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="panel mt-8 p-10 text-center text-sm text-muted-foreground">
                Nothing here yet — generate something and it lands in this archive.
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                {filtered.map((r) => (
                  <article key={r.id} className="panel p-5">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">
                            {GENERATION_LABELS[r.kind as keyof typeof GENERATION_LABELS] ?? r.kind}
                          </Badge>
                          {r.language && <Badge variant="secondary">{r.language}</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h2 className="mt-2 truncate font-semibold">{r.title}</h2>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setOpenId(openId === r.id ? null : r.id)}
                        >
                          {openId === r.id ? "Hide" : "View"}
                        </Button>
                        {r.output && (
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label="Copy output"
                            onClick={() => {
                              navigator.clipboard.writeText(r.output!);
                              toast.success("Output copied");
                            }}
                          >
                            <Copy />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Delete"
                          onClick={() => remove(r.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>

                    {openId === r.id && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="label-eyebrow">Prompt</p>
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-3 font-mono text-xs">
                            {r.prompt}
                          </pre>
                        </div>
                        {images[r.id] && (
                          <img
                            src={images[r.id]}
                            alt={r.title}
                            className="max-h-[480px] rounded-lg"
                          />
                        )}
                        {r.output && (
                          <div>
                            <p className="label-eyebrow">Output</p>
                            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                              {r.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
