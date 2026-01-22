# Operating Strengths Assessment - Architecture Document

**Version:** 1.1
**Date:** December 21, 2025
**Status:** Production-Ready

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Data Architecture](#4-data-architecture)
5. [API Architecture](#5-api-architecture)
6. [Authentication & Security](#6-authentication--security)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Real-time Architecture](#8-real-time-architecture)
9. [Email Architecture](#9-email-architecture)
10. [Scoring Engine](#10-scoring-engine)
11. [State Management](#11-state-management)
12. [Error Handling](#12-error-handling)
13. [Performance Optimization](#13-performance-optimization)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Monitoring & Observability](#16-monitoring--observability)

---

## 1. System Overview

### 1.1 Architecture Philosophy

**Principles:**
- **Simplicity over cleverness**: Flat structure, explicit patterns
- **Fail-safe defaults**: Optimistic UI with rollback capabilities
- **Security in depth**: Token hashing, timing-safe comparisons, RLS
- **Observable systems**: Structured logging, error tracking, performance metrics

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel Edge                          │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │   Static   │  │   Next.js    │  │   API Routes     │    │
│  │   Assets   │  │  App Router  │  │  (Node Runtime)  │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ↓               ↓               ↓
    ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
    │   Supabase   │ │   Resend    │ │   Vercel     │
    │   Postgres   │ │    Email    │ │  Analytics   │
    │  + Realtime  │ │   Service   │ │              │
    └──────────────┘ └─────────────┘ └──────────────┘
```

### 1.3 Request Flow Patterns

**Pattern 1: Assessment Submission**
```
User Browser → Route Handler → Token Validation → Scoring Engine 
→ DB Function (Atomic Write) → Email Queue → Response
```

**Pattern 2: Dashboard Real-time Updates**
```
User Browser → JWT Token Request → Establish Realtime Channel 
→ Subscribe to team_members → Receive Postgres CDC Events → UI Update
```

**Pattern 3: Report Generation**
```
Leader Dashboard → Route Handler → Query Completed Members 
→ Aggregate Scores → Upsert Report → Generate Token → Send Email
```

---

## 2. Technology Stack

### 2.1 Core Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.4.0",
    
    "@supabase/supabase-js": "^2.43.0",
    "@supabase/ssr": "^0.4.0",
    
    "resend": "^3.2.0",
    "jose": "^5.2.0",
    
    "@phosphor-icons/react": "^2.1.0",
    "tailwindcss": "^3.4.0",
    "tailwind-merge": "^2.3.0",
    "clsx": "^2.1.0",
    
    "zod": "^3.23.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    
    "supabase": "^1.176.0",
    
    "vitest": "^1.5.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "playwright": "^1.43.0",
    
    "prettier": "^3.2.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

### 2.2 Runtime Configuration

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // API routes use Node runtime for crypto operations
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Optimize for Vercel deployment
  output: 'standalone',
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## 3. Project Structure

### 3.1 Directory Layout

```
osa-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Public routes (no auth)
│   │   │   ├── page.tsx             # Homepage + create form
│   │   │   ├── a/[token]/           # Assessment routes
│   │   │   │   ├── page.tsx         # Assessment intro + name capture
│   │   │   │   └── questions/
│   │   │   │       └── page.tsx     # Question UI
│   │   │   ├── d/[token]/           # Dashboard routes
│   │   │   │   └── page.tsx         # Leader dashboard
│   │   │   ├── r/[token]/           # Report routes
│   │   │   │   └── page.tsx         # View-only report
│   │   │   └── layout.tsx           # Public layout
│   │   │
│   │   ├── api/                      # API Route Handlers (Node runtime)
│   │   │   ├── teams/
│   │   │   │   └── route.ts         # POST /api/teams (create team)
│   │   │   ├── assessment/
│   │   │   │   └── [token]/
│   │   │   │       ├── questions/
│   │   │   │       │   └── route.ts # GET /api/assessment/[token]/questions
│   │   │   │       ├── name/
│   │   │   │       │   └── route.ts # POST /api/assessment/[token]/name
│   │   │   │       └── submit/
│   │   │   │           └── route.ts # POST /api/assessment/[token]/submit
│   │   │   ├── dashboard/
│   │   │   │   ├── [token]/
│   │   │   │   │   ├── members/
│   │   │   │   │   │   ├── route.ts # GET /api/dashboard/[token]/members
│   │   │   │   │   │   └── [memberId]/
│   │   │   │   │   │       └── resend/
│   │   │   │   │   │           └── route.ts # POST resend
│   │   │   │   │   ├── add-member/
│   │   │   │   │   │   └── route.ts # POST /api/dashboard/[token]/add-member
│   │   │   │   │   └── report/
│   │   │   │   │       └── route.ts # POST /api/dashboard/[token]/report
│   │   │   │   └── realtime-token/
│   │   │   │       └── route.ts     # POST /api/dashboard/realtime-token
│   │   │   └── report/
│   │   │       └── [token]/
│   │   │           └── route.ts     # GET /api/report/[token]
│   │   │
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── assessment/
│   │   │   ├── QuestionCard.tsx     # Single question UI
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── NavigationButtons.tsx
│   │   │   └── ScaleOptions.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── CompletionStats.tsx
│   │   │   ├── MemberList.tsx
│   │   │   ├── LiveIndicator.tsx
│   │   │   └── AddMemberForm.tsx
│   │   ├── report/
│   │   │   ├── ReportHeader.tsx
│   │   │   ├── TeamAveragesChart.tsx
│   │   │   ├── SubscaleTable.tsx
│   │   │   └── IndividualScoresList.tsx
│   │   └── shared/
│   │       ├── CopyButton.tsx
│   │       ├── EmailListParser.tsx
│   │       └── LoadingSpinner.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Client-side Supabase client
│   │   │   ├── server.ts            # Server-side Supabase client
│   │   │   └── types.ts             # Generated types (via CLI)
│   │   │
│   │   ├── scoring/
│   │   │   ├── engine.ts            # Core scoring algorithms
│   │   │   ├── aggregation.ts       # Team aggregate calculations
│   │   │   └── validation.ts        # Score validation utilities
│   │   │
│   │   ├── tokens/
│   │   │   └── index.ts             # Token generation, hashing, verification
│   │   │
│   │   ├── randomization/
│   │   │   └── shuffle.ts           # Deterministic shuffle (mulberry32)
│   │   │
│   │   ├── email/
│   │   │   ├── client.ts            # Resend client wrapper
│   │   │   ├── templates.ts         # Email template builders
│   │   │   ├── send.ts              # Send with retry logic
│   │   │   └── logger.ts            # Email event logging
│   │   │
│   │   ├── validation/
│   │   │   └── schemas.ts           # All Zod schemas
│   │   │
│   │   └── utils/
│   │       ├── cn.ts                # Tailwind merge utility
│   │       ├── date.ts              # Date formatting utilities
│   │       ├── request.ts           # Request utilities (IP extraction)
│   │       └── errors.ts            # Custom error classes
│   │
│   ├── hooks/
│   │   ├── useRealtime.ts           # Realtime subscription hook
│   │   ├── useSessionStorage.ts     # Session storage abstraction
│   │   ├── useClipboard.ts          # Clipboard with fallback
│   │   └── useAssessmentProgress.ts # Assessment state management
│   │
│   └── types/
│       ├── assessment.ts            # Assessment-related types
│       ├── dashboard.ts             # Dashboard-related types
│       ├── report.ts                # Report-related types
│       └── api.ts                   # API request/response types
│
├── supabase/
│   ├── migrations/
│   │   ├── 20250101000000_initial_schema.sql
│   │   ├── 20250101000001_rls_policies.sql
│   │   ├── 20250101000002_functions.sql
│   │   └── 20250101000003_seed_questions.sql
│   │
│   └── config.toml                  # Supabase project config
│
├── tests/
│   ├── unit/
│   │   ├── scoring.test.ts
│   │   ├── tokens.test.ts
│   │   └── randomization.test.ts
│   ├── integration/
│   │   ├── api/
│   │   │   ├── teams.test.ts
│   │   │   ├── assessment.test.ts
│   │   │   └── dashboard.test.ts
│   │   └── db/
│   │       └── submit_assessment.test.ts
│   └── e2e/
│       ├── create-team.spec.ts
│       ├── complete-assessment.spec.ts
│       └── generate-report.spec.ts
│
├── scripts/
│   ├── generate-types.sh            # Run Supabase type generation
│   └── seed-dev-data.ts             # Development data seeding
│
├── .env.local.example
├── .env.production.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 3.2 File Naming Conventions

- **Components**: PascalCase (`QuestionCard.tsx`)
- **Utilities**: camelCase (`scoring/engine.ts`)
- **API Routes**: lowercase with hyphens (`add-member/route.ts`)
- **Types**: PascalCase interfaces/types (`AssessmentResponse`)
- **Hooks**: camelCase with `use` prefix (`useRealtime.ts`)

---

## 4. Data Architecture

### 4.1 Database Schema (Canonical)

**Implementation Notes:**
- All tables use `gen_random_uuid()` for primary keys
- `citext` extension for case-insensitive email matching
- Indexes optimized for query patterns
- RLS enabled on all tables (service role bypasses)

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Tables (see PRD Section 8 for complete DDL)
-- Key indexes:
CREATE INDEX idx_teams_admin_token_hash ON teams(admin_token_hash);
CREATE INDEX idx_teams_creator_ip_created_at ON teams(creator_ip, created_at DESC);
CREATE INDEX idx_team_members_token_hash ON team_members(assessment_token_hash);
CREATE INDEX idx_team_members_team_completed ON team_members(team_id, completed);
CREATE INDEX idx_responses_member ON responses(team_member_id);
CREATE INDEX idx_email_events_member_type_created ON email_events(team_member_id, email_type, created_at DESC);
```

### 4.2 Type Generation Strategy

**Setup:**
```bash
# Install Supabase CLI
npm install -g supabase

# Link to project
supabase link --project-ref <project-id>

# Generate types
npm run generate:types
```

**package.json script:**
```json
{
  "scripts": {
    "generate:types": "supabase gen types typescript --linked > src/lib/supabase/types.ts"
  }
}
```

**Generated types usage:**
```typescript
// src/lib/supabase/types.ts (auto-generated)
export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          leader_name: string;
          leader_email: string;
          // ... complete type definitions
        };
        Insert: { /* ... */ };
        Update: { /* ... */ };
      };
      // ... all tables
    };
    Functions: {
      submit_assessment: {
        Args: {
          p_member_id: string;
          p_responses: Json;
          // ...
        };
        Returns: void;
      };
    };
  };
};

// Usage in application code
import { Database } from '@/lib/supabase/types';

type Team = Database['public']['Tables']['teams']['Row'];
type TeamInsert = Database['public']['Tables']['teams']['Insert'];
```

### 4.3 RLS Policies

**Strategy:**
- Enable RLS on all tables
- Service role key used for server-side operations (bypasses RLS)
- Anon key used for client-side Realtime (RLS enforced)
- Single policy for dashboard Realtime access

```sql
-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_versions ENABLE ROW LEVEL SECURITY;

-- Policy for Realtime dashboard access
CREATE POLICY "Authenticated users can view team members for their team"
ON team_members FOR SELECT
TO authenticated
USING (
  team_id = (current_setting('request.jwt.claims', true)::jsonb->>'team_id')::uuid
);

-- All other operations via service role (no additional policies needed)
```

### 4.4 Database Functions

**submit_assessment (Atomic Submission)**

See PRD Section 9.1 for complete implementation.

**Key characteristics:**
- Row-level lock on team_member (FOR UPDATE)
- Validates exactly 36 responses with valid question_ids and values 1-5
- Inserts responses with UNIQUE constraint protection
- Updates completion status + dimension scores + subscales atomically
- All or nothing (transaction rollback on any error)

**Rate limit check function:**

```sql
CREATE OR REPLACE FUNCTION check_team_creation_rate_limit(
  p_creator_ip TEXT
) RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_oldest_created_at TIMESTAMPTZ;
  v_window_start TIMESTAMPTZ := NOW() - INTERVAL '1 hour';
BEGIN
  -- Set lock timeout
  SET LOCAL lock_timeout = '5s';
  
  -- Advisory lock on IP hash
  PERFORM pg_advisory_xact_lock(hashtext(p_creator_ip));
  
  -- Count teams in last hour
  SELECT COUNT(*), MIN(created_at)
  INTO v_count, v_oldest_created_at
  FROM teams
  WHERE creator_ip = p_creator_ip
    AND created_at > v_window_start;
  
  IF v_count >= 2 THEN
    -- Calculate retry time
    RETURN QUERY SELECT 
      FALSE as allowed,
      GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_created_at + INTERVAL '1 hour' - NOW()))::INTEGER) as retry_after_seconds;
  ELSE
    RETURN QUERY SELECT TRUE as allowed, 0 as retry_after_seconds;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 5. API Architecture

