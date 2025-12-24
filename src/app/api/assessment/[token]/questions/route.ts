/**
 * GET /api/assessment/[token]/questions
 * Return deterministically shuffled questions for a participant
 *
 * Per PRD Section 6.2.5 and Architecture Section 5.3
 *
 * SECURITY: Question shuffle happens server-side.
 * - RANDOMIZATION_SECRET never exposed to client
 * - is_reversed and subscale fields never returned (not needed by client)
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";
import { generateShuffledQuestions } from "@/lib/randomization/shuffle";

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

interface QuestionForClient {
  id: number; // question_order (canonical 1-36)
  text: string;
  dimension: string;
  position: number; // display order (1-36)
}

interface QuestionsResponse {
  questions: QuestionForClient[];
  memberId: string;
  memberName: string | null;
  isCompleted: boolean;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
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

    // Hash token for lookup
    const tokenHash = hashToken(token);

    // Initialize Supabase client (service role)
    const supabase = createAdminClient();

    // 1. Validate token and get member info + team's question version
    const memberResult = await supabase
      .from("team_members")
      .select(
        `
        id,
        display_name,
        completed,
        team:teams!inner(
          question_version_id
        )
      `
      )
      .eq("assessment_token_hash", tokenHash)
      .single();

    // Type assertion to work around Supabase inference issues
    interface MemberWithTeam {
      id: string;
      display_name: string | null;
      completed: boolean;
      team: { question_version_id: number } | { question_version_id: number }[];
    }
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

    // Extract team data (handle Supabase relation typing)
    const team = Array.isArray(member.team) ? member.team[0] : member.team;
    const questionVersionId = team?.question_version_id;

    if (!questionVersionId) {
      console.error("No question version found for team");
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Assessment configuration error",
            code: "NO_QUESTION_VERSION",
            retryable: false,
          },
        },
        { status: 500 }
      );
    }

    // 2. Fetch questions for team's locked version (ordered by question_order)
    interface QuestionRow {
      question_order: number;
      question_text: string;
      dimension: string;
    }

    const questionsResult = await supabase
      .from("questions")
      .select("question_order, question_text, dimension")
      .eq("version_id", questionVersionId)
      .order("question_order", { ascending: true });

    const questions = questionsResult.data as QuestionRow[] | null;
    const questionsError = questionsResult.error;

    if (questionsError || !questions) {
      console.error("Questions fetch error:", questionsError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to load questions",
            code: "QUESTIONS_FETCH_ERROR",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    // Validate we have exactly 36 questions
    if (questions.length !== 36) {
      console.error(`Expected 36 questions, got ${questions.length}`);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Assessment configuration error",
            code: "INVALID_QUESTION_COUNT",
            retryable: false,
          },
        },
        { status: 500 }
      );
    }

    // 3. Shuffle deterministically using memberId + RANDOMIZATION_SECRET
    // The generateShuffledQuestions function uses mulberry32 PRNG with sha256 seed
    // Same memberId always produces same shuffle order
    const shuffledQuestions = generateShuffledQuestions(member.id, questions);

    // 4. Transform to client format (position is 1-indexed display order)
    // NOTE: We intentionally do NOT include is_reversed or subscale
    const questionsForClient: QuestionForClient[] = shuffledQuestions.map(
      (q, index) => ({
        id: q.question_order, // Canonical question ID (1-36)
        text: q.question_text,
        dimension: q.dimension,
        position: index + 1, // Display position (1-36)
      })
    );

    // 5. Return response
    return NextResponse.json<ApiResponse<QuestionsResponse>>(
      {
        success: true,
        data: {
          questions: questionsForClient,
          memberId: member.id,
          memberName: member.display_name,
          isCompleted: member.completed ?? false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Questions fetch error:", error);

    // Check if it's a missing RANDOMIZATION_SECRET error
    if (
      error instanceof Error &&
      error.message.includes("RANDOMIZATION_SECRET")
    ) {
      console.error("RANDOMIZATION_SECRET not configured");
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Assessment configuration error",
            code: "CONFIG_ERROR",
            retryable: false,
          },
        },
        { status: 500 }
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

