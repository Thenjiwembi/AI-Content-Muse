export type TxnInput = {
  amount: number;
  currency: string;
  channel: "card_present" | "card_not_present" | "wire" | "ach" | "crypto_offramp" | "p2p";
  country: string;
  customerCountry: string;
  accountAgeDays: number;
  avgTxnAmount: number;
  txnsLast24h: number;
  hourOfDay: number;
  newBeneficiary: boolean;
  deviceChanged: boolean;
  kycVerified: boolean;
  description: string;
};

export type ReasonCode = {
  code: string;
  label: string;
  detail: string;
  points: number;
};

export type TriageResult = {
  score: number;
  tier: "low" | "medium" | "high";
  reasons: ReasonCode[];
  checklist: string[];
  sla: string;
};

export const CHANNELS: { value: TxnInput["channel"]; label: string; weight: number }[] = [
  { value: "card_present", label: "Card present", weight: 0 },
  { value: "card_not_present", label: "Card not present", weight: 8 },
  { value: "ach", label: "ACH transfer", weight: 6 },
  { value: "wire", label: "Wire transfer", weight: 14 },
  { value: "p2p", label: "P2P transfer", weight: 10 },
  { value: "crypto_offramp", label: "Crypto off-ramp", weight: 22 },
];

// Illustrative elevated-risk jurisdictions for the demo scenario only.
export const HIGH_RISK_COUNTRIES = ["AF", "IR", "KP", "MM", "SY", "YE", "RU", "PA", "KY"];

const KEYWORDS = [
  "gift card",
  "urgent",
  "invoice",
  "crypto",
  "loan fee",
  "refund",
  "prepaid",
  "escrow",
];

