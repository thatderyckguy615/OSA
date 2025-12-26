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
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome, {displayName}</CardTitle>
        <CardDescription className="text-base">
          You're about to complete the Operating Strengths Assessment for{" "}
          {firmName}. This will measure your team&apos;s collective strength across three dimensions: Alignment, Execution, and Accountability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Purpose */}
        <div className="space-y-2">
          <p className="text-base text-foreground">⏱️ Answer 36 questions/prompts.</p>
        </div>

        {/* Privacy Statement - Exact PRD copy */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-blue-900 flex items-center gap-2">
            🔒 Your Privacy
          </h3>
          <p className="text-sm text-blue-800">
            Your overall dimension scores and team averages will be visible to your leader, but NOT your answers to individual questions.
            Please answer honestly.
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

