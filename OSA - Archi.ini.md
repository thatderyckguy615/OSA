# Operating Strengths Assessment - Architecture Document

**Version:** 1.0  
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
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Static   │  │   Next.js    │  │   API Routes     │   │
│  │   Assets   │  │  App Router  │  │  (Node Runtime)  │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
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
    "@supabase/supabase-js": "^2.43.0",
    
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
│   │   │   │   ├── [token]/
│   │   │   │   │   ├── questions/
│   │   │   │   │   │   └── route.ts # GET /api/assessment/[token]/questions
│   │   │   │   │   ├── name/
│   │   │   │   │   │   └── route.ts # POST /api/assessment/[token]/name
│   │   │   │   │   └── submit/
│   │   │   │   │       └── route.ts # POST /api/assessment/[token]/submit
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
│   │   │   ├── middleware.ts        # Middleware for token validation
│   │   │   └── types.ts             # Generated types (via CLI)
│   │   │
│   │   ├── scoring/
│   │   │   ├── engine.ts            # Core scoring algorithms
│   │   │   ├── aggregation.ts       # Team aggregate calculations
│   │   │   └── validation.ts        # Score validation utilities
│   │   │
│   │   ├── tokens/
│   │   │   ├── generate.ts          # Token generation utilities
│   │   │   ├── hash.ts              # Token hashing with crypto
│   │   │   └── verify.ts            # Timing-safe verification
│   │   │
│   │   ├── randomization/
│   │   │   ├── shuffle.ts           # Deterministic shuffle (mulberry32)
│   │   │   └── seed.ts              # Seed generation from member_id
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