export const SAMPLE_TXNS: Record<string, TxnInput> = {
  benign: {
    amount: 74.2,
    currency: "USD",
    channel: "card_present",
    country: "US",
    customerCountry: "US",
    accountAgeDays: 1420,
    avgTxnAmount: 88,
    txnsLast24h: 2,
    hourOfDay: 13,
    newBeneficiary: false,
    deviceChanged: false,
    kycVerified: true,
    description: "Grocery store purchase",
  },
  borderline: {
    amount: 2400,
    currency: "USD",
    channel: "ach",
    country: "US",
    customerCountry: "US",
    accountAgeDays: 65,
    avgTxnAmount: 310,
    txnsLast24h: 6,
    hourOfDay: 2,
    newBeneficiary: true,
    deviceChanged: false,
    kycVerified: true,
    description: "Urgent invoice payment to new supplier",
  },
  suspicious: {
    amount: 18500,
    currency: "USD",
    channel: "crypto_offramp",
    country: "PA",
    customerCountry: "US",
    accountAgeDays: 4,
    avgTxnAmount: 120,
    txnsLast24h: 11,
    hourOfDay: 3,
    newBeneficiary: true,
    deviceChanged: true,
    kycVerified: false,
    description: "Escrow settlement, crypto off-ramp, urgent",
  },
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function triage(t: TxnInput): TriageResult {
  const reasons: ReasonCode[] = [];
  const add = (code: string, label: string, detail: string, points: number) =>
    reasons.push({ code, label, detail, points });

  const ratio = t.avgTxnAmount > 0 ? t.amount / t.avgTxnAmount : t.amount > 0 ? 99 : 0;
  if (ratio >= 20) add("AMT-01", "Extreme amount deviation", `${ratio.toFixed(1)}x the customer's typical ${t.currency} ${t.avgTxnAmount.toFixed(0)} transaction`, 26);
  else if (ratio >= 8) add("AMT-02", "Large amount deviation", `${ratio.toFixed(1)}x the customer's usual transaction size`, 16);
  else if (ratio >= 3) add("AMT-03", "Moderate amount deviation", `${ratio.toFixed(1)}x typical spend`, 8);

  if (t.amount >= 10000) add("AMT-04", "Reporting threshold", `Amount ${t.currency} ${t.amount.toLocaleString()} at or above the 10k reporting threshold`, 12);
  else if (t.amount >= 9000 && t.amount < 10000) add("AMT-05", "Possible structuring", "Amount sits just below the 10k reporting threshold", 18);

  const channel = CHANNELS.find((c) => c.value === t.channel);
  if (channel && channel.weight > 0) add("CHN-01", `${channel.label} channel`, "Channel carries elevated baseline risk", channel.weight);

  if (HIGH_RISK_COUNTRIES.includes(t.country.toUpperCase()))
    add("GEO-01", "Elevated-risk jurisdiction", `Counterparty country ${t.country.toUpperCase()} is on the watch list`, 20);
  if (t.country.toUpperCase() !== t.customerCountry.toUpperCase())
    add("GEO-02", "Cross-border activity", `Customer in ${t.customerCountry.toUpperCase()} transacting into ${t.country.toUpperCase()}`, 8);

  if (t.accountAgeDays < 7) add("ACC-01", "Very new account", `Account opened ${t.accountAgeDays} day(s) ago`, 18);
  else if (t.accountAgeDays < 90) add("ACC-02", "Young account", `Account is ${t.accountAgeDays} days old`, 8);

  if (!t.kycVerified) add("KYC-01", "KYC incomplete", "Customer identity verification is not complete", 20);

  if (t.txnsLast24h >= 10) add("VEL-01", "High velocity", `${t.txnsLast24h} transactions in the last 24 hours`, 16);
  else if (t.txnsLast24h >= 5) add("VEL-02", "Elevated velocity", `${t.txnsLast24h} transactions in the last 24 hours`, 7);

  if (t.hourOfDay >= 0 && t.hourOfDay <= 4) add("TIM-01", "Off-hours activity", `Initiated at ${String(t.hourOfDay).padStart(2, "0")}:00 local time`, 6);

  if (t.newBeneficiary) add("BEN-01", "First payment to beneficiary", "No prior payment history with this counterparty", 10);
  if (t.deviceChanged) add("DEV-01", "New device or fingerprint change", "Session device differs from the customer's usual device", 12);

  const hits = KEYWORDS.filter((k) => t.description.toLowerCase().includes(k));
  if (hits.length) add("TXT-01", "Risk keywords in description", `Matched: ${hits.join(", ")}`, Math.min(14, 6 * hits.length));

  const raw = reasons.reduce((s, r) => s + r.points, 0);
  const score = Math.round(clamp(100 * (1 - Math.exp(-raw / 55)), 0, 99));
  const tier: TriageResult["tier"] = score >= 70 ? "high" : score >= 35 ? "medium" : "low";

  reasons.sort((a, b) => b.points - a.points);

  const checklist = buildChecklist(t, tier, reasons);
  const sla = tier === "high" ? "Review within 1 hour" : tier === "medium" ? "Review within 24 hours" : "No review required — monitor only";

  return { score, tier, reasons, checklist, sla };
}

function buildChecklist(t: TxnInput, tier: TriageResult["tier"], reasons: ReasonCode[]): string[] {
  const has = (c: string) => reasons.some((r) => r.code === c);
  const list: string[] = [];

  if (tier === "low") {
    list.push("No analyst action required — log outcome and keep the transaction in routine monitoring.");
    if (has("GEO-02")) list.push("Confirm cross-border activity matches the customer's stated travel or business profile.");
    return list;
  }

  list.push("Confirm the customer's expected activity profile against the last 90 days of transactions.");
  if (has("KYC-01")) list.push("Escalate to onboarding: complete identity verification before releasing funds.");
  if (has("AMT-01") || has("AMT-02")) list.push("Request source-of-funds evidence for the transaction amount.");
  if (has("AMT-05")) list.push("Check the 30-day history for a structuring pattern of sub-threshold payments.");
  if (has("AMT-04")) list.push("Prepare the currency-transaction report package for compliance sign-off.");
  if (has("GEO-01")) list.push("Run a sanctions and adverse-media screen on the counterparty and jurisdiction.");
  if (has("BEN-01")) list.push("Call back the customer on a verified number to confirm the beneficiary details.");
  if (has("DEV-01")) list.push("Review device, IP and session telemetry for account-takeover indicators.");
  if (has("VEL-01") || has("VEL-02")) list.push("Inspect the 24-hour velocity cluster for related transactions and a common beneficiary.");
  if (has("CHN-01") && t.channel === "crypto_offramp") list.push("Trace the destination wallet and check it against known illicit-address lists.");
  if (has("TXT-01")) list.push("Read the payment narrative for social-engineering or scam-script language.");
  list.push(tier === "high" ? "If two or more red flags are confirmed, file a SAR referral and hold the payment." : "Document the decision rationale and route back to automated monitoring if cleared.");

  return list;
}

export function reportMarkdown(t: TxnInput, r: TriageResult) {
  return [
    `# Transaction Risk Triage Report`,
    ``,
    `**Risk score:** ${r.score}/100  |  **Tier:** ${r.tier.toUpperCase()}  |  **SLA:** ${r.sla}`,
    ``,
    `## Transaction`,
    `- Amount: ${t.currency} ${t.amount.toLocaleString()}`,
    `- Channel: ${CHANNELS.find((c) => c.value === t.channel)?.label ?? t.channel}`,
    `- Route: ${t.customerCountry.toUpperCase()} → ${t.country.toUpperCase()}`,
    `- Account age: ${t.accountAgeDays} days | KYC: ${t.kycVerified ? "verified" : "incomplete"}`,
    `- Velocity: ${t.txnsLast24h} txns / 24h | Hour: ${String(t.hourOfDay).padStart(2, "0")}:00`,
    `- Description: ${t.description || "—"}`,
    ``,
    `## Reason codes`,
    r.reasons.length
      ? ["| Code | Signal | Detail | Weight |", "| --- | --- | --- | --- |", ...r.reasons.map((x) => `| ${x.code} | ${x.label} | ${x.detail} | +${x.points} |`)].join("\n")
      : "No risk signals triggered.",
    ``,
    `## Analyst checklist`,
    ...r.checklist.map((c, i) => `${i + 1}. ${c}`),
    ``,
    `> Decision support only. This output flags transactions for human review and is not an automated fraud decision.`,
  ].join("\n");
}
