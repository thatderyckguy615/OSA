/**
 * Leader Dashboard Page
 * Per PRD Section 4.3 and 6.3
 *
 * Token pages must never be cached.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { DashboardClient } from "./components/DashboardClient";

// ✅ Guaranteed: always dynamic, never cached (prevents stale token pages)
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ token: string }>;
}

interface TeamMember {
  id: string;
  email: string;
  display_name: string | null;
  is_leader: boolean;
  completed: boolean;
  completed_at: string | null;
  alignment_score: number | null;
  execution_score: number | null;
  accountability_score: number | null;
}

async function getDashboardData(token: string) {
  const supabase = createAdminClient();
  const tokenHash = hashToken(token);

  // Fetch team by admin token hash
  const teamResult = await supabase
    .from("teams")
    .select("id, firm_name, leader_name, leader_email")
    .eq("admin_token_hash", tokenHash)
    .maybeSingle();

  const team = teamResult.data as {
    id: string;
    firm_name: string;
    leader_name: string;
    leader_email: string;
  } | null;

  if (teamResult.error || !team) {
    return null;
  }

  // Fetch all team members
  const membersResult = await supabase
    .from("team_members")
    .select(
      `
      id,
      email,
      display_name,
      is_leader,
      completed,
      completed_at,
      alignment_score,
      execution_score,
      accountability_score
    `
    )
    .eq("team_id", team.id)
    .order("completed", { ascending: false })
    .order("display_name", { ascending: true });

  const members = (membersResult.data as TeamMember[]) || [];

  return {
    team,
    members,
  };
}

export default async function DashboardPage({ params }: PageProps) {
  const { token } = await params;

  const data = await getDashboardData(token);

  // Invalid token
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-secondary">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Invalid Dashboard Link
          </h1>
          <p className="text-muted-foreground">
            This dashboard link is invalid or has expired. Please check your
            email for the correct link.
          </p>
        </div>
      </div>
    );
  }

  const { team, members } = data;

  // Build dashboard URL for copying
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const dashboardUrl = `${appUrl}/d/${token}`;

  return (
    <div className="min-h-screen bg-secondary">
      <DashboardClient
        token={token}
        dashboardUrl={dashboardUrl}
        teamId={team.id}
        firmName={team.firm_name}
        leaderName={team.leader_name}
        initialMembers={members}
      />
    </div>
  );
}
