import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";

// Use the exact email_type from database schema
type DbEmailType =
  Database["public"]["Tables"]["email_events"]["Insert"]["email_type"];

export interface LogEmailEventParams {
  teamId?: string | null;
  teamMemberId?: string | null;
  emailType: DbEmailType;
  recipientEmail: string;
  success: boolean;
  providerMessageId?: string | null;
  error?: string | null;
}

/**
 * Log an email event to the database.
 * NEVER throws (fail-open): logging failures must not block app flows.
 *
 * Returns true if insert succeeded, false otherwise (useful for test route output).
 */
export async function logEmailEvent(
  params: LogEmailEventParams
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("email_events").insert({
      team_id: params.teamId ?? null,
      team_member_id: params.teamMemberId ?? null,
      email_type: params.emailType,
      recipient_email: params.recipientEmail,
      success: params.success,
      provider_message_id: params.providerMessageId ?? null,
      error: params.error ?? null,
    });

    if (error) {
      console.error("Failed to log email event:", error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error logging email event:", err);
    return false;
  }
}

export interface CanResendResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Check if a resend is allowed for a team member.
 * Enforces 5-minute rate limit between invite/resend emails.
 * Fail-open on errors (do not block user).
 */
export async function canResendToMember(
  memberId: string
): Promise<CanResendResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createAdminClient() as any;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { count, error: countError } = await supabase
      .from("email_events")
      .select("*", { count: "exact", head: true })
      .eq("team_member_id", memberId)
      .in("email_type", ["participant_invite", "participant_resend"])
      .eq("success", true)
      .gte("created_at", fiveMinutesAgo);

    if (countError) {
      console.error("Error checking resend rate limit:", countError.message);
      return { allowed: true };
    }

    if ((count ?? 0) >= 1) {
      const { data, error: fetchError } = await supabase
        .from("email_events")
        .select("created_at")
        .eq("team_member_id", memberId)
        .in("email_type", ["participant_invite", "participant_resend"])
        .eq("success", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching recent email:", fetchError.message);
        return { allowed: false, retryAfterSeconds: 300 };
      }

      const emailData = data as { created_at: string } | null;
      if (emailData?.created_at) {
        const sentAt = new Date(emailData.created_at).getTime();
        const retryAfterSeconds = Math.ceil(
          (sentAt + 5 * 60 * 1000 - Date.now()) / 1000
        );

        return {
          allowed: false,
          retryAfterSeconds: Math.max(0, retryAfterSeconds),
        };
      }

      return { allowed: false, retryAfterSeconds: 300 };
    }

    return { allowed: true };
  } catch (err) {
    console.error("Error in canResendToMember:", err);
    return { allowed: true };
  }
}
