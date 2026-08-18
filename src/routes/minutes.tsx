import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Loader2,
  Mic,
  RotateCcw,
  Sparkles,
  Square,
  ClipboardList,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MINUTES_STAGES,
  MEETING_TYPES,
  DETAIL_LEVELS,
  SAMPLE_NOTES,
  SPEAKER_NOTES_PROMPT,
  fillMinutesPrompt,
  parseMarkdownTable,
  type MinutesStageId,
} from "@/lib/minutes-prompts";


export const Route = createFileRoute("/minutes")({
  head: () => ({
    meta: [
      { title: "Meeting Minutes & Decisions Generator — Forge Studio" },
      {
        name: "description",
        content:
          "Turn rough meeting notes into structured minutes, a decision log and an Owner / Task / Due date action table with a chained AI workflow.",
      },
      {
        property: "og:title",
        content: "Meeting Minutes & Decisions Generator — Forge Studio",
      },
      {
        property: "og:description",
        content:
          "Extract topics, then decisions, then action items from rough notes or a transcript.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MinutesPage,
});

type Results = Partial<Record<MinutesStageId, string>>;

function MinutesPage() {
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [type, setType] = useState<string>(MEETING_TYPES[1]);
  const [detail, setDetail] = useState<string>(DETAIL_LEVELS[1]);

  const [results, setResults] = useState<Results>({});
  const [activeStage, setActiveStage] = useState<MinutesStageId | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ---- transcript parser ----
  const [rawTranscript, setRawTranscript] = useState("");
  const [speakerNotes, setSpeakerNotes] = useState("");
  const [transcribeStep, setTranscribeStep] = useState<"idle" | "transcribing" | "parsing">("idle");
  const [recording, setRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const baseVars = { notes, title, type, date, attendees, detail };

  async function parseSpeakers(transcript: string) {
    setTranscribeStep("parsing");
    setSpeakerNotes("");
    const prompt = fillMinutesPrompt(SPEAKER_NOTES_PROMPT, {
      ...baseVars,
      notes: transcript,
    });
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        system:
          "You are a transcript parser. Segment speech by speaker turns. Never invent content that is not in the transcript. Return only clean markdown.",
      }),
    });
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}) as { error?: string });
      throw new Error(data.error ?? "Could not parse speakers.");
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      text += chunk;
      setSpeakerNotes((s) => s + chunk);
    }
    return text;
  }

  async function handleAudio(file: File) {
    setTranscribeStep("transcribing");
    setRawTranscript("");
    setSpeakerNotes("");
    try {
      const form = new FormData();
      form.append("audio", file, file.name || "recording.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "Transcription failed.");
      setRawTranscript(data.text);

      const parsed = await parseSpeakers(data.text);
      setNotes(parsed);
      toast.success("Transcript parsed into speaker notes");
    } catch (err) {
      toast.error((err as Error).message || "Could not read that recording.");
    } finally {
      setTranscribeStep("idle");
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const type = recorder.mimeType.split(";")[0] || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (blob.size < 2048) {
          toast.error("That recording was empty — please try again.");
          return;
        }
        void handleAudio(new File([blob], "recording.webm", { type }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to record the meeting.");
    }
  }


  async function runStage(
    stageIndex: number,
    controller: AbortController,
    acc: Results,
  ): Promise<string> {
    const stage = MINUTES_STAGES[stageIndex]!;
    const prompt = fillMinutesPrompt(stage.template, {
      ...baseVars,
      prev:
        stage.id === "decisions"
          ? (acc.topics ?? "")
          : stage.id === "actions"
            ? (acc.decisions ?? "")
            : "",
      topics: acc.topics,
      decisions: acc.decisions,
      actions: acc.actions,
    });

    setActiveStage(stage.id);
    setResults((r) => ({ ...r, [stage.id]: "" }));

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        system:
          "You are a precise meeting analyst. Never invent facts that are not present in the supplied notes. Follow the requested output structure exactly and return only that content in clean markdown, with no preamble.",
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}) as { error?: string });
      throw new Error(data.error ?? "Generation failed. Try again.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      text += chunk;
      setResults((r) => ({ ...r, [stage.id]: (r[stage.id] ?? "") + chunk }));
    }
    return text;
  }

  async function runWorkflow() {
    if (notes.trim().length < 20) {
      toast.error("Paste your rough notes or transcript first.");
      return;
    }
    setBusy(true);
    setResults({});
    const controller = new AbortController();
    abortRef.current = controller;
    const acc: Results = {};

    try {
      for (let i = 0; i < MINUTES_STAGES.length; i++) {
        const out = await runStage(i, controller, acc);
        acc[MINUTES_STAGES[i]!.id] = out;
      }
      toast.success("Minutes ready");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error((err as Error).message || "Something went wrong.");
      }
    } finally {
      setBusy(false);
      setActiveStage(null);
      abortRef.current = null;
    }
  }

  function copy(text: string | undefined, what: string) {
    if (!text?.trim()) return;
    navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  }

  function downloadAll() {
    const md = MINUTES_STAGES.map((s) =>
      results[s.id] ? `<!-- ${s.title} -->\n\n${results[s.id]}` : "",
    )
      .filter(Boolean)
      .join("\n\n---\n\n");
    if (!md.trim()) return;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `minutes-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const actionsTable = parseMarkdownTable(results.actions ?? "");

  return (
    <main className="mx-auto w-full max-w-7xl px-5 pb-24 pt-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/">
              <ArrowLeft /> Back to studio
            </Link>
          </Button>
          <p className="label-eyebrow">Workflow · notes → decisions → accountability</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
            Meeting <span className="text-primary">Minutes</span> Generator
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Paste rough notes or a transcript. A four-stage chained prompt extracts topics,
            logs decisions, assigns Owner / Task / Due date actions, then writes the minutes.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link to="/prompts">Prompt library</Link>
        </Button>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section className="panel space-y-6 p-6">
          <div className="space-y-3 rounded-lg border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="label-eyebrow">Transcript parser</p>
              {transcribeStep !== "idle" && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  {transcribeStep === "transcribing"
                    ? "Transcribing audio…"
                    : "Splitting by speaker…"}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload or record the meeting audio. It is transcribed, then split into
              speaker-by-speaker notes that feed the workflow below.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,video/mp4"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void handleAudio(f);
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                type="button"
                disabled={transcribeStep !== "idle" || recording}
                onClick={() => fileRef.current?.click()}
              >
                <Upload /> Upload recording
              </Button>
              <Button
                variant={recording ? "destructive" : "outline"}
                type="button"
                disabled={transcribeStep !== "idle"}
                onClick={() => void toggleRecording()}
              >
                {recording ? <Square /> : <Mic />}
                {recording ? "Stop" : "Record"}
              </Button>
            </div>
            {rawTranscript && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Raw transcript</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(rawTranscript, "Transcript")}
                  >
                    <Copy /> Copy
                  </Button>
                </div>
                <p className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
                  {rawTranscript}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">

            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Rough notes / transcript</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNotes(SAMPLE_NOTES)}
                type="button"
              >
                <ClipboardList /> Sample
              </Button>
            </div>
            <Textarea
              id="notes"
              rows={12}
              placeholder="Paste messy bullet points, Slack dumps or a raw transcript…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="mtitle">Meeting title</Label>
              <Input
                id="mtitle"
                placeholder="Weekly product sync"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mdate">Date</Label>
              <Input
                id="mdate"
                placeholder="18 Aug 2026"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Meeting type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="attendees">Attendees</Label>
              <Input
                id="attendees"
                placeholder="Thenjiwe, Sipho, Lerato, Dan"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Detail level</Label>
              <Select value={detail} onValueChange={setDetail}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DETAIL_LEVELS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            {busy ? (
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => abortRef.current?.abort()}
              >
                <Square /> Stop
              </Button>
            ) : (
              <Button className="flex-1" onClick={runWorkflow}>
                <Sparkles /> Run workflow
              </Button>
            )}
            <Button variant="outline" onClick={downloadAll} aria-label="Download markdown">
              <Download />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNotes("");
                setResults({});
              }}
              aria-label="Reset"
            >
              <RotateCcw />
            </Button>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="label-eyebrow">Workflow</p>
            {MINUTES_STAGES.map((s) => {
              const done = Boolean(results[s.id]) && activeStage !== s.id && !busy;
              const running = activeStage === s.id;
              return (
                <div key={s.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5">
                    {running ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : results[s.id] ? (
                      <Check className="size-4 text-primary" />
                    ) : (
                      <span className="block size-4 rounded-full border border-border" />
                    )}
                  </span>
                  <div>
                    <p className={done || running ? "text-foreground" : "text-muted-foreground"}>
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.blurb}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          {actionsTable && (
            <div className="panel p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="label-eyebrow">Action items</p>
                <Button size="sm" variant="ghost" onClick={() => copy(results.actions, "Actions")}>
                  <Copy /> Copy table
                </Button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {actionsTable.headers.map((h) => (
                        <th
                          key={h}
                          className="border-b border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {actionsTable.rows.map((row, i) => (
                      <tr key={i} className="align-top">
                        {row.map((cell, j) => (
                          <td key={j} className="border-b border-border/60 px-3 py-2">
                            {j === 0 ? (
                              <Badge variant={cell === "UNASSIGNED" ? "outline" : "secondary"}>
                                {cell}
                              </Badge>
                            ) : (
                              cell
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {MINUTES_STAGES.map((s) => (
            <div key={s.id} className="panel p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="label-eyebrow">{s.title}</p>
                <Button size="sm" variant="ghost" onClick={() => copy(results[s.id], s.title)}>
                  <Copy /> Copy
                </Button>
              </div>
              {results[s.id] ? (
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {results[s.id]}
                  {activeStage === s.id && (
                    <span className="ml-1 animate-pulse text-primary">▍</span>
                  )}
                </pre>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{s.blurb}</p>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
