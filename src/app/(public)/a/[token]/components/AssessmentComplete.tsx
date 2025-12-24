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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-rose-600 md:text-4xl">
            Assessment Complete!
          </h1>
          <p className="text-lg text-gray-600">{firmName}</p>
        </div>

        <Card className="border-gray-200 shadow-sm">
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
                <div className="w-1.5 h-6 bg-rose-500"></div>
                <h3 className="text-lg font-bold text-slate-900 tracking-wide uppercase">
                  Your Scores
                </h3>
                <span className="text-slate-400 text-sm font-medium ml-2">(1.0 - 10.0 scale. Higher scores reflect strength.)</span>
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
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                Your leader can view your dimension scores and will generate a
                team report once all participants have completed the assessment.
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
    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
      <span className="font-medium text-gray-900">{label}:</span>
      <span className="text-2xl font-bold text-gray-900">{score}</span>
    </div>
  );
}

