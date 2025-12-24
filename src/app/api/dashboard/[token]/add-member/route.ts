import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, deriveRawToken } from "@/lib/tokens";
import { AddMemberSchema } from "@/lib/validation/schemas";
import { sendParticipantInviteEmail } from "@/lib/email";
import { ZodError } from "zod";

export const runtime = "nodejs";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

interface AddMemberSuccessResponse {
  memberId: string;
  email: string;
}

/**
 * POST /api/dashboard/[token]/add-member
 *
 * Add a new team member after team creation.
 *
 * Per PRD Section 6.2.2:
 * - Validate admin token → team ID
 * - Validate and normalize email (lowercase/trim)
 * - Ensure email not already in team (DB unique constraint on CITEXT)
 * - Ensure team size <= 100
 * - Create team_member with deterministic assessment token hash
 * - Send participant_invite email
 * - Log email event
 *
 * Returns 409 if email already exists or team is full.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Missing admin token",
            code: "INVALID_REQUEST",
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Invalid JSON in request body",
            code: "INVALID_JSON",
          },
        },
        { status: 400 }
      );
    }

    // Validate with Zod schema (normalizes email)
    let validated: { email: string };
    try {
      validated = AddMemberSchema.parse(body);
    } catch (err) {
      if (err instanceof ZodError) {
        const firstError = err.issues[0];
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              message: firstError?.message || "Validation failed",
              code: "VALIDATION_ERROR",
            },
          },
          { status: 400 }
        );
      }
      throw err;
    }

    const email = validated.email;

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

    // 2. Check current team size (must be < 100)
    const { count: currentCount, error: countError } = await supabase
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("team_id", teamId);

    if (countError) {
      console.error("Error checking team size:", countError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to check team size",
            code: "DATABASE_ERROR",
          },
        },
        { status: 500 }
      );
    }

    if ((currentCount ?? 0) >= 100) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Team is full (maximum 100 members)",
            code: "TEAM_FULL",
          },
        },
        { status: 409 }
      );
    }

    // 3. Check if email already exists in team (CITEXT unique constraint)
    const { data: existingMember, error: existingError } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", teamId)
      .eq("email", email)
      .maybeSingle();

    // If the query succeeded and found a member, email is already in team
    if (!existingError && existingMember) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Email is already a member of this team",
            code: "DUPLICATE_EMAIL",
          },
        },
        { status: 409 }
      );
    }

    // 4. Create new member with deterministic assessment token
    const memberId = crypto.randomUUID();
    const assessmentRawToken = deriveRawToken("assessment", memberId);
    const assessmentTokenHash = hashToken(assessmentRawToken);

    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        id: memberId,
        team_id: teamId,
        email,
        display_name: null,
        is_leader: false,
        completed: false,
        assessment_token_hash: assessmentTokenHash,
      });

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (
        insertError.code === "23505" &&
        insertError.message.includes("email")
      ) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              message: "Email is already a member of this team",
              code: "DUPLICATE_EMAIL",
            },
          },
          { status: 409 }
        );
      }

      console.error("Error inserting team member:", insertError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to add team member",
            code: "DATABASE_ERROR",
          },
        },
        { status: 500 }
      );
    }

    // 5. Send participant_invite email asynchronously
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const assessmentLink = `${appUrl}/a/${assessmentRawToken}`;

    void sendParticipantInviteEmail({
      leaderName: team.leader_name,
      firmName: team.firm_name,
      assessmentLink,
      participantEmail: email,
      teamId,
      teamMemberId: memberId,
    }).catch((err) => {
      console.error("Failed to send participant invite email:", err);
    });

    // 6. Return success (Realtime will update the dashboard UI)
    return NextResponse.json<ApiResponse<AddMemberSuccessResponse>>(
      {
        success: true,
        data: {
          memberId,
          email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in add-member endpoint:", error);
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