**Rate limit check (separate function):**

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
import { createServerClient } from '@/lib/supabase/server';
import { CreateTeamSchema } from '@/lib/validation/schemas';
import { generateToken, hashToken } from '@/lib/tokens';
import { sendLeaderWelcomeEmail, sendParticipantInviteEmail } from '@/lib/email/send';
import { getClientIp } from '@/lib/utils/request';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validated = CreateTeamSchema.parse(body);
    
    // Get client IP
    const clientIp = getClientIp(request);
    
    // Create Supabase client (service role)
    const supabase = createServerClient();
    
    // Check rate limit
    const { data: rateLimitResult, error: rateLimitError } = await supabase
      .rpc('check_team_creation_rate_limit', { p_creator_ip: clientIp });
    
    if (rateLimitError?.message.includes('lock timeout')) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Service is busy. Please try again in a moment.',
          code: 'SERVICE_BUSY',
          retryable: true,
        },
      }, { status: 503 });
    }
    
    if (!rateLimitResult[0]?.allowed) {
      return NextResponse.json<ApiResponse>({
        success: false,
        error: {
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT',
          retryable: false,
          retryAfterSeconds: rateLimitResult[0]?.retry_after_seconds,
        },
      }, { status: 429 });
    }
    
    // Generate tokens
    const adminToken = generateToken();
    const adminTokenHash = hashToken(adminToken);
    
    // Get current active question version
    const { data: activeVersion } = await supabase
      .from('question_versions')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!activeVersion) {
      throw new Error('No active question version found');
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
        memberId: null, // Will be looked up in send function
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
          details: error.errors,
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
import { verifyTokenHash } from '@/lib/tokens/verify';
import { generateShuffledQuestions } from '@/lib/randomization/shuffle';

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

### 5.4 POST /api/assessment/[token]/submit

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

import { calculateAllScores } from '@/lib/scoring/engine';
import { SubmitAssessmentSchema } from '@/lib/validation/schemas';
import { sendPersonalResultsEmail } from '@/lib/email/send';

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

### 5.5 POST /api/dashboard/realtime-token

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

import { SignJWT } from 'jose';
import { verifyTokenHash } from '@/lib/tokens/verify';

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

### 5.6 Additional API Routes

**POST /api/assessment/[token]/name** - Save display name
**GET /api/dashboard/[token]/members** - Get member list (initial load)
**POST /api/dashboard/[token]/members/[memberId]/resend** - Resend invite
**POST /api/dashboard/[token]/add-member** - Add new member
**POST /api/dashboard/[token]/report** - Generate report
**GET /api/report/[token]** - Fetch report data

See detailed implementations in Section 5.7-5.12 (abbreviated for length).

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

**Token Generation:**
```typescript
// src/lib/tokens/generate.ts
import crypto from 'crypto';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 characters
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Timing-Safe Verification:**
```typescript
// src/lib/tokens/verify.ts
import crypto from 'crypto';
import { hashToken } from './generate';

export function verifyTokenHash(providedToken: string, storedHash: string): boolean {
  const providedHash = hashToken(providedToken);
  
  // Timing-safe comparison prevents timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}

// Usage in API routes:
export async function validateAssessmentToken(token: string) {
  const tokenHash = hashToken(token);
  
  const { data: member } = await supabase
    .from('team_members')
    .select('*')
    .eq('assessment_token_hash', tokenHash)
    .single();
  
  // Note: We still use direct hash comparison in SQL query for performance
  // The timing-safe comparison would be used if comparing tokens in memory
  return member;
}
```

### 6.2 Request IP Extraction

```typescript
// src/lib/utils/request.ts
import { NextRequest } from 'next/server';

export function getClientIp(request: NextRequest): string {
  // Priority order for Vercel deployment
  const forwardedFor = request.headers.get('x-vercel-forwarded-for') ||
                       request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip');
  
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated, take first IP
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback (may not be available in all environments)
  return request.ip || 'unknown';
}
```

### 6.3 Rate Limiting Strategy

**Implementation:**
- Database-enforced using advisory locks
- Rolling window (60 minutes)
- Per IP address
- Lock timeout prevents indefinite waits

**Error Handling:**
```typescript
// In API route
try {
  const { data: rateLimitResult } = await supabase.rpc('check_team_creation_rate_limit', {
    p_creator_ip: clientIp
  });
  
  if (!rateLimitResult[0]?.allowed) {
    return NextResponse.json({
      success: false,
      error: {
        message: `Rate limit exceeded. Please try again in ${Math.ceil(rateLimitResult[0].retry_after_seconds / 60)} minutes.`,
        code: 'RATE_LIMIT',
        retryAfterSeconds: rateLimitResult[0].retry_after_seconds,
      },
    }, { status: 429 });
  }
} catch (error) {
  if (error.message?.includes('lock timeout')) {
    return NextResponse.json({
      success: false,
      error: {
        message: 'Service is temporarily busy. Please try again.',
        code: 'SERVICE_BUSY',
        retryable: true,
      },
    }, { status: 503 });
  }
  throw error;
}
```

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

### 7.2 Key Component Implementations

**QuestionCard.tsx (Mobile-First):**
```typescript
// src/components/assessment/QuestionCard.tsx
'use client';

import { useState } from 'react';

interface QuestionCardProps {
  question: {
    id: number;
    text: string;
    position: number;
  };
  totalQuestions: number;
  initialValue?: number;
  onAnswer: (questionId: number, value: number) => void;
}

const SCALE_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

export function QuestionCard({
  question,
  totalQuestions,
  initialValue,
  onAnswer,
}: QuestionCardProps) {
  const [selectedValue, setSelectedValue] = useState<number | undefined>(initialValue);

  const handleSelect = (value: number) => {
    setSelectedValue(value);
    onAnswer(question.id, value);
  };

  return (
    <div className="flex flex-col h-full min-h-screen px-4 py-6 md:px-8 md:py-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="text-sm text-gray-600 mb-2">
          Question {question.position} of {totalQuestions}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(question.position / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Text */}
      <div className="flex-1 flex items-start md:items-center">
        <h2 className="text-xl md:text-2xl font-medium leading-relaxed">
          {question.text}
        </h2>
      </div>

      {/* Scale Options */}
      <div className="space-y-3 mb-6" role="radiogroup" aria-label="Response scale">
        {SCALE_OPTIONS.map((option) => {
          const isSelected = selectedValue === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(option.value)}
              className={`
                w-full min-h-[44px] px-4 py-3 rounded-lg border-2 
                text-left transition-all duration-200
                ${isSelected 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 bg-white hover:border-gray-400'
                }
              `}
            >
              <div className="flex items-center">
                <div className={`
                  w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                  ${isSelected ? 'border-green-500' : 'border-gray-400'}
                `}>
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  )}
                </div>
                <span className={`text-base ${isSelected ? 'font-medium' : ''}`}>
                  {option.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**CopyButton.tsx (with Clipboard Fallback):**
```typescript
// src/components/shared/CopyButton.tsx
'use client';

import { useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

interface CopyButtonProps {
  text: string;
  label: string;
}

export function CopyButton({ text, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const handleCopy = async () => {
    // Try modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (error) {
        console.error('Clipboard API failed:', error);
      }
    }
    
    // Fallback: show modal with pre-selected text
    setShowFallback(true);
  };

  return (
    <>
      <Button onClick={handleCopy} variant="outline">
        {copied ? (
          <>
            <Check className="mr-2" weight="bold" size={16} />
            Copied!
          </>
        ) : (
          <>
            <Copy className="mr-2" size={16} />
            {label}
          </>
        )}
      </Button>

      {/* Fallback Modal */}
      {showFallback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Copy Link</h3>
            <p className="text-sm text-gray-600 mb-4">
              Press Ctrl+C (Cmd+C on Mac) to copy:
            </p>
            <input
              type="text"
              value={text}
              readOnly
              className="w-full p-2 border rounded mb-4"
              onClick={(e) => e.currentTarget.select()}
              autoFocus
            />
            <Button onClick={() => setShowFallback(false)} className="w-full">
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
```

### 7.3 Form Validation & Parsing

**Email List Parser:**
```typescript
// src/components/shared/EmailListParser.tsx
'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';

const emailSchema = z.string().email();

interface ParsedEmail {
  email: string;
  isValid: boolean;
  error?: string;
}

interface EmailListParserProps {
  value: string;
  onChange: (emails: string[]) => void;
  onValidationChange: (isValid: boolean) => void;
}

function parseEmailList(input: string): ParsedEmail[] {
  // Split by common delimiters
  const rawEmails = input
    .split(/[\n,;\t\s]+/)
    .map(e => e.trim())
    .filter(e => e.length > 0);
  
  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  const deduped = rawEmails.filter(email => {
    const normalized = email.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  
  // Validate each
  return deduped.map(email => {
    const result = emailSchema.safeParse(email);
    return {
      email,
      isValid: result.success,
      error: result.success ? undefined : 'Invalid email format',
    };
  });
}

export function EmailListParser({
  value,
  onChange,
  onValidationChange,
}: EmailListParserProps) {
  const [parsed, setParsed] = useState<ParsedEmail[]>([]);

  useEffect(() => {
    if (!value.trim()) {
      setParsed([]);
      onChange([]);
      onValidationChange(false);
      return;
    }

    const parsedEmails = parseEmailList(value);
    setParsed(parsedEmails);
    
    const validEmails = parsedEmails.filter(e => e.isValid).map(e => e.email);
    const allValid = parsedEmails.every(e => e.isValid);
    
    onChange(validEmails);
    onValidationChange(allValid && validEmails.length > 0);
  }, [value]);

  if (parsed.length === 0) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <h4 className="text-sm font-medium mb-3">
        Parsed {parsed.length} email{parsed.length !== 1 ? 's' : ''}:
      </h4>
      <div className="space-y-2">
        {parsed.map((item, index) => (
          <div
            key={index}
            className={`flex items-center text-sm ${
              item.isValid ? 'text-green-700' : 'text-red-700'
            }`}
          >
            <span className="mr-2">{item.isValid ? '✓' : '✗'}</span>
            <span>{item.email}</span>
            {item.error && (
              <span className="ml-2 text-xs text-red-600">({item.error})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
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
    // Clear existing timeout
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
      // Fetch JWT token
      const tokenData = await fetchRealtimeToken();
      if (!tokenData || !isMounted) return;

      // Set auth on Realtime client
      supabase.realtime.setAuth(tokenData.token);

      // Schedule token refresh
      scheduleTokenRefresh(tokenData.expiresIn);

      // Create channel
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
            console.log('Realtime update:', payload);
            
            if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
              onMemberUpdate(payload.new as TeamMember);
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime status:', status);
          
          if (isMounted) {
            setState({
              isConnected: status === 'SUBSCRIBED',
              error: status === 'CHANNEL_ERROR' || status === 'TIMED_OUT'
                ? 'Connection lost'
                : null,
            });
          }
        });

      setChannel(currentChannel);
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

### 8.3 Dashboard Integration

```typescript
// src/app/d/[token]/page.tsx (simplified)
'use client';

import { useState, useCallback } from 'react';
import { useRealtime } from '@/hooks/useRealtime';

export default function DashboardPage({ params }: { params: { token: string } }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  
  const handleMemberUpdate = useCallback((updatedMember: TeamMember) => {
    setMembers(prev => {
      const index = prev.findIndex(m => m.id === updatedMember.id);
      if (index >= 0) {
        // Update existing
        const next = [...prev];
        next[index] = updatedMember;
        return next;
      } else {
        // Add new
        return [...prev, updatedMember];
      }
    });
  }, []);
  
  const { isConnected, error } = useRealtime({
    teamId: team.id,
    adminToken: params.token,
    onMemberUpdate: handleMemberUpdate,
  });
  
  return (
    <div>
      {/* Live indicator */}
      <div className="flex items-center gap-2">
        {isConnected && (
          <>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-700">Live</span>
          </>
        )}
      </div>
      
      {/* Connection error banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
          <p className="text-sm text-yellow-800">
            ⚠️ Live updates paused. Refresh your browser.
          </p>
        </div>
      )}
      
      {/* Member lists */}
      <MemberLists members={members} />
    </div>
  );
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

```typescript
// src/lib/email/templates.ts

interface LeaderWelcomeEmailData {
  leaderName: string;
  firmName: string;
  dashboardUrl: string;
  assessmentUrl: string;
  participantCount: number;
}

export function buildLeaderWelcomeEmail(data: LeaderWelcomeEmailData): string {
  return `Subject: Your Operating Strengths Assessment is Ready

Hi ${data.leaderName},

Your Operating Strengths Assessment for ${data.firmName} has been created.
${data.participantCount} team members have been invited.

YOUR DASHBOARD (track progress, generate report):
${data.dashboardUrl}

YOUR PERSONAL ASSESSMENT (complete this too):
${data.assessmentUrl}

Visibility: You'll see team averages and each participant's overall dimension scores by name (Alignment/Execution/Accountability), but not anyone's answers to individual questions.

— The Operating Strengths Assessment`;
}

interface ParticipantInviteEmailData {
  leaderName: string;
  firmName: string;
  assessmentUrl: string;
}

export function buildParticipantInviteEmail(data: ParticipantInviteEmailData): string {
  return `Subject: ${data.leaderName} invited you to the Operating Strengths Assessment

Hi,

${data.leaderName} has invited you to complete the Operating Strengths Assessment for ${data.firmName}.

This will measure your team's strengths across several dimensions.
⏱️ Answer 36 questions/prompts.

TAKE THE ASSESSMENT:
${data.assessmentUrl}

Privacy: Your leader will see your overall dimension scores (Alignment/Execution/Accountability) and team averages, but will NOT see your answers to individual questions.

— The Operating Strengths Assessment`;
}

interface PersonalResultsEmailData {
  displayName: string;
  scores: {
    alignment: number;
    execution: number;
    accountability: number;
  };
}

export function buildPersonalResultsEmail(data: PersonalResultsEmailData): string {
  return `Subject: Your Operating Strengths Results

Hi ${data.displayName},

Thank you for completing the Operating Strengths Assessment.

YOUR SCORES (1.0 - 10.0 scale):

Alignment:      ${data.scores.alignment.toFixed(1)}
Execution:      ${data.scores.execution.toFixed(1)}
Accountability: ${data.scores.accountability.toFixed(1)}

Higher scores reflect strength.

— The Operating Strengths Assessment`;
}

interface ReportReadyEmailData {
  leaderName: string;
  firmName: string;
  reportUrl: string;
  completionCount: number;
  totalCount: number;
}

export function buildReportReadyEmail(data: ReportReadyEmailData): string {
  return `Subject: Operating Strengths Report Ready for ${data.firmName}

Hi ${data.leaderName},

Your Operating Strengths Report is ready.

Based on ${data.completionCount} of ${data.totalCount} responses.

VIEW REPORT:
${data.reportUrl}

You can share this link—it's view-only and doesn't expose dashboard controls or individual question answers.

— The Operating Strengths Assessment`;
}
```

### 9.3 Send with Retry Logic

```typescript
// src/lib/email/send.ts
import { resend, EMAIL_FROM } from './client';
import { logEmailEvent } from './logger';
import {
  buildLeaderWelcomeEmail,
  buildParticipantInviteEmail,
  buildPersonalResultsEmail,
  buildReportReadyEmail,
} from './templates';

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
  text: string,
  maxRetries = 2
): Promise<SendEmailResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send({
        from: EMAIL_FROM,
        to: [to],
        subject: text.split('\n')[0].replace('Subject: ', ''),
        text: text.split('\n').slice(2).join('\n'), // Remove subject line
      });

      return { success: true, messageId: result.id };
    } catch (error) {
      lastError = error as Error;
      console.error(`Email send attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries) {
        await delay(1000 * (attempt + 1)); // Exponential backoff
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
  };
}

// Public send functions

interface LeaderWelcomeEmailParams {
  to: string;
  leaderName: string;
  firmName: string;
  dashboardUrl: string;
  assessmentUrl: string;
  participantCount: number;
  teamId: string;
  memberId: string;
}

export async function sendLeaderWelcomeEmail(params: LeaderWelcomeEmailParams): Promise<SendEmailResult> {
  const emailText = buildLeaderWelcomeEmail({
    leaderName: params.leaderName,
    firmName: params.firmName,
    dashboardUrl: params.dashboardUrl,
    assessmentUrl: params.assessmentUrl,
    participantCount: params.participantCount,
  });

  const result = await sendEmailWithRetry(params.to, emailText);

  // Log email event
  await logEmailEvent({
    teamId: params.teamId,
    teamMemberId: params.memberId,
    emailType: 'leader_welcome',
    recipientEmail: params.to,
    providerMessageId: result.messageId,
    success: result.success,
    error: result.error,
  });

  return result;
}

interface ParticipantInviteEmailParams {
  to: string;
  leaderName: string;
  firmName: string;
  assessmentUrl: string;
  teamId: string;
  memberId: string | null;
}

export async function sendParticipantInviteEmail(params: ParticipantInviteEmailParams): Promise<SendEmailResult> {
  const emailText = buildParticipantInviteEmail({
    leaderName: params.leaderName,
    firmName: params.firmName,
    assessmentUrl: params.assessmentUrl,
  });

  const result = await sendEmailWithRetry(params.to, emailText);

  // Log email event
  await logEmailEvent({
    teamId: params.teamId,
    teamMemberId: params.memberId,
    emailType: 'participant_invite',
    recipientEmail: params.to,
    providerMessageId: result.messageId,
    success: result.success,
    error: result.error,
  });

  return result;
}

// Similar implementations for:
// - sendPersonalResultsEmail
// - sendReportReadyEmail
// - sendParticipantResendEmail
```

### 9.4 Email Event Logger

```typescript
// src/lib/email/logger.ts
import { createServerClient } from '@/lib/supabase/server';

interface EmailEventData {
  teamId: string;
  teamMemberId: string | null;
  emailType: 'leader_welcome' | 'participant_invite' | 'participant_resend' | 'personal_results' | 'report_ready';
  recipientEmail: string;
  providerMessageId?: string;
  success: boolean;
  error?: string;
}

export async function logEmailEvent(data: EmailEventData): Promise<void> {
  try {
    const supabase = createServerClient();
    
    await supabase.from('email_events').insert({
      team_id: data.teamId,
      team_member_id: data.teamMemberId,
      email_type: data.emailType,
      recipient_email: data.recipientEmail,
      provider_message_id: data.providerMessageId,
      success: data.success,
      error: data.error,
    });
  } catch (error) {
    // Don't throw - logging should never break the main flow
    console.error('Failed to log email event:', error);
  }
}

// Resend rate limit check
export async function canResendToMember(memberId: string): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
}> {
  const supabase = createServerClient();
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from('email_events')
    .select('*', { count: 'exact', head: true })
    .eq('team_member_id', memberId)
    .in('email_type', ['participant_invite', 'participant_resend'])
    .eq('success', true)
    .gte('created_at', fiveMinutesAgo);
  
  if (count && count >= 1) {
    // Find most recent send
    const { data } = await supabase
      .from('email_events')
      .select('created_at')
      .eq('team_member_id', memberId)
      .in('email_type', ['participant_invite', 'participant_resend'])
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      const sentAt = new Date(data.created_at).getTime();
      const retryAfterSeconds = Math.ceil((sentAt + 5 * 60 * 1000 - Date.now()) / 1000);
      return { allowed: false, retryAfterSeconds };
    }
  }
  
  return { allowed: true };
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
  question_order: number; // question_id (1-36)
  dimension: Dimension;
  subscale: Subscale;
  is_reversed: boolean;
}

export interface DimensionResult {
  pd: number;       // 0-100, integer
  cs: number;       // 0-100, integer
  ob: number;       // 0-100, integer
  composite: number; // 0-100, float
  strength: number;  // 1.0-10.0, 1 decimal
}

export type ScoringResult = Record<Dimension, DimensionResult>;

/**
 * Score a single response, accounting for reverse coding
 */
function scoreResponse(responseValue: number, isReversed: boolean): number {
  if (responseValue < 1 || responseValue > 5) {
    throw new Error(`Invalid response value: ${responseValue}`);
  }
  return isReversed ? (6 - responseValue) : responseValue;
}

/**
 * Calculate subscale score (0-100, integer)
 * Each subscale has exactly 4 questions
 */
function calculateSubscale(scoredValues: number[]): number {
  if (scoredValues.length !== 4) {
    throw new Error(`Subscale must have exactly 4 values, got ${scoredValues.length}`);
  }
  
  const mean = scoredValues.reduce((sum, val) => sum + val, 0) / 4;
  const score0to100 = ((mean - 1) / 4) * 100;
  return Math.round(score0to100);
}

/**
 * Calculate dimension composite (0-100)
 * Weights: OB 55%, CS 28%, PD 17%
 */
function calculateDimensionComposite(pd: number, cs: number, ob: number): number {
  return (0.55 * ob) + (0.28 * cs) + (0.17 * pd);
}

/**
 * Calculate dimension strength (1.0-10.0, 1 decimal)
 */
function calculateStrength(composite: number): number {
  const strength = 1 + (composite / 100) * 9;
  return Math.round(strength * 10) / 10;
}

/**
 * Calculate all scores from responses
 */
export function calculateAllScores(
  responses: Record<number, number>, // question_id -> response value (1-5)
  questions: QuestionMetadata[]
): ScoringResult {
  // Validate we have 36 questions
  if (questions.length !== 36) {
    throw new Error(`Expected 36 questions, got ${questions.length}`);
  }
  
  // Validate we have 36 responses
  if (Object.keys(responses).length !== 36) {
    throw new Error(`Expected 36 responses, got ${Object.keys(responses).length}`);
  }
  
  // Group scored values by dimension and subscale
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
  
  // Calculate dimension results
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

### 10.2 Team Aggregation Functions

```typescript
// src/lib/scoring/aggregation.ts

import type { Dimension, Subscale, DimensionResult } from './engine';

export interface MemberScores {
  member_computed_subscales: {
    alignment: { pd: number; cs: number; ob: number };
    execution: { pd: number; cs: number; ob: number };
    accountability: { pd: number; cs: number; ob: number };
  };
  alignment_score: number;
  execution_score: number;
  accountability_score: number;
}

export interface TeamAggregates {
  averages: {
    alignment: number;
    execution: number;
    accountability: number;
  };
  subscales: {
    alignment: { pd: number; cs: number; ob: number };
    execution: { pd: number; cs: number; ob: number };
    accountability: { pd: number; cs: number; ob: number };
  };
}

/**
 * Calculate team average strengths (1.0-10.0, 1 decimal)
 */
export function calculateTeamAverages(
  members: MemberScores[]
): TeamAggregates['averages'] {
  if (members.length === 0) {
    throw new Error('Cannot calculate averages with no members');
  }
  
  const sums = {
    alignment: 0,
    execution: 0,
    accountability: 0,
  };
  
  for (const member of members) {
    sums.alignment += member.alignment_score;
    sums.execution += member.execution_score;
    sums.accountability += member.accountability_score;
  }
  
  return {
    alignment: Math.round((sums.alignment / members.length) * 10) / 10,
    execution: Math.round((sums.execution / members.length) * 10) / 10,
    accountability: Math.round((sums.accountability / members.length) * 10) / 10,
  };
}

/**
 * Calculate team subscale averages (0-100, integer)
 */
export function calculateTeamSubscales(
  members: MemberScores[]
): TeamAggregates['subscales'] {
  if (members.length === 0) {
    throw new Error('Cannot calculate subscales with no members');
  }
  
  const dimensions: Dimension[] = ['alignment', 'execution', 'accountability'];
  const subscales: Subscale[] = ['pd', 'cs', 'ob'];
  
  const result: any = {};
  
  for (const dim of dimensions) {
    result[dim] = {};
    
    for (const sub of subscales) {
      const values = members.map(m => m.member_computed_subscales[dim][sub]);
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      result[dim][sub] = Math.round(avg);
    }
  }
  
  return result as TeamAggregates['subscales'];
}

/**
 * Find lowest dimension value(s) for emphasis
 */
export function findLowestDimensions(
  averages: TeamAggregates['averages']
): Dimension[] {
  const dims: Array<{ dim: Dimension; value: number }> = [
    { dim: 'alignment', value: averages.alignment },
    { dim: 'execution', value: averages.execution },
    { dim: 'accountability', value: averages.accountability },
  ];
  
  const minValue = Math.min(...dims.map(d => d.value));
  return dims.filter(d => d.value === minValue).map(d => d.dim);
}

/**
 * Find lowest subscale value(s) within each dimension
 */
export function findLowestSubscales(
  subscales: TeamAggregates['subscales']
): Record<Dimension, Subscale[]> {
  const result: Record<Dimension, Subscale[]> = {} as any;
  const dimensions: Dimension[] = ['alignment', 'execution', 'accountability'];
  
  for (const dim of dimensions) {
    const subs: Array<{ sub: Subscale; value: number }> = [
      { sub: 'pd', value: subscales[dim].pd },
      { sub: 'cs', value: subscales[dim].cs },
      { sub: 'ob', value: subscales[dim].ob },
    ];
    
    const minValue = Math.min(...subs.map(s => s.value));
    result[dim] = subs.filter(s => s.value === minValue).map(s => s.sub);
  }
  
  return result;
}
```

### 10.3 Score Validation

```typescript
// src/lib/scoring/validation.ts

/**
 * Validate dimension strength (1.0-10.0)
 */
export function isValidStrength(value: number): boolean {
  return value >= 1.0 && value <= 10.0;
}

/**
 * Validate subscale score (0-100)
 */
export function isValidSubscale(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

/**
 * Validate response value (1-5)
 */
export function isValidResponse(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Validate complete responses object
 */
export function validateResponses(
  responses: Record<number, number>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const keys = Object.keys(responses).map(Number);
  
  // Check count
  if (keys.length !== 36) {
    errors.push(`Expected 36 responses, got ${keys.length}`);
  }
  
  // Check question IDs are 1-36
  for (const key of keys) {
    if (key < 1 || key > 36) {
      errors.push(`Invalid question ID: ${key}`);
    }
  }
  
  // Check values are 1-5
  for (const [key, value] of Object.entries(responses)) {
    if (!isValidResponse(value)) {
      errors.push(`Invalid response value for question ${key}: ${value}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
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
    // Initialize from sessionStorage if available
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
  
  // Save to sessionStorage on changes
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

### 11.2 Dashboard Member State

```typescript
// src/app/d/[token]/page.tsx (state management excerpt)
'use client';

import { useState, useCallback, useMemo } from 'react';

interface TeamMember {
  id: string;
  email: string;
  display_name: string | null;
  is_leader: boolean;
  completed: boolean;
  alignment_score: number | null;
  execution_score: number | null;
  accountability_score: number | null;
}

export default function DashboardPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  
  // Update member from Realtime event
  const handleMemberUpdate = useCallback((updatedMember: TeamMember) => {
    setMembers(prev => {
      const index = prev.findIndex(m => m.id === updatedMember.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updatedMember;
        return next;
      } else {
        return [...prev, updatedMember];
      }
    });
  }, []);
  
  // Computed lists
  const { completed, notCompleted } = useMemo(() => {
    const completed = members.filter(m => m.completed);
    const notCompleted = members.filter(m => !m.completed);
    
    // Sort by name, with leader first in completed list
    completed.sort((a, b) => {
      if (a.is_leader && !b.is_leader) return -1;
      if (!a.is_leader && b.is_leader) return 1;
      return (a.display_name || a.email).localeCompare(b.display_name || b.email);
    });
    
    notCompleted.sort((a, b) => 
      (a.display_name || a.email).localeCompare(b.display_name || b.email)
    );
    
    return { completed, notCompleted };
  }, [members]);
  
  const completionPercentage = members.length > 0
    ? Math.round((completed.length / members.length) * 100)
    : 0;
  
  return (
    // ... component JSX
  );
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

### 12.2 API Error Handler

```typescript
// src/lib/utils/api-error-handler.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ApiResponse } from '@/types/api';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  DatabaseError,
} from './errors';

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);
  
  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: 'Invalid request data',
        code: 'VALIDATION_ERROR',
        retryable: false,
        details: error.errors,
      },
    }, { status: 400 });
  }
  
  // Custom app errors
  if (error instanceof AppError) {
    return NextResponse.json<ApiResponse>({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        retryable: error.retryable,
        retryAfterSeconds: error instanceof RateLimitError ? error.retryAfterSeconds : undefined,
      },
    }, { status: error.statusCode });
  }
  
  // Unknown errors
  return NextResponse.json<ApiResponse>({
    success: false,
    error: {
      message: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL_ERROR',
      retryable: true,
    },
  }, { status: 500 });
}

