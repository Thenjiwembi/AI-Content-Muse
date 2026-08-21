import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import {
  deleteGeneration,
  listGenerations,
  signedImageUrl,
  type GenerationRow,
} from "@/lib/generations";

export function useGenerations() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<GenerationRow[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const data = await listGenerations();
      setRows(data);
      setLoading(false);
      const entries = await Promise.all(
        data
          .filter((r) => r.image_path)
          .map(async (r) => [r.id, await signedImageUrl(r.image_path!)] as const),
      );
      setImages(Object.fromEntries(entries.filter(([, u]) => u) as [string, string][]));
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteGeneration(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted");
      return true;
    } catch {
      toast.error("Couldn't delete that item. Please try again.");
      return false;
    }
  }, []);

  return {
    rows,
    setRows,
    images,
    loading: loading || authLoading,
    error,
    reload: load,
    remove,
    user,
  };
}
