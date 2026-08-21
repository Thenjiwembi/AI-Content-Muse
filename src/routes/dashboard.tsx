import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BookMarked,
  Code2,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Mail,
  Plus,
  Share2,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GENERATION_LABELS, isSaved } from "@/lib/generations";
import { useGenerations } from "@/lib/use-generations";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Forge Studio" },
      {
        name: "description",
        content:
          "Your Forge Studio dashboard: generation stats, quick actions and your most recent AI-generated content.",
      },
      { property: "og:title", content: "Dashboard — Forge Studio" },
      {
        property: "og:description",
        content: "Create, manage and organize your AI-generated content in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const QUICK_ACTIONS = [
  { to: "/studio", icon: FileText, title: "Generate Blog", body: "Long-form posts with structure." },
  { to: "/studio", icon: Mail, title: "Generate Email", body: "Outreach and follow-ups." },
  { to: "/studio", icon: Share2, title: "Social Post", body: "Short punchy copy." },
  { to: "/studio", icon: Code2, title: "Generate Code", body: "Any language you prefer." },
  { to: "/images", icon: ImageIcon, title: "Generate Image", body: "Visuals from a description." },
  { to: "/prompts", icon: Sparkles, title: "Prompt Library", body: "Reusable optimized prompts." },
] as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const { rows, images, loading, error, reload, user } = useGenerations();

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = rows.filter((r) => new Date(r.created_at).getTime() > weekAgo).length;
    return [
      { label: "Total Generations", value: rows.length, icon: Wand2, trend: null },
      { label: "Saved Content", value: rows.filter(isSaved).length, icon: BookMarked, trend: null },
      {
        label: "Prompts Used",
        value: new Set(rows.map((r) => (r.metadata as { template?: string } | null)?.template ?? r.kind))
          .size,
        icon: ListChecks,
        trend: null,
      },
      {
        label: "Created This Week",
        value: thisWeek,
        icon: TrendingUp,
        trend: rows.length ? `${Math.round((thisWeek / rows.length) * 100)}% of all` : null,
      },
    ];
  }, [rows]);

  const recent = rows.slice(0, 6);
  const name = user?.email?.split("@")[0] ?? "there";

  return (
    <DashboardShell
      title="Dashboard"
      description="Overview of your AI content workspace"
      actions={
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/studio">
            <Plus /> Create
          </Link>
        </Button>
      }
    >
      <section className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            {greeting()}, <span className="text-primary">{name}</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create, manage and organize your AI-generated content.
          </p>
        </div>
        <Button asChild size="lg" className="shrink-0">
          <Link to="/studio">
            <Plus /> Create New Content
          </Link>
        </Button>
      </section>

      <section className="mt-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="panel flex h-full flex-col justify-between gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="size-4" />
                </span>
              </div>
              {loading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-semibold tabular-nums">{s.value}</p>
              )}
              <p className="text-xs text-muted-foreground">{s.trend ?? "All time"}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h3 className="text-lg font-semibold">Quick actions</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.title}
              to={a.to}
              className="panel flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <a.icon className="size-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{a.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.body}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Recent generations</h3>
          <Button asChild variant="ghost" size="sm">
            <Link to="/archive">View all</Link>
          </Button>
        </div>

        {error ? (
          <div className="panel mt-4 p-8 text-center">
            <p className="text-sm font-medium">Something went wrong</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Unable to load your content right now.
            </p>
            <Button className="mt-4" size="sm" variant="secondary" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : !user ? (
          <div className="panel mt-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">Sign in to track your generations.</p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        ) : recent.length === 0 ? (
          <div className="panel mt-4 p-10 text-center">
            <Wand2 className="mx-auto size-6 text-primary" />
            <p className="mt-3 text-sm font-medium">No generations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your generated content will appear here.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link to="/studio">Create your first generation</Link>
            </Button>
          </div>
        ) : (
          <div className="panel mt-4 divide-y divide-border overflow-hidden">
            {recent.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {images[r.id] ? (
                    <img src={images[r.id]} alt={r.title} className="size-full object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center text-primary">
                      <FileText className="size-4" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {GENERATION_LABELS[r.kind as keyof typeof GENERATION_LABELS] ?? r.kind}
                </Badge>
                <Button asChild size="sm" variant="ghost" className="shrink-0">
                  <Link to="/archive">Open</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