### 5.1 Route Handler Patterns

**All API routes:**
- Use Node runtime (`export const runtime = 'nodejs'`)
- Return standardized JSON responses
- Include proper error handling with retry flags
- Log structured data for observability

**Standard response format:**
```typescript
// src/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    retryable?: boolean;
    retryAfterSeconds?: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
  details?: Record<string, any>;
}
```

### 5.2 POST /api/teams (Create Team)

**Purpose**: Create new assessment team with rate limiting

**Request:**
```typescript
POST /api/teams
Content-Type: application/json

{
  "leaderName": "Sarah Johnson",
  "leaderEmail": "sarah@firm.com",
  "firmName": "Acme Accounting",
  "participantEmails": ["john@firm.com", "jane@firm.com"]
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "teamId": "uuid",
    "dashboardUrl": "https://app.com/d/[token]",
    "assessmentUrl": "https://app.com/a/[token]",
    "participantCount": 3
  }
}
```

**Implementation:**
```typescript
// src/app/api/teams/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { CreateTeamSchema } from '@/lib/validation/schemas';
import { generateToken, hashToken } from '@/lib/tokens';
import { sendLeaderWelcomeEmail, sendParticipantInviteEmail } from '@/lib/email/send';
import { getClientIp } from '@/lib/utils/request';
import type { ApiResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = CreateTeamSchema.parse(body);
    
    // Get client IP (may be null)
    const clientIp = getClientIp(request);
    
    // Create Supabase client (service role)
    const supabase = createServerClient();
    
    // Check rate limit only if IP is available
    if (clientIp) {
      const { data: rateLimitResult, error: rateLimitError } = await supabase
        .rpc('check_team_creation_rate_limit', { p_creator_ip: clientIp });
      
      if (rateLimitError) {
        if (rateLimitError.message.includes('lock timeout')) {
          // Fail open on lock timeout - allow the request
          console.warn('Rate limit lock timeout, allowing request');
        } else {
          throw rateLimitError;
        }
      } else if (!rateLimitResult?.[0]?.allowed) {
        const retrySeconds = rateLimitResult[0]?.retry_after_seconds || 3600;
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            message: `Rate limit exceeded. Please try again in ${Math.ceil(retrySeconds / 60)} minutes.`,
            code: 'RATE_LIMIT',
            retryable: false,
            retryAfterSeconds: retrySeconds,
          },
        }, { status: 429 });
      }
    }
    // If clientIp is null, skip rate limiting entirely
    
    // Generate tokens
    const adminToken = generateToken();
    const adminTokenHash = hashToken(adminToken);
    
    // Get current active question version
    const { data: activeVersion, error: versionError } = await supabase
      .from('question_versions')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (versionError || !activeVersion) {
      console.error('No active question version:', versionError);
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'System configuration error. Please contact support.',
          code: 'CONFIG_ERROR',
          retryable: false,
        },
      }, { status: 500 });
    }
    
    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        leader_name: validated.leaderName,
        leader_email: validated.leaderEmail,
        firm_name: validated.firmName,
        question_version_id: activeVersion.id,
        admin_token_hash: adminTokenHash,
        creator_ip: clientIp,
      })
      .select()
      .single();
    
    if (teamError) throw teamError;
    
    // Create leader as team member
    const leaderAssessmentToken = generateToken();
    const { data: leaderMember, error: leaderError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        email: validated.leaderEmail,
        display_name: validated.leaderName,
        assessment_token_hash: hashToken(leaderAssessmentToken),
        is_leader: true,
      })
      .select()
      .single();
    
    if (leaderError) throw leaderError;
    
    // Create participant members
    const participantTokens: Array<{ email: string; token: string }> = [];
    
    for (const email of validated.participantEmails) {
      const assessmentToken = generateToken();
      participantTokens.push({ email, token: assessmentToken });
      
      await supabase.from('team_members').insert({
        team_id: team.id,
        email: email,
        assessment_token_hash: hashToken(assessmentToken),
        is_leader: false,
      });
    }
    
    // Send emails (async, don't block response)
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/d/${adminToken}`;
    const leaderAssessmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/a/${leaderAssessmentToken}`;
    
    // Send leader welcome email
    sendLeaderWelcomeEmail({
      to: validated.leaderEmail,
      leaderName: validated.leaderName,
      firmName: validated.firmName,
      dashboardUrl,
      assessmentUrl: leaderAssessmentUrl,
      participantCount: validated.participantEmails.length + 1,
      teamId: team.id,
      memberId: leaderMember.id,
    }).catch(console.error);
    
    // Send participant invites
    for (const { email, token } of participantTokens) {
      const assessmentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/a/${token}`;
      sendParticipantInviteEmail({
        to: email,
        leaderName: validated.leaderName,
        firmName: validated.firmName,
        assessmentUrl,
        teamId: team.id,
      }).catch(console.error);
    }
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        teamId: team.id,
        dashboardUrl,
        assessmentUrl: leaderAssessmentUrl,
        participantCount: validated.participantEmails.length + 1,
      },
    }, { status: 201 });
    
  } catch (error) {
    console.error('Team creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          retryable: false,
        },
      }, { status: 400 });
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: 'Failed to create team. Please try again.',
        code: 'INTERNAL_ERROR',
        retryable: true,
      },
    }, { status: 500 });
  }
}
```

### 5.3 GET /api/assessment/[token]/questions

**Purpose**: Return deterministically shuffled questions for a participant

**Response:**
```typescript
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": 15, // question_order from DB
        "text": "I often feel it is better to...",
        "dimension": "execution",
        "position": 1 // 1-36, display order
      },
      // ... 35 more
    ],
    "memberId": "uuid",
    "memberName": "Sarah Johnson",
    "isCompleted": false
  }
}
```

**Implementation:**
```typescript
// src/app/api/assessment/[token]/questions/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { hashToken } from '@/lib/tokens';
import { generateShuffledQuestions } from '@/lib/randomization/shuffle';
import type { ApiResponse } from '@/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const tokenHash = hashToken(token);
    const supabase = createServerClient();
    
    // Find member by token
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('id, team_id, display_name, completed, team:teams(question_version_id)')
      .eq('assessment_token_hash', tokenHash)
      .single();
    
    if (memberError || !member) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Invalid assessment link',
          code: 'INVALID_TOKEN',
          retryable: false,
        },
      }, { status: 404 });
    }
    
    // Get questions for team's version
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('question_order, question_text, dimension')
      .eq('version_id', member.team.question_version_id)
      .order('question_order', { ascending: true });
    
    if (questionsError || !questions || questions.length !== 36) {
      throw new Error('Failed to load questions');
    }
    
    // Generate deterministic shuffle
    const shuffled = generateShuffledQuestions(member.id, questions);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        questions: shuffled.map((q, index) => ({
          id: q.question_order,
          text: q.question_text,
          dimension: q.dimension,
          position: index + 1,
        })),
        memberId: member.id,
        memberName: member.display_name,
        isCompleted: member.completed,
      },
    });
    
  } catch (error) {
    console.error('Questions fetch error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: 'Failed to load questions',
        code: 'INTERNAL_ERROR',
        retryable: true,
      },
    }, { status: 500 });
  }
}
```

### 5.4 POST /api/assessment/[token]/name

**Purpose**: Save participant display name

**Request:**
```typescript
{
  "displayName": "John Smith"
}
```

**Implementation:**
```typescript
// src/app/api/assessment/[token]/name/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { hashToken } from '@/lib/tokens';
import { DisplayNameSchema } from '@/lib/validation/schemas';
import type { ApiResponse } from '@/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { displayName } = DisplayNameSchema.parse(body);
    
    const tokenHash = hashToken(params.token);
    const supabase = createServerClient();
    
    // Find member by token
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('id, completed')
      .eq('assessment_token_hash', tokenHash)
      .single();
    
    if (memberError || !member) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Invalid assessment link',
          code: 'INVALID_TOKEN',
          retryable: false,
        },
      }, { status: 404 });
    }
    
    if (member.completed) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Assessment already completed',
          code: 'ALREADY_COMPLETED',
          retryable: false,
        },
      }, { status: 400 });
    }
    
    // Update display name
    const { error: updateError } = await supabase
      .from('team_members')
      .update({ display_name: displayName })
      .eq('id', member.id);
    
    if (updateError) {
      throw updateError;
    }
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: { displayName },
    });
    
  } catch (error) {
    console.error('Name save error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: 'Failed to save name',
        code: 'SAVE_ERROR',
        retryable: true,
      },
    }, { status: 500 });
  }
}
```

### 5.5 POST /api/assessment/[token]/submit

**Purpose**: Submit completed assessment responses

**Request:**
```typescript
{
  "responses": {
    "1": 5,
    "2": 4,
    // ... all 36 question_ids with values 1-5
    "36": 3
  }
}
```

**Implementation:**
```typescript
// src/app/api/assessment/[token]/submit/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { hashToken } from '@/lib/tokens';
import { calculateAllScores } from '@/lib/scoring/engine';
import { SubmitAssessmentSchema } from '@/lib/validation/schemas';
import { sendPersonalResultsEmail } from '@/lib/email/send';
import type { ApiResponse } from '@/types/api';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const validated = SubmitAssessmentSchema.parse(body);
    
    const tokenHash = hashToken(params.token);
    const supabase = createServerClient();
    
    // Get member and questions
    const { data: member } = await supabase
      .from('team_members')
      .select('id, team_id, display_name, email, completed, team:teams(question_version_id)')
      .eq('assessment_token_hash', tokenHash)
      .single();
    
    if (!member || member.completed) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: member?.completed ? 'Assessment already completed' : 'Invalid link',
          code: member?.completed ? 'ALREADY_COMPLETED' : 'INVALID_TOKEN',
          retryable: false,
        },
      }, { status: 400 });
    }
    
    // Get questions with metadata
    const { data: questions } = await supabase
      .from('questions')
      .select('question_order, dimension, subscale, is_reversed')
      .eq('version_id', member.team.question_version_id);
    
    // Calculate scores
    const scores = calculateAllScores(validated.responses, questions);
    
    // Prepare data for DB function
    const responsesJson = JSON.stringify(validated.responses);
    const subscalesJson = JSON.stringify({
      alignment: {
        pd: scores.alignment.pd,
        cs: scores.alignment.cs,
        ob: scores.alignment.ob,
      },
      execution: {
        pd: scores.execution.pd,
        cs: scores.execution.cs,
        ob: scores.execution.ob,
      },
      accountability: {
        pd: scores.accountability.pd,
        cs: scores.accountability.cs,
        ob: scores.accountability.ob,
      },
    });
    
    // Submit via DB function (atomic)
    const { error: submitError } = await supabase.rpc('submit_assessment', {
      p_member_id: member.id,
      p_responses: responsesJson,
      p_alignment_score: scores.alignment.strength,
      p_execution_score: scores.execution.strength,
      p_accountability_score: scores.accountability.strength,
      p_subscales: subscalesJson,
    });
    
    if (submitError) {
      console.error('Submit error:', submitError);
      
      // Check if already completed (race condition)
      if (submitError.message.includes('already completed')) {
        return NextResponse.json<ApiResponse>({
          success: false,
          error: {
            message: 'This assessment has already been submitted',
            code: 'ALREADY_COMPLETED',
            retryable: false,
          },
        }, { status: 409 });
      }
      
      throw submitError;
    }
    
    // Send results email (async)
    sendPersonalResultsEmail({
      to: member.email,
      displayName: member.display_name || 'Team Member',
      scores: {
        alignment: scores.alignment.strength,
        execution: scores.execution.strength,
        accountability: scores.accountability.strength,
      },
      teamId: member.team_id,
      memberId: member.id,
    }).catch(console.error);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        scores: {
          alignment: scores.alignment.strength,
          execution: scores.execution.strength,
          accountability: scores.accountability.strength,
        },
      },
    });
    
  } catch (error) {
    console.error('Assessment submission error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Invalid response data',
          code: 'VALIDATION_ERROR',
          retryable: false,
        },
      }, { status: 400 });
    }
    
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: 'Failed to submit assessment. Please try again.',
        code: 'SUBMISSION_ERROR',
        retryable: true,
      },
    }, { status: 500 });
  }
}
```

### 5.6 POST /api/dashboard/realtime-token

**Purpose**: Generate short-lived JWT for Realtime authentication

**Request:**
```typescript
{
  "adminToken": "dashboard-token-here"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "expiresIn": 3600
  }
}
```

**Implementation:**
```typescript
// src/app/api/dashboard/realtime-token/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { createServerClient } from '@/lib/supabase/server';
import { hashToken } from '@/lib/tokens';
import type { ApiResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const { adminToken } = await request.json();
    
    if (!adminToken) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: { message: 'Missing admin token', code: 'MISSING_TOKEN' },
      }, { status: 400 });
    }
    
    const supabase = createServerClient();
    const tokenHash = hashToken(adminToken);
    
    // Verify admin token
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('admin_token_hash', tokenHash)
      .single();
    
    if (!team) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: { message: 'Invalid token', code: 'INVALID_TOKEN' },
      }, { status: 401 });
    }
    
    // Generate JWT
    const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
    const token = await new SignJWT({
      role: 'authenticated',
      team_id: team.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);
    
    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        token,
        expiresIn: 3600,
      },
    });
    
  } catch (error) {
    console.error('Realtime token error:', error);
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: 'Failed to generate token',
        code: 'TOKEN_GENERATION_ERROR',
        retryable: true,
      },
    }, { status: 500 });
  }
}
```

---

## 6. Authentication & Security

### 6.1 Token System Architecture

**Token Types:**

| Type       | Purpose            | Storage       | Expiry | Hashing |
|------------|-------------------|---------------|--------|---------|
| Assessment | Participant access | DB hash only  | Never  | SHA-256 |
| Admin      | Dashboard access   | DB hash only  | Never  | SHA-256 |
| Report     | View-only report   | DB hash only  | Never  | SHA-256 |
| Realtime JWT | Realtime auth    | Not stored    | 1 hour | HMAC    |

**Token Generation and Hashing:**
```typescript
// src/lib/tokens/index.ts
import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token
 * Returns 64-character hex string (32 bytes)
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token using SHA-256
 * Only the hash is stored in the database; raw token is sent via URL
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Timing-safe token verification for in-memory comparisons
 * 
 * Note: This function is provided for cases where token comparison
 * happens in application code. For database lookups, we use direct
 * hash comparison via SQL query, which is acceptable because:
 * 1. The database query itself adds variable latency
 * 2. We're comparing hashes, not the original tokens
 * 3. The hash operation provides consistent timing
 */
