export type MinutesStageId = "topics" | "decisions" | "actions" | "minutes";

export type MinutesStage = {
  id: MinutesStageId;
  title: string;
  blurb: string;
  /** Prompt scaffold. {{notes}}, {{context}} and {{prev}} are interpolated. */
  template: string;
};

export const MEETING_TYPES = [
  "Team stand-up",
  "Project status",
  "Client call",
  "Design review",
  "Sprint planning",
  "Board / leadership",
] as const;

export const DETAIL_LEVELS = ["Concise", "Balanced", "Detailed"] as const;

const CONTEXT_BLOCK = `Meeting: {{title}}
Meeting type: {{type}}
Date: {{date}}
Attendees: {{attendees}}
Detail level: {{detail}}`;

export const MINUTES_STAGES: MinutesStage[] = [
  {
    id: "topics",
    title: "1 · Extract topics",
    blurb: "Cluster the raw notes into the discussion topics that were actually covered.",
    template: `You are an expert meeting analyst.

${CONTEXT_BLOCK}

Raw notes / transcript:
"""
{{notes}}
"""

Extract the discussion topics ONLY. Rules:
- Group related fragments into 3-8 distinct topics
- For each topic: a bold short title, then 1-3 bullet points summarising what was said
- Attribute points to a speaker only when the notes make it explicit
- Never invent content that is not in the notes; if something is unclear, write "unclear from notes"
- No decisions and no action items at this stage
Output clean markdown, no preamble.`,
  },
  {
    id: "decisions",
    title: "2 · Identify decisions",
    blurb: "Turn the topics into an explicit decision log with rationale and status.",
    template: `You are an expert meeting analyst building a decision log.

${CONTEXT_BLOCK}

Topics already extracted:
"""
{{prev}}
"""

Original raw notes for reference:
"""
{{notes}}
"""

Produce the decisions ONLY, as a markdown table with exactly these columns:
| Decision | Rationale | Status | Topic |
- Status is one of: Agreed, Provisional, Deferred, Blocked
- One row per decision; do not merge two decisions into one row
- Only include decisions supported by the notes — do not infer
- If no decision was made on a topic, omit it rather than padding the table
Below the table, add a short "Open questions" bullet list of anything left unresolved.
Output clean markdown, no preamble.`,
  },
  {
    id: "actions",
    title: "3 · Assign action items",
    blurb: "Owner / Task / Due date table — the accountability layer.",
    template: `You are a chief of staff converting a meeting into accountable work.

${CONTEXT_BLOCK}

Decisions log:
"""
{{prev}}
"""

Original raw notes for reference:
"""
{{notes}}
"""

Output the action items ONLY, as a markdown table with exactly these columns and nothing else:
| Owner | Task | Due date | Priority | Source decision |
Rules:
- Task starts with a verb and is specific enough to be done without asking questions
- Owner is a named person from the attendees; if unassigned, write "UNASSIGNED"
- Due date: use the explicit date if stated, otherwise a relative one ("within 1 week") and mark it "(inferred)"
- Priority is High, Medium or Low
- Do not invent tasks that nobody committed to
Return only the table rows, no commentary.`,
  },
  {
    id: "minutes",
    title: "4 · Compose minutes",
    blurb: "Assemble everything into circulate-ready meeting minutes.",
    template: `You are a professional minute-taker.

${CONTEXT_BLOCK}

Topics:
"""
{{topics}}
"""

Decisions:
"""
{{decisions}}
"""

Action items:
"""
{{actions}}
"""

Write the final meeting minutes in markdown with this exact structure:
# {{title}}
**Date:** {{date}} · **Type:** {{type}} · **Attendees:** {{attendees}}

## Summary
Three sentences maximum, written for someone who did not attend.

## Discussion
The topics above, tightened into prose-plus-bullets.

## Decisions
Reproduce the decisions table verbatim.

## Action items
Reproduce the Owner / Task / Due date table verbatim.

## Open questions & next meeting
Bullets.

Do not add content that is absent from the material above. No preamble.`,
  },
];

export function fillMinutesPrompt(
  template: string,
  vars: {
    notes: string;
    title: string;
    type: string;
    date: string;
    attendees: string;
    detail: string;
    prev?: string | undefined;
    topics?: string | undefined;
    decisions?: string | undefined;
    actions?: string | undefined;
  },
) {
  return template
    .replaceAll("{{notes}}", vars.notes.trim() || "(no notes supplied)")
    .replaceAll("{{title}}", vars.title.trim() || "Untitled meeting")
    .replaceAll("{{type}}", vars.type)
    .replaceAll("{{date}}", vars.date.trim() || "(not stated)")
    .replaceAll("{{attendees}}", vars.attendees.trim() || "(not stated)")
    .replaceAll("{{detail}}", vars.detail)
    .replaceAll("{{prev}}", vars.prev ?? "")
    .replaceAll("{{topics}}", vars.topics ?? "")
    .replaceAll("{{decisions}}", vars.decisions ?? "")
    .replaceAll("{{actions}}", vars.actions ?? "");
}

/** Parse the first markdown pipe table found in text into headers + rows. */
export function parseMarkdownTable(md: string): { headers: string[]; rows: string[][] } | null {
  const lines = md.split("\n").map((l) => l.trim());
  const start = lines.findIndex(
    (l, i) =>
      l.startsWith("|") &&
      /^\|[\s:|-]+\|$/.test(lines[i + 1] ?? "") &&
      (lines[i + 1] ?? "").includes("-"),
  );
  if (start === -1) return null;
  const cells = (l: string) =>
    l
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  const headers = cells(lines[start]!);
  const rows: string[][] = [];
  for (let i = start + 2; i < lines.length; i++) {
    const l = lines[i]!;
    if (!l.startsWith("|")) break;
    rows.push(cells(l));
  }
  return rows.length ? { headers, rows } : null;
}

/** Turns a raw transcript into speaker-by-speaker notes. */
export const SPEAKER_NOTES_PROMPT = `You are a transcript parser preparing speaker-by-speaker meeting notes.

Meeting: {{title}}
Attendees (may be incomplete): {{attendees}}

Raw transcript (no speaker labels, produced by speech-to-text):
"""
{{notes}}
"""

Segment the transcript by speaker turns and output clean markdown:

## Speaker notes
For each speaker turn block, in chronological order:
**<Speaker name or "Speaker 1", "Speaker 2", …>** — 1-3 bullets summarising what they said, in their own framing.
- Map a speaker to a real attendee name ONLY when the transcript makes it explicit (self-introduction, someone addressing them). Otherwise keep the generic label.
- Merge consecutive turns by the same speaker.
- Keep numbers, dates, names and commitments verbatim.
- Never invent content. Mark anything indistinct as "unclear from audio".

## Participants detected
A bullet list of each speaker label with a one-line description of their role in the discussion.

Output only that markdown, no preamble.`;

export const SAMPLE_NOTES = `weekly product sync - 18 aug

present: thenjiwe, sipho, lerato, dan (joined late)

- onboarding drop-off: sipho says 40% bail on step 3 (the KYC upload). lerato thinks it's the file size limit
- agreed we cut step 3 down to just ID photo for now, full KYC moves to post-signup. sipho to ship behind a flag
- pricing page: dan wants to test 3 tiers vs 2. no decision, needs data from finance first
- support backlog at 180 tickets, lerato asking for a temp contractor. thenjiwe says budget only opens in sept, revisit then
- mobile app crash on android 13 - dan says it's the camera lib. he'll patch this week, before friday release
- someone needs to update the changelog, nobody volunteered
- next sync same time next week`;
