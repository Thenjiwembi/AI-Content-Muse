import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookMarked, Loader2 } from "lucide-react";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ContentPreviewDialog } from "@/components/ContentPreviewDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGenerations } from "@/lib/use-generations";
import { GENERATION_LABELS, isSaved, type GenerationRow } from "@/lib/generations";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Content — Forge Studio" },
      {
        name: "description",
        content: "Your bookmarked AI generations: blogs, emails, code snippets and images.",
      },
      { property: "og:title", content: "Saved Content — Forge Studio" },
      {
        property: "og:description",
        content: "Quick access to the AI content you marked as saved in Forge Studio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavedPage,
});

const TABS = [
  { key: "all", label: "All" },
  { key: "text", label: "Text" },
  { key: "image", label: "Images" },
  { key: "code", label: "Code" },
  { key: "other", label: "Other" },
] as const;

function bucket(row: GenerationRow) {
  if (row.kind === "image") return "image";
  if (row.kind === "code") return "code";
  if (row.kind === "blog" || row.kind === "email" || row.kind === "minutes") return "text";
  return "other";
}

function SavedPage() {
  const { rows, images, loading, error, remove, user } = useGenerations();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const saved = useMemo(() => rows.filter(isSaved), [rows]);
  const filtered = useMemo(
    () => (tab === "all" ? saved : saved.filter((r) => bucket(r) === tab)),
    [saved, tab],
  );
  const active = filtered.find((r) => r.id === openId) ?? null;

  return (
    <DashboardShell title="Saved Content" description="Everything you bookmarked, grouped by type.">
      {!user ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BookMarked className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Sign in to see your saved content.</p>
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              {TABS.map((t) => (
                <TabsTrigger key={t.key} value={t.key}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading saved content…
            </div>
          ) : error ? (
            <p className="py-16 text-center text-sm text-destructive">
              Couldn&apos;t load your saved content. Please refresh.
            </p>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <BookMarked className="size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nothing saved here yet.</p>
                <Button asChild size="sm">
                  <Link to="/studio">Generate something</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((row) => (
                <Card key={row.id} className="overflow-hidden">
                  {images[row.id] && (
                    <img
                      src={images[row.id]}
                      alt={row.title}
                      loading="lazy"
                      className="h-40 w-full object-cover"
                    />
                  )}
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {GENERATION_LABELS[row.kind as keyof typeof GENERATION_LABELS] ?? row.kind}
                      </Badge>
                      {row.language && <Badge variant="secondary">{row.language}</Badge>}
                    </div>
                    <p className="line-clamp-2 text-sm font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </p>
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(row.id)}>
                      Open
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ContentPreviewDialog
        row={active}
        imageUrl={active ? images[active.id] : undefined}
        open={Boolean(active)}
        onOpenChange={(v) => !v && setOpenId(null)}
        deleting={deleting}
        onDelete={async (id) => {
          setDeleting(true);
          const ok = await remove(id);
          setDeleting(false);
          if (ok) setOpenId(null);
        }}
      />
    </DashboardShell>
  );
}