// Usage in API routes:
export async function POST(request: NextRequest) {
  try {
    // ... route logic
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 12.3 Client-Side Error Handling

```typescript
// src/lib/utils/api-client.ts
interface FetchOptions extends RequestInit {
  retries?: number;
}

export async function apiRequest<T = any>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data?: T; error?: string; retryable?: boolean }> {
  const { retries = 2, ...fetchOptions } = options;
  let lastError: string | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);
      const json = await response.json();
      
      if (!response.ok) {
        // Check if retryable
        if (json.error?.retryable && attempt < retries) {
          await delay(1000 * (attempt + 1));
          continue;
        }
        
        return {
          error: json.error?.message || 'Request failed',
          retryable: json.error?.retryable,
        };
      }
      
      return { data: json.data };
      
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Network error';
      
      if (attempt < retries) {
        await delay(1000 * (attempt + 1));
      }
    }
  }
  
  return { error: lastError || 'Request failed', retryable: true };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

**Query patterns:**
```typescript
// Dashboard member list - efficient
const { data: members } = await supabase
  .from('team_members')
  .select('id, email, display_name, is_leader, completed, alignment_score, execution_score, accountability_score')
  .eq('team_id', teamId)
  .order('completed', { ascending: false })
  .order('display_name', { ascending: true });

// Report data - single query with join
const { data: members } = await supabase
  .from('team_members')
  .select('display_name, email, alignment_score, execution_score, accountability_score, member_computed_subscales')
  .eq('team_id', teamId)
  .eq('completed', true);
```

### 13.2 Frontend Performance

**Code splitting:**
```typescript
// Dynamic imports for heavy components
const ReportChart = dynamic(() => import('@/components/report/ReportChart'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false, // Chart.js should only render client-side
});
```

**Memoization:**
```typescript
// In dashboard
const completionStats = useMemo(() => ({
  completed: members.filter(m => m.completed).length,
  total: members.length,
  percentage: Math.round((members.filter(m => m.completed).length / members.length) * 100),
}), [members]);
```

**Debouncing:**
```typescript
// Email list parsing
const debouncedParse = useMemo(
  () => debounce((value: string) => parseEmails(value), 300),
  []
);
```

### 13.3 Caching Strategy

**Static pages (ISR):**
- Homepage: Static
- Report pages: Dynamic (never cached - must reflect latest data)

**API routes:**
- No HTTP caching (all dynamic data)
- Database connection pooling via Supabase

**Browser caching:**
```typescript
// next.config.js
{
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
}
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
  const mockQuestions = [
    { question_order: 1, dimension: 'alignment', subscale: 'pd', is_reversed: false },
    // ... all 36 questions
  ];
  
  it('should calculate correct scores for all 1s (minimum)', () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i + 1, 1])
    );
    
    const result = calculateAllScores(responses, mockQuestions);
    
    expect(result.alignment.strength).toBe(1.0);
    expect(result.execution.strength).toBe(1.0);
    expect(result.accountability.strength).toBe(1.0);
  });
  
  it('should calculate correct scores for all 5s (maximum)', () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i + 1, 5])
    );
    
    const result = calculateAllScores(responses, mockQuestions);
    
    expect(result.alignment.strength).toBe(10.0);
    expect(result.execution.strength).toBe(10.0);
    expect(result.accountability.strength).toBe(10.0);
  });
  
  it('should calculate correct scores for all 3s (neutral)', () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i + 1, 3])
    );
    
    const result = calculateAllScores(responses, mockQuestions);
    
    expect(result.alignment.strength).toBe(5.5);
    expect(result.execution.strength).toBe(5.5);
    expect(result.accountability.strength).toBe(5.5);
  });
  
  it('should correctly reverse-code items', () => {
    const responses = { 1: 5, 2: 5, 3: 5, 4: 5 }; // All 5s for first subscale
    const questions = [
      { question_order: 1, dimension: 'alignment', subscale: 'pd', is_reversed: false },
      { question_order: 2, dimension: 'alignment', subscale: 'pd', is_reversed: false },
      { question_order: 3, dimension: 'alignment', subscale: 'pd', is_reversed: true }, // Reversed
      { question_order: 4, dimension: 'alignment', subscale: 'pd', is_reversed: false },
    ];
    
    // This would score as: 5 + 5 + (6-5) + 5 = 5 + 5 + 1 + 5 = 16 / 4 = 4.0 mean
    // Subscale: ((4.0 - 1) / 4) * 100 = 75
  });
  
  it('should reject responses with missing questions', () => {
    const responses = Object.fromEntries(
      Array.from({ length: 35 }, (_, i) => [i + 1, 3]) // Only 35
    );
    
    expect(() => calculateAllScores(responses, mockQuestions)).toThrow();
  });
  
  it('should reject responses with invalid values', () => {
    const responses = Object.fromEntries(
      Array.from({ length: 36 }, (_, i) => [i + 1, i === 0 ? 0 : 3])
    );
    
    expect(() => calculateAllScores(responses, mockQuestions)).toThrow();
  });
});
```

**Token tests:**
```typescript
// tests/unit/tokens.test.ts
import { describe, it, expect } from 'vitest';
import { generateToken, hashToken, verifyTokenHash } from '@/lib/tokens';

