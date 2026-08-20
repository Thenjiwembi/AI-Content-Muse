import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Image as ImageIcon, Code2, ListChecks, Archive, Sparkles } from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Forge Studio — AI Content, Image & Code Generator" },
      {
        name: "description",
        content:
          "Forge Studio generates blogs, emails, code, images and meeting minutes from optimized prompts, and saves everything to your personal archive.",
      },
      { property: "og:title", content: "Forge Studio — AI Content, Image & Code Generator" },
      {
        property: "og:description",
        content:
          "One workspace for AI-generated blogs, emails, code, images and meeting minutes with a reusable prompt library.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const FEATURES = [
  {
    to: "/studio",
    icon: FileText,
    title: "Blogs & emails",
    body: "Optimized templates with tone, length and audience controls, streamed live.",
  },
  {
    to: "/studio",
    icon: Code2,
    title: "Code in any language",
    body: "Pick your preferred programming language and get idiomatic, commented code.",
  },
  {
    to: "/images",
    icon: ImageIcon,
    title: "Image generation",
    body: "Describe a picture and get it generated, stored privately and archived.",
  },
  {
    to: "/minutes",
    icon: ListChecks,
    title: "Meeting minutes",
    body: "Upload a recording, get speaker notes, decisions and an owner/task/due table.",
  },
  {
    to: "/archive",
    icon: Archive,
    title: "Full history",
    body: "Every prompt and output — text and images — saved and searchable.",
  },
  {
    to: "/prompts",
    icon: Sparkles,
    title: "Prompt library",
    body: "A documented prompt-engineering case study behind every generator.",
  },
] as const;

function Home() {
  const { user } = useAuth();

  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-16">
        <section className="max-w-3xl">
          <p className="label-eyebrow">AI productivity workspace</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight sm:text-6xl">
            Everything you write, <span className="text-primary">generated</span> in one place.
          </h1>
          <p className="mt-5 text-base text-muted-foreground">
            Forge Studio turns a short brief into blog posts, emails, code, images and full
            meeting minutes — powered by a curated prompt library, with every result saved to
            your archive.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/studio">Start generating</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to={user ? "/archive" : "/auth"}>
                {user ? "View archive" : "Create an account"}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.title} to={f.to} className="panel group p-6 transition-colors hover:bg-secondary/50">
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
