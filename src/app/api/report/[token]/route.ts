import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens";

export const runtime = "nodejs";

// Critical: mark route as dynamic to prevent Next.js static optimization
export const dynamic = "force-dynamic";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

interface ReportData {
  firmName: string;
  scoresJson: any; // Use the exact shape from team_reports.scores_json
}

/**
 * GET /api/report/[token]
 *
 * Fetch report data by report token (read-only access).
 *
 * Per PRD Section 6.4.4:
 * - Validate report token via hash lookup in team_reports
 * - Return scores_json and firm name
 * - Must not be cached (Cache-Control: no-store)
 * - Return 404 if token invalid
 *
 * Critical: This endpoint must serve fresh data after report regeneration.
 */
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
            message: "Missing report token",
            code: "INVALID_REQUEST",
          },
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Hash the provided token for lookup
    const reportTokenHash = hashToken(token);

    // Use service role client for database access
    const supabase = createAdminClient();

    // Look up report by token hash and join with team for firm name
    const { data: report, error: reportError } = (await supabase
      .from("team_reports")
      .select(
        `
        scores_json,
        team:teams!inner(firm_name)
      `
      )
      .eq("report_token_hash", reportTokenHash)
      .single()) as {
      data: {
        scores_json: any;
        team: { firm_name: string } | { firm_name: string }[];
      } | null;
      error: any;
    };

    if (reportError || !report) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Report not found",
            code: "NOT_FOUND",
          },
        },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Extract firm name from nested team object
    const team = Array.isArray(report.team) ? report.team[0] : report.team;
    const firmName = team?.firm_name;

    if (!firmName) {
      console.error("Report found but team/firm_name missing:", report);
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            message: "Report data incomplete",
            code: "DATA_INTEGRITY_ERROR",
          },
        },
        {
          status: 500,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
    }

    // Return report data with aggressive no-cache headers
    return NextResponse.json<ApiResponse<ReportData>>(
      {
        success: true,
        data: {
          firmName,
          scoresJson: report.scores_json,
        },
      },
      {
        status: 200,
        headers: {
          // Aggressive cache prevention per PRD requirement
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error in report fetch endpoint:", error);
    return NextResponse.json<ApiResponse>(
      {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}