describe('Token System', () => {
  it('should generate 64-character hex tokens', () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
  
  it('should hash tokens consistently', () => {
    const token = 'test-token';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });
  
  it('should verify matching token hashes', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(verifyTokenHash(token, hash)).toBe(true);
  });
  
  it('should reject non-matching token hashes', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    const hash1 = hashToken(token1);
    expect(verifyTokenHash(token2, hash1)).toBe(false);
  });
});
```

### 14.2 Integration Tests

**API route tests:**
```typescript
// tests/integration/api/teams.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/teams/route';
import { createMocks } from 'node-mocks-http';

describe('POST /api/teams', () => {
  it('should create team with valid data', async () => {
    const { req } = createMocks({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        leaderName: 'Test Leader',
        leaderEmail: 'leader@test.com',
        firmName: 'Test Firm',
        participantEmails: ['participant1@test.com', 'participant2@test.com'],
      },
    });
    
    const response = await POST(req as any);
    const json = await response.json();
    
    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('teamId');
    expect(json.data).toHaveProperty('dashboardUrl');
  });
  
  it('should enforce rate limiting', async () => {
    // Create 2 teams from same IP
    for (let i = 0; i < 2; i++) {
      await POST(/* ... */);
    }
    
    // Third should be rate limited
    const response = await POST(/* ... */);
    const json = await response.json();
    
    expect(response.status).toBe(429);
    expect(json.error.code).toBe('RATE_LIMIT');
  });
  
  it('should reject invalid emails', async () => {
    const { req } = createMocks({
      body: {
        leaderName: 'Test',
        leaderEmail: 'invalid-email',
        firmName: 'Test',
        participantEmails: [],
      },
    });
    
    const response = await POST(req as any);
    expect(response.status).toBe(400);
  });
});
```

### 14.3 E2E Tests (Playwright)

```typescript
// tests/e2e/complete-assessment.spec.ts
import { test, expect } from '@playwright/test';

