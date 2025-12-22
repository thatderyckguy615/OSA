/**
 * Resend Email Client
 * Server-side only - requires RESEND_API_KEY
 */
import { Resend } from 'resend';

let resendClient: Resend | null = null;

/**
 * Get or create Resend client instance.
 * @throws Error if RESEND_API_KEY is not configured
 */
export function getResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Get the configured sender email address.
 * @throws Error if EMAIL_FROM is not configured
 */
export function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('Missing EMAIL_FROM environment variable');
  }
  return from;
}

/**
 * Get the app base URL for building links.
 * @throws Error if NEXT_PUBLIC_APP_URL is not configured
 */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_APP_URL environment variable');
  }
  return url;
}

