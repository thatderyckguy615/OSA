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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900">Report Unavailable</h1>
          <p className="mt-2 text-gray-600">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900">Data Missing</h1>
          <p className="mt-2 text-gray-600">The report data is incomplete.</p>
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
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
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
          
          /* Explicitly force white text in navy section */
          .bg-slate-900,
          .bg-slate-900 h2,
          .bg-slate-900 p,
          .bg-slate-900 a {
            color: white !important;
          }
          
          /* Force white text on rose button */
          .bg-rose-600,
          .bg-rose-600 span,
          .bg-rose-600 svg {
            color: white !important;
          }
          
          /* Ensure slate-300 text renders as light gray */
          .text-slate-300 {
            color: #cbd5e1 !important;
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
        <div className="border-b border-gray-200 pb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-rose-600 md:text-4xl tracking-tight">Operating Strengths Report</h1>
              <p className="text-xl text-slate-900 mt-2 font-medium">{firmName}</p>
              
              <div className="flex gap-12 mt-6">
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Generated</div>
                  <div className="text-sm font-medium text-slate-900">{fmtDate(scores.generated_at)}</div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-1">Participation</div>
                  <div className="text-sm font-medium text-slate-900">
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
            <div className="w-1.5 h-6 bg-rose-500"></div>
            <h2 className="text-lg font-bold text-slate-900 tracking-wide uppercase">Team Averages</h2>
            <span className="text-slate-400 text-sm font-medium ml-2">(1.0 - 10.0 Scale)</span>
          </div>

          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-8">
            <div className="space-y-8">
              {dims.map((d) => {
                const val = scores.team_averages[d];
                const pct = (val / 10) * 100;

                return (
                  <div key={d} className="flex items-center gap-6">
                    <div className="w-32 text-right font-medium text-slate-700 text-sm">
                      {labelDim(d)}
                    </div>
                    <div className="flex-1 relative h-12 bg-slate-100 rounded-md overflow-hidden">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex w-full">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="flex-1 border-r border-white/50 h-full last:border-0" />
                        ))}
                      </div>
                      
                      {/* Bar */}
                      <div 
                        className="h-full bg-slate-700 relative z-10 transition-all duration-500"
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
                    <div className="text-2xl md:text-3xl font-bold text-slate-800">
                      {val.toFixed(1)}
                    </div>
                    <div className="text-[9px] md:text-[10px] font-bold text-slate-400 tracking-widest md:tracking-wider uppercase mt-1 leading-tight">
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
            <div className="w-1.5 h-6 bg-rose-500"></div>
            <h2 className="text-lg font-bold text-slate-900 tracking-wide uppercase">Subscale Breakdown</h2>
            <span className="text-slate-400 text-sm font-medium ml-2">(Team Averages)</span>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block print:block border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-left font-bold text-slate-500 text-xs tracking-wider uppercase w-1/4">
                    Dimension
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-slate-500 text-xs tracking-wider uppercase w-1/4">
                    <div>Personal Discipline</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5 capitalize">Mindset</div>
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-slate-500 text-xs tracking-wider uppercase w-1/4">
                    <div>Collective Systems</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5 capitalize">Environment</div>
                  </th>
                  <th className="py-4 px-6 text-center font-bold text-slate-500 text-xs tracking-wider uppercase w-1/4">
                    <div>Observable Behaviors</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5 capitalize">Forensic Evidence</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dims.map((d) => (
                  <tr key={d} className="bg-white">
                    <td className="py-5 px-6 font-bold text-slate-900">
                      {labelDim(d)}
                    </td>
                    {subs.map((s) => {
                      const val = scores.subscale_averages[d][s];
                      // Convert 0-100 subscale score to 1.0-10.0 format
                      const normalizedVal = (val / 100) * 9 + 1;
                      return (
                        <td key={s} className="py-5 px-6 text-center">
                          <span className="text-base font-medium text-slate-700">
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
              <div key={d} className="border border-slate-200 rounded-xl p-4 bg-white">
                <h3 className="font-bold text-slate-900 mb-4 text-lg">{labelDim(d)}</h3>
                <div className="grid grid-cols-3 gap-4">
                  {subs.map((s) => {
                    const val = scores.subscale_averages[d][s];
                    const normalizedVal = (val / 100) * 9 + 1;
                    const isLowest = val === minSubVal;
                    const subLabel = s === 'pd' ? 'Personal Discipline' : s === 'cs' ? 'Collective Systems' : 'Observable Behaviors';
                    const subDesc = s === 'pd' ? 'Mindset' : s === 'cs' ? 'Environment' : 'Forensic Evidence';
                    
                    return (
                      <div key={s} className="text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {subLabel}
                        </div>
                        <div className="text-[9px] text-slate-400 mb-2 capitalize">{subDesc}</div>
                        <div className={`text-xl font-bold ${isLowest ? "text-rose-500" : "text-slate-700"}`}>
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
            <div className="w-1.5 h-6 bg-rose-500"></div>
            <h2 className="text-lg font-bold text-slate-900 tracking-wide uppercase">Individual Results</h2>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block print:block border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-3 px-6 text-left font-bold text-slate-500 text-xs tracking-wider uppercase">Name</th>
                  <th className="py-3 px-6 text-left font-bold text-slate-500 text-xs tracking-wider uppercase">Email</th>
                  <th className="py-3 px-6 text-center font-bold text-slate-500 text-xs tracking-wider uppercase w-24">Align</th>
                  <th className="py-3 px-6 text-center font-bold text-slate-500 text-xs tracking-wider uppercase w-24">Exec</th>
                  <th className="py-3 px-6 text-center font-bold text-slate-500 text-xs tracking-wider uppercase w-24">Acct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scores.individual_scores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                      No completed responses found in this report snapshot.
                    </td>
                  </tr>
                ) : (
                  scores.individual_scores.map((m) => (
                    <tr key={m.email} className="bg-white">
                      <td className="py-4 px-6 font-medium text-slate-900">{m.name}</td>
                      <td className="py-4 px-6 text-slate-500">{m.email}</td>
                      <td className="py-4 px-6 text-center text-slate-700">{m.alignment.toFixed(1)}</td>
                      <td className="py-4 px-6 text-center text-slate-700">{m.execution.toFixed(1)}</td>
                      <td className="py-4 px-6 text-center text-slate-700">{m.accountability.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden print:hidden space-y-4">
            {scores.individual_scores.length === 0 ? (
              <div className="border border-slate-200 rounded-xl p-6 text-center text-slate-500 italic bg-white">
                No completed responses found in this report snapshot.
              </div>
            ) : (
              scores.individual_scores.map((m) => (
                <div key={m.email} className="border border-slate-200 rounded-xl p-4 bg-white">
                  <div className="mb-4">
                    <div className="font-medium text-slate-900 text-base">{m.name}</div>
                    <div className="text-sm text-slate-500">{m.email}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200">
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Align
                      </div>
                      <div className="text-xl font-bold text-slate-700">
                        {m.alignment.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Exec
                      </div>
                      <div className="text-xl font-bold text-slate-700">
                        {m.execution.toFixed(1)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Acct
                      </div>
                      <div className="text-xl font-bold text-slate-700">
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
          <div className="bg-slate-900 rounded-2xl p-12 text-center shadow-lg relative overflow-hidden">
            {/* Subtle background glow effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-rose-500/20 blur-xl"></div>
            
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">WHAT TO DO WITH THESE RESULTS</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              For help interpreting or improving these results, visit the FREE guide:
            </p>
            
            <a
              href="https://addictiveleadership.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              <span>Visit Addictive Leadership</span>
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
            src="/addictive-leadership-logo.png" 
            alt="Addictive Leadership" 
            className="mx-auto max-w-[150px] w-full h-auto"
          />
        </div>
      </main>
    </div>
  );
}