test('complete assessment flow', async ({ page }) => {
  // Navigate to assessment link
  await page.goto('/a/test-token');
  
  // See intro
  await expect(page.getByRole('heading', { name: 'Operating Strengths Assessment' })).toBeVisible();
  
  // Enter name
  await page.getByLabel('What is your name?').fill('Test Participant');
  await page.getByRole('button', { name: 'Continue' }).click();
  
  // Start assessment
  await page.getByRole('button', { name: 'Start Assessment' }).click();
  
  // Answer all 36 questions
  for (let i = 1; i <= 36; i++) {
    await expect(page.getByText(`Question ${i} of 36`)).toBeVisible();
    
    // Select "Agree" (4)
    await page.getByRole('radio', { name: 'Agree' }).click();
    
    if (i < 36) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
  }
  
  // Submit
  await page.getByRole('button', { name: 'Submit' }).click();
  
  // See thank you page with scores
  await expect(page.getByText('Thank you for completing')).toBeVisible();
  await expect(page.getByText('Alignment:')).toBeVisible();
  await expect(page.getByText('Execution:')).toBeVisible();
  await expect(page.getByText('Accountability:')).toBeVisible();
});

test('session recovery on refresh', async ({ page }) => {
  await page.goto('/a/test-token');
  
  // Enter name and start
  await page.getByLabel('What is your name?').fill('Test');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Start Assessment' }).click();
  
  // Answer first 5 questions
  for (let i = 1; i <= 5; i++) {
    await page.getByRole('radio', { name: 'Agree' }).click();
    if (i < 5) await page.getByRole('button', { name: 'Next' }).click();
  }
  
  // Refresh page
  await page.reload();
  
  // Should be on question 6 (last answered was 5)
  await expect(page.getByText('Question 6 of 36')).toBeVisible();
  
  // Go back - question 5 should have saved answer
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByRole('radio', { name: 'Agree', checked: true })).toBeVisible();
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

### 15.2 Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key",
    "SUPABASE_JWT_SECRET": "@supabase-jwt-secret",
    "RESEND_API_KEY": "@resend-api-key",
    "EMAIL_FROM": "@email-from",
    "NEXT_PUBLIC_APP_URL": "@app-url",
    "RANDOMIZATION_SECRET": "@randomization-secret"
  }
}
```

### 15.3 Supabase Setup

**1. Create project:**
```bash
npx supabase init
npx supabase link --project-ref <your-project-id>
```

**2. Run migrations:**
```bash
npx supabase db push
```

**3. Generate types:**
```bash
npm run generate:types
```

**4. Configure RLS:**
- Enable RLS on all tables via Supabase Dashboard
- Verify policies are applied

### 15.4 DNS & Domain

**DNS Records:**
```
Type  Name                Value
A     @                   76.76.21.21 (Vercel)
CNAME www                 cname.vercel-dns.com
TXT   @                   v=spf1 include:_spf.resend.com ~all
TXT   resend._domainkey   (Resend DKIM)
TXT   _dmarc              v=DMARC1; p=quarantine;
```

### 15.5 Monitoring Setup

**Vercel Analytics:**
- Enable in project settings
- Track Core Web Vitals

**Sentry (optional):**
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
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
  userId?: string;
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

// Usage
log('info', 'Team created', { teamId: '123', participantCount: 5 });
log('error', 'Assessment submission failed', { memberId: '456', error: 'Validation error' });
```

