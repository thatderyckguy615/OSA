import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, deriveRawToken } from "@/lib/tokens";
import {
  canResendToMember,
  sendParticipantResendEmail,
} from "@/lib/email";

export const runtime = "nodejs";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

interface ResendSuccessResponse {
  message: string;
}

interface ResendThrottledResponse {
  message: string;
  retryAfterSeconds: number;
}

/**
 * POST /api/dashboard/[token]/members/[memberId]/resend
 *
 * Resend assessment invitation to a team member.
 *
 * Per PRD Section 6.2.3:
 * - Validate admin token → team ID
 * - Confirm member belongs to team and is incomplete
 * - Enforce 5-minute throttle (via email_events)
 * - Use deterministic token (NO rotation)
 * - Send participant_resend email
 * - Log email event
 *
 * Returns 429 if throttled with retry seconds.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string; memberId: string }> }
) {
  try {
    const { token, memberId } = await context.params;

    if (!token || !memberId) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Missing admin token or member ID",
            code: "INVALID_REQUEST",
          },
        },
        { status: 400 }
      );
    }

    // 1. Validate admin token → get team ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;
    const adminTokenHash = hashToken(token);

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, firm_name, leader_name")
      .eq("admin_token_hash", adminTokenHash)
      .single();

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

    // 2. Validate member belongs to team and is incomplete
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .select("id, email, display_name, completed, team_id")
      .eq("id", memberId)
      .eq("team_id", teamId)
      .single();

    if (memberError || !member) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Member not found or does not belong to this team",
            code: "NOT_FOUND",
          },
        },
        { status: 404 }
      );
    }

    if (member.completed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Cannot resend: member has already completed the assessment",
            code: "ALREADY_COMPLETED",
          },
        },
        { status: 400 }
      );
    }

    // 3. Check resend throttle (5-minute rate limit)
    const throttleCheck = await canResendToMember(memberId);

    if (!throttleCheck.allowed) {
      const retrySeconds = throttleCheck.retryAfterSeconds ?? 300;
      return NextResponse.json<ApiResponse<ResendThrottledResponse>>(
        {
          success: false,
          error: {
            message: `Please wait ${retrySeconds} seconds before resending`,
            code: "RATE_LIMITED",
          },
          data: {
            message: "Rate limited",
            retryAfterSeconds: retrySeconds,
          },
        },
        { status: 429, headers: { "Retry-After": String(retrySeconds) } }
      );
    }

    // 4. Compute deterministic assessment token (NO rotation)
    const assessmentRawToken = deriveRawToken("assessment", memberId);

    // Build assessment link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const assessmentLink = `${appUrl}/a/${assessmentRawToken}`;

    // 5. Send participant_resend email using after() to ensure completion
    after(async () => {
      try {
        await sendParticipantResendEmail({
          leaderName: team.leader_name,
          firmName: team.firm_name,
          assessmentLink,
          participantEmail: member.email,
          teamId,
          teamMemberId: memberId,
        });
      } catch (err) {
        console.error("Failed to send resend email:", err);
      }
    });

    // 6. Return success
    return NextResponse.json<ApiResponse<ResendSuccessResponse>>(
      {
        success: true,
        data: {
          message: "Invitation resent successfully",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in resend endpoint:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

