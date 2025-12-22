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
  const team = Array.isArray(member.team) ? member.team[0] : member.team;

  return {
    memberId: member.id,
    displayName: member.display_name,
    isLeader: member.is_leader ?? false,
    completed: member.completed ?? false,
    completedAt: member.completed_at,
    alignmentScore: member.alignment_score,
    executionScore: member.execution_score,
    accountabilityScore: member.accountability_score,
    firmName: team?.firm_name ?? "Unknown Firm",
  };
}

export default async function AssessmentIntroPage({ params }: PageProps) {
  const { token } = await params;

  const data = await getAssessmentData(token);

  // Invalid token
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Assessment Link
          </h1>
          <p className="text-gray-600">
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Operating Strengths Assessment
          </h1>
          <p className="text-lg text-gray-600">{data.firmName}</p>
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