export function verifyTokenHash(providedToken: string, storedHash: string): boolean {
  const providedHash = hashToken(providedToken);
  return crypto.timingSafeEqual(
    Buffer.from(providedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}
```

### 6.2 Request IP Extraction

```typescript
// src/lib/utils/request.ts
import { NextRequest } from 'next/server';

/**
 * Extract client IP from request headers.
 * Returns null if IP cannot be determined (rate limiting will be skipped).
 */
export function getClientIp(request: NextRequest): string | null {
  // Priority order for Vercel deployment
  const forwardedFor = request.headers.get('x-vercel-forwarded-for') ||
                       request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated, take first IP
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback - return null if unavailable (don't use 'unknown')
  return request.ip || null;
}
```

### 6.3 Rate Limiting Strategy

**Implementation:**
- Database-enforced using advisory locks
- Rolling window (60 minutes)
- Per IP address
- Lock timeout prevents indefinite waits
- Skip rate limiting if IP is null

### 6.4 Supabase Client Configuration

**Server-side (service role):**
```typescript
// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses RLS
    {
      auth: {
        persistSession: false,
      },
    }
  );
}
```

**Client-side (anon key + RLS):**
```typescript
// src/lib/supabase/client.ts
'use client';

import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // RLS enforced
  {
    auth: {
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 2, // Throttle updates
      },
    },
  }
);
```

---

## 7. Frontend Architecture

### 7.1 Component Hierarchy

**Homepage (Team Creation):**
```
page.tsx
└── CreateTeamForm
    ├── FormHeader
    ├── LeaderInfoSection
    │   ├── Input (name)
    │   ├── Input (email)
    │   └── Input (firm name)
    ├── ParticipantEmailsSection
    │   ├── EmailListParser
    │   └── ParsedEmailsList
    │       └── EmailItem (valid/invalid indicator)
    └── SubmitButton
