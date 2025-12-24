/**
 * POST /api/assessment/[token]/name
 * Persist participant display name (server-side)
 *
 * Per PRD FR-2.2 (Name capture logic + validation)
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
}

// PRD: Trim input; must be >=2 chars after trim; store as provided (no forced casing)
const DisplayNameSchema = z.object({
  displayName: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 2, "Name must be at least 2 characters"),
});

// -----------------------------------------------------------------------------
// POST Handler
// -----------------------------------------------------------------------------

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

    // Parse + validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Invalid JSON body",
            code: "INVALID_JSON",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const parsed = DisplayNameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message:
              parsed.error.issues[0]?.message ?? "Invalid display name input",
            code: "INVALID_DISPLAY_NAME",
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const { displayName } = parsed.data;

    // Hash token for lookup
    const tokenHash = hashToken(token);

    const supabase = createAdminClient();

    // Validate token + completion state
    const result = await supabase
      .from("team_members")
      .select("id, completed")
      .eq("assessment_token_hash", tokenHash)
      .maybeSingle();

    const memberRow = result.data as { id: string; completed: boolean } | null;

    if (result.error || !memberRow) {
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

    // Extract values
    const memberId = memberRow.id;
    const isCompleted = memberRow.completed;

    if (isCompleted) {
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

    // Update display name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("team_members")
      .update({ display_name: displayName })
      .eq("id", memberId);

    if (updateError) {
      console.error("Name update error:", updateError);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Failed to save name",
            code: "NAME_SAVE_FAILED",
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<{ displayName: string }>>(
      { success: true, data: { displayName } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Name route error:", error);
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
