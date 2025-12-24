/**
 * View-only Report Page (server-rendered)
 * Interactivity (copy/print) is isolated in ReportActionsClient.
 */

import { headers } from "next/headers";
import { ReportActionsClient } from "./ReportActionsClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Dimension = "alignment" | "execution" | "accountability";
type Subscale = "pd" | "cs" | "ob";

interface ScoresJson {
  generated_at: string;
  completion_count: number;
  total_count: number;
  team_averages: Record<Dimension, number>;
  subscale_averages: Record<Dimension, Record<Subscale, number>>;
  individual_scores: Array<{
    name: string;
    email: string;
    alignment: number;
    execution: number;
    accountability: number;
  }>;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string };
}

function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function labelDim(d: Dimension) {
  if (d === "alignment") return "Alignment";
  if (d === "execution") return "Execution";
  return "Accountability";
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Build an absolute base URL (so server-side fetch works reliably)
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

  const reportUrl = `${baseUrl}/r/${token}`;

  // Fetch report data (no-store)
  const res = await fetch(`${baseUrl}/api/report/${token}`, { cache: "no-store" });
  const json = (await res.json()) as ApiResponse<any>;

  if (!res.ok || !json.success || !json.data) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Report not found</CardTitle>
              <CardDescription>
                This report link is invalid or the report hasn’t been generated yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-700">
              {json?.error?.message ? <p>Error: {json.error.message}</p> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Be tolerant of slightly different response shapes
  const data = json.data;
  const firmName =
    data.firmName ?? data.firm_name ?? data.team?.firm_name ?? data.team?.firmName ?? "";

  const scores: ScoresJson =
    data.scoresJson ??
    data.scores_json ??
    data.scores ??
    data.report?.scores_json ??
    data.report?.scoresJson;

  if (!firmName || !scores) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Report data missing</CardTitle>
              <CardDescription>
                The report exists, but required fields are missing from the API response.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const dims: Dimension[] = ["alignment", "execution", "accountability"];
  const subs: Subscale[] = ["pd", "cs", "ob"];

  const minDim = Math.min(
    scores.team_averages.alignment,
    scores.team_averages.execution,
    scores.team_averages.accountability
  );

  const lowestDims = new Set<Dimension>(
    dims.filter((d) => scores.team_averages[d] === minDim)
  );

  const allSubVals: number[] = [];
  for (const d of dims) for (const s of subs) allSubVals.push(scores.subscale_averages[d][s]);
  const minSub = Math.min(...allSubVals);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 print:bg-white">
      {/* Print rules */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-gray-500">{firmName}</div>
            <h1 className="text-2xl font-semibold text-gray-900">Operating Strengths Report</h1>
            <div className="mt-1 text-sm text-gray-600">
              Generated {fmtDate(scores.generated_at)} • Based on {scores.completion_count} of{" "}
              {scores.total_count} responses
            </div>
          </div>

          {/* Interactive buttons live in a CLIENT component */}
          <ReportActionsClient reportUrl={reportUrl} />
        </div>

        {/* Team averages */}
        <Card>
          <CardHeader>
            <CardTitle>Team Averages</CardTitle>
            <CardDescription>Strength scores (1.0–10.0). Lowest dimension is red.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dims.map((d) => {
              const val = scores.team_averages[d];
              const pct = clampPct((val / 10) * 100);
              const isLowest = lowestDims.has(d);

              return (
                <div key={d} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isLowest ? "text-red-600 font-medium" : "text-gray-700"}>
                      {labelDim(d)}
                    </span>
                    <span className={isLowest ? "text-red-600 font-medium" : "text-gray-900"}>
                      {val.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200">
                    <div className="h-3 rounded-full bg-rose-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Subscales table */}
        <Card>
          <CardHeader>
            <CardTitle>Subscales</CardTitle>
            <CardDescription>PD / CS / OB averages. Lowest value(s) are red.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium text-gray-700">Dimension</th>
                    <th className="py-2 text-left font-medium text-gray-700">PD</th>
                    <th className="py-2 text-left font-medium text-gray-700">CS</th>
                    <th className="py-2 text-left font-medium text-gray-700">OB</th>
                  </tr>
                </thead>
                <tbody>
                  {dims.map((d) => (
                    <tr key={d} className="border-b last:border-b-0">
                      <td className="py-3 text-gray-700">{labelDim(d)}</td>
                      {subs.map((s) => {
                        const v = scores.subscale_averages[d][s];
                        const isLowest = v === minSub;
                        return (
                          <td
                            key={`${d}-${s}`}
                            className={`py-3 ${isLowest ? "text-red-600 font-medium" : "text-gray-900"}`}
                          >
                            {v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Individual scores */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Scores</CardTitle>
            <CardDescription>Completed members only (no highlighting).</CardDescription>
          </CardHeader>
          <CardContent>
            {scores.individual_scores.length === 0 ? (
              <div className="text-sm text-gray-600">No completed members found in this snapshot.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left font-medium text-gray-700">Name</th>
                      <th className="py-2 text-left font-medium text-gray-700">Email</th>
                      <th className="py-2 text-left font-medium text-gray-700">Alignment</th>
                      <th className="py-2 text-left font-medium text-gray-700">Execution</th>
                      <th className="py-2 text-left font-medium text-gray-700">Accountability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.individual_scores.map((m) => (
                      <tr key={m.email} className="border-b last:border-b-0">
                        <td className="py-3 text-gray-900">{m.name}</td>
                        <td className="py-3 text-gray-600">{m.email}</td>
                        <td className="py-3 text-gray-900">{m.alignment.toFixed(1)}</td>
                        <td className="py-3 text-gray-900">{m.execution.toFixed(1)}</td>
                        <td className="py-3 text-gray-900">{m.accountability.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What to do */}
        <Card>
          <CardHeader>
            <CardTitle>What to do with these results</CardTitle>
            <CardDescription>Use this report to guide focused conversations and next steps.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            <p>
              Review the lowest dimension and lowest subscale first. Those represent the biggest
              opportunity areas for the team right now.
            </p>
            <p>
              Learn more at{" "}
              <a
                href="https://addictiveleadership.com"
                className="text-rose-600 underline"
                target="_blank"
                rel="noreferrer"
              >
                addictiveleadership.com
              </a>
              .
            </p>
          </CardContent>
        </Card>

        <div className="text-xs text-gray-400">View-only report link: {reportUrl}</div>
      </div>
    </div>
  );
}
