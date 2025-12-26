/**
 * Assessment Intro & Name Capture Page
 * Per PRD Section 4.2 and 6.2
 */
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { AssessmentIntro } from "./components/AssessmentIntro";
import { NameCaptureForm } from "./components/NameCaptureForm";
import { AssessmentComplete } from "./components/AssessmentComplete";

// Force dynamic rendering (prevent caching of token pages)
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getAssessmentData(token: string) {
  const supabase = createAdminClient();
  const tokenHash = hashToken(token);

  const { data: member, error } = await supabase
    .from("team_members")
    .select(
      `
      id,
      display_name,
      is_leader,
      completed,
      completed_at,
      alignment_score,
      execution_score,
      accountability_score,
      team:teams!inner(
        firm_name
      )
    `
    )
    .eq("assessment_token_hash", tokenHash)
    .single();

  if (error || !member) {
    return null;
  }

  // Type assertion since Supabase doesn't infer nested relations perfectly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberData = member as any;
  const team = Array.isArray(memberData.team)
    ? memberData.team[0]
    : memberData.team;

  return {
    memberId: memberData.id as string,
    displayName: memberData.display_name as string | null,
    isLeader: (memberData.is_leader ?? false) as boolean,
    completed: (memberData.completed ?? false) as boolean,
    completedAt: memberData.completed_at as string | null,
    alignmentScore: memberData.alignment_score as number | null,
    executionScore: memberData.execution_score as number | null,
    accountabilityScore: memberData.accountability_score as number | null,
    firmName: (team?.firm_name ?? "Unknown Firm") as string,
  };
}

export default async function AssessmentIntroPage({ params }: PageProps) {
  const { token } = await params;

  const data = await getAssessmentData(token);

  // Invalid token
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-secondary">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Invalid Assessment Link
          </h1>
          <p className="text-muted-foreground">
            This assessment link is invalid or has expired. Please check your
            email for the correct link or contact your team leader.
          </p>
        </div>
      </div>
    );
  }

  // Assessment already completed - show scores
  if (data.completed) {
    return (
      <AssessmentComplete
        firmName={data.firmName}
        displayName={data.displayName || "Team Member"}
        completedAt={data.completedAt}
        alignmentScore={data.alignmentScore}
        executionScore={data.executionScore}
        accountabilityScore={data.accountabilityScore}
      />
    );
  }

  // Check if name capture is needed
  const needsName = !data.displayName;
  const skipNameCapture = data.isLeader && data.displayName;

  return (
    <div className="min-h-screen bg-secondary py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary md:text-4xl">
            Operating Strengths Assessment
          </h1>
        </div>

        {/* Name capture if needed */}
        {needsName ? (
          <NameCaptureForm token={token} isLeader={data.isLeader} />
        ) : (
          <AssessmentIntro
            token={token}
            displayName={data.displayName || ""}
            firmName={data.firmName}
          />
        )}
      </div>
    </div>
  );
}

