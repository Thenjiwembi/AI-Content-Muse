import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Copy, Download, Loader2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveGeneration } from "@/lib/generations";
import { useAuth } from "@/lib/auth";
import {
  CHANNELS,
  SAMPLE_TXNS,
  reportMarkdown,
  triage,
  type TxnInput,
} from "@/lib/risk-triage";

export const Route = createFileRoute("/risk")({
  head: () => ({
    meta: [
      { title: "Transaction Risk Triage — Forge Studio" },
      {
        name: "description",
        content:
          "Score a financial transaction, surface reason codes and generate an analyst review checklist for human triage.",
      },
      { property: "og:title", content: "Transaction Risk Triage — Forge Studio" },
      {
        property: "og:description",
        content:
          "Explainable risk scoring with reason codes and a reviewer checklist — decision support, not automated fraud decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RiskPage,
});

const TIER_STYLES = {
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  high: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
} as const;

function RiskPage() {
  const { user } = useAuth();
  const [txn, setTxn] = useState<TxnInput>(SAMPLE_TXNS.borderline);
  const [narrative, setNarrative] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => triage(txn), [txn]);
  const set = <K extends keyof TxnInput>(key: K, value: TxnInput[K]) =>
    setTxn((prev) => ({ ...prev, [key]: value }));

  const markdown = reportMarkdown(txn, result);

  async function explain() {
    setBusy(true);
    setNarrative("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system:
            "You are a financial crime analyst assistant. You never make final fraud decisions; you summarise evidence for a human reviewer. Be factual, concise and cite only the signals provided.",
          prompt: `Write a short triage narrative (max 180 words) for the reviewer of this transaction. Cover: what happened, why it was flagged, the strongest counter-argument that it may be legitimate, and the single most useful next check. Plain markdown, no headings.\n\n${markdown}`,
        }),
      });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setNarrative((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the narrative.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReport() {
    if (!user) {
      toast.error("Sign in to save reports to your archive.");
      return;
    }
    setSaving(true);
    try {
      await saveGeneration({
        kind: "risk",
        title: `Risk triage — ${txn.currency} ${txn.amount.toLocaleString()} (${result.tier})`,
        prompt: `${txn.description || "Transaction"} · ${txn.customerCountry} → ${txn.country}`,
        output: narrative ? `${markdown}\n\n## Analyst narrative\n\n${narrative}` : markdown,
        metadata: { score: result.score, tier: result.tier, codes: result.reasons.map((r) => r.code) },
      });
      toast.success("Report saved to your archive.");
    } catch {
      toast.error("Could not save the report.");
    } finally {
      setSaving(false);
    }
  }

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "risk-triage-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell
      title="Transaction Risk Triage"
      description="Score a transaction, see why it was flagged and hand a checklist to a human reviewer."
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction details</CardTitle>
            <CardDescription>Scoring updates live as you edit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["benign", "Low-risk sample"],
                  ["borderline", "Borderline sample"],
                  ["suspicious", "High-risk sample"],
                ] as const
              ).map(([key, label]) => (
                <Button key={key} variant="outline" size="sm" onClick={() => setTxn(SAMPLE_TXNS[key])}>
                  {label}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={txn.amount}
                  onChange={(e) => set("amount", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={txn.currency}
                  onChange={(e) => set("currency", e.target.value.toUpperCase().slice(0, 3))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Channel</Label>
                <Select value={txn.channel} onValueChange={(v) => set("channel", v as TxnInput["channel"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerCountry">Customer country</Label>
                <Input
                  id="customerCountry"
                  value={txn.customerCountry}
                  onChange={(e) => set("customerCountry", e.target.value.toUpperCase().slice(0, 2))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Counterparty country</Label>
                <Input
                  id="country"
                  value={txn.country}
                  onChange={(e) => set("country", e.target.value.toUpperCase().slice(0, 2))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avg">Customer average amount</Label>
                <Input
                  id="avg"
                  type="number"
                  value={txn.avgTxnAmount}
                  onChange={(e) => set("avgTxnAmount", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Account age (days)</Label>
                <Input
                  id="age"
                  type="number"
                  value={txn.accountAgeDays}
                  onChange={(e) => set("accountAgeDays", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vel">Transactions last 24h</Label>
                <Input
                  id="vel"
                  type="number"
                  value={txn.txnsLast24h}
                  onChange={(e) => set("txnsLast24h", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hour">Hour of day (0–23)</Label>
                <Input
                  id="hour"
                  type="number"
                  min={0}
                  max={23}
                  value={txn.hourOfDay}
                  onChange={(e) => set("hourOfDay", Math.max(0, Math.min(23, Number(e.target.value) || 0)))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Payment description</Label>
              <Textarea
                id="desc"
                rows={2}
                value={txn.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="e.g. Urgent invoice payment to new supplier"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["newBeneficiary", "New beneficiary"],
                  ["deviceChanged", "New device"],
                  ["kycVerified", "KYC verified"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-sm">{label}</span>
                  <Switch checked={txn[key]} onCheckedChange={(v) => set(key, v)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <div className="relative grid size-24 place-items-center rounded-full border-4 border-primary/20">
                  <span className="text-2xl font-semibold">{result.score}</span>
                  <span className="absolute bottom-3 text-[10px] uppercase tracking-wide text-muted-foreground">
                    / 100
                  </span>
                </div>
                <div className="space-y-2">
                  <Badge variant="outline" className={TIER_STYLES[result.tier]}>
                    {result.tier === "high" ? (
                      <AlertTriangle className="mr-1 size-3" />
                    ) : (
                      <ShieldCheck className="mr-1 size-3" />
                    )}
                    {result.tier.toUpperCase()} RISK
                  </Badge>
                  <p className="text-sm text-muted-foreground">{result.sla}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button size="sm" onClick={explain} disabled={busy}>
                  {busy ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Sparkles className="mr-1 size-4" />}
                  AI narrative
                </Button>
                <Button size="sm" variant="outline" onClick={saveReport} disabled={saving}>
                  {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />}
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={download}>
                  <Download className="mr-1 size-4" />
                  .md
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(markdown);
                    toast.success("Report copied.");
                  }}
                >
                  <Copy className="mr-1 size-4" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reason codes</CardTitle>
              <CardDescription>Every signal that contributed to the score.</CardDescription>
            </CardHeader>
            <CardContent>
              {result.reasons.length === 0 ? (
                <p className="text-sm text-muted-foreground">No risk signals triggered.</p>
              ) : (
                <ul className="divide-y">
                  {result.reasons.map((r) => (
                    <li key={r.code} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {r.code}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-sm text-muted-foreground">{r.detail}</p>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">+{r.points}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analyst review checklist</CardTitle>
              <CardDescription>Hand this to the human reviewer.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {result.checklist.map((c, i) => (
                  <li key={c} className="flex gap-3 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                      {i + 1}
                    </span>
                    <span>{c}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {(narrative || busy) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI triage narrative</CardTitle>
                <CardDescription>Decision support only — a human makes the call.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {narrative || "Generating…"}
                </p>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            This tool triages transactions for human review. It does not block payments or make final
            fraud decisions, and its signals are illustrative rather than a production risk model.
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
