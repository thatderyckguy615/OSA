/**
 * Request Utilities
 * Helper functions for extracting data from HTTP requests
 */
import { NextRequest } from 'next/server';

/**
 * Extract client IP address from request headers.
 * Returns null if IP cannot be determined (PRD: do not block creation if null).
 *
 * Priority order (per PRD Section 6.1.3):
 * 1. x-vercel-forwarded-for (Vercel deployment)
 * 2. x-forwarded-for (first IP if multiple)
 * 3. x-real-ip
 * 4. null (fallback)
 */
export function getClientIp(request: NextRequest): string | null {
  // Vercel-specific header
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.trim();
  }

  // Standard proxy header (may contain multiple IPs)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP (client IP is typically first in the chain)
    const firstIp = forwardedFor.split(',')[0];
    if (firstIp) {
      return firstIp.trim();
    }
  }

  // Nginx-style header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Cannot determine IP - return null (PRD: do not block creation)
  return null;
}

