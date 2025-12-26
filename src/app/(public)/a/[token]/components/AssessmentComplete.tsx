"use client";

/**
 * Assessment Complete - Show Scores
 * Per PRD Section 6.2.3
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  completedAt,
  alignmentScore,
  executionScore,
  accountabilityScore,
}: AssessmentCompleteProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "recently";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "recently";
    }
  };

  const formatScore = (score: number | null): string => {
    if (score === null || score === undefined) return "—";
    return score.toFixed(1);
  };

  return (
    <div className="min-h-screen bg-secondary py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary md:text-4xl">
            Assessment Complete
          </h1>
          <p className="text-lg text-muted-foreground">{firmName}</p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Thank you, {displayName}!</CardTitle>
            <CardDescription>
              You completed this assessment on {formatDate(completedAt)}. Your
              results have been recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scores */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-primary"></div>
                <h3 className="text-lg font-bold text-foreground tracking-wide uppercase">
                  Your Scores
                </h3>
                <span className="text-muted-foreground text-sm font-medium ml-2">(1.0 - 10.0 scale. Higher scores reflect strength.)</span>
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
            <div className="bg-secondary border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
              🔎 Only your dimension scores and team averages will be visible in the leader's dashboard.
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
      <span className="font-medium text-foreground">{label}:</span>
      <span className="text-2xl font-bold text-foreground">{score}</span>
    </div>
  );
}

