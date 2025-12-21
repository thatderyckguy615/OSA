import crypto from "node:crypto";

function getTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "Missing TOKEN_SECRET environment variable. This is required for token derivation and must be set in your environment."
    );
  }
  return secret;
}

export function deriveRawToken(purpose: string, id: string): string {
  const secret = getTokenSecret();
  return crypto.createHmac("sha256", secret).update(`${purpose}:${id}`).digest("hex");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function verifyTokenHash(rawToken: string, expectedHash: string): boolean {
  const actual = hashToken(rawToken);
  // timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expectedHash));
}
