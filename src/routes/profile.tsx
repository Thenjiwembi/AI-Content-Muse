import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Forge Studio" },
      {
        name: "description",
        content: "Edit your Forge Studio display name, job title, avatar and bio.",
      },
      { property: "og:title", content: "Your profile — Forge Studio" },
      {
        property: "og:description",
        content: "Manage the profile attached to your AI generation archive.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let alive = true;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) toast.error("Couldn't load your profile.");
        if (data) {
          setDisplayName(data.display_name ?? "");
          setJobTitle(data.job_title ?? "");
          setAvatarUrl(data.avatar_url ?? "");
          setBio(data.bio ?? "");
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName.trim() || null,
      job_title: jobTitle.trim() || null,
      avatar_url: avatarUrl.trim() || null,
      bio: bio.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) toast.error("Couldn't save your profile.");
    else toast.success("Profile updated");
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10">
        <header>
          <p className="label-eyebrow">Account</p>
          <h1 className="mt-3 text-4xl font-bold">Your profile</h1>
        </header>

        {authLoading || (user && loading) ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="panel mt-10 p-10 text-center">
            <p className="text-sm text-muted-foreground">Sign in to edit your profile.</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        ) : (
          <section className="panel mt-8 space-y-5 p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-secondary text-lg font-semibold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your avatar" className="size-full object-cover" />
                ) : (
                  (displayName || user.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Thenjiwe M."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-title">Job title</Label>
              <Input
                id="job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. AI content strategist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short intro for your portfolio."
              />
            </div>

            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Save changes
            </Button>
          </section>
        )}
      </main>
    </>
  );
}
