/**
 * View-only Report Page (server-rendered)
 */

import { headers } from "next/headers";
import { ReportHeaderActions } from "./ReportActionsClient";

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

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function labelDim(d: Dimension) {
  if (d === "alignment") return "Alignment";
  if (d === "execution") return "Execution";
  return "Accountability";
}

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // Build absolute URL for server-side fetch
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
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground">Report Unavailable</h1>
          <p className="mt-2 text-muted-foreground">
            {json?.error?.message || "This report could not be loaded."}
          </p>
        </div>
      </div>
    );
  }

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
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-foreground">Data Missing</h1>
          <p className="mt-2 text-muted-foreground">The report data is incomplete.</p>
        </div>
      </div>
    );
  }

  // --- Logic for mobile highlighting of lowest subscale values ---
  const dims: Dimension[] = ["alignment", "execution", "accountability"];
  const subs: Subscale[] = ["pd", "cs", "ob"];

  // Calculate lowest subscale value for mobile highlighting
  const allSubVals: number[] = [];
  for (const d of dims) for (const s of subs) allSubVals.push(scores.subscale_averages[d][s]);
  const minSubVal = Math.min(...allSubVals);

  return (
    <div className="min-h-screen bg-background text-foreground print:bg-background">
      {/* Print & Layout Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Force white text in navy sections */
          .bg-navy,
          .bg-navy h2,
          .bg-navy p,
          .bg-navy a {
            color: white !important;
          }

          /* Force white text on coral button */
          .bg-primary,
          .bg-primary span,
          .bg-primary svg {
            color: white !important;
          }

          /* Ensure muted text renders correctly */
          .text-muted-foreground {
            color: #6B6B6D !important;
          }

          /* Force white text */
          .text-white {
            color: white !important;
          }

          /* Ensure navy renders correctly */
          .bg-navy {
            background-color: #002253 !important;
          }

          /* Ensure coral renders correctly */
          .bg-primary,
          .text-primary {
            color: #FF5252 !important;
          }
          .bg-primary {
            background-color: #FF5252 !important;
            color: white !important;
          }

          /* Ensure charcoal text renders correctly */
          .text-foreground {
            color: #1C1C1E !important;
          }

          .print-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>

      {/* Top Navigation Bar (No-print) */}
      <div className="mx-auto max-w-5xl px-8 pt-8">
        <ReportHeaderActions reportUrl={reportUrl} />
      </div>

      <main className="mx-auto max-w-5xl px-8 pb-20 space-y-12">
        {/* REPORT HEADER */}
        <div className="border-b border-border pb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold text-foreground md:text-4xl tracking-tight">Operating Strengths Report</h1>
              <p className="text-xl text-foreground mt-2 font-medium">{firmName}</p>
              
              <div className="flex gap-12 mt-6">
                <div>
                  <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1">Generated</div>
                  <div className="text-sm font-medium text-foreground">{fmtDate(scores.generated_at)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase mb-1">Participation</div>
                  <div className="text-sm font-medium text-foreground">
                    {scores.completion_count} of {scores.total_count} Responses
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TEAM AVERAGES */}
        <section className="print-break-inside-avoid">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-primary"></div>
            <h2 className="text-lg font-bold text-foreground tracking-wide uppercase">Team Averages</h2>
            <span className="text-muted-foreground text-sm font-medium ml-2">(1.0 - 10.0 Scale)</span>
          </div>

          <div className="bg-secondary/50 border border-border rounded-xl p-8">
            <div className="space-y-8">
              {dims.map((d) => {
                const val = scores.team_averages[d];
                const pct = (val / 10) * 100;

                return (
                  <div key={d} className="flex items-center gap-6">
                    <div className="w-32 text-right font-medium text-foreground text-sm">
                      {labelDim(d)}
                    </div>
                    <div className="flex-1 relative h-12 bg-secondary rounded-md overflow-hidden">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex w-full">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="flex-1 border-r border-white/50 h-full last:border-0" />
                        ))}
                      </div>
                      
                      {/* Bar */}
                      <div 
                        className="h-full bg-navy relative z-10 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Numeric Callouts */}
            <div className="grid grid-cols-3 gap-2 pl-[9.5rem] mt-6 md:flex md:justify-between md:px-4">
              {dims.map((d) => {
                const val = scores.team_averages[d];
                return (
                  <div key={d} className="text-center flex-1">
                    <div className="text-2xl md:text-3xl font-bold text-foreground">
                      {val.toFixed(1)}
                    </div>
                    <div className="text-[9px] md:text-[10px] font-bold text-muted-foreground tracking-widest md:tracking-wider uppercase mt-1 leading-tight">
                      {labelDim(d)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SUBSCALE BREAKDOWN */}
        <section className="print-break-inside-avoid">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-primary"></div>
            <h2 className="text-lg font-bold text-foreground tracking-wide uppercase">Subscale Breakdown</h2>
            <span className="text-muted-foreground text-sm font-medium ml-2">(Team Averages)</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block print:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  <th className="py-4 px-6 text-left font-bold text-foreground text-xs tracking-wider uppercase w-1/4">
                    Dimension
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-foreground text-xs tracking-wider uppercase w-1/4">
                    <div>Personal Discipline</div>
                    <div className="text-[10px] font-normal text-muted-foreground mt-0.5 capitalize">Mindset</div>
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-foreground text-xs tracking-wider uppercase w-1/4">
                    <div>Collective Systems</div>
                    <div className="text-[10px] font-normal text-muted-foreground mt-0.5 capitalize">Environment</div>
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-foreground text-xs tracking-wider uppercase w-1/4">
                    <div>Observable Behaviors</div>
                    <div className="text-[10px] font-normal text-muted-foreground mt-0.5 capitalize">Forensic Evidence</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dims.map((d) => (
                  <tr key={d} className="bg-background">
                    <td className="py-5 px-6 font-bold text-foreground">
                      {labelDim(d)}
                    </td>
                    {subs.map((s) => {
                      const val = scores.subscale_averages[d][s];
                      // Convert 0-100 subscale score to 1.0-10.0 format
                      const normalizedVal = (val / 100) * 9 + 1;
                      return (
                        <td key={s} className="py-5 px-6 text-center">
                          <span className="text-base font-medium text-foreground">
                            {normalizedVal.toFixed(1)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden print:hidden space-y-4">
            {dims.map((d) => (
              <div key={d} className="border border-border rounded-xl p-4 bg-background">
                <h3 className="font-bold text-foreground mb-4 text-lg">{labelDim(d)}</h3>
                <div className="grid grid-cols-3 gap-4">
                  {subs.map((s) => {
                    const val = scores.subscale_averages[d][s];
                    const normalizedVal = (val / 100) * 9 + 1;
                    const isLowest = val === minSubVal;
                    const subLabel = s === 'pd' ? 'Personal Discipline' : s === 'cs' ? 'Collective Systems' : 'Observable Behaviors';
                    const subDesc = s === 'pd' ? 'Mindset' : s === 'cs' ? 'Environment' : 'Forensic Evidence';
                    
                    return (
                      <div key={s} className="text-center">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                          {subLabel}
                        </div>
                        <div className="text-[9px] text-muted-foreground mb-2 capitalize">{subDesc}</div>
                        <div className={`text-xl font-bold ${isLowest ? "text-destructive" : "text-foreground"}`}>
                          {normalizedVal.toFixed(1)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INDIVIDUAL RESULTS */}
        <section className="print-break-inside-avoid">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-primary"></div>
            <h2 className="text-lg font-bold text-foreground tracking-wide uppercase">Individual Results</h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block print:block border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary border-b border-border">
                  <th className="py-3 px-6 text-left font-bold text-foreground text-xs tracking-wider uppercase">Name</th>
                  <th className="py-3 px-6 text-left font-bold text-foreground text-xs tracking-wider uppercase">Email</th>
                  <th className="py-3 px-6 text-center font-bold text-foreground text-xs tracking-wider uppercase w-24">Align</th>
                  <th className="py-3 px-6 text-center font-bold text-foreground text-xs tracking-wider uppercase w-24">Exec</th>
                  <th className="py-3 px-6 text-center font-bold text-foreground text-xs tracking-wider uppercase w-24">Acct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scores.individual_scores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground italic">
                      No completed responses found in this report snapshot.
                    </td>
                  </tr>
                ) : (
                  scores.individual_scores.map((m) => (
                    <tr key={m.email} className="bg-background">
                      <td className="py-4 px-6 font-medium text-foreground">{m.name}</td>
                      <td className="py-4 px-6 text-foreground">{m.email}</td>
                      <td className="py-4 px-6 text-center text-foreground">{m.alignment.toFixed(1)}</td>
                      <td className="py-4 px-6 text-center text-foreground">{m.execution.toFixed(1)}</td>
                      <td className="py-4 px-6 text-center text-foreground">{m.accountability.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden print:hidden space-y-4">
            {scores.individual_scores.length === 0 ? (
              <div className="border border-border rounded-xl p-6 text-center text-muted-foreground italic bg-background">
                No completed responses found in this report snapshot.
              </div>
            ) : (
              scores.individual_scores.map((m) => (
                <div key={m.email} className="border border-border rounded-xl p-4 bg-background">
                  <div className="mb-4">
                    <div className="font-medium text-foreground text-base">{m.name}</div>
                    <div className="text-sm text-foreground">{m.email}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                    <div className="text-center">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Align
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {m.alignment.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Exec
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {m.execution.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        Acct
                      </div>
                      <div className="text-xl font-bold text-foreground">
                        {m.accountability.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* WHAT TO DO CARD */}
        <section className="print-break-inside-avoid">
          <div className="bg-navy rounded-2xl p-12 text-center shadow-lg relative overflow-hidden">
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">HOW TO INTERPRET OR IMPROVE THESE RESULTS</h2>
            <p className="text-white mb-8 max-w-2xl mx-auto leading-relaxed">
              Schedule a free diagnostic consultation with an expert.
            </p>

            <a
              href="https://addictiveleadership.com/contact?interest=assessment"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <span>Book Our Consultation</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </section>

        {/* Logo at bottom */}
        <div className="mt-12 pb-6 text-center">
          <img 
            src="/2026 Logo - horizontal - black text - 2000w.svg" 
            alt="Addictive Leadership" 
            className="mx-auto max-w-[150px] w-full h-auto"
          />
        </div>
      </main>
    </div>
  );
}
