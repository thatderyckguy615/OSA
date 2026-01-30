import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, deriveRawToken } from "@/lib/tokens";
import { sendReportReadyEmail } from "@/lib/email";

export const runtime = "nodejs";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

interface GenerateReportSuccessResponse {
  reportUrl: string;
}

type Dimension = "alignment" | "execution" | "accountability";
type Subscale = "pd" | "cs" | "ob";

interface MemberSubscales {
  alignment: { pd: number; cs: number; ob: number };
  execution: { pd: number; cs: number; ob: number };
  accountability: { pd: number; cs: number; ob: number };
}

interface CompletedMemberRow {
  display_name: string | null;
  email: string;
  alignment_score: number | null;
  execution_score: number | null;
  accountability_score: number | null;
  member_computed_subscales: MemberSubscales | null;
}

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

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round0(n: number): number {
  return Math.round(n);
}

/**
 * POST /api/dashboard/[token]/report
 *
 * Generates (or regenerates) team report snapshot.
 * Per PRD/Architecture: must use service-role (admin) Supabase client server-side.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { message: "Missing admin token", code: "INVALID_REQUEST" },
        },
        { status: 400 }
      );
    }

    // IMPORTANT: This MUST be the service-role/admin client (server-only).
    const supabase = createAdminClient();
    const adminTokenHash = hashToken(token);

    // 1) Validate admin token → team
    const { data: team, error: teamError } = (await supabase
      .from("teams")
      .select("id, firm_name, leader_name, leader_email")
      .eq("admin_token_hash", adminTokenHash)
      .single()) as {
      data: {
        id: string;
        firm_name: string;
        leader_name: string;
        leader_email: string;
      } | null;
      error: any;
    };

    if (teamError || !team) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Unauthorized: invalid admin token",
            code: "UNAUTHORIZED",
          },
        },
        { status: 401 }
      );
    }

    const teamId = team.id;

    // 2) Total member count
    const { count: totalCount, error: countError } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);

    if (countError) {
      console.error("Error counting team members:", countError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { message: "Failed to count team members", code: "DATABASE_ERROR" },
        },
        { status: 500 }
      );
    }

    // 3) Completed members with scores + subscales
    const { data: completedRows, error: membersError } = await supabase
      .from("team_members")
      .select(
        "display_name, email, alignment_score, execution_score, accountability_score, member_computed_subscales"
      )
      .eq("team_id", teamId)
      .eq("completed", true);

    if (membersError) {
      console.error("Error fetching completed members:", membersError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { message: "Failed to fetch completed members", code: "DATABASE_ERROR" },
        },
        { status: 500 }
      );
    }

    const completed = (completedRows ?? []) as CompletedMemberRow[];

    if (completed.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: { message: "No completed assessments yet", code: "NO_COMPLETIONS" },
        },
        { status: 400 }
      );
    }

    // Guardrails: scores/subscales should exist for completed members
    const validCompleted = completed.filter(
      (m) =>
        typeof m.alignment_score === "number" &&
        typeof m.execution_score === "number" &&
        typeof m.accountability_score === "number" &&
        m.member_computed_subscales != null
    );

    if (validCompleted.length === 0) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Completed assessments are missing scores/subscales",
            code: "DATA_INTEGRITY_ERROR",
          },
        },
        { status: 500 }
      );
    }

    const dims: Dimension[] = ["alignment", "execution", "accountability"];
    const subs: Subscale[] = ["pd", "cs", "ob"];

    // 4) Team averages (1 decimal)
    const teamAverages: Record<Dimension, number> = {
      alignment: round1(mean(validCompleted.map((m) => m.alignment_score as number))),
      execution: round1(mean(validCompleted.map((m) => m.execution_score as number))),
      accountability: round1(mean(validCompleted.map((m) => m.accountability_score as number))),
    };

    // 5) Subscale averages (integer)
    const subscaleAverages: Record<Dimension, Record<Subscale, number>> = {
      alignment: { pd: 0, cs: 0, ob: 0 },
      execution: { pd: 0, cs: 0, ob: 0 },
      accountability: { pd: 0, cs: 0, ob: 0 },
    };

    for (const d of dims) {
      for (const s of subs) {
        const values = validCompleted.map((m) => (m.member_computed_subscales as MemberSubscales)[d][s]);
        subscaleAverages[d][s] = round0(mean(values));
      }
    }

    // 6) Individual scores list (completed only)
    const individualScores = validCompleted.map((m) => ({
      name: m.display_name || "(Name pending)",
      email: m.email,
      alignment: m.alignment_score as number,
      execution: m.execution_score as number,
      accountability: m.accountability_score as number,
    }));

    // 7) Build scores_json
    const generatedAt = new Date().toISOString();
    const scoresJson: ScoresJson = {
      generated_at: generatedAt,
      completion_count: validCompleted.length,
      total_count: totalCount ?? 0,
      team_averages: teamAverages,
      subscale_averages: subscaleAverages,
      individual_scores: individualScores,
    };

    // 8) Deterministic report token (stable)
    const reportRawToken = deriveRawToken("report", teamId);
    const reportTokenHash = hashToken(reportRawToken);

    // 9) Upsert team_reports snapshot (overwrite previous)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
      .from("team_reports")
      .upsert(
        {
          team_id: teamId,
          report_token_hash: reportTokenHash,
          completion_count: validCompleted.length,
          total_count: totalCount ?? 0,
          scores_json: scoresJson,
          generated_at: generatedAt,
        },
        { onConflict: "team_id" }
      );

    if (upsertError) {
      console.error("Error upserting report:", upsertError);

      // This is the exact issue you hit: wrong privileges/client.
      const msg = String(upsertError.message || "");
      const isPermission = msg.toLowerCase().includes("permission denied");

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: isPermission
              ? "Server cannot write reports (permissions). Ensure this endpoint uses the Supabase SERVICE ROLE key and that the service role has access to team_reports."
              : "Failed to save report",
            code: isPermission ? "PERMISSION_DENIED" : "DATABASE_ERROR",
          },
        },
        { status: 500 }
      );
    }

    // 10) Build report URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const reportUrl = `${appUrl}/r/${reportRawToken}`;

    // 11) Send report_ready email async (and log)
    const leaderMemberResult = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("is_leader", true)
      .maybeSingle();

    const leaderMemberId = (leaderMemberResult.data as { id: string } | null)?.id;

    if (leaderMemberId) {
      after(async () => {
        try {
          await sendReportReadyEmail({
            leaderName: team.leader_name,
            firmName: team.firm_name,
            completionCount: validCompleted.length,
            totalCount: totalCount ?? 0,
            reportLink: reportUrl,
            leaderEmail: team.leader_email,
            teamId,
            teamMemberId: leaderMemberId,
          });
        } catch (err) {
          console.error("Failed to send report ready email:", err);
        }
      });
    } else {
      console.warn("Leader team_member row not found; skipping report_ready email logging.");
    }

    // 12) Return reportUrl
    return NextResponse.json<ApiResponse<GenerateReportSuccessResponse>>(
      { success: true, data: { reportUrl } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in report generation endpoint:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { message: "Internal server error", code: "INTERNAL_ERROR" } },
      { status: 500 }
    );
  }
}
