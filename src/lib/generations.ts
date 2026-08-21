import { supabase } from "@/integrations/supabase/client";

export type GenerationKind = "blog" | "email" | "code" | "image" | "minutes";

export const GENERATION_LABELS: Record<GenerationKind, string> = {
  blog: "Blog",
  email: "Email",
  code: "Code",
  image: "Image",
  minutes: "Minutes",
};

export type GenerationRow = {
  id: string;
  kind: string;
  title: string;
  prompt: string;
  output: string | null;
  language: string | null;
  image_path: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export async function saveGeneration(input: {
  kind: GenerationKind;
  title: string;
  prompt: string;
  output?: string | null;
  language?: string | null;
  imagePath?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      kind: input.kind,
      title: input.title.slice(0, 160),
      prompt: input.prompt,
      output: input.output ?? null,
      language: input.language ?? null,
      image_path: input.imagePath ?? null,
      metadata: (input.metadata ?? {}) as never,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listGenerations() {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as GenerationRow[];
}

export async function deleteGeneration(id: string) {
  const { error } = await supabase.from("generations").delete().eq("id", id);
  if (error) throw error;
}

export async function signedImageUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("generated-images")
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadGeneratedImage(base64: string, mime = "image/png") {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const ext = mime.includes("jpeg") ? "jpg" : "png";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("generated-images")
    .upload(path, new Blob([bytes], { type: mime }), { contentType: mime });
  if (error) throw error;
  return path;
}

export async function setSavedFlag(row: GenerationRow, saved: boolean) {
  const metadata = { ...(row.metadata ?? {}), saved };
  const { error } = await supabase
    .from("generations")
    .update({ metadata: metadata as never })
    .eq("id", row.id);
  if (error) throw error;
  return metadata;
}

export function isSaved(row: GenerationRow) {
  return Boolean((row.metadata as { saved?: boolean } | null)?.saved);
}

export function contentGroup(kind: string): "text" | "images" | "code" | "other" {
  if (kind === "image") return "images";
  if (kind === "code") return "code";
  if (kind === "blog" || kind === "email" || kind === "minutes") return "text";
  return "other";
}
