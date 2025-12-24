/**
 * POST /api/dashboard/realtime-token
 * Generate JWT for Supabase Realtime authentication
 *
 * Per PRD Section 6.3.2
 */
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

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

interface RealtimeTokenResponse {
  token: string;
  expiresIn: number;
}

// Validation schema
const RequestSchema = z.object({
  adminToken: z.string().min(1, "Admin token is required"),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // 1) Parse and validate request body
    const body = await request.json();
    const validated = RequestSchema.parse(body);

    // 2) Hash admin token for lookup
    const tokenHash = hashToken(validated.adminToken);

    // 3) Validate admin token and get team ID
    const supabase = createAdminClient();

    const teamResult = await supabase
      .from("teams")
      .select("id")
      .eq("admin_token_hash", tokenHash)
      .maybeSingle();

    const team = teamResult.data as { id: string } | null;

    if (teamResult.error || !team) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Invalid dashboard token",
            code: "INVALID_TOKEN",
            retryable: false,
          },
        },
        { status: 401 }
      );
    }

    // 4) Get Supabase JWT secret
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error("SUPABASE_JWT_SECRET not configured");
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Server configuration error",
            code: "CONFIG_ERROR",
            retryable: false,
          },
        },
        { status: 500 }
      );
    }

    // 5) Create JWT with jose
    const secret = new TextEncoder().encode(jwtSecret);
    const expiresIn = 3600; // 1 hour in seconds

    const token = await new SignJWT({
      role: "authenticated",
      team_id: team.id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    // 6) Return token and expiry
    return NextResponse.json<ApiResponse<RealtimeTokenResponse>>(
      {
        success: true,
        data: {
          token,
          expiresIn,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Realtime token generation error:", error);

    // Handle Zod validation errors
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

    // Generic error
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

