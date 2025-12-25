/**
 * Email Send with Retry Logic
 * Implements PRD Section 6.5.3 - exponential backoff with max 2 retries
 */
import { getResendClient, getEmailFrom } from './client';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Helper to create a delay promise.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Send email with retry logic and exponential backoff.
 * 
 * Retry behavior (PRD Section 6.5.3):
 * - Attempt 1: immediate
 * - Attempt 2: after 1s delay
 * - Attempt 3: after 2s delay
 * - Return error after all attempts fail
 * 
 * This function NEVER throws - it always returns a result object.
 * This ensures email failures don't block core application flows.
 * 
 * @param params - Email parameters (to, subject, text)
 * @returns Result object with success status and messageId or error
 */
export async function sendEmailWithRetry(params: SendEmailParams): Promise<SendEmailResult> {
  const maxRetries = 2; // 3 total attempts
  let lastError: Error | null = null;

  // Get client and from address - if these fail, return error immediately
  let resend;
  let from;
  try {
    resend = getResendClient();
    from = getEmailFrom();
  } catch (error) {
    const err = error as Error;
    console.error('Email configuration error:', err.message);
    return { success: false, error: err.message };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const emailPayload: any = {
        from,
        to: params.to,
        subject: params.subject,
        text: params.text,
      };

      // Add HTML if provided
      if (params.html) {
        emailPayload.html = params.html;
      }

      const result = await resend.emails.send(emailPayload);

      // Resend returns { data, error } structure
      if (result.error) {
        throw new Error(result.error.message);
      }

      return { success: true, messageId: result.data?.id };
    } catch (error) {
      lastError = error as Error;
      
      // Only wait if we have more attempts left
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s
        await delay(1000 * (attempt + 1));
      }
    }
  }

  // All attempts failed
  console.error('Email send failed after retries:', lastError);
  return { success: false, error: lastError?.message ?? 'Unknown email error' };
}

