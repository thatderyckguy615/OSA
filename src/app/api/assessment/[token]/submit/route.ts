/**
 * POST /api/assessment/[token]/submit
 * Submit assessment responses and compute scores
 *
 * Per PRD Section 6.2.7 and 9.1
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { SubmitAssessmentSchema } from "@/lib/validation/schemas";
import { calculateAllScores, type Question } from "@/lib/scoring/engine";
import { sendPersonalResultsEmail } from "@/lib/email";

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
  };
}

interface SubmitResponse {
  alignment: number;
  execution: number;
  accountability: number;
}

// ============================================================================
// POST Handler
// ============================================================================

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
            message: "Missing assessment token",
            code: "MISSING_TOKEN",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // 1) Parse and validate request body
    const body = await request.json();
    const validated = SubmitAssessmentSchema.parse(body);

    // Hash token for lookup
    const tokenHash = hashToken(token);

    // Initialize Supabase admin client (service role)
    const supabase = createAdminClient();

    // 2) Validate token and get member info + team's question version
    interface MemberWithTeam {
      id: string;
      email: string;
      display_name: string | null;
      completed: boolean;
      team:
        | { id: string; question_version_id: number }
        | { id: string; question_version_id: number }[];
    }

    const memberResult = await supabase
      .from("team_members")
      .select(
        `
        id,
        email,
        display_name,
        completed,
        team:teams!inner(
          id,
          question_version_id
        )
      `
      )
      .eq("assessment_token_hash", tokenHash)
      .single();

    const member = memberResult.data as MemberWithTeam | null;

    if (memberResult.error || !member) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Invalid assessment link",
            code: "INVALID_TOKEN",
            retryable: false,
          },
        },
        { status: 404 }
      );
    }

    // Already completed (not retryable)
    if (member.completed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Assessment already completed",
            code: "ALREADY_COMPLETED",
            retryable: false,
          },
        },
        { status: 409 }
      );
    }

    // Extract team data
    const team = Array.isArray(member.team) ? member.team[0] : member.team;
    const teamId = team?.id;
    const questionVersionId = team?.question_version_id;

    if (!teamId || !questionVersionId) {
      console.error("No team or question version found for member");
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Assessment configuration error",
            code: "NO_TEAM_VERSION",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // 3) Fetch question metadata for scoring (dimension, subscale, is_reversed)
    interface QuestionRow {
      question_order: number;
      dimension: string;
      subscale: string;
      is_reversed: boolean;
    }

    const questionsResult = await supabase
      .from("questions")
      .select("question_order, dimension, subscale, is_reversed")
      .eq("version_id", questionVersionId)
      .order("question_order", { ascending: true });

    const questions = questionsResult.data as QuestionRow[] | null;

    if (questionsResult.error || !questions || questions.length !== 36) {
      console.error("Questions fetch error:", questionsResult.error);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to load question metadata",
            code: "QUESTIONS_FETCH_ERROR",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // 4) Convert response keys to numbers for scoring
    const responsesAsNumbers: Record<number, number> = {};
    for (const [key, value] of Object.entries(validated.responses)) {
      responsesAsNumbers[parseInt(key, 10)] = value;
    }

    // 5) Build question list for scoring engine
    const questionsForScoring: Question[] = questions.map((q) => ({
      question_id: q.question_order,
      dimension: q.dimension as "alignment" | "execution" | "accountability",
      subscale: q.subscale as "pd" | "cs" | "ob",
      is_reversed: q.is_reversed,
    }));

    // 6) Compute scores via scoring engine
    let scores;
    try {
      scores = calculateAllScores(responsesAsNumbers, questionsForScoring);
    } catch (err) {
      console.error("Scoring error:", err);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to compute scores",
            code: "SCORING_ERROR",
            retryable: false,
          },
        },
        { status: 500 }
      );
    }

    // 7) Subscales JSONB matching PRD structure (integers 0–100)
    const subscalesJson = {
      alignment: {
        pd: scores.alignment.pd,
        cs: scores.alignment.cs,
        ob: scores.alignment.ob,
      },
      execution: {
        pd: scores.execution.pd,
        cs: scores.execution.cs,
        ob: scores.execution.ob,
      },
      accountability: {
        pd: scores.accountability.pd,
        cs: scores.accountability.cs,
        ob: scores.accountability.ob,
      },
    };

    // 8) Call submit_assessment RPC (atomic transaction)
    // IMPORTANT: pass validated.responses so keys are exactly "1".."36"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase as any).rpc("submit_assessment", {
      p_member_id: member.id,
      p_responses: validated.responses,
      p_alignment_score: scores.alignment.strength,
      p_execution_score: scores.execution.strength,
      p_accountability_score: scores.accountability.strength,
      p_subscales: subscalesJson,
    });

    if (rpcError) {
      console.error("Submit RPC error:", rpcError);

      // Already completed (row-lock protection inside RPC)
      if (rpcError.message?.toLowerCase().includes("already completed")) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              message: "Assessment already completed",
              code: "ALREADY_COMPLETED",
              retryable: false,
            },
          },
          { status: 409 }
        );
      }

      // Permission/config error (won’t fix by “changing answers”)
      if (rpcError.code === "42501" || rpcError.message?.includes("permission denied")) {
        return NextResponse.json<ApiResponse>(
          {
            success: false,
            error: {
              message: "We couldn’t save your assessment due to a system configuration issue. Please try again in a moment.",
              code: "DB_PERMISSION_DENIED",
              retryable: true,
            },
          },
          { status: 500 }
        );
      }

      // Other DB errors are retryable (client should NOT clear sessionStorage)
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to save assessment. Please try again.",
            code: "SUBMIT_ERROR",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // 9) Send personal results email using after() to ensure completion
    after(async () => {
      try {
        await sendPersonalResultsEmail({
          participantEmail: member.email,
          teamId,
          teamMemberId: member.id,
          displayName: member.display_name || "Team Member",
          alignment: scores.alignment.strength,
          execution: scores.execution.strength,
          accountability: scores.accountability.strength,
        });
      } catch (err) {
        console.error("Failed to send personal results email:", err);
      }
    });

    // 10) Return success with leader-visible scores only (no subscales)
    return NextResponse.json<ApiResponse<SubmitResponse>>(
      {
        success: true,
        data: {
          alignment: scores.alignment.strength,
          execution: scores.execution.strength,
          accountability: scores.accountability.strength,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Assessment submission error:", error);

    // Handle Zod validation errors (not retryable)
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Invalid response data. Please ensure all 36 questions are answered.",
            code: "VALIDATION_ERROR",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Handle JSON parse errors
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

    // Generic errors are retryable
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