```

**Assessment Flow:**
```
/a/[token]/page.tsx (Intro + Name Capture)
└── AssessmentIntro
    ├── PrivacyStatement
    ├── NameCaptureForm (conditional)
    └── StartButton

/a/[token]/questions/page.tsx
└── AssessmentContainer
    ├── ProgressBar
    ├── QuestionCard
    │   ├── QuestionText
    │   └── ScaleOptions (5 radio buttons)
    └── NavigationButtons
        ├── PreviousButton
        ├── NextButton
        └── SubmitButton (Q36 only)
```

**Dashboard:**
```
/d/[token]/page.tsx
└── DashboardContainer
    ├── DashboardHeader
    │   ├── FirmLogo
    │   ├── FirmName
    │   └── CopyDashboardLinkButton
    ├── CompletionSection
    │   ├── GenerateReportButton (primary CTA)
    │   ├── CompletionStats
    │   └── LiveIndicator
    ├── MemberLists
    │   ├── CompletedList
    │   │   └── MemberCard[] (name + email)
    │   └── NotCompletedList
    │       └── MemberCard[] (name + email + resend button)
    └── AddMemberSection
        └── AddMemberForm
```

**Report:**
```
/r/[token]/page.tsx
└── ReportContainer
    ├── ReportHeader
    │   ├── FirmName
    │   ├── GeneratedDate
    │   ├── CompletionBanner
    │   ├── CopyReportLinkButton
    │   └── PrintButton
    ├── TeamAveragesSection
    │   ├── SectionHeading
    │   └── DimensionBar[] (3 bars)
    ├── SubscaleBreakdownSection
    │   ├── SectionHeading
    │   └── SubscaleTable
    ├── IndividualScoresSection
    │   ├── SectionHeading
    │   └── IndividualScoreCard[]
    └── InterpretationSection
        └── CallToAction (link to addictiveleadership.com)
