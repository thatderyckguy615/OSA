/**
 * Multipart Email Templates (HTML + Plain Text)
 * Exactly matching PRD Section 6.5.2
 */

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

// ============================================================================
// Shared HTML Email Layout
// ============================================================================

const LOGO_URL = "https://addictiveleadership.com/program/accounting/";
// Use the app-hosted logo (SVG, displayed at 150px width)
const getLogoImageUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://addictiveleadership.com";
  return `${baseUrl}/2026%20Logo%20-%20horizontal%20-%20black%20text%20-%202000w.svg`;
};

function buildHtmlWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Operating Strengths Assessment</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 40px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer with Logo -->
          <tr>
            <td align="center" style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <a href="${LOGO_URL}" style="text-decoration: none; border: none; outline: none; display: inline-block;">
                <img src="${getLogoImageUrl()}" alt="Addictive Leadership" width="150" style="display: block; border: none; outline: none; max-width: 150px; height: auto;" />
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function createButton(href: string, text: string): string {
  return `
<table role="presentation" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: #FF5252; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </td>
  </tr>
</table>
  `.trim();
}

// ============================================================================
// Leader Welcome Email
// Sent: On team creation
// Contains: Dashboard link + leader's personal assessment link
// ============================================================================

export interface LeaderWelcomeParams {
  leaderName: string;
  firmName: string;
  memberCount: number;
  dashboardLink: string;
  assessmentLink: string;
}

export function buildLeaderWelcome(params: LeaderWelcomeParams): EmailTemplate {
  const { leaderName, firmName, memberCount, dashboardLink, assessmentLink } = params;

  const text = `${leaderName},

Your Operating Strengths Assessment for ${firmName} has been created.
${memberCount} team members have been invited.

YOUR DASHBOARD (track progress, generate report):
${dashboardLink}

YOUR PERSONAL ASSESSMENT (complete this too):
${assessmentLink}

What to expect: Once your team completes their assessments, you'll see the collective averages and each participant's dimension scores by name.

— The Operating Strengths Assessment`;

  const html = buildHtmlWrapper(`
<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #1c1c1e;">
  ${leaderName},<br><br>Your <strong style="color: #ff5252;">Operating Strengths Assessment</strong> for <strong>${firmName}</strong> has been created.
  ${memberCount} team members have been invited.
</p>

<div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #ff5252;">
  <h2 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">
    Your Dashboard
  </h2>
  <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #475569;">
    Track progress and generate your team report:
  </p>
  ${createButton(dashboardLink, 'Open Dashboard')}
</div>

<div style="margin: 24px 0; padding: 20px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #ff5252;">
  <h2 style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">
    Your Personal Assessment
  </h2>
  <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.5; color: #475569;">
    Complete this too:
  </p>
  ${createButton(assessmentLink, 'Take Assessment')}
</div>

<div style="margin: 24px 0; padding: 16px; background-color: #E6EFF8; border-radius: 6px;">
  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #002253;">
    <strong>What to expect:</strong> Once your team completes their assessments, you'll see the collective averages and each participant's dimension scores by name.
  </p>
</div>
  `);

  return { subject: 'Your Operating Strengths Assessment is Ready', text, html };
}

// ============================================================================
// Participant Invite Email
// Sent: On team creation, add member, or resend
// Contains: Assessment link + privacy note
// ============================================================================

export interface ParticipantInviteParams {
  leaderName: string;
  firmName: string;
  assessmentLink: string;
}

export function buildParticipantInvite(params: ParticipantInviteParams): EmailTemplate {
  const { leaderName, firmName, assessmentLink } = params;

  const text = `You're invited!

${leaderName} has asked you to complete a brief assessment for ${firmName}.

It measures the firm's collective operating strengths across multiple dimensions. The results help distinguish between systems issues and development gaps, so the firm can address the right problems.

Answer 36 questions/prompts.

TAKE THE ASSESSMENT:
${assessmentLink}

Privacy: Your individual answers stay confidential. Leadership sees firm-wide patterns and aggregate scores, not who said what. Please answer honestly.

— The Operating Strengths Assessment`;

  const html = buildHtmlWrapper(`
<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #1c1c1e;">You're invited!<br /><br /><strong>${leaderName}</strong> has asked you to complete a brief assessment for <strong>${firmName}</strong>.</p>

<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #475569;">It measures the firm's collective operating strengths across multiple dimensions. The results help distinguish between systems issues and development gaps, so the firm can address the right problems.</p>

<p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #1c1c1e; font-weight: 600;">Answer 36 questions/prompts.</p>

${createButton(assessmentLink, 'Start Assessment')}

<div style="margin: 24px 0; padding: 16px; background-color: #E6EFF8; border-radius: 6px;">
  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #002253;">
    <strong>🔒 Privacy:</strong> Your individual answers stay confidential. Leadership sees firm-wide patterns and aggregate scores, not who said what. Please answer honestly.
  </p>
</div>
  `);

  return { subject: `${leaderName} invited you to the Operating Strengths Assessment`, text, html };
}

// ============================================================================
// Personal Results Email
// Sent: On assessment completion
// Contains: 3 dimension scores
// ============================================================================

export interface PersonalResultsParams {
  displayName: string;
  alignment: number;
  execution: number;
  accountability: number;
}

export function buildPersonalResults(params: PersonalResultsParams): EmailTemplate {
  const { displayName, alignment, execution, accountability } = params;

  // Format scores to 1 decimal place with padding for alignment
  const formatScore = (score: number): string => score.toFixed(1);

  const text = `${displayName},

Thank you for completing the Operating Strengths Assessment.

YOUR SCORES (1.0 - 10.0 scale):

Alignment:      ${formatScore(alignment)}
Execution:      ${formatScore(execution)}
Accountability: ${formatScore(accountability)}

Higher scores reflect strength.

— The Operating Strengths Assessment`;

  const html = buildHtmlWrapper(`
<p style="margin: 0 0 24px; font-size: 14px; line-height: 1.5; color: #1c1c1e;">
  ${displayName},<br><br>Thank you for completing the <strong style="color: #ff5252;">Operating Strengths Assessment</strong>.
</p>

<div style="margin: 24px 0; padding: 24px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid #ff5252;">
  <h2 style="margin: 0 0 16px; font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">
    Your Scores
  </h2>
  <p style="margin: 0 0 16px; font-size: 13px; color: #64748b;">
    (1.0 - 10.0 scale. Higher scores reflect strength.)
  </p>

  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="font-size: 16px; font-weight: 600; color: #1c1c1e;">Alignment:</span>
      </td>
      <td align="left" style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="font-size: 24px; font-weight: bold; color: #1c1c1e;">${formatScore(alignment)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="font-size: 16px; font-weight: 600; color: #1c1c1e;">Execution:</span>
      </td>
      <td align="left" style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="font-size: 24px; font-weight: bold; color: #1c1c1e;">${formatScore(execution)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 0;">
        <span style="font-size: 16px; font-weight: 600; color: #1c1c1e;">Accountability:</span>
      </td>
      <td align="left" style="padding: 12px 0;">
        <span style="font-size: 24px; font-weight: bold; color: #1c1c1e;">${formatScore(accountability)}</span>
      </td>
    </tr>
  </table>
</div>
  `);

  return { subject: 'Your Operating Strengths Results', text, html };
}

// ============================================================================
// Report Ready Email
// Sent: On report generation
// Contains: Report link
// ============================================================================

export interface ReportReadyParams {
  leaderName: string;
  firmName: string;
  completionCount: number;
  totalCount: number;
  reportLink: string;
}

export function buildReportReady(params: ReportReadyParams): EmailTemplate {
  const { leaderName, firmName, completionCount, totalCount, reportLink } = params;

  const text = `${leaderName},

Your Operating Strengths Report for ${firmName} is ready.

Based on ${completionCount} of ${totalCount} responses.

VIEW REPORT:
${reportLink}

You can share this link—it's view-only and doesn't expose dashboard controls.

— The Operating Strengths Assessment`;

  const html = buildHtmlWrapper(`
<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #1c1c1e;">
  ${leaderName},<br><br>Your <strong style="color: #ff5252;">Operating Strengths Report</strong> for <strong>${firmName}</strong> is ready.
</p>

<p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #1c1c1e;">
  Based on <strong>${completionCount} of ${totalCount}</strong> responses.
</p>

${createButton(reportLink, 'View Report')}

<div style="margin: 24px 0; padding: 14px; background-color: #E6EFF8; border-radius: 6px;">
  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #002253;">
    You can share this link—it's view-only and doesn't expose dashboard controls.
  </p>
</div>
  `);

  return { subject: `Operating Strengths Report Ready for ${firmName}`, text, html };
}

// ============================================================================
// Email Type Constants
// Matches database email_type enum
// ============================================================================

export const EMAIL_TYPES = {
  LEADER_WELCOME: 'leader_welcome',
  PARTICIPANT_INVITE: 'participant_invite',
  PARTICIPANT_RESEND: 'participant_resend',
  PERSONAL_RESULTS: 'personal_results',
  REPORT_READY: 'report_ready',
} as const;

export type EmailType = typeof EMAIL_TYPES[keyof typeof EMAIL_TYPES];