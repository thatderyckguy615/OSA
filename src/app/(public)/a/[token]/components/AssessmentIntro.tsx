"use client";

/**
 * Assessment Introduction & Start
 * Per PRD Section 6.2.1
 */
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl" style={{ color: "#1c1c1e" }}>Welcome, {displayName}</CardTitle>
        <p className="text-base" style={{ color: "#1c1c1e" }}>
          You&apos;re completing the Operating Strengths Assessment for {firmName}. It measures the firm&apos;s collective operating strengths across multiple dimensions.
        </p>
        <p className="text-base font-bold" style={{ color: "#1c1c1e" }}>
          Answer 36 questions/prompts.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Privacy Statement */}
        <div className="rounded-lg p-4" style={{ backgroundColor: "#E6EFF8" }}>
          <p className="text-sm" style={{ color: "#002253" }}>
            <strong>🔒 Privacy:</strong> Your individual responses stay confidential. Leadership sees collective patterns and aggregate scores only. Please answer honestly.
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

