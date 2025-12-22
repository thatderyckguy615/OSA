"use client";

/**
 * Assessment Introduction & Start
 * Per PRD Section 6.2.1
 */
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AssessmentIntroProps {
  token: string;
  displayName: string;
  firmName: string;
}

export function AssessmentIntro({ token, displayName, firmName }: AssessmentIntroProps) {
  const router = useRouter();

  const handleStart = () => {
    // Navigate to questions page (to be implemented)
    router.push(`/a/${token}/questions`);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome, {displayName}</CardTitle>
        <CardDescription className="text-base">
          You're about to complete the Operating Strengths Assessment for{" "}
          {firmName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Purpose */}
        <div className="space-y-2">
          <p className="text-gray-700">
            This will measure your team&apos;s strengths across several dimensions.
          </p>
          <p className="text-gray-700">⏱️ Answer 36 questions/prompts.</p>
        </div>

        {/* Privacy Statement - Exact PRD copy */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            🔒 Your Privacy
          </h3>
          <p className="text-sm text-blue-800">
            Your leader will see your <strong>overall dimension scores</strong>{" "}
            (Alignment/Execution/Accountability) and team averages, but{" "}
            <strong>will NOT see your answers to individual questions</strong>.
            Answer honestly.
          </p>
        </div>

        {/* Start Button */}
        <Button onClick={handleStart} size="lg" className="w-full">
          Start Assessment
        </Button>
      </CardContent>
    </Card>
  );
}

