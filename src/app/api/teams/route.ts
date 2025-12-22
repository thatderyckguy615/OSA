/**
 * POST /api/teams
 * Create a new assessment team
 *
 * Per PRD Section 4.1 and Architecture Section 5.2
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { deriveRawToken, hashToken } from "@/lib/tokens";
import { CreateTeamSchema } from "@/lib/validation/schemas";
import { getClientIp } from "@/lib/utils/request";
import { sendLeaderWelcomeEmail, sendParticipantInviteEmail } from "@/lib/email";

// ============================================================================
// Types
// ============================================================================

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
    retryAfterSeconds?: number;
  };
}

interface CreateTeamResponse {
  teamId: string;
  dashboardUrl: string;
  leaderAssessmentUrl: string;
  participantCount: number;
}

// ============================================================================
// Helper: Check rate limit with fail-open on lock timeout / errors
// ============================================================================

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

async function checkRateLimit(
  supabase: ReturnType<typeof createAdminClient>,
  clientIp: string | null
): Promise<RateLimitResult> {
  // Skip rate limit check if IP cannot be determined (PRD requirement)
  if (!clientIp) return { allowed: true };

  try {
    const { data, error } = await supabase.rpc("check_team_creation_rate_limit", {
      p_creator_ip: clientIp,
    });

    // Fail-open on any RPC error (PRD: do not block team creation)
    if (error) {
      const msg = error.message ?? "";
      if (
        msg.includes("lock timeout") ||
        msg.includes("canceling statement") ||
        msg.includes("deadlock")
      ) {
        console.warn("Rate limit check timed out, failing open:", msg);
        return { allowed: true };
      }
      console.error("Rate limit check error, failing open:", error);
      return { allowed: true };
    }

    // RPC may return an object or a one-row array depending on function definition
    const result: any = Array.isArray(data) ? data[0] : data;

    if (!result || typeof result.allowed !== "boolean") {
      // No/unknown shape → fail open
      return { allowed: true };
    }

    return {
      allowed: result.allowed,
      retryAfterSeconds:
        typeof result.retry_after_seconds === "number"
          ? result.retry_after_seconds
          : undefined,
    };
  } catch (err) {
    console.error("Unexpected rate limit error, failing open:", err);
    return { allowed: true };
  }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1) Parse + validate request body
    const body = await request.json();
    const validated = CreateTeamSchema.parse(body);

    // 2) Extract client IP (may be null)
    const clientIp = getClientIp(request);

    // 3) Admin Supabase client (service role) — REQUIRED for server-side inserts
    const supabase = createAdminClient();

    // 4) Rate limit (skip if IP null, fail-open on errors)
    const rateLimitResult = await checkRateLimit(supabase, clientIp);
    if (!rateLimitResult.allowed) {
      const retryMinutes = rateLimitResult.retryAfterSeconds
        ? Math.ceil(rateLimitResult.retryAfterSeconds / 60)
        : 60;

      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: `You've created the maximum number of assessments. Please try again in ${retryMinutes} minute${
              retryMinutes !== 1 ? "s" : ""
            }.`,
            code: "RATE_LIMIT",
            retryable: false,
            retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          },
        },
        { status: 429 }
      );
    }

    // 5) Get active question version (your table uses id/name/is_active/created_at)
    const { data: activeVersion, error: versionError } = await supabase
      .from("question_versions")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError || !activeVersion?.id) {
      console.error("No active question version found:", versionError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Assessment configuration error. Please contact support.",
            code: "NO_ACTIVE_VERSION",
            retryable: false,
          },
        },
        { status: 500 }
      );
    }

    // 6) Normalize participants server-side (defensive):
    // - trim/lowercase for dedupe
    // - remove leader if included
    // - keep original-cased email as trimmed input if you want; here we keep trimmed strings.
    const leaderEmailLower = validated.leaderEmail.trim().toLowerCase();

    const dedupedParticipants: string[] = [];
    const seen = new Set<string>();

    for (const raw of validated.participantEmails) {
      const trimmed = raw.trim();
      const lower = trimmed.toLowerCase();
      if (!lower) continue;
      if (lower === leaderEmailLower) continue; // prevent unique constraint
      if (seen.has(lower)) continue;
      seen.add(lower);
      dedupedParticipants.push(trimmed);
    }

    // Must have at least 1 non-leader participant (PRD requirement)
    if (dedupedParticipants.length < 1) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message:
              "Please include at least 1 participant besides the leader.",
            code: "NO_PARTICIPANTS",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // 7) Generate team + tokens (only hashes stored)
    const teamId = crypto.randomUUID();

    const adminRaw = deriveRawToken("admin", teamId);
    const adminTokenHash = hashToken(adminRaw);

    // 8) Insert team
    const { error: teamError } = await supabase.from("teams").insert({
      id: teamId,
      leader_name: validated.leaderName,
      leader_email: validated.leaderEmail,
      firm_name: validated.firmName,
      question_version_id: activeVersion.id,
      admin_token_hash: adminTokenHash,
      creator_ip: clientIp,
    });

    if (teamError) {
      console.error("Team insert error:", teamError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to create team. Please try again.",
            code: "TEAM_INSERT_ERROR",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // 9) Insert leader member
    const leaderMemberId = crypto.randomUUID();
    const leaderAssessmentRaw = deriveRawToken("assessment", leaderMemberId);
    const leaderAssessmentHash = hashToken(leaderAssessmentRaw);

    const { error: leaderError } = await supabase.from("team_members").insert({
      id: leaderMemberId,
      team_id: teamId,
      email: validated.leaderEmail,
      display_name: validated.leaderName,
      assessment_token_hash: leaderAssessmentHash,
      is_leader: true,
    });

    if (leaderError) {
      console.error("Leader insert error:", leaderError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to create team leader. Please try again.",
            code: "LEADER_INSERT_ERROR",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // 10) Insert participants (continue on per-row failures)
    const participantData: Array<{
      memberId: string;
      email: string;
      assessmentRaw: string;
    }> = [];

    for (const email of dedupedParticipants) {
      const memberId = crypto.randomUUID();
      const assessmentRaw = deriveRawToken("assessment", memberId);
      const assessmentHash = hashToken(assessmentRaw);

      const { error: memberError } = await supabase.from("team_members").insert({
        id: memberId,
        team_id: teamId,
        email,
        display_name: null,
        assessment_token_hash: assessmentHash,
        is_leader: false,
      });

      if (memberError) {
        console.error(`Member insert error for ${email}:`, memberError);
        continue;
      }

      participantData.push({ memberId, email, assessmentRaw });
    }

    // If all participant inserts failed, treat as error (prevents "leader-only" teams)
    if (participantData.length < 1) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message:
              "Failed to add participants. Please try again (or adjust emails).",
            code: "PARTICIPANT_INSERT_ERROR",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // 11) URLs
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "http://localhost:3000";

    const dashboardUrl = `${appUrl}/d/${adminRaw}`;
    const leaderAssessmentUrl = `${appUrl}/a/${leaderAssessmentRaw}`;

    const participantCount = 1 + participantData.length;

    // 12) Emails: fire-and-forget (never block response)
    void sendLeaderWelcomeEmail({
      leaderEmail: validated.leaderEmail,
      teamId,
      teamMemberId: leaderMemberId,
      leaderName: validated.leaderName,
      firmName: validated.firmName,
      memberCount: participantCount,
      dashboardLink: dashboardUrl,
      assessmentLink: leaderAssessmentUrl,
    }).catch((err) => console.error("Failed to send leader welcome email:", err));

    for (const participant of participantData) {
      const participantAssessmentUrl = `${appUrl}/a/${participant.assessmentRaw}`;

      void sendParticipantInviteEmail({
        participantEmail: participant.email,
        teamId,
        teamMemberId: participant.memberId,
        leaderName: validated.leaderName,
        firmName: validated.firmName,
        assessmentLink: participantAssessmentUrl,
      }).catch((err) =>
        console.error(`Failed to send invite email to ${participant.email}:`, err)
      );
    }

    // 13) Success response
    return NextResponse.json<ApiResponse<CreateTeamResponse>>(
      {
        success: true,
        data: {
          teamId,
          dashboardUrl,
          leaderAssessmentUrl,
          participantCount,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Team creation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Invalid request data",
            code: "VALIDATION_ERROR",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Invalid JSON in request body",
            code: "PARSE_ERROR",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          message: "An unexpected error occurred. Please try again.",
          code: "INTERNAL_ERROR",
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
