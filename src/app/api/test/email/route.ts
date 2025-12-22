import { NextResponse } from "next/server";
import { sendEmailWithRetry } from "@/lib/email/send";
import { buildParticipantInvite } from "@/lib/email/templates";
import { logEmailEvent } from "@/lib/email/logger";
import type { SendEmailResult } from "@/lib/email/send";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // 1) Parse body safely
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 2) Validate input
  const to = body?.to;
  if (typeof to !== "string" || !to.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Missing/invalid 'to' (must be an email string)" },
      { status: 400 }
    );
  }

  // 3) Build template
  const email = buildParticipantInvite({
    leaderName: "Test Leader",
    firmName: "Test Firm",
    assessmentLink: "https://example.com/a/test-token",
  });

  // 4) Send (never block the route if it fails)
  let result: SendEmailResult;
  try {
    result = await sendEmailWithRetry({
      to,
      subject: email.subject,
      text: email.text,
    });
  } catch (e: any) {
    // This should not happen if sendEmailWithRetry is implemented correctly,
    // but we still fail-open.
    result = { success: false, error: e?.message ?? "Unknown send error" };
  }

  // 5) Log (ALSO never block the route)
  let logInserted = false;
  try {
    await logEmailEvent({
      emailType: "participant_invite",
      recipientEmail: to,
      success: result.success,
      providerMessageId: result.success ? result.messageId ?? undefined : undefined,
      error: result.success ? undefined : result.error ?? "Unknown error",
      teamId: undefined,
      teamMemberId: undefined,
    });
    logInserted = true; // best-effort; if logEmailEvent swallowed errors, this still stays true
  } catch {
    // In case your logger accidentally throws (it shouldn't)
    logInserted = false;
  }

  // 6) Always return 200 for this test route; result.success tells you if email sent
  return NextResponse.json(
    { ok: true, result, logInserted },
    { status: 200 }
  );
}