```

### 7.2 Print CSS

```css
/* src/app/globals.css - Add print styles */

@media print {
  /* Hide interactive elements */
  .no-print,
  button:not(.print-visible),
  .copy-button,
  .live-indicator,
  .add-member-form,
  nav,
  footer {
    display: none !important;
  }
  
  /* Ensure proper backgrounds */
  body,
  .report-container,
  .dashboard-container {
    background: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Preserve colored elements (like red for low scores) */
  .text-red-600,
  .text-red-700 {
    color: #dc2626 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  /* Prevent page breaks inside cards */
  .score-card,
  .member-row,
  .subscale-row,
  .individual-score-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  
  /* Ensure readable font sizes */
  body {
    font-size: 12pt;
    line-height: 1.5;
  }
  
  h1 { font-size: 18pt; }
  h2 { font-size: 16pt; }
  h3 { font-size: 14pt; }
  
  /* Remove shadows and decorative elements */
  * {
    box-shadow: none !important;
    text-shadow: none !important;
  }
  
  /* Ensure links are visible */
  a[href]:after {
    content: none; /* Don't show URLs after links */
  }
  
  /* Page margins */
  @page {
    margin: 1cm;
  }
}
```

---

## 8. Real-time Architecture

### 8.1 Realtime Connection Flow

```
1. Dashboard loads → calls /api/dashboard/realtime-token
2. Receives JWT (1 hour expiry)
3. Establishes Realtime channel with JWT auth
4. Subscribes to team_members table changes (filtered by team_id)
5. On postgres_changes event → updates UI
6. 5 minutes before expiry → fetches new JWT → calls setAuth()
7. On disconnect → shows banner "Live updates paused"
```

### 8.2 Realtime Hook Implementation

```typescript
// src/hooks/useRealtime.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

type TeamMember = Database['public']['Tables']['team_members']['Row'];

interface UseRealtimeOptions {
  teamId: string;
  adminToken: string;
  onMemberUpdate: (member: TeamMember) => void;
}

interface RealtimeState {
  isConnected: boolean;
  error: string | null;
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

export function useRealtime({
  teamId,
  adminToken,
  onMemberUpdate,
}: UseRealtimeOptions): RealtimeState {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    error: null,
  });
  const [refreshTimeout, setRefreshTimeout] = useState<NodeJS.Timeout | null>(null);

  const fetchRealtimeToken = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/realtime-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Realtime token');
      }

      const { data } = await response.json();
      return data;
    } catch (error) {
      console.error('Realtime token fetch error:', error);
      setState(prev => ({ ...prev, error: 'Failed to authenticate Realtime connection' }));
      return null;
    }
  }, [adminToken]);

  const scheduleTokenRefresh = useCallback((expiresIn: number) => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }

    const refreshTime = (expiresIn * 1000) - REFRESH_BUFFER_MS;
    
    const timeout = setTimeout(async () => {
      const tokenData = await fetchRealtimeToken();
      if (tokenData) {
        supabase.realtime.setAuth(tokenData.token);
        scheduleTokenRefresh(tokenData.expiresIn);
      }
    }, refreshTime);

    setRefreshTimeout(timeout);
  }, [fetchRealtimeToken, refreshTimeout]);

  useEffect(() => {
    let isMounted = true;
    let currentChannel: RealtimeChannel | null = null;

    const setupRealtime = async () => {
      const tokenData = await fetchRealtimeToken();
      if (!tokenData || !isMounted) return;

      supabase.realtime.setAuth(tokenData.token);
      scheduleTokenRefresh(tokenData.expiresIn);

      currentChannel = supabase
        .channel(`team-${teamId}-updates`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'team_members',
            filter: `team_id=eq.${teamId}`,
          },
          (payload) => {
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              onMemberUpdate(payload.new as TeamMember);
            }
          }
        )
        .subscribe((status) => {
          if (isMounted) {
            setState({
              isConnected: status === 'SUBSCRIBED',
              error: status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'
                ? 'Connection lost'
                : null,
            });
          }
        });
    };

    setupRealtime();

    return () => {
      isMounted = false;
      if (currentChannel) {
        supabase.removeChannel(currentChannel);
      }
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [teamId, adminToken, onMemberUpdate, fetchRealtimeToken, scheduleTokenRefresh]);

  return state;
}
```

---

## 9. Email Architecture

### 9.1 Email Client Wrapper

```typescript
// src/lib/email/client.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@operatingstrengths.com';
```

### 9.2 Email Templates

See PRD Section 6.5 for complete email templates.

### 9.3 Send with Retry Logic

```typescript
// src/lib/email/send.ts
import { resend, EMAIL_FROM } from './client';
import { logEmailEvent } from './logger';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendEmailWithRetry(
  to: string,
  subject: string,
  text: string,
  maxRetries = 2
): Promise<SendEmailResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: EMAIL_FROM,
        to: [to],
        subject,
        text,
      });

      return { success: true, messageId: result.id };
    } catch (error) {
      lastError = error as Error;
      console.error(`Email send attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries) {
        await delay(1000 * (attempt + 1));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
  };
}
```

---

## 10. Scoring Engine

### 10.1 Core Scoring Functions

```typescript
// src/lib/scoring/engine.ts

export type Dimension = 'alignment' | 'execution' | 'accountability';
export type Subscale = 'pd' | 'cs' | 'ob';

export interface QuestionMetadata {
  question_order: number;
  dimension: Dimension;
  subscale: Subscale;
  is_reversed: boolean;
}

export interface DimensionResult {
  pd: number;
  cs: number;
  ob: number;
  composite: number;
  strength: number;
}

export type ScoringResult = Record<Dimension, DimensionResult>;

function scoreResponse(responseValue: number, isReversed: boolean): number {
  if (responseValue < 1 || responseValue > 5) {
    throw new Error(`Invalid response value: ${responseValue}`);
  }
  return isReversed ? (6 - responseValue) : responseValue;
}

function calculateSubscale(scoredValues: number[]): number {
  if (scoredValues.length !== 4) {
    throw new Error(`Subscale must have exactly 4 values, got ${scoredValues.length}`);
  }
  
  const mean = scoredValues.reduce((sum, val) => sum + val, 0) / 4;
  const score0to100 = ((mean - 1) / 4) * 100;
  return Math.round(score0to100);
}

function calculateDimensionComposite(pd: number, cs: number, ob: number): number {
  return (0.55 * ob) + (0.28 * cs) + (0.17 * pd);
}

function calculateStrength(composite: number): number {
  const strength = 1 + (composite / 100) * 9;
  return Math.round(strength * 10) / 10;
}

export function calculateAllScores(
  responses: Record<number, number>,
  questions: QuestionMetadata[]
): ScoringResult {
  if (questions.length !== 36) {
    throw new Error(`Expected 36 questions, got ${questions.length}`);
  }
  
  if (Object.keys(responses).length !== 36) {
    throw new Error(`Expected 36 responses, got ${Object.keys(responses).length}`);
  }
  
  const grouped: Record<Dimension, Record<Subscale, number[]>> = {
    alignment: { pd: [], cs: [], ob: [] },
    execution: { pd: [], cs: [], ob: [] },
    accountability: { pd: [], cs: [], ob: [] },
  };
  
  for (const q of questions) {
    const responseValue = responses[q.question_order];
    
    if (responseValue === undefined) {
      throw new Error(`Missing response for question ${q.question_order}`);
    }
    
    const scored = scoreResponse(responseValue, q.is_reversed);
    grouped[q.dimension][q.subscale].push(scored);
  }
  
  const result: ScoringResult = {} as ScoringResult;
  
  for (const dim of ['alignment', 'execution', 'accountability'] as Dimension[]) {
    const pd = calculateSubscale(grouped[dim].pd);
    const cs = calculateSubscale(grouped[dim].cs);
    const ob = calculateSubscale(grouped[dim].ob);
    const composite = calculateDimensionComposite(pd, cs, ob);
    const strength = calculateStrength(composite);
    
    result[dim] = { pd, cs, ob, composite, strength };
  }
  
  return result;
}
```

### 10.2 Question Randomization

```typescript
// src/lib/randomization/shuffle.ts
import crypto from 'crypto';

interface Question {
  question_order: number;
  question_text: string;
  dimension: string;
  subscale?: string;
  is_reversed?: boolean;
}

/**
 * mulberry32 PRNG - deterministic random number generator
 */
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle with deterministic seed
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate deterministically shuffled questions for a participant
 * Uses SHA-256 hash of memberId + secret to create reproducible order
 */
export function generateShuffledQuestions<T extends Question>(
  memberId: string,
  questions: T[]
): T[] {
  if (!process.env.RANDOMIZATION_SECRET) {
    throw new Error('RANDOMIZATION_SECRET environment variable is not set');
  }
  
  const seedHex = crypto
    .createHash('sha256')
    .update(`${memberId}:${process.env.RANDOMIZATION_SECRET}`)
    .digest('hex');
  
  const seed = parseInt(seedHex.substring(0, 8), 16) >>> 0;
  
  return shuffleWithSeed(questions, seed);
}
```

---

## 11. State Management

### 11.1 Assessment Progress Hook

```typescript
// src/hooks/useAssessmentProgress.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface Question {
  id: number;
  text: string;
  dimension: string;
  position: number;
}

interface AssessmentState {
  responses: Record<number, number>;
  currentIndex: number;
  questions: Question[];
}

const STORAGE_KEY_PREFIX = 'osa_responses:';

export function useAssessmentProgress(memberId: string, questions: Question[]) {
  const storageKey = `${STORAGE_KEY_PREFIX}${memberId}`;
  
  const [state, setState] = useState<AssessmentState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return {
            responses: parsed.responses || {},
            currentIndex: parsed.currentIndex || 0,
            questions,
          };
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
    }
    
    return {
      responses: {},
      currentIndex: 0,
      questions,
    };
  });
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, JSON.stringify({
        responses: state.responses,
        currentIndex: state.currentIndex,
      }));
    }
  }, [state.responses, state.currentIndex, storageKey]);
  
  const setResponse = useCallback((questionId: number, value: number) => {
    setState(prev => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: value,
      },
    }));
  }, []);
  
  const goToNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, prev.questions.length - 1),
    }));
  }, []);
  
  const goToPrevious = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  }, []);
  
  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);
  
  const currentQuestion = state.questions[state.currentIndex];
  const isComplete = Object.keys(state.responses).length === state.questions.length;
  const canGoNext = state.responses[currentQuestion?.id] !== undefined;
  const canGoPrevious = state.currentIndex > 0;
  
  return {
    responses: state.responses,
    currentQuestion,
    currentIndex: state.currentIndex,
    totalQuestions: state.questions.length,
    isComplete,
    canGoNext,
    canGoPrevious,
    setResponse,
    goToNext,
    goToPrevious,
    clearSession,
  };
}
```

---

## 12. Error Handling

### 12.1 Custom Error Classes

```typescript
// src/lib/utils/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 'VALIDATION_ERROR', false, 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Invalid or expired token') {
    super(message, 'AUTHENTICATION_ERROR', false, 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string,
    public retryAfterSeconds: number
  ) {
    super(message, 'RATE_LIMIT_ERROR', false, 429);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: any) {
    super(message, 'DATABASE_ERROR', true, 500);
    this.name = 'DatabaseError';
  }
}
```

---

## 13. Performance Optimization

### 13.1 Database Query Optimization

**Indexes (already defined in schema):**
- `idx_teams_admin_token_hash` - Fast dashboard lookups
- `idx_team_members_token_hash` - Fast assessment access
- `idx_team_members_team_completed` - Efficient member filtering
- `idx_responses_member` - Fast response retrieval
- `idx_email_events_member_type_created` - Rate limit checks

### 13.2 Frontend Performance

**Code splitting:**
```typescript
const ReportChart = dynamic(() => import('@/components/report/ReportChart'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false,
});
```

---

## 14. Testing Strategy

### 14.1 Unit Tests (Vitest)

**Scoring engine tests:**
```typescript
// tests/unit/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { calculateAllScores } from '@/lib/scoring/engine';

describe('Scoring Engine', () => {
  it('should calculate correct scores for all 1s (minimum)', () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i + 1, 1])
    );
    
    const result = calculateAllScores(responses, mockQuestions);
    
    expect(result.alignment.strength).toBe(1.0);
  });
  
  it('should calculate correct scores for all 5s (maximum)', () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i + 1, 5])
    );
    
    const result = calculateAllScores(responses, mockQuestions);
    
    expect(result.alignment.strength).toBe(10.0);
  });
});
```

---

## 15. Deployment Architecture

### 15.1 Environment Variables

```bash
# .env.production
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret

# Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@operatingstrengths.com

# Application
NEXT_PUBLIC_APP_URL=https://operatingstrengths.com

# Security
RANDOMIZATION_SECRET=your-random-secret-32-chars
```

---

## 16. Monitoring & Observability

### 16.1 Structured Logging

```typescript
// src/lib/utils/logger.ts
type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  teamId?: string;
  memberId?: string;
  [key: string]: any;
}

export function log(
  level: LogLevel,
  message: string,
  context?: LogContext
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  
  console[level](JSON.stringify(logEntry));
}
```

---

## 17. Security Checklist

- [ ] All tokens stored as SHA-256 hashes
- [ ] Token lookup via database hash comparison
- [ ] RLS enabled on all tables
- [ ] Service role key not exposed to client
- [ ] JWT secret rotation plan documented
- [ ] Rate limiting active on team creation
- [ ] IP addresses logged for audit (null-safe)
- [ ] Email resend throttling enforced
- [ ] HTTPS enforced (Vercel default)
- [ ] Security headers configured
- [ ] No sensitive data in client-side storage
- [ ] Realtime JWT expiry and refresh working

---

## 18. Launch Checklist

**Pre-Launch:**
- [ ] All database migrations applied
- [ ] Question seed data loaded
- [ ] Environment variables set in Vercel
- [ ] DNS configured and verified
- [ ] Email domain verified in Resend
- [ ] DKIM/SPF/DMARC records added
- [ ] Test emails sent successfully
- [ ] All unit tests passing
- [ ] Critical E2E tests passing
- [ ] Performance targets met
- [ ] Accessibility audit passed
- [ ] Mobile testing completed
- [ ] Print-to-PDF tested

**Post-Launch:**
- [ ] Monitor error rates first 24h
- [ ] Verify email delivery rates
- [ ] Check database performance
- [ ] Confirm Realtime stability
- [ ] Review first user completions

---

## Changelog

| Version | Date         | Changes |
| ------- | ------------ | ------- |
| 1.0     | Dec 21, 2025 | Initial architecture document |
| 1.1     | Dec 21, 2025 | Production review fixes: (1) Updated getClientIp to return null instead of 'unknown', (2) Added missing imports to API routes, (3) Added /api/assessment/[token]/name route implementation, (4) Added generateShuffledQuestions implementation, (5) Added print CSS section, (6) Clarified token verification approach, (7) Aligned with PRD v2.4 |

---

**END OF ARCHITECTURE DOCUMENT**