### 16.2 Key Metrics to Track

**Performance:**
- API route response times
- Database query duration
- Email delivery time
- Realtime connection latency

**Business:**
- Teams created per day
- Assessment completion rate
- Average time to complete
- Reports generated per day

**Errors:**
- Rate limit hits
- Assessment submission failures
- Email delivery failures
- Realtime connection drops

### 16.3 Alerts

**Critical:**
- Database connection failures (> 5 in 5 min)
- Email service down (> 10 failures in 10 min)
- API error rate > 10%

**Warning:**
- Rate limit hits > 50/hour
- Assessment submission retries > 20/hour
- Realtime disconnections > 100/hour

---

## 17. Security Checklist

- [ ] All tokens stored as SHA-256 hashes
- [ ] Timing-safe token comparison implemented
- [ ] RLS enabled on all tables
- [ ] Service role key not exposed to client
- [ ] JWT secret rotation plan documented
- [ ] Rate limiting active on team creation
- [ ] IP addresses logged for audit
- [ ] Email resend throttling enforced
- [ ] HTTPS enforced (Vercel default)
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (React escaping + CSP headers)
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
- [ ] Performance targets met (lighthouse)
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Mobile testing completed (iOS/Android)
- [ ] Print-to-PDF tested (Chrome/Safari/Firefox)

**Post-Launch:**
- [ ] Monitor error rates first 24h
- [ ] Verify email delivery rates
- [ ] Check database performance
- [ ] Confirm Realtime stability
- [ ] Review first user completions
- [ ] Gather initial feedback

---

**END OF ARCHITECTURE DOCUMENT**

This architecture provides a complete, production-ready blueprint for building the Operating Strengths Assessment application. All technical decisions align with the PRD requirements and follow industry best practices for Next.js, Supabase, and TypeScript applications.