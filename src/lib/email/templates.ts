/**
 * Plain Text Email Templates
 * Exactly matching PRD Section 6.5.2
 */

export interface EmailTemplate {
  subject: string;
  text: string;
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

  return {
    subject: 'Your Operating Strengths Assessment is Ready',
    text: `Hi ${leaderName},

Your Operating Strengths Assessment for ${firmName} has been created.
${memberCount} team members have been invited.

YOUR DASHBOARD (track progress, generate report):
${dashboardLink}

YOUR PERSONAL ASSESSMENT (complete this too):
${assessmentLink}

Visibility: You'll see team averages and each participant's overall
dimension scores by name (Alignment/Execution/Accountability), but not
anyone's answers to individual questions.

— The Operating Strengths Assessment`,
  };
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

  return {
    subject: `${leaderName} invited you to the Operating Strengths Assessment`,
    text: `Hi,

${leaderName} has invited you to complete the Operating Strengths
Assessment for ${firmName}.

This will measure your team's strengths across several dimensions.
⏱️ Answer 36 questions/prompts.

TAKE THE ASSESSMENT:
${assessmentLink}

Privacy: Your leader will see your overall dimension scores
(Alignment/Execution/Accountability) and team averages, but will NOT see
your answers to individual questions.

— The Operating Strengths Assessment`,
  };
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

  return {
    subject: 'Your Operating Strengths Results',
    text: `Hi ${displayName},

Thank you for completing the Operating Strengths Assessment.

YOUR SCORES (1.0 - 10.0 scale):

Alignment:      ${formatScore(alignment)}
Execution:      ${formatScore(execution)}
Accountability: ${formatScore(accountability)}

Higher scores reflect strength.

— The Operating Strengths Assessment`,
  };
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

  return {
    subject: `Operating Strengths Report Ready for ${firmName}`,
    text: `Hi ${leaderName},

Your Operating Strengths Report is ready.

Based on ${completionCount} of ${totalCount} responses.

VIEW REPORT:
${reportLink}

You can share this link—it's view-only and doesn't expose dashboard
controls or individual question answers.

— The Operating Strengths Assessment`,
  };
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

