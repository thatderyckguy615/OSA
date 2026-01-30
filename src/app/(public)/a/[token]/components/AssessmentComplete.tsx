"use client";

/**
 * Assessment Complete - Show Scores
 * Per PRD Section 6.2.3
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AssessmentCompleteProps {
  firmName: string;
  displayName: string;
  completedAt: string | null;
  alignmentScore: number | null;
  executionScore: number | null;
  accountabilityScore: number | null;
}

export function AssessmentComplete({
  firmName,
  displayName,
  completedAt: _completedAt,
  alignmentScore,
  executionScore,
  accountabilityScore,
}: AssessmentCompleteProps) {
  // _completedAt intentionally unused - kept for API compatibility

  const formatScore = (score: number | null): string => {
    if (score === null || score === undefined) return "—";
    return score.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-secondary py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold md:text-4xl" style={{ color: "#1c1c1e" }}>
            Assessment Complete
          </h1>
          <p className="text-lg" style={{ color: "#1c1c1e" }}>{firmName}</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-center" style={{ color: "#1c1c1e" }}>Thank you, {displayName}!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scores */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6" style={{ backgroundColor: "#ff5252" }}></div>
                <h3 className="text-lg font-bold tracking-wide uppercase" style={{ color: "#1c1c1e" }}>
                  YOUR SCORES:
                </h3>
              </div>

              <div className="space-y-3">
                <ScoreRow
                  label="Alignment"
                  score={formatScore(alignmentScore)}
                />
                <ScoreRow
                  label="Execution"
                  score={formatScore(executionScore)}
                />
                <ScoreRow
                  label="Accountability"
                  score={formatScore(accountabilityScore)}
                />
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-lg p-4" style={{ backgroundColor: "#E6EFF8" }}>
              <p className="text-sm text-center" style={{ color: "#002253" }}>
              🔎 1.0 - 10.0 scale. Higher scores reflect strength.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-2xl font-bold" style={{ color: "#1c1c1e" }}>{label}</span>
      <span className="text-2xl font-bold" style={{ color: "#1c1c1e" }}>{score}</span>
    </div>
  );
}

