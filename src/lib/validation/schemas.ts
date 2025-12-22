/**
 * Zod Validation Schemas
 * API input validation per PRD Section 10
 */
import { z } from 'zod';

// ============================================================================
// Team Creation Schema (PRD Section 10.1)
// ============================================================================

export const CreateTeamSchema = z.object({
  leaderName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .transform((s) => s.trim()),
  leaderEmail: z
    .string()
    .email('Invalid email format')
    .transform((s) => s.toLowerCase().trim()),
  firmName: z
    .string()
    .min(2, 'Firm name must be at least 2 characters')
    .transform((s) => s.trim()),
  participantEmails: z
    .array(z.string().email('Invalid email format'))
    .min(1, 'At least one participant required')
    .max(99, 'Maximum 99 participants (plus leader = 100 total)')
    .transform((emails) => [...new Set(emails.map((e) => e.toLowerCase().trim()))]),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;

// ============================================================================
// Assessment Submission Schema (PRD Section 10.2)
// ============================================================================

export const SubmitAssessmentSchema = z.object({
  responses: z
    .record(
      z.string().regex(/^[1-9]$|^[1-2][0-9]$|^3[0-6]$/, 'Invalid question ID'),
      z.number().int().min(1).max(5)
    )
    .refine((obj) => Object.keys(obj).length === 36, 'Exactly 36 responses required'),
});

export type SubmitAssessmentInput = z.infer<typeof SubmitAssessmentSchema>;

// ============================================================================
// Add Member Schema (PRD Section 10.3)
// ============================================================================

export const AddMemberSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .transform((s) => s.toLowerCase().trim()),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;

// ============================================================================
// Display Name Schema (PRD Section 10.4)
// ============================================================================

export const DisplayNameSchema = z.object({
  displayName: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s.length >= 2, 'Name must be at least 2 characters'),
});

export type DisplayNameInput = z.infer<typeof DisplayNameSchema>;

