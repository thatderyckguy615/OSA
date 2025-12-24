import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { deriveRawToken, hashToken, verifyTokenHash } from '@/lib/tokens';

describe('Token derivation and hashing', () => {
  const originalEnv = process.env.TOKEN_SECRET;

  beforeEach(() => {
    // Set test secret to avoid requiring real .env.local
    process.env.TOKEN_SECRET = 'test-secret-for-unit-tests';
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.TOKEN_SECRET = originalEnv;
    } else {
      delete process.env.TOKEN_SECRET;
    }
  });

  describe('deriveRawToken', () => {
    it('should generate the same token for the same id and purpose', () => {
      const token1 = deriveRawToken('assessment', 'member-123');
      const token2 = deriveRawToken('assessment', 'member-123');
      
      expect(token1).toBe(token2);
      expect(token1).toBeTruthy();
      expect(token1.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different purposes', () => {
      const assessmentToken = deriveRawToken('assessment', 'member-123');
      const adminToken = deriveRawToken('admin', 'member-123');
      const reportToken = deriveRawToken('report', 'member-123');
      
      expect(assessmentToken).not.toBe(adminToken);
      expect(assessmentToken).not.toBe(reportToken);
      expect(adminToken).not.toBe(reportToken);
    });

    it('should generate different tokens for different ids', () => {
      const token1 = deriveRawToken('assessment', 'member-123');
      const token2 = deriveRawToken('assessment', 'member-456');
      
      expect(token1).not.toBe(token2);
    });

    it('should generate deterministic tokens (HMAC-SHA256)', () => {
      const token = deriveRawToken('assessment', 'test-id');
      
      // Should be hex string (64 chars for SHA256)
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should throw error when TOKEN_SECRET is missing', () => {
      delete process.env.TOKEN_SECRET;
      
      expect(() => {
        deriveRawToken('assessment', 'member-123');
      }).toThrow(/TOKEN_SECRET/);
    });

    it('should throw error when TOKEN_SECRET is empty', () => {
      process.env.TOKEN_SECRET = '';
      
      expect(() => {
        deriveRawToken('assessment', 'member-123');
      }).toThrow(/TOKEN_SECRET/);
    });
  });

  describe('hashToken', () => {
    it('should generate stable hash for the same input', () => {
      const rawToken = deriveRawToken('assessment', 'member-123');
      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);
      
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const token1 = deriveRawToken('assessment', 'member-123');
      const token2 = deriveRawToken('assessment', 'member-456');
      
      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should generate SHA256 hex hash (64 chars)', () => {
      const rawToken = deriveRawToken('assessment', 'test-id');
      const hash = hashToken(rawToken);
      
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash.length).toBe(64);
    });

    it('should be deterministic (pure SHA256)', () => {
      const input = 'test-raw-token-string';
      const hash1 = hashToken(input);
      const hash2 = hashToken(input);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('verifyTokenHash', () => {
    it('should verify correct token hash', () => {
      const rawToken = deriveRawToken('assessment', 'member-123');
      const hash = hashToken(rawToken);
      
      expect(verifyTokenHash(rawToken, hash)).toBe(true);
    });

    it('should reject incorrect token hash', () => {
      const rawToken1 = deriveRawToken('assessment', 'member-123');
      const rawToken2 = deriveRawToken('assessment', 'member-456');
      const hash1 = hashToken(rawToken1);
      
      expect(verifyTokenHash(rawToken2, hash1)).toBe(false);
    });

    it('should reject tampered hash', () => {
      const rawToken = deriveRawToken('assessment', 'member-123');
      const hash = hashToken(rawToken);
      const tamperedHash = hash.replace('a', 'b');
      
      expect(verifyTokenHash(rawToken, tamperedHash)).toBe(false);
    });

    it('should use timing-safe comparison', () => {
      // This test ensures the function exists and doesn't throw
      const rawToken = deriveRawToken('assessment', 'member-123');
      const hash = hashToken(rawToken);
      
      // Should not throw for equal-length strings
      expect(() => verifyTokenHash(rawToken, hash)).not.toThrow();
    });
  });

  describe('Full token workflow', () => {
    it('should support complete derive -> hash -> verify cycle', () => {
      const memberId = 'member-uuid-123';
      
      // Derive raw token
      const rawToken = deriveRawToken('assessment', memberId);
      
      // Hash for storage
      const hash = hashToken(rawToken);
      
      // Verify later (simulating lookup)
      expect(verifyTokenHash(rawToken, hash)).toBe(true);
      
      // Ensure different member tokens don't verify
      const otherRawToken = deriveRawToken('assessment', 'other-member');
      expect(verifyTokenHash(otherRawToken, hash)).toBe(false);
    });

    it('should generate unique tokens per purpose for same entity', () => {
      const teamId = 'team-uuid-abc';
      
      const adminToken = deriveRawToken('admin', teamId);
      const reportToken = deriveRawToken('report', teamId);
      
      const adminHash = hashToken(adminToken);
      const reportHash = hashToken(reportToken);
      
      // Different purposes = different tokens and hashes
      expect(adminToken).not.toBe(reportToken);
      expect(adminHash).not.toBe(reportHash);
      
      // Each verifies correctly
      expect(verifyTokenHash(adminToken, adminHash)).toBe(true);
      expect(verifyTokenHash(reportToken, reportHash)).toBe(true);
      
      // Cross-verification fails
      expect(verifyTokenHash(adminToken, reportHash)).toBe(false);
      expect(verifyTokenHash(reportToken, adminHash)).toBe(false);
    });
  });
});

