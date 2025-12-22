/**
 * Email System Public API
 * High-level functions that combine template building, sending with retry, and logging
 * 
 * IMPORTANT: Email failures NEVER block core application flows.
 * All functions return success/failure result rather than throwing.
 */
import { sendEmailWithRetry, type SendEmailResult } from './send';
import { logEmailEvent, canResendToMember } from './logger';
import {
  buildLeaderWelcome,
  buildParticipantInvite,
  buildPersonalResults,
  buildReportReady,
  EMAIL_TYPES,
  type LeaderWelcomeParams,
  type ParticipantInviteParams,
  type PersonalResultsParams,
  type ReportReadyParams,
} from './templates';

// Re-export types and utilities
export { canResendToMember } from './logger';
export type { SendEmailResult } from './send';
export type { CanResendResult } from './logger';

// ============================================================================
// Leader Welcome Email
// ============================================================================

export interface SendLeaderWelcomeParams extends LeaderWelcomeParams {
  leaderEmail: string;
  teamId: string;
  teamMemberId: string;
}

/**
 * Send leader welcome email with dashboard and assessment links.
 * Logs the event regardless of success/failure.
 */
export async function sendLeaderWelcomeEmail(
  params: SendLeaderWelcomeParams
): Promise<SendEmailResult> {
  const { leaderEmail, teamId, teamMemberId, ...templateParams } = params;
  const template = buildLeaderWelcome(templateParams);

  const result = await sendEmailWithRetry({
    to: leaderEmail,
    subject: template.subject,
    text: template.text,
  });

  await logEmailEvent({
    teamId,
    teamMemberId,
    emailType: EMAIL_TYPES.LEADER_WELCOME,
    recipientEmail: leaderEmail,
    success: result.success,
    providerMessageId: result.messageId,
    error: result.error,
  });

  return result;
}

// ============================================================================
// Participant Invite Email
// ============================================================================

export interface SendParticipantInviteParams extends ParticipantInviteParams {
  participantEmail: string;
  teamId: string;
  teamMemberId: string;
}

/**
 * Send participant invitation email.
 * Logs the event regardless of success/failure.
 */
export async function sendParticipantInviteEmail(
  params: SendParticipantInviteParams
): Promise<SendEmailResult> {
  const { participantEmail, teamId, teamMemberId, ...templateParams } = params;
  const template = buildParticipantInvite(templateParams);

  const result = await sendEmailWithRetry({
    to: participantEmail,
    subject: template.subject,
    text: template.text,
  });

  await logEmailEvent({
    teamId,
    teamMemberId,
    emailType: EMAIL_TYPES.PARTICIPANT_INVITE,
    recipientEmail: participantEmail,
    success: result.success,
    providerMessageId: result.messageId,
    error: result.error,
  });

  return result;
}

// ============================================================================
// Participant Resend Email (uses same template as invite)
// ============================================================================

export interface SendParticipantResendParams extends ParticipantInviteParams {
  participantEmail: string;
  teamId: string;
  teamMemberId: string;
}

/**
 * Resend participant invitation email.
 * Uses the same template as invite but logs as 'participant_resend'.
 * Logs the event regardless of success/failure.
 */
export async function sendParticipantResendEmail(
  params: SendParticipantResendParams
): Promise<SendEmailResult> {
  const { participantEmail, teamId, teamMemberId, ...templateParams } = params;
  const template = buildParticipantInvite(templateParams);

  const result = await sendEmailWithRetry({
    to: participantEmail,
    subject: template.subject,
    text: template.text,
  });

  await logEmailEvent({
    teamId,
    teamMemberId,
    emailType: EMAIL_TYPES.PARTICIPANT_RESEND,
    recipientEmail: participantEmail,
    success: result.success,
    providerMessageId: result.messageId,
    error: result.error,
  });

  return result;
}

// ============================================================================
// Personal Results Email
// ============================================================================

export interface SendPersonalResultsParams extends PersonalResultsParams {
  participantEmail: string;
  teamId: string;
  teamMemberId: string;
}

/**
 * Send personal results email after assessment completion.
 * Logs the event regardless of success/failure.
 */
export async function sendPersonalResultsEmail(
  params: SendPersonalResultsParams
): Promise<SendEmailResult> {
  const { participantEmail, teamId, teamMemberId, ...templateParams } = params;
  const template = buildPersonalResults(templateParams);

  const result = await sendEmailWithRetry({
    to: participantEmail,
    subject: template.subject,
    text: template.text,
  });

  await logEmailEvent({
    teamId,
    teamMemberId,
    emailType: EMAIL_TYPES.PERSONAL_RESULTS,
    recipientEmail: participantEmail,
    success: result.success,
    providerMessageId: result.messageId,
    error: result.error,
  });

  return result;
}

// ============================================================================
// Report Ready Email
// ============================================================================

export interface SendReportReadyParams extends ReportReadyParams {
  leaderEmail: string;
  teamId: string;
  teamMemberId: string;
}

/**
 * Send report ready notification to leader.
 * Logs the event regardless of success/failure.
 */
export async function sendReportReadyEmail(
  params: SendReportReadyParams
): Promise<SendEmailResult> {
  const { leaderEmail, teamId, teamMemberId, ...templateParams } = params;
  const template = buildReportReady(templateParams);

  const result = await sendEmailWithRetry({
    to: leaderEmail,
    subject: template.subject,
    text: template.text,
  });

  await logEmailEvent({
    teamId,
    teamMemberId,
    emailType: EMAIL_TYPES.REPORT_READY,
    recipientEmail: leaderEmail,
    success: result.success,
    providerMessageId: result.messageId,
    error: result.error,
  });

  return result;
}

