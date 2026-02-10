# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OSA (Operating Strengths Assessment) is a team assessment tool built with Next.js 16 (App Router), Supabase, and Resend. Team leaders create assessments, invite participants via email, and view team reports. No user accounts—all access is via token-based URLs.

## Commands

```bash
pnpm dev          # Start dev server at localhost:3000
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Run Vitest in watch mode
pnpm test:unit    # Run tests once
pnpm preview:email # Preview email templates (tsx scripts/preview-email.ts)
pnpm generate:types # Regenerate Supabase types from remote schema

# Run a single test file
pnpm vitest run tests/unit/scoring.test.ts
```

### Utility Scripts

- `scripts/preview-email.ts` - Preview email templates locally
- `scripts/print-assessment-link.ts` - Generate assessment links for testing
- `scripts/test-tokens.ts` - Test token derivation

## Important Conventions

- **Path alias**: `@/*` maps to `./src/*` (configured in tsconfig and vitest)
- **Tests live in** `tests/unit/` (not co-located with source)
- **React Compiler** is enabled (`reactCompiler: true` in next.config.ts)
- **shadcn/ui** uses `radix-vega` style with Phosphor icons (`@phosphor-icons/react`)
- **No middleware** — all auth is token-based via URL params, no session/cookie auth

## Architecture

### Route Structure (App Router)

- `src/app/(public)/` - Public routes (no auth required)
  - `/` - Homepage (team creation form)
  - `/a/[token]` - Assessment flow (name capture → 36 questions → completion)
  - `/d/[token]` - Dashboard (leader view, realtime member status)
  - `/r/[token]` - Report (team scores, individual breakdown)
- `src/app/api/` - API routes
  - `/teams` - Create team (POST)
  - `/assessment/[token]/*` - Assessment endpoints (name, questions, submit)
  - `/dashboard/[token]/*` - Dashboard data, add member, resend invite
  - `/report/[token]` - Generate/fetch report

### Token System

Tokens are HMAC-derived, not random. Only hashes are stored in the database.

```typescript
// src/lib/tokens/index.ts
deriveRawToken(purpose: string, id: string)  // Creates token from secret
hashToken(rawToken: string)                   // SHA-256 hash for storage
verifyTokenHash(rawToken, expectedHash)       // Timing-safe comparison
```

Token purposes: `admin` (dashboard), `assessment` (member), `report`.

### Supabase Integration

- `src/lib/supabase/admin.ts` - Service role client (for server-side inserts)
- `src/lib/supabase/client.ts` - Browser client (for realtime subscriptions)
- `src/lib/supabase/server.ts` - Server-side client (cookies)
- `src/lib/supabase/types.ts` - Manual type stubs (replace via `pnpm generate:types`)

Database tables: `teams`, `team_members`, `responses`, `questions`, `question_versions`, `team_reports`, `email_events`

### Scoring Engine

`src/lib/scoring/engine.ts` implements the assessment scoring algorithm:

- 36 questions across 3 dimensions: `alignment`, `execution`, `accountability`
- Each dimension has 3 subscales: `pd` (Personal Discipline), `cs` (Collective Systems), `ob` (Observable Behaviors)
- Subscale weights for composite: OB 55%, CS 28%, PD 17%
- Final strength score: 1.0-10.0 scale

### Email System

`src/lib/email/` - Non-blocking email with retry logic:
- Templates: `templates.ts` (HTML email builders)
- Sending: `send.ts` (Resend API with exponential backoff)
- Logging: `logger.ts` (tracks all email events in DB)
- Email failures never block core application flows

### UI Components

- `src/components/ui/` - shadcn/ui components (Radix-based)
- `src/components/shared/` - Reusable app components
- Styling: Tailwind CSS v4, `src/app/globals.css`

### Environment Variables

Required in `.env.local`:
- `TOKEN_SECRET` - HMAC secret for token derivation
- `NEXT_PUBLIC_APP_URL` - Base URL for generated links
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin operations
- `RESEND_API_KEY` - Email sending
- `HUBSPOT_ACCESS_TOKEN` - HubSpot Private App token for contact syncing (optional; sync skipped if not set)

## Key Patterns

### API Response Format

All API routes return consistent structure:
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string; code?: string; retryable?: boolean; };
}
```

### Validation

Zod schemas in `src/lib/validation/schemas.ts` for request validation.

### Realtime

Dashboard uses Supabase realtime subscriptions via `src/hooks/useRealtime.ts` to show live member completion status.
