import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — Forge Studio" },
      {
        name: "description",
        content: "Answers to common questions about generating, saving and managing AI content in Forge Studio.",
      },
      { property: "og:title", content: "Help & Support — Forge Studio" },
      {
        property: "og:description",
        content: "Guides and FAQs for the Forge Studio AI content workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HelpPage,
});

const FAQS = [
  {
    q: "How do I generate content?",
    a: "Open AI Generators, choose a content type and template, fill in the brief, then press Generate. The compiled prompt is always visible so you can learn from it.",
  },
  {
    q: "Where does my content go?",
    a: "Every generation is saved to Generation History while you're signed in. Star an item to move it into Saved Content.",
  },
  {
    q: "Can I pick a programming language?",
    a: "Yes — pick Code in the generator and choose your preferred language from the dropdown before generating.",
  },
  {
    q: "How do meeting minutes work?",
    a: "Upload or record audio, and the workflow transcribes it, splits it by speaker, then extracts topics, decisions and an owner/task/due-date table.",
  },
];

function HelpPage() {
  return (
    <DashboardShell title="Help & Support" description="Guides, FAQs and ways to get unstuck">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="panel p-6">
          <h2 className="text-lg font-semibold">Frequently asked</h2>
          <Accordion type="single" collapsible className="mt-2">
            {FAQS.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="panel h-fit p-6">
          <h2 className="text-lg font-semibold">Still stuck?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Browse the prompt library for worked examples, or start a fresh generation.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/prompts">Open prompt library</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/studio">Start generating</Link>
            </Button>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
