export type ContentKind = "blog" | "email" | "code";

export type PromptTemplate = {
  id: string;
  kind: ContentKind;
  title: string;
  summary: string;
  /** The optimized prompt scaffold. {{topic}} is replaced with the user brief. */
  template: string;
  tags: string[];
};

export const KIND_LABELS: Record<ContentKind, string> = {
  blog: "Blog & article",
  email: "Email & outreach",
  code: "Code & docs",
};

export const TONES = [
  "Professional",
  "Conversational",
  "Persuasive",
  "Technical",
  "Playful",
  "Empathetic",
] as const;

export const LENGTHS = ["Short", "Medium", "Long"] as const;

export const PROMPT_LIBRARY: PromptTemplate[] = [
  {
    id: "blog-seo-post",
    kind: "blog",
    title: "SEO blog post",
    summary: "Search-optimised article with H2 structure, intro hook and CTA.",
    tags: ["seo", "long-form", "structure"],
    template: `Act as a senior content strategist writing for an audience of {{audience}}.
Write a search-optimised blog post about: {{topic}}

Requirements:
- Compelling title (max 60 characters) plus a 1-sentence meta description (max 155 characters)
- Hook in the first 2 sentences, no generic "In today's world" openings
- 4-6 H2 sections with skimmable sub-points
- Include one concrete example or mini case per section
- Close with a clear call to action
Tone: {{tone}}. Length: {{length}}. Output clean markdown.`,
  },
  {
    id: "blog-listicle",
    kind: "blog",
    title: "Listicle / roundup",
    summary: "Numbered roundup where every item has a takeaway.",
    tags: ["listicle", "skimmable"],
    template: `You are a specialist writer for {{audience}}.
Create a numbered roundup article on: {{topic}}

Rules:
- 7 items, each with a bold title, 2-3 sentences of substance and a "Why it matters" line
- No filler items, no repeated ideas
- Add a short intro (max 60 words) and a summary table at the end
Tone: {{tone}}. Length: {{length}}. Output markdown.`,
  },
  {
    id: "blog-linkedin",
    kind: "blog",
    title: "LinkedIn thought post",
    summary: "Short social post with a strong hook and one insight.",
    tags: ["social", "short-form"],
    template: `Write a LinkedIn post for {{audience}} about: {{topic}}

Constraints:
- First line is a scroll-stopping hook under 12 words
- One central insight, supported by a specific personal-style example
- Line breaks every 1-2 sentences for readability
- End with an open question to drive comments
- No hashtags spam: max 3 relevant hashtags
Tone: {{tone}}. Length: {{length}}.`,
  },
  {
    id: "email-cold-outreach",
    kind: "email",
    title: "Cold outreach email",
    summary: "Personalised, low-friction first-touch email with one ask.",
    tags: ["sales", "outreach"],
    template: `You are an outreach specialist emailing {{audience}}.
Write a cold email about: {{topic}}

Rules:
- 3 subject line options (under 45 characters each)
- Body under 120 words, one idea, no buzzwords
- Open with a specific observation about the recipient, not about us
- One measurable benefit, one soft call to action (a question, not a demo demand)
- Plain-text friendly, no emojis
Tone: {{tone}}. Length: {{length}}.`,
  },
  {
    id: "email-follow-up",
    kind: "email",
    title: "Follow-up sequence",
    summary: "Three-touch follow-up sequence that adds value each time.",
    tags: ["sequence", "sales"],
    template: `Write a 3-email follow-up sequence to {{audience}} regarding: {{topic}}

For each email give: send delay, subject line, body (max 90 words).
- Email 1: add new value (insight, resource), do not "just check in"
- Email 2: address the most likely objection
- Email 3: polite break-up email leaving the door open
Tone: {{tone}}. Length: {{length}}.`,
  },
  {
    id: "email-support",
    kind: "email",
    title: "Customer support reply",
    summary: "Empathetic support response with clear next steps.",
    tags: ["support", "service"],
    template: `You are a customer support lead replying to {{audience}}.
Situation: {{topic}}

Write a reply that:
- Acknowledges the specific issue in the first line (no templated apology wall)
- Explains what happened in plain language
- Gives numbered next steps with owner and timeline
- Offers one goodwill gesture if appropriate
- Ends with a direct contact route
Tone: {{tone}}. Length: {{length}}.`,
  },
  {
    id: "code-snippet",
    kind: "code",
    title: "Code snippet generator",
    summary: "Working, commented snippet plus usage example.",
    tags: ["code", "example"],
    template: `You are a senior engineer writing production code for {{audience}}.
Task: {{topic}}

Deliver:
- One clean, runnable code block (state the language)
- Inline comments only where logic is non-obvious
- Edge cases handled explicitly
- A short usage example
- A note on time/space complexity or performance trade-offs where relevant
Tone: {{tone}}. Length: {{length}}.`,
  },
  {
    id: "code-review",
    kind: "code",
    title: "Code review & refactor",
    summary: "Structured review with severity levels and a refactored version.",
    tags: ["review", "refactor"],
    template: `Act as a staff engineer reviewing code for {{audience}}.
Code / context: {{topic}}

Output:
1. Summary verdict (2 sentences)
2. Findings table: issue | severity (high/medium/low) | fix
3. Refactored version of the code
4. Tests you would add
Be specific, cite line-level reasoning. Tone: {{tone}}. Length: {{length}}.`,
  },
  {
    id: "code-docs",
    kind: "code",
    title: "Technical documentation",
    summary: "README-style docs with install, usage and API reference.",
    tags: ["docs", "readme"],
    template: `Write technical documentation for {{audience}} covering: {{topic}}

Structure:
- What it does (3 sentences)
- Installation
- Quick start with a copy-paste example
- API reference table: name | type | default | description
- Common pitfalls
Use markdown, no marketing language. Tone: {{tone}}. Length: {{length}}.`,
  },
];

export function buildPrompt(opts: {
  template: PromptTemplate;
  topic: string;
  audience: string;
  tone: string;
  length: string;
}) {
  return opts.template.template
    .replaceAll("{{topic}}", opts.topic.trim() || "(not specified)")
    .replaceAll("{{audience}}", opts.audience.trim() || "a general professional audience")
    .replaceAll("{{tone}}", opts.tone)
    .replaceAll("{{length}}", opts.length);
}

export const CODE_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "Java",
  "C#",
  "C++",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "SQL",
  "Bash",
  "HTML/CSS",
] as const;

export function withLanguage(prompt: string, kind: ContentKind, language: string) {
  if (kind !== "code") return prompt;
  return `${prompt}\n\nProgramming language: ${language}. Write all code in ${language} using its idiomatic style, conventions and standard tooling. Use fenced code blocks labelled with the correct language.`;
}
