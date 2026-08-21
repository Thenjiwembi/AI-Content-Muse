import { Download, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GENERATION_LABELS, type GenerationRow } from "@/lib/generations";

export function ContentPreviewDialog({
  row,
  imageUrl,
  open,
  onOpenChange,
  onDelete,
  deleting,
}: {
  row: GenerationRow | null;
  imageUrl?: string | undefined;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDelete?: (id: string) => void;
  deleting?: boolean;
}) {
  if (!row) return null;
  const label = GENERATION_LABELS[row.kind as keyof typeof GENERATION_LABELS] ?? row.kind;

  function download() {
    if (!row) return;
    if (imageUrl) {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${row.title.slice(0, 40) || "image"}.png`;
      a.target = "_blank";
      a.click();
      return;
    }
    const blob = new Blob([row.output ?? ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.title.slice(0, 40) || "content"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-4 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b border-border px-6 pt-6 pb-4 text-left">
          <DialogTitle className="pr-8 text-base sm:text-lg">{row.title}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{label}</Badge>
            {row.language && <Badge variant="secondary">{row.language}</Badge>}
            <span>{new Date(row.created_at).toLocaleString()}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6">
          {row.image_path && (
            <div className="flex items-center justify-center rounded-xl bg-muted p-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={row.title}
                  className="max-h-[58vh] w-auto max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          )}

          {row.output && (
            <div>
              <p className="label-eyebrow">Output</p>
              {row.kind === "code" ? (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-secondary p-4 font-mono text-xs leading-relaxed text-secondary-foreground">
                  {row.output}
                </pre>
              ) : (
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {row.output}
                </pre>
              )}
            </div>
          )}

          <div>
            <p className="label-eyebrow">Prompt</p>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-secondary p-4 font-mono text-xs">
              {row.prompt}
            </pre>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="secondary" size="sm" onClick={download}>
            <Download /> Download
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={() => onDelete(row.id)}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
