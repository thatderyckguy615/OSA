# Product Requirements Document: The Operating Strengths Assessment

**Product Name:** The Operating Strengths Assessment (OSA)
**Subtitle:** A Behavioral Diagnostic for Public Accounting Firms
**Version:** 2.3 (MVP, production-ready)
**Author:** Derek, Addictive Leadership
**Date:** December 20, 2025
**Status:** Ready for Development

---

## 0) MVP Build Decisions (Locked)

These decisions remove ambiguity and reduce engineering scope. They are **non-negotiable** for MVP.

1. **Leader visibility + privacy (non-negotiable UX truth):**

   * Leaders **see each participant's 3 dimension scores** (Alignment, Execution, Accountability) **by participant name** (Name primary, Email secondary).
   * Leaders **do not see** any **question-level answers**.
   * Leaders **do not see** subscale breakdown **per person** (PD/CS/OB per individual is hidden). Subscales appear **only as team averages**.

2. **Names-first display:**

   * All leader views (dashboard + report) show **Name as primary identifier**, **Email as secondary** (to disambiguate shared names).
   * **Participants** must confirm their display name on the assessment landing page before starting (unless leader with pre-filled name).
   * **Leaders** have their display name pre-populated from the creation form and skip the name capture screen.

3. **Response saving:**

   * Responses are saved only on **final Submit** (no server-side autosave).
   * **Session recovery:** Answers are stored in browser `sessionStorage` during the assessment. If the participant refreshes or navigates within the same browser tab session, progress is restored. If the tab/session storage is lost (e.g., tab closed, storage cleared), the participant restarts from the beginning.
   * **Double-submit protection:** Submit button disables on click AND database unique constraint prevents duplicate response rows AND server-side row-lock prevents race completion.

4. **Report sharing safety:**

   * Report links are **view-only** and use a **different token** than the dashboard link.
   * Dashboard link enables actions (resend/add members/generate); report link does not.

5. **MVP exports:**

   * **Print-friendly report page** (no CSV export for MVP).
   * Dashboard and report prominently display **"Print / Save as PDF"** button that triggers browser print dialog.

6. **Real-time updates:**

   * Use **Supabase Realtime subscriptions** for dashboard completion status.
   * No polling fallback—if Realtime fails, user can manually refresh.

7. **Mobile-first UI:**

   * Assessment optimized for mobile devices with large touch targets (44px minimum) and full-viewport question display.

8. **Question randomization:**

   * Questions are **randomized** per participant using a deterministic seed derived from `sha256(member_id + ":" + RANDOMIZATION_SECRET)`.
   * **Seed is never stored**; computed on-demand.
   * **Important security note:** randomization occurs server-side so `RANDOMIZATION_SECRET` is never shipped to the browser.
   * Scoring maps responses back to correct dimension/subscale via `question_id` (canonical 1–36 within the team's question version).

9. **Data retention:**

   * Team records stay forever (no deletion or archival for MVP).

10. **Link recovery:**

    * Participants contact support for lost links (no self-service for MVP).

11. **Leader email (creation event):**

    * On team creation, leader receives **ONE** email containing both their dashboard link and their personal assessment link.
    * (Separate system-triggered emails, e.g., "Report Ready," may still be sent later as specified.)

12. **Question versioning:**

    * Managed via SQL/seed files (no admin UI for MVP).
    * Teams are locked to their question version at **team creation time**.

13. **Report snapshots:**

    * Each "Generate Report" overwrites the single report record for that team with current data.
    * No historical snapshot preservation.

14. **Rate limiting:**

    * Maximum **2 teams per IP address per rolling hour** to prevent abuse.
    * IP addresses logged on team creation for audit purposes.

---

## 1) Product Overview

### 1.1 Executive Summary ("Capacity Paradox")

Public accounting firms face a paradox: everyone is maxed out, yet the firm isn't moving forward. Growth initiatives, advisory expansion, talent development, and operational improvements stall due to "behavioral friction" in the firm's operating system—often driven by an addiction to doing (technical execution) and avoidance of leading (governance and people management).

OSA is a **forensic behavioral diagnostic**, not an engagement survey. It measures **how work actually gets done** and reveals leverage loss from patterns like the **Billing Trap**, **Nice Culture syndrome**, and **Review Paralysis**.

### 1.2 Why This Tool Is Trustworthy (Methodology)

OSA uses a **Triangulated Input Structure**:

* **PD: Personal Discipline (Mindset)** — Low PD suggests a **Talent/Training** issue.
* **CS: Collective Systems (Environment)** — Low CS with high PD suggests a **Leadership/System** issue.
* **OB: Observable Behaviors (Forensic Evidence, last 4 weeks)** — Anchors in objective actions vs intentions.

**Psychometric safeguards:**

* **Reverse-coded items [R]** reduce autopilot responding.
* **Question randomization** reduces order bias and pattern gaming.
* **Privacy-driven truth:** item-level responses are **never visible** to leadership.

### 1.3 Dimensions (Axes of "Operating Hygiene")

1. **Alignment:** Strategy vs urgency ("client-captured" behavior)
2. **Execution:** Progress vs perfection ("review paralysis," over-functioning leaders)
3. **Accountability:** Truth vs harmony ("nice culture," avoidance of hard conversations)

### 1.4 Target Users

* **Primary:** Partners/Directors/Managers (leaders) in public accounting firms; team sizes 2–100
* **Secondary:** Staff and seniors participating
* **Tertiary:** Firm admins / HR / consultants (future)

### 1.5 Success Criteria (MVP)

* Leader can create and send assessment in **< 5 minutes**
* **80%+ completion rate** within 7 days
* Median completion time: **8–18 minutes**
* Individual results email sent within **1 minute**
* Report generation under **2 seconds** for up to 100 completions
* **Mobile completion rate within 5% of desktop**

---

## 2) Roles & Permissions

### 2.1 Firm Leader (Primary)

**Can:**

* Create an assessment cohort
* Add members and resend links
* View completion status (real-time via Supabase)
* Generate report (overwrites previous)
* View team report and **individual dimension scores** by **Name + Email**
* Copy dashboard link to clipboard
* Copy report link to clipboard

**Cannot:**

* View any participant's question responses
* View per-person subscale breakdown (PD/CS/OB per person)
* Export question-level response data

### 2.2 Participant (Secondary)

**Can:**

* Take assessment via unique link
* Confirm display name before starting (leader's name is pre-populated)
* Resume assessment if the same browser tab session is still active (via `sessionStorage`)
* View personal results (3 dimension scores + brief interpretation text)

### 2.3 Platform Admin (Internal)

**Can:**

* Manage question versions via SQL/database tools
* Access Supabase dashboard for support lookups

**No custom admin UI for MVP.**

---

## 3) Core UX Principles

1. **Names-first experience**
2. **Mobile-first design**
3. **Psychological safety is explicit**
4. **No accounts** (magic links only)
5. **Short, transactional plain-text emails**
6. **Zero ambiguity** (what leaders can see is stated clearly in invite + intro)
7. **Session resilience** (don't lose work on refresh/hiccup)
8. **Trust real-time** (no manual refresh buttons, browser reload as fallback)

---

## 4) Key User Stories

### 4.1 Leader: Create Assessment

**As a leader**, I want to launch quickly so I can diagnose operating friction without setup overhead.

**Acceptance Criteria:**

* Form has 4 required fields:

  * Leader Name
  * Leader Email
  * Firm Name
  * Participant Emails (bulk paste supported; limit 100 total participants including leader; **must include at least 1 non-leader participant email**)
* System validates emails and shows parsed list with invalid emails highlighted before submit
* System deduplicates emails (case-insensitive, client-side before submit and server-side via CITEXT)
* Leader email is automatically included as a participant (no separate entry needed)
* Rate limit: 2 teams per IP per rolling hour (show friendly error if exceeded)
* IP address logged for audit purposes
* Leader receives **one** "Leader Welcome" email containing:

  * Dashboard link
  * Their personal assessment link
* Other participants receive invitation email
* Confirmation shows number of invites sent

**Homepage Hero Text:**

```
Measure your firm's strength across three critical dimensions: alignment, execution, and accountability.
```

**CTA Button:**

```
[Send Invites & Start Assessment]
```

### 4.2 Participant: Confirm Name + Take Assessment

**As a participant**, I want a simple, private, fast assessment that works on my phone.

**Acceptance Criteria:**

* Intro clearly states:

  * Purpose: "This will measure your team's strengths across several dimensions."
  * Time estimate: "⏱️ Answer 36 questions/prompts."
  * Privacy + visibility (no ambiguity):

    * "🔒 Your Privacy: Your leader will see your **overall dimension scores** (Alignment/Execution/Accountability) and team averages, but **will not see your answers to individual questions**."
* Before starting:

  * **Regular participants:** Enter Display Name (required, min 2 non-whitespace chars)

    * Heading: "What is your name?"
    * Help text: "Your leader will see your overall dimension scores and team averages, not your individual answers."
  * **Leader:** Display Name pre-populated from creation form; skip name entry
* Assessment is 36 questions, randomized order, one per screen, required responses
* Selected response UI: **green filled circle** + subtle background highlight (not blue)
* **Session recovery:** answers stored in `sessionStorage`; restored on refresh within same tab session
* Mobile optimized: large touch targets (min 44px), full viewport, easy thumb navigation
* Double-submit protection: submit disables; DB constraint + server lock prevents duplicates
* Submit button text: **[Submit]**
* Already completed: if link used after completion, show "Already Completed" page with their scores

### 4.3 Leader: Progress Dashboard

**Acceptance Criteria:**

* Dashboard shows:

  * Firm name with logo (Addictive Leadership)
  * **[Generate Report] button as PRIMARY CTA** (enabled when ≥1 complete)
  * Completion percentage secondary (e.g., "7 of 12 completed (58%)")
  * Completed vs Not Completed lists by **Name (primary) + Email (secondary)**
* [Copy Dashboard Link] button (one-click clipboard copy with "Copied ✓" feedback; fallback to select-and-copy prompt if Clipboard API unavailable)
* Resend link button for incomplete participants
* Add member functionality
* Real-time updates via Supabase Realtime with "● Live" indicator (green dot when connected)
* Connection lost banner if Realtime disconnects:

  * "⚠️ Live updates paused. Refresh your browser."

### 4.4 Leader: Generate & Share Report

**Acceptance Criteria:**

* Leader can generate report once ≥1 response is complete
* Generating report overwrites any previous report for this team
* Report includes:

  * Team averages (Alignment/Execution/Accountability) on **1.0–10.0** scale

    * Visual: horizontal bar charts, single color (not color-coded by score)
    * Lowest team average dimension score: display numeric value and label in **red** for emphasis (bars remain single-color)
  * "Based on X of Y responses" banner
  * Individual dimension scores by Name + Email (**completed participants only**)

    * Do NOT visually emphasize or highlight any individual scores
  * Team subscale averages (PD/CS/OB) by dimension (team averages only)

    * Lowest subscale values: display in **red** for emphasis
  * "WHAT TO DO WITH THESE RESULTS" section with link to addictiveleadership.com
* [Copy Report Link] button prominently at top (fallback to select-and-copy prompt if Clipboard API unavailable)
* [Print / Save as PDF] button secondary to Copy Link
* Share link is view-only and safe to forward (no dashboard controls; no question-level answers)
* Print-friendly layout

**Report Interpretation Text (Bottom of Report):**

```
WHAT TO DO WITH THESE RESULTS

For help interpreting or improving these results, CLICK HERE to visit the 'OSA Interpretation Guide.'

(Link "CLICK HERE" to: https://addictiveleadership.com)
```

---

## 5) User Flows

### 5.1 Leader Creates Assessment

```
1. Homepage → "Create Operating Strengths Assessment"
2. Enter: leader name, leader email, firm name
3. Paste participant emails into bulk input field
4. System parses and displays:
   - Valid emails (green checkmarks)
   - Invalid emails (red highlights, must fix or remove)
   - Duplicate detection (case-insensitive, client-side)
   - Count: "12 participants will be invited" (includes leader)
5. Submit (blocked if invalid emails remain, if no non-leader participants, or if >100 total)
6. System checks rate limit (2/IP/hour rolling)
   - If exceeded: show friendly error with retry time
7. System:
   - Logs IP address
   - Creates team with current question_version_id
   - Creates leader as team_member (is_leader=true, display_name=leader_name)
   - Creates participant team_members (display_name=null)
   - Generates admin token + member assessment tokens
   - Sends leader ONE email (dashboard + assessment links)
   - Sends participant invitation emails
8. Confirmation screen:
   - "✅ Assessment Created! You've invited X team members."
   - Primary CTA: "Start Your Assessment" (links to leader's personal assessment link)
   - Secondary: "📧 Check your email for your dashboard link."
```

### 5.2 Participant Takes Assessment

```
1. Click email link → Assessment intro page
2. System validates token and checks completion:
   - If completed → "Already Completed" page with scores and completion date
   - Else → show intro + privacy/visibility statement
3. Name capture:
   - If is_leader=true AND display_name exists → skip
   - Else → enter Display Name → save to DB
4. Click "Start Assessment"
5. Server computes deterministic randomized question order using:
   sha256(member_id + ":" + RANDOMIZATION_SECRET)
6. Display Q1 of 36 (randomized order)
7. For each question:
   - Show question text + 5-point scale
   - Store answer in sessionStorage keyed by member_id + question_id
   - Next advances; Previous goes back; answers preserved in sessionStorage
8. After Q36 answered → show Submit
9. On Submit click:
   - Disable button immediately
   - Send all 36 responses to server
   - Server validates:
     - Token exists and completed=false
     - Exactly 36 responses and each maps to a valid question_id for the team's version
     - All response values are integers 1-5
   - Server saves in a single transaction:
     - Insert 36 response rows (DB uniqueness prevents duplicates)
     - Compute and store 3 dimension scores + 9 subscale scores on team_member
     - Update team_member completed=true, completed_at=now()
   - Send personal results email
   - Clear sessionStorage
10. Show Thank You page with scores
```

### 5.3 Leader Monitors & Reports

```
1. Leader opens dashboard link
2. System validates admin token (timing-safe comparison)
3. Dashboard displays firm header, completion, member lists, actions
4. Leader obtains Realtime JWT from server endpoint → establishes Realtime subscription
5. Realtime subscription updates UI on team_member changes
6. Leader clicks "Generate Report":
   - Server computes team aggregates from completed data
   - Server computes team subscale averages from member_computed_subscales
   - Upserts team_reports row (overwrites previous)
   - Displays report with copy/print actions
7. Leader shares report link (view-only)
```

---

## 6) Functional Requirements

### 6.1 Team Creation Module

#### FR-1.1 Leader Create Form

**Fields (all required):**

* `leader_name` (required, min 2 chars after trim)
* `leader_email` (required, valid email)
* `firm_name` (required, min 2 chars after trim)
* `participant_emails` (bulk text input; must yield ≥1 valid non-leader participant)

**Email Parsing & Validation:**

* Accept comma, semicolon, newline, tab, or space-separated emails
* Trim whitespace; ignore empty tokens
* Validate each email format (Zod)
* **Client-side deduplication:** normalize emails to lowercase, use `Set` to remove duplicates before display
* Display parsed list with visual feedback:

  * ✓ Valid emails (green)
  * ✗ Invalid emails (red, with message "Invalid email format")
* Leader email automatically included (and deduped if present)
* Max 100 participants total (including leader)
* Block submit until:

  * all emails valid OR invalid ones removed
  * total participants ≤ 100
  * at least 1 non-leader participant exists

**Client-side deduplication logic:**

```ts
function deduplicateEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  return emails.filter(email => {
    const normalized = email.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
```

#### FR-1.2 Rate Limiting (Team Creation)

**Requirement:** max 2 teams created per IP per rolling hour.

**Production implementation (required):**

* Use Postgres as source of truth (no in-memory rate limit in serverless).
* On team creation request:

  * Determine `creator_ip` from request headers
  * In a transaction, take an advisory lock on that IP to prevent race
  * Count teams created by that IP in last hour
  * If count ≥ 2 → return 429 with retry minutes
  * Else insert team

**SQL pattern (with timeout handling):**

```sql
-- Set lock timeout to prevent indefinite waits (5 seconds)
SET LOCAL lock_timeout = '5s';

-- advisory lock based on ip hash
SELECT pg_advisory_xact_lock(hashtext($1)); -- $1 = creator_ip

SELECT COUNT(*) INTO v_count
FROM teams
WHERE creator_ip = $1
  AND created_at > NOW() - INTERVAL '1 hour';

IF v_count >= 2 THEN
  RAISE EXCEPTION 'RATE_LIMIT';
END IF;
```

**Lock timeout handling in application code:**

```ts
try {
  await db.rpc('check_rate_limit_and_create_team', { ...params });
} catch (error) {
  if (error.message.includes('lock timeout')) {
    // Retry after brief delay or return 503
    return { error: 'Service busy, please try again', status: 503 };
  }
  if (error.message.includes('RATE_LIMIT')) {
    return { error: 'Rate limit exceeded', status: 429 };
  }
  throw error;
}
```

**Friendly error message:**

* "You've created the maximum number of assessments. Please try again in X minutes."

#### FR-1.3 IP Logging

* Store `creator_ip` on teams table.
* Capture from headers in this order:

  1. `x-vercel-forwarded-for`
  2. `x-forwarded-for` (take first IP)
  3. `x-real-ip`
  4. fallback: `request.ip` if available
* If IP cannot be determined, store NULL and **do not** block creation.

#### FR-1.4 Tokens & URLs

| Token Type | URL Pattern  | Purpose                      | Permissions                               |
| ---------- | ------------ | ---------------------------- | ----------------------------------------- |
| Assessment | `/a/[token]` | Participant takes assessment | Read intro/questions; submit responses    |
| Admin      | `/d/[token]` | Leader dashboard             | View status; resend; add; generate report |
| Report     | `/r/[token]` | View-only report             | Read-only report                          |

**Token generation:**

* 32 random bytes → hex (64 chars)
* Store SHA-256 hash only; send raw token via URL

**Node runtime (recommended)**

```ts
import crypto from 'crypto';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Timing-safe token comparison (required for security):**

```ts
import crypto from 'crypto';

export function verifyTokenHash(providedToken: string, storedHash: string): boolean {
  const providedHash = hashToken(providedToken);
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(providedHash, 'hex'),
    Buffer.from(storedHash, 'hex')
  );
}
```

**Important runtime note:**

* If using Next.js Route Handlers on Edge runtime, use Web Crypto API instead of Node `crypto`.
* For simplicity and reliability, **all token-generating API routes run on Node runtime**:

  * `export const runtime = 'nodejs'`

**Token rules:**

* Tokens never expire
* Assessment token becomes "consumed" when `completed=true`
* Tokens are never reused across purposes

---

### 6.2 Assessment Module

#### FR-2.1 Intro Page

**Display:**

* Firm name
* Heading: "Operating Strengths Assessment"
* Copy:

  > "This will measure your team's strengths across several dimensions.
  > ⏱️ Answer 36 questions/prompts.
  > 🔒 Your Privacy: Your leader will see your overall dimension scores (Alignment/Execution/Accountability) and team averages, but will NOT see your answers to individual questions. Answer honestly."

#### FR-2.2 Name Capture Logic

```
IF team_member.is_leader = true AND team_member.display_name IS NOT NULL:
    Show: "Welcome back, [display_name]"
    Button: "Start Assessment"
ELSE IF team_member.display_name IS NOT NULL AND completed = false:
    Show: "Welcome back, [display_name]"
    Button: "Start Assessment"
ELSE:
    Show: "What is your name?"
    Help: "Your leader will see your overall dimension scores and team averages, not your individual answers."
    Input: display_name (required, min 2 non-whitespace chars)
    Button: "Continue" → Save name → Show "Start Assessment"
```

**Validation:**

* Trim input
* Must be ≥2 characters after trim
* Store as provided (no forced casing)

#### FR-2.3 Already Completed State

If `team_member.completed = true` when accessing `/a/[token]`:

* Show "Assessment Complete"
* Display 3 dimension scores (Alignment/Execution/Accountability)
* Message: "You completed this assessment on [date]. Your results have been recorded."
* No option to retake

#### FR-2.4 Question UI (Mobile-First)

**Layout:**

* Full viewport height
* Question text large and readable
* 5-point scale as large tap targets (min 44px height each)
* Progress indicator: "Question X of 36"
* Previous / Next navigation at bottom

**Scale Labels (consistent):**

| Value | Label             |
| ----: | ----------------- |
|     1 | Strongly Disagree |
|     2 | Disagree          |
|     3 | Neutral           |
|     4 | Agree             |
|     5 | Strongly Agree    |

**Navigation rules:**

* Next disabled until answered
* Previous available except Q1
* Submit appears only after Q36 answered

#### FR-2.5 Question Randomization (Deterministic, Server-Side)

**Inputs:**

* `team_member.id` (UUID)
* `RANDOMIZATION_SECRET` (server-only env var)

**Algorithm:**

1. Fetch team's questions (`version_id = team.question_version_id`) ordered by `question_order ASC`
2. Compute seed hex:

   * `seedHex = sha256(member_id + ":" + RANDOMIZATION_SECRET)`
3. Convert seed to 32-bit integer (first 8 hex chars parsed as hex → unsigned 32-bit)
4. Fisher–Yates shuffle with **mulberry32** PRNG (deterministic)

**mulberry32 implementation (canonical):**

```ts
function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = mulberry32(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

**Output:**

* A stable per-participant ordered array of 36 questions (question_id = canonical `question_order`)

**Critical:** never expose `RANDOMIZATION_SECRET` to the client.

#### FR-2.6 Session Recovery (sessionStorage)

**Storage keying (avoid collisions across different assessments):**

* Key: `osa_responses:<member_id>`
* Payload includes `responses` and `currentIndex`

**On each answer:**

```javascript
sessionStorage.setItem(`osa_responses:${memberId}`, JSON.stringify({
  responses: { [questionId]: value, ... },
  currentIndex
}));
```

**On page load:**

```javascript
const saved = sessionStorage.getItem(`osa_responses:${memberId}`);
if (saved) restoreProgress(JSON.parse(saved));
```

**On successful submit:**

```javascript
sessionStorage.removeItem(`osa_responses:${memberId}`);
```

#### FR-2.7 Submission (Double-Submit Protection + Server Validation)

**Client-side:**

* Disable submit button immediately
* If server returns error, re-enable and show message
* Do not clear sessionStorage unless success

**Server-side validation (must enforce):**

* Token exists (timing-safe comparison)
* Member not completed
* Responses:

  * exactly 36 keys
  * all keys are valid question_ids for team's question version
  * all values are integers 1–5 (explicit check before DB insert)

**Atomic write requirement:**

* Responses insert + completed flag + dimension scores + subscale scores update occur in **one** DB transaction.

---

### 6.3 Leader Dashboard

#### FR-3.1 Dashboard Access

**URL:** `/d/[adminToken]`
**Auth:** token validated via timing-safe hash comparison, no password, no expiry.

**Dashboard layout:** (unchanged hierarchy)

* Firm header + logo
* Generate Report (primary)
* Completion (secondary)
* Copy link
* Member lists
* Add member

#### FR-3.2 Real-Time Updates (Supabase Realtime)

**JWT Authentication for Realtime:**

To enable Realtime subscriptions with RLS, the client must obtain a short-lived JWT from the server.

**JWT specification:**

* **Library:** `jose` (recommended for Next.js compatibility)
* **Signing algorithm:** HS256 with `SUPABASE_JWT_SECRET`
* **Expiry:** 1 hour
* **Payload:**
  ```json
  {
    "role": "authenticated",
    "team_id": "<team_id>",
    "exp": <unix_timestamp_1_hour_from_now>,
    "iat": <current_unix_timestamp>
  }
  ```

**Server endpoint (POST /api/realtime-token):**

```ts
import { SignJWT } from 'jose';

export async function POST(request: Request) {
  // Validate admin token from request
  const { adminToken } = await request.json();
  const team = await validateAdminToken(adminToken); // timing-safe
  if (!team) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
  const token = await new SignJWT({ role: 'authenticated', team_id: team.id })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  return Response.json({ token, expiresIn: 3600 });
}
```

**Client refresh strategy:**

```ts
// Refresh token 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

function scheduleTokenRefresh(expiresIn: number) {
  const refreshTime = (expiresIn * 1000) - REFRESH_BUFFER_MS;
  setTimeout(async () => {
    const { token, expiresIn: newExpiry } = await fetchRealtimeToken(adminToken);
    supabase.realtime.setAuth(token);
    scheduleTokenRefresh(newExpiry);
  }, refreshTime);
}
```

**Subscription scope:**

* Subscribe to `team_members` changes filtered by the leader's `team_id`.
* The `team_members` table must contain **only fields safe for leaders to receive** via realtime payload (see data model).

**Client subscription (illustrative):**

```javascript
const { token } = await fetchRealtimeToken(adminToken);
supabase.realtime.setAuth(token);

const subscription = supabase
  .channel(`team-${teamId}-updates`)
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'team_members', filter: `team_id=eq.${teamId}` },
    (payload) => updateMemberFromPayload(payload)
  )
  .subscribe((status) => setLiveStatus(status));
```

**UI:**

* Show "● Live" green dot when connected
* On disconnect: show banner "⚠️ Live updates paused. Refresh your browser."

#### FR-3.3 Copy Dashboard Link

* One-click copy using Clipboard API
* "Copied ✓" toast/inline feedback for 2 seconds
* **Fallback:** If Clipboard API unavailable, show modal with link text pre-selected and instruction "Press Ctrl+C to copy"

**Browser compatibility check:**

```ts
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
  return false; // Trigger fallback UI
}
```

#### FR-3.4 Resend Link

* One-click resend for **incomplete** participants only
* Same assessment token (no rotation)
* UI shows "Sent ✓" for 2 seconds
* Rate limit: 1 resend per participant per 5 minutes (server enforced)

**Resend rate limit enforcement query:**

```sql
SELECT COUNT(*) FROM email_events
WHERE team_member_id = $1
  AND email_type IN ('participant_invite', 'participant_resend')
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND success = true;
```

If count ≥ 1, reject with message: "Please wait before resending (5-minute limit)."

#### FR-3.5 Add Member

**Input:** email (validated)
**Constraints:**

* Must not already exist in team (case-insensitive)
* Must not exceed max 100 participants total

**Process:**

1. Validate admin token (timing-safe)
2. Create team_member row with new assessment token
3. Send invitation email
4. UI updates via Realtime subscription

---

### 6.4 Reporting Module

#### FR-4.1 Report Generation

**Trigger:** Leader clicks "Generate Report" (enabled when ≥1 completion)

**Process (server):**

1. Validate admin token (timing-safe)
2. Query completed participants + their stored subscale scores
3. Compute:

   * team average strengths (Alignment/Execution/Accountability, 1 decimal)
   * team subscale averages (PD/CS/OB per dimension, integer 0–100) — computed from `member_computed_subscales` JSONB
   * individual dimension scores list (completed only)
4. Upsert `team_reports` row (overwrite)
5. Generate report token if first time; otherwise reuse existing token
6. Send "Report Ready" email to leader

**Team subscale average computation:**

```ts
function computeTeamSubscaleAverages(
  members: Array<{ member_computed_subscales: SubscaleScores }>
): Record<Dimension, Record<Subscale, number>> {
  const dimensions = ['alignment', 'execution', 'accountability'] as const;
  const subscales = ['pd', 'cs', 'ob'] as const;
  
  const result: Record<string, Record<string, number>> = {};
  
  for (const dim of dimensions) {
    result[dim] = {};
    for (const sub of subscales) {
      const values = members.map(m => m.member_computed_subscales[dim][sub]);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      result[dim][sub] = Math.round(avg); // Integer 0-100
    }
  }
  
  return result as Record<Dimension, Record<Subscale, number>>;
}
```

**Report data shape (scores_json):**

```json
{
  "generated_at": "2025-12-18T10:30:00Z",
  "completion_count": 7,
  "total_count": 12,
  "team_averages": {
    "alignment": 6.8,
    "execution": 5.4,
    "accountability": 7.2
  },
  "subscale_averages": {
    "alignment": { "pd": 72, "cs": 58, "ob": 68 },
    "execution": { "pd": 65, "cs": 42, "ob": 55 },
    "accountability": { "pd": 78, "cs": 70, "ob": 72 }
  },
  "individual_scores": [
    { "name": "Sarah Johnson", "email": "sarah@firm.com", "alignment": 7.2, "execution": 6.1, "accountability": 8.0 }
  ]
}
```

#### FR-4.2 Report Display

**Header:**

* Firm name, "Operating Strengths Report"
* Generated date (local formatting)
* Based on X of Y responses
* Copy Report Link (primary)
* Print / Save as PDF (secondary)

**Team Averages (bars):**

* Horizontal bars (single color)
* Lowest dimension label + value in red (ties: all lowest values red)

**Subscale breakdown:**

* Table showing PD/CS/OB
* Lowest subscale values in red (ties: all lowest values red)

**Individual results:**

* Completed participants only
* No highlighting of individuals

#### FR-4.3 Print-Friendly Layout

* Hide buttons in print via `@media print`
* Avoid page breaks inside rows (`break-inside: avoid`)
* White background
* Readable font sizes
* **Browser compatibility note:** Print-to-PDF works reliably in Chrome and Safari; Firefox may have minor variations

#### FR-4.4 Report Link (View-Only)

**URL:** `/r/[reportToken]`

* Same report content
* No dashboard controls
* Shows only:

  * Copy Report Link
  * Print / Save as PDF
  * Report content

**Caching requirement (critical):**

* `/r/[token]` must be dynamic (no stale cache after regeneration).

---

### 6.5 Email System

#### FR-5.1 Email Types

| Email              | Recipient    | Trigger                             | Contains                                  |
| ------------------ | ------------ | ----------------------------------- | ----------------------------------------- |
| Leader Welcome     | Leader       | Team creation                       | Dashboard link + leader assessment link   |
| Participant Invite | Participants | Team creation / Add member / Resend | Assessment link + privacy/visibility note |
| Personal Results   | Participant  | Completion                          | 3 dimension scores                        |
| Report Ready       | Leader       | Report generation                   | Report link                               |

#### FR-5.2 Email Templates (Plain Text Only)

**Leader Welcome:**

```
Subject: Your Operating Strengths Assessment is Ready

Hi [Leader Name],

Your Operating Strengths Assessment for [Firm Name] has been created.
[X] team members have been invited.

YOUR DASHBOARD (track progress, generate report):
[Dashboard Link]

YOUR PERSONAL ASSESSMENT (complete this too):
[Assessment Link]

Visibility: You'll see team averages and each participant's overall
dimension scores by name (Alignment/Execution/Accountability), but not
anyone's answers to individual questions.

— The Operating Strengths Assessment
```

**Participant Invitation (clarified visibility):**

```
Subject: [Leader Name] invited you to the Operating Strengths Assessment

Hi,

[Leader Name] has invited you to complete the Operating Strengths
Assessment for [Firm Name].

This will measure your team's strengths across several dimensions.
⏱️ Answer 36 questions/prompts.

TAKE THE ASSESSMENT:
[Assessment Link]

Privacy: Your leader will see your overall dimension scores
(Alignment/Execution/Accountability) and team averages, but will NOT see
your answers to individual questions.

— The Operating Strengths Assessment
```

**Personal Results:**

```
Subject: Your Operating Strengths Results

Hi [Display Name],

Thank you for completing the Operating Strengths Assessment.

YOUR SCORES (1.0 - 10.0 scale):

Alignment:      [X.X]
Execution:      [X.X]
Accountability: [X.X]

Higher scores reflect strength.

— The Operating Strengths Assessment
```

**Report Ready:**

```
Subject: Operating Strengths Report Ready for [Firm Name]

Hi [Leader Name],

Your Operating Strengths Report is ready.

Based on [X] of [Y] responses.

VIEW REPORT:
[Report Link]

You can share this link—it's view-only and doesn't expose dashboard
controls or individual question answers.

— The Operating Strengths Assessment
```

#### FR-5.3 Provider & Configuration (Resend)

* Plain text only
* SPF, DKIM, DMARC configured and verified

**Error handling:**

```ts
async function sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await resend.emails.send(params);
      return { success: true, messageId: result.id };
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await delay(1000 * (attempt + 1)); // Exponential backoff: 1s, 2s
      }
    }
  }

  // Log failure for debugging
  console.error('Email send failed after retries:', lastError);
  return { success: false, error: lastError?.message };
}
```

#### FR-5.4 Email Send Logging + Resend Rate Limit (Required)

To enforce resend throttling and support troubleshooting, log email sends.

**Rules:**

* Participant invite/resend: max 1 send per participant per 5 minutes (server enforced)
* Log all send attempts (success/failure)

**Resend rate limit check (server-side, before sending):**

```ts
async function canResendToMember(memberId: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const { count } = await supabase
    .from('email_events')
    .select('*', { count: 'exact', head: true })
    .eq('team_member_id', memberId)
    .in('email_type', ['participant_invite', 'participant_resend'])
    .eq('success', true)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

  if (count && count >= 1) {
    // Find the most recent send to calculate retry time
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

## 7) Scoring Algorithm (Canonical)

### 7.1 Question Metadata

Each question has:

* `question_id` (canonical 1–36 within a version; stored as `question_order`)
* `dimension` (alignment | execution | accountability)
* `subscale` (pd | cs | ob)
* `is_reversed` (boolean)

### 7.2 Per-Question Scoring

```ts
function scoreResponse(responseValue: number, isReversed: boolean): number {
  // responseValue is 1-5
  return isReversed ? (6 - responseValue) : responseValue;
}
```

### 7.3 Subscale Score (0–100, integer)

Each dimension+subscale has 4 questions:

```ts
function calculateSubscale(scored: number[]): number {
  const mean = scored.reduce((a, b) => a + b, 0) / 4;
  const score0to100 = ((mean - 1) / 4) * 100;
  return Math.round(score0to100);
}
```

### 7.4 Dimension Composite (0–100)

Weights: OB 55%, CS 28%, PD 17%

```ts
function calculateDimensionComposite(pd: number, cs: number, ob: number): number {
  return (0.55 * ob) + (0.28 * cs) + (0.17 * pd);
}
```

### 7.5 Dimension Strength (1.0–10.0, 1 decimal)

```ts
function calculateStrength(composite: number): number {
  const strength = 1 + (composite / 100) * 9;
  return Math.round(strength * 10) / 10;
}
```

### 7.6 Complete Scoring Flow

```ts
type Dimension = 'alignment' | 'execution' | 'accountability';
type Subscale = 'pd' | 'cs' | 'ob';

interface DimensionResult {
  pd: number;
  cs: number;
  ob: number;
  composite: number;
  strength: number;
}

function calculateAllScores(
  responses: Record<number, number>, // question_id -> 1..5
  questions: Array<{ question_id: number; dimension: Dimension; subscale: Subscale; is_reversed: boolean; }>
): Record<Dimension, DimensionResult> {
  const grouped: Record<Dimension, Record<Subscale, number[]>> = {
    alignment: { pd: [], cs: [], ob: [] },
    execution: { pd: [], cs: [], ob: [] },
    accountability: { pd: [], cs: [], ob: [] }
  };

  for (const q of questions) {
    const raw = responses[q.question_id];
    const scored = scoreResponse(raw, q.is_reversed);
    grouped[q.dimension][q.subscale].push(scored);
  }

  const result: Record<Dimension, DimensionResult> = {} as any;
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

### 7.7 Team Aggregates (Display Rounding)

* Dimension team averages: mean of participant `strength` values, rounded to **1 decimal**
* Subscale team averages: mean of participant subscale values (from `member_computed_subscales`), rounded to **nearest integer**

### 7.8 Required Unit Tests

| Test Case                      | Input             | Expected Output          |
| ------------------------------ | ----------------- | ------------------------ |
| All 1s (normal items)          | All responses = 1 | Strength ≈ 1.0           |
| All 5s (normal items)          | All responses = 5 | Strength = 10.0          |
| All 3s                         | All responses = 3 | Strength = 5.5           |
| Mixed reverse-coded            | Specific pattern  | Verify correct inversion |
| Validation: missing question   | 35 responses      | Reject submit            |
| Validation: out-of-range value | 0 or 6            | Reject submit            |

---

## 8) Data Model

### 8.1 Required Postgres Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- for case-insensitive emails
```

### 8.2 Tables

#### teams

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_name TEXT NOT NULL,
  leader_email CITEXT NOT NULL,
  firm_name TEXT NOT NULL,
  question_version_id INTEGER NOT NULL REFERENCES question_versions(id),
  admin_token_hash TEXT NOT NULL UNIQUE,
  creator_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_admin_token_hash ON teams(admin_token_hash);
CREATE INDEX idx_teams_creator_ip_created_at ON teams(creator_ip, created_at DESC);
```

#### team_members

**Realtime-safe rule:** this table must contain **only** fields that a leader is allowed to receive over realtime (no question-level answers, no per-person subscale breakdown exposed via columns — subscales stored in private JSONB field excluded from realtime).

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  display_name TEXT,
  assessment_token_hash TEXT NOT NULL UNIQUE,
  is_leader BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  -- Leader-visible per-person dimension scores (1.0-10.0)
  alignment_score NUMERIC(3,1),
  execution_score NUMERIC(3,1),
  accountability_score NUMERIC(3,1),

  -- Private: per-person subscale scores for team aggregate computation
  -- NOT exposed via Realtime; leaders only see team averages
  member_computed_subscales JSONB,
  -- Format: {"alignment":{"pd":72,"cs":58,"ob":68},"execution":{...},"accountability":{...}}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_id, email)
);

CREATE INDEX idx_team_members_token_hash ON team_members(assessment_token_hash);
CREATE INDEX idx_team_members_team_completed ON team_members(team_id, completed);
```

**RLS policy for Realtime (exclude sensitive columns):**

```sql
-- For realtime subscriptions, create a restricted view or use column-level security
-- Option: Use Supabase's column-level RLS (if available) or filter in subscription

-- Minimal approach: the realtime subscription payload automatically includes all columns
-- but RLS policies can restrict row access. For column restriction, use a view:

CREATE VIEW team_members_realtime AS
SELECT
  id, team_id, email, display_name, is_leader, completed, completed_at,
  alignment_score, execution_score, accountability_score,
  created_at, updated_at
FROM team_members;

-- Leaders subscribe to this view instead of the base table
-- (Supabase Realtime on views may require configuration)
```

**Alternative (simpler, acceptable for MVP):** Accept that `member_computed_subscales` is technically in the realtime payload but is meaningless without aggregation context, and leaders are not shown per-person subscales in the UI.

#### responses

```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,

  -- Canonical question identifier within a version (1-36)
  question_id INTEGER NOT NULL CHECK (question_id BETWEEN 1 AND 36),

  response_value INTEGER NOT NULL CHECK (response_value BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(team_member_id, question_id)
);

CREATE INDEX idx_responses_member ON responses(team_member_id);
```

#### question_versions

```sql
CREATE TABLE question_versions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_question_versions_active
  ON question_versions(is_active)
  WHERE is_active = TRUE;
```

#### questions

```sql
CREATE TABLE questions (
  id SERIAL PRIMARY KEY,
  version_id INTEGER NOT NULL REFERENCES question_versions(id),
  question_order INTEGER NOT NULL, -- canonical 1-36
  dimension TEXT NOT NULL CHECK (dimension IN ('alignment', 'execution', 'accountability')),
  subscale TEXT NOT NULL CHECK (subscale IN ('pd', 'cs', 'ob')),
  question_text TEXT NOT NULL,
  is_reversed BOOLEAN DEFAULT FALSE,

  UNIQUE(version_id, question_order)
);

CREATE INDEX idx_questions_version ON questions(version_id);
```

#### team_reports

```sql
CREATE TABLE team_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  report_token_hash TEXT NOT NULL UNIQUE,
  completion_count INTEGER NOT NULL,
  total_count INTEGER NOT NULL,
  scores_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_reports_token_hash ON team_reports(report_token_hash);
```

#### email_events (required)

```sql
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('leader_welcome','participant_invite','participant_resend','personal_results','report_ready')),
  recipient_email CITEXT NOT NULL,
  provider_message_id TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_events_member_type_created ON email_events(team_member_id, email_type, created_at DESC);
CREATE INDEX idx_email_events_recipient_created ON email_events(recipient_email, created_at DESC);
```

### 8.3 Database Triggers (Recommended)

Maintain `updated_at` on `team_members`:

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_members_updated_at
BEFORE UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
```

### 8.4 Row-Level Security (RLS)

**Baseline requirement:**

* Enable RLS on all tables
* All writes occur via server routes using service role
* Realtime subscriptions must not expose sensitive fields

```sql
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
```

**RLS policy for Realtime JWT access:**

```sql
-- Policy for authenticated leaders to read their team members
CREATE POLICY "Leaders can view their team members"
ON team_members FOR SELECT
TO authenticated
USING (
  team_id = (current_setting('request.jwt.claims', true)::jsonb->>'team_id')::uuid
);
```

**Client access policy (minimal):**

* Only leader dashboard realtime needs client DB access.
* Use a server-minted, signed JWT (see FR-3.2) containing `team_id` and `role=authenticated` to authorize realtime SELECT on `team_members` filtered to that `team_id`.
* No client access to `responses`, `teams`, `team_reports`, `email_events`.

---

## 9) Database Functions

### 9.1 submit_assessment (atomic submission + strict validation + subscale storage)

**Goal:** Enforce:

* not already completed (row lock)
* exactly 36 responses
* valid question IDs 1–36 for the team's question version
* all response values are 1–5
* store dimension scores AND subscale scores atomically

```sql
CREATE OR REPLACE FUNCTION submit_assessment(
  p_member_id UUID,
  p_responses JSONB,
  p_alignment_score NUMERIC,
  p_execution_score NUMERIC,
  p_accountability_score NUMERIC,
  p_subscales JSONB  -- {"alignment":{"pd":72,"cs":58,"ob":68},...}
) RETURNS VOID AS $$
DECLARE
  v_completed BOOLEAN;
  v_team_id UUID;
  v_version_id INTEGER;
  v_key_count INTEGER;
  v_valid_key_count INTEGER;
  v_invalid_value_count INTEGER;
  v_inserted_count INTEGER;
BEGIN
  -- Lock member row and get team
  SELECT completed, team_id
    INTO v_completed, v_team_id
  FROM team_members
  WHERE id = p_member_id
  FOR UPDATE;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_completed THEN
    RAISE EXCEPTION 'Assessment already completed';
  END IF;

  SELECT question_version_id INTO v_version_id
  FROM teams
  WHERE id = v_team_id;

  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'Team version not found';
  END IF;

  -- Validate response key count
  SELECT jsonb_object_length(p_responses) INTO v_key_count;
  IF v_key_count <> 36 THEN
    RAISE EXCEPTION 'Incomplete responses: expected 36, got %', v_key_count;
  END IF;

  -- Validate keys correspond to existing questions for this version (1..36)
  SELECT COUNT(*)
    INTO v_valid_key_count
  FROM jsonb_object_keys(p_responses) k
  JOIN questions q
    ON q.version_id = v_version_id
   AND q.question_order = (k)::INTEGER;

  IF v_valid_key_count <> 36 THEN
    RAISE EXCEPTION 'Invalid question IDs in responses';
  END IF;

  -- Validate all response values are 1-5
  SELECT COUNT(*)
    INTO v_invalid_value_count
  FROM jsonb_each(p_responses) AS item
  WHERE (item.value)::INTEGER NOT BETWEEN 1 AND 5;

  IF v_invalid_value_count > 0 THEN
    RAISE EXCEPTION 'Response values must be between 1 and 5';
  END IF;

  -- Insert responses (unique constraint prevents duplicates)
  INSERT INTO responses (team_member_id, question_id, response_value)
  SELECT
    p_member_id,
    (item.key)::INTEGER,
    (item.value)::INTEGER
  FROM jsonb_each(p_responses) AS item;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  IF v_inserted_count <> 36 THEN
    RAISE EXCEPTION 'Response insert failed: expected 36, inserted %', v_inserted_count;
  END IF;

  -- Mark completed + store leader-visible dimension scores + private subscales
  UPDATE team_members
  SET
    completed = TRUE,
    completed_at = NOW(),
    alignment_score = p_alignment_score,
    execution_score = p_execution_score,
    accountability_score = p_accountability_score,
    member_computed_subscales = p_subscales
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 10) API Validation Schemas (Zod)

### 10.1 Team Creation Schema

```ts
import { z } from 'zod';

export const CreateTeamSchema = z.object({
  leaderName: z.string().min(2, 'Name must be at least 2 characters').transform(s => s.trim()),
  leaderEmail: z.string().email('Invalid email format').transform(s => s.toLowerCase().trim()),
  firmName: z.string().min(2, 'Firm name must be at least 2 characters').transform(s => s.trim()),
  participantEmails: z.array(z.string().email('Invalid email format'))
    .min(1, 'At least one participant required')
    .max(99, 'Maximum 99 participants (plus leader = 100 total)')
    .transform(emails => [...new Set(emails.map(e => e.toLowerCase().trim()))]),
});

export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
```

### 10.2 Assessment Submission Schema

```ts
export const SubmitAssessmentSchema = z.object({
  responses: z.record(
    z.string().regex(/^[1-9]$|^[1-2][0-9]$|^3[0-6]$/, 'Invalid question ID'),
    z.number().int().min(1).max(5)
  ).refine(
    (obj) => Object.keys(obj).length === 36,
    'Exactly 36 responses required'
  ),
});

export type SubmitAssessmentInput = z.infer<typeof SubmitAssessmentSchema>;
```

### 10.3 Add Member Schema

```ts
export const AddMemberSchema = z.object({
  email: z.string().email('Invalid email format').transform(s => s.toLowerCase().trim()),
});

export type AddMemberInput = z.infer<typeof AddMemberSchema>;
```

### 10.4 Display Name Schema

```ts
export const DisplayNameSchema = z.object({
  displayName: z.string()
    .transform(s => s.trim())
    .refine(s => s.length >= 2, 'Name must be at least 2 characters'),
});

export type DisplayNameInput = z.infer<typeof DisplayNameSchema>;
```

---

## 11) Error Handling Strategy

### 11.1 Database Errors (Supabase Down)

**During assessment submission:**

```ts
async function submitAssessment(memberId: string, responses: Record<number, number>) {
  try {
    const result = await supabase.rpc('submit_assessment', { ... });
    if (result.error) throw result.error;
    return { success: true };
  } catch (error) {
    // Re-enable submit button client-side
    // Keep sessionStorage intact for retry
    if (isNetworkError(error) || isSupabaseUnavailable(error)) {
      return {
        success: false,
        error: 'Unable to save your responses. Please check your connection and try again.',
        retryable: true
      };
    }
    // Validation errors (already completed, invalid data) are not retryable
    return { success: false, error: error.message, retryable: false };
  }
}
```

**Client-side retry UI:**

* Show error message with "Try Again" button
* Do NOT clear sessionStorage on retryable errors
* After 3 failed attempts, show "Please try again later or contact support"

### 11.2 Email Delivery Failures

See FR-5.3 for retry logic with exponential backoff.

**If email fails after retries:**

* Log failure in `email_events` with `success=false` and error message
* Team creation / assessment submission still succeeds
* Dashboard shows participant status; leader can manually resend later
* Do NOT block user-facing operations on email failure

### 11.3 Realtime Connection Failures

**During assessment (participant):**

* Realtime not used during assessment taking
* No impact on assessment flow

**During dashboard viewing (leader):**

* Show "⚠️ Live updates paused" banner
* Leader can manually refresh browser
* Dashboard still functions; just not live-updating

### 11.4 Generic Error Response Format

```ts
interface ApiErrorResponse {
  error: string;           // User-friendly message
  code?: string;           // Machine-readable code (e.g., 'RATE_LIMIT', 'VALIDATION_ERROR')
  retryable?: boolean;     // Whether client should offer retry
  retryAfterSeconds?: number; // For rate limits
}
```

---

## 12) Tech Stack

### 12.1 Core Stack

| Layer     | Technology               | Notes                                                        |
| --------- | ------------------------ | ------------------------------------------------------------ |
| Framework | Next.js 14+ (App Router) | Route Handlers, Server Components                            |
| Language  | TypeScript               | Strict mode                                                  |
| Database  | Supabase (Postgres)      | Hosted Postgres                                              |
| Real-time | Supabase Realtime        | Dashboard completion updates                                 |
| Email     | Resend                   | Plain-text transactional                                     |
| Styling   | Tailwind CSS + shadcn/ui | Mobile-first                                                 |
| Icons     | Phosphor Icons           | @phosphor-icons/react                                        |
| Charts    | Horizontal bars          | Use CSS-based bars for print reliability (Chart.js optional) |
| Hosting   | Vercel                   | Node runtime for token/email routes                          |
| JWT       | jose                     | For Realtime authentication                                  |

### 12.2 Key Dependencies (MVP)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "@supabase/ssr": "^0.4.0",
    "resend": "^2.0.0",
    "@phosphor-icons/react": "^2.0.0",
    "zod": "^3.0.0",
    "jose": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

> Note: If Chart.js is retained, it must be dynamically imported client-side to avoid SSR pitfalls. CSS-based bars are recommended for printing.

### 12.3 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_JWT_SECRET=xxx  # For signing Realtime JWTs

# Email
RESEND_API_KEY=xxx
EMAIL_FROM=noreply@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Security
RANDOMIZATION_SECRET=xxx  # server-only, do not rotate in MVP
```

### 12.4 Browser Compatibility

**Supported browsers:**

* Chrome 90+ (recommended for Print-to-PDF)
* Safari 14+
* Firefox 90+
* Edge 90+

**Feature fallbacks:**

| Feature       | Fallback                                      |
| ------------- | --------------------------------------------- |
| Clipboard API | Modal with pre-selected text + copy instruction |
| sessionStorage | Works in all supported browsers; private mode may clear on tab close |
| Print-to-PDF  | All browsers support; Chrome produces best results |

---

## 13) Non-Functional Requirements

### 13.1 Performance Targets

| Metric                               | Target       |
| ------------------------------------ | ------------ |
| Team creation                        | < 3 seconds  |
| Assessment page load                 | < 2 seconds  |
| Question navigation                  | < 100ms      |
| Report generation (100 participants) | < 2 seconds  |
| Email delivery                       | < 60 seconds |

### 13.2 Reliability

* Atomic submissions via DB function
* Double-submit protection (client + DB + row lock)
* Session recovery via sessionStorage within same tab session
* Realtime disconnect messaging; manual browser refresh fallback
* Email retry with exponential backoff (max 2 retries)

### 13.3 Security & Privacy

* Tokens stored only as SHA-256 hashes
* **Timing-safe token comparison** using `crypto.timingSafeEqual` to prevent timing attacks
* No leader access to question-level answers (UI + API + data model)
* Realtime-safe schema: `member_computed_subscales` not displayed per-person in UI
* Zod validation on all API inputs (see Section 10)
* Rate limiting for team creation and resend
* JWT-authenticated Realtime with 1-hour expiry

### 13.4 Accessibility

* Keyboard navigation for all interactions
* Correct ARIA for radiogroups/buttons/forms
* WCAG 2.1 AA contrast
* 44px minimum touch targets

### 13.5 Load Testing Specifications

**Scenarios to validate:**

| Scenario                           | Load                                    | Success Criteria              |
| ---------------------------------- | --------------------------------------- | ----------------------------- |
| Concurrent team creation           | 20 teams created simultaneously         | All succeed, < 5s each        |
| Concurrent assessment submission   | 50 participants submit within 1 minute  | All succeed, no duplicates    |
| Dashboard with 100 team members    | Real-time updates for 100 members       | Updates visible < 500ms       |
| Report generation under load       | 10 leaders generate reports concurrently | All complete < 3s each        |
| Rate limit enforcement             | 10 rapid team creations from same IP    | Exactly 2 succeed, 8 blocked  |

**Tools:** k6 or Artillery for load testing; run against staging environment.

---

## 14) Item Bank (36 Questions) — Canonical Text

**Source of truth:** `questions.question_text` seed data below.
IDs shown are `question_order` (1–36). **[R]** = reverse-coded.

### ALIGNMENT (1–12)

**PD**

1. I am clear on my team's top three priorities, how they map to the firm's goals for this year, and how success will be measured.
2. When a new request comes in (client or internal), I quickly decide to do, delegate, defer, or decline it—or I am empowered to negotiate the decision with my supervisor.
3. **[R]** I say "yes" to work that feels urgent or political even when it pulls attention away from team/firm priorities or creates avoidable capacity strain.
4. When priorities compete (billable delivery vs. coaching vs. BD vs. internal initiatives), I force a clear choice instead of trying to do everything.

**CS**
5. Our team/service line is consistently clear on what the firm expects us to prioritize right now, even when busy season pressure rises.
6. **[R]** We get mixed signals about what matters most (e.g., charge hours vs. realization vs. quality vs. BD vs. developing people).
7. I know what outcomes I'm accountable for this month, and what I should stop doing if capacity tightens.
8. Our leaders translate firm strategy into specific "do this / not that" priorities for teams and service lines.

**OB**
9. In the last 4 weeks, I declined a request (from a client, peer, or report) because it did not align with our current focus/top priorities.
10. **[R]** In the last 4 weeks, I accepted or continued work that I knew didn't fit our stated capacity limits or strategic priorities.
11. In the last 4 weeks, I spent time on at least one high-value, non-billable activity (e.g., business development, talent coaching, process improvement, strategic work).
12. In the last 4 weeks, when someone proposed work or an initiative, I evaluated whether it fit our priorities before committing (rather than automatically saying 'yes').

### EXECUTION (13–24)

**PD**
13. I define my value by how well I leverage my team, not by how much technical work I do myself.
14. **[R]** I often feel it is better to "just do it myself" than to teach a staff member how to do it.
15. **[R]** I avoid an uncomfortable conversation (client, staff, peer, partner) even when it would unblock delivery, quality, or capacity.
16. I am comfortable letting a team member struggle with a task in the short term so they can learn for the long term.

**CS**
17. Our firm's culture and processes push work down to the lowest capable level, rather than letting it float up to partners.
18. We have a standardized "definition of done" for engagements so staff aren't guessing what each Partner wants.
19. **[R]** Work frequently sits in a "Review Bottleneck" for periods without movement, rather than actively unblocking.
20. We have effective systems (technology, processes, or support) that reduce lower-value tasks (scheduling and admin) so staff focus on higher-value billable work.

**OB**
21. In the last 4 weeks, I delegated a task I am technically good at because it was below my level, even if it meant training a report.
22. In the last 4 weeks, I identified and helped fix a workflow problem (e.g., handoff gap, unclear expectation, missing template).
23. **[R]** In the last 4 weeks, I completed work that someone at a lower level could have done, because it felt faster or easier than delegating it.
24. In the last 4 weeks, when a client request went beyond original scope, I raised the issue and documented the change (rather than just doing the extra work).

### ACCOUNTABILITY (25–36)

**PD**
25. I view giving direct, corrective feedback as an act of kindness, not an act of aggression.
26. **[R]** I hesitate to address underperformance in peers or staff because I don't want to damage the relationship.
27. When a client expands scope without paying, I am willing to directly address or escalate the issue right away.
28. **[R]** I frequently redo work myself because it is faster or easier than explaining what was wrong and holding the person accountable.

**CS**
29. In our firm, important work has a clear owner, due date, and definition of "done" (not just "someone's on it").
30. We use a shared system to track to-dos/commitments and status so reality is visible (not trapped in inboxes or someone's head).
31. **[R]** People delay surfacing risks or delays because they fear blame, conflict, or "looking bad."
32. Performance reviews in our firm are honest assessments of behavior, not just "nice" conversations to ensure retention.

**OB**
33. In the last 4 weeks, I had a difficult conversation with a peer or team member about a performance or behavioral issue (not just technical).
34. **[R]** In the last 4 weeks, I absorbed extra client work beyond the original scope without discussing additional fees.
35. In the last 4 weeks, when I made an error or misjudgment, I acknowledged it openly rather than minimizing or deflecting it.
36. In the last 4 weeks, when something went wrong with my work or on my team (missed deadline, budget issue, quality problem), I participated in identifying what to do differently next time.

---

## 15) Seed Data SQL (Canonical)

```sql
-- Insert question version
INSERT INTO question_versions (id, name, is_active) VALUES (1, 'Initial Version', true);

-- Insert all 36 questions
INSERT INTO questions (version_id, question_order, dimension, subscale, question_text, is_reversed) VALUES
-- Alignment PD (1-4)
(1, 1, 'alignment', 'pd', 'I am clear on my team''s top three priorities, how they map to the firm''s goals for this year, and how success will be measured.', false),
(1, 2, 'alignment', 'pd', 'When a new request comes in (client or internal), I quickly decide to do, delegate, defer, or decline it—or I am empowered to negotiate the decision with my supervisor.', false),
(1, 3, 'alignment', 'pd', 'I say "yes" to work that feels urgent or political even when it pulls attention away from team/firm priorities or creates avoidable capacity strain.', true),
(1, 4, 'alignment', 'pd', 'When priorities compete (billable delivery vs. coaching vs. BD vs. internal initiatives), I force a clear choice instead of trying to do everything.', false),

-- Alignment CS (5-8)
(1, 5, 'alignment', 'cs', 'Our team/service line is consistently clear on what the firm expects us to prioritize right now, even when busy season pressure rises.', false),
(1, 6, 'alignment', 'cs', 'We get mixed signals about what matters most (e.g., charge hours vs. realization vs. quality vs. BD vs. developing people).', true),
(1, 7, 'alignment', 'cs', 'I know what outcomes I''m accountable for this month, and what I should stop doing if capacity tightens.', false),
(1, 8, 'alignment', 'cs', 'Our leaders translate firm strategy into specific "do this / not that" priorities for teams and service lines.', false),

-- Alignment OB (9-12)
(1, 9, 'alignment', 'ob', 'In the last 4 weeks, I declined a request (from a client, peer, or report) because it did not align with our current focus/top priorities.', false),
(1, 10, 'alignment', 'ob', 'In the last 4 weeks, I accepted or continued work that I knew didn''t fit our stated capacity limits or strategic priorities.', true),
(1, 11, 'alignment', 'ob', 'In the last 4 weeks, I spent time on at least one high-value, non-billable activity (e.g., business development, talent coaching, process improvement, strategic work).', false),
(1, 12, 'alignment', 'ob', 'In the last 4 weeks, when someone proposed work or an initiative, I evaluated whether it fit our priorities before committing (rather than automatically saying ''yes'').', false),

-- Execution PD (13-16)
(1, 13, 'execution', 'pd', 'I define my value by how well I leverage my team, not by how much technical work I do myself.', false),
(1, 14, 'execution', 'pd', 'I often feel it is better to "just do it myself" than to teach a staff member how to do it.', true),
(1, 15, 'execution', 'pd', 'I avoid an uncomfortable conversation (client, staff, peer, partner) even when it would unblock delivery, quality, or capacity.', true),
(1, 16, 'execution', 'pd', 'I am comfortable letting a team member struggle with a task in the short term so they can learn for the long term.', false),

-- Execution CS (17-20)
(1, 17, 'execution', 'cs', 'Our firm''s culture and processes push work down to the lowest capable level, rather than letting it float up to partners.', false),
(1, 18, 'execution', 'cs', 'We have a standardized "definition of done" for engagements so staff aren''t guessing what each Partner wants.', false),
(1, 19, 'execution', 'cs', 'Work frequently sits in a "Review Bottleneck" for periods without movement, rather than actively unblocking.', true),
(1, 20, 'execution', 'cs', 'We have effective systems (technology, processes, or support) that reduce lower-value tasks (scheduling and admin) so staff focus on higher-value billable work.', false),

-- Execution OB (21-24)
(1, 21, 'execution', 'ob', 'In the last 4 weeks, I delegated a task I am technically good at because it was below my level, even if it meant training a report.', false),
(1, 22, 'execution', 'ob', 'In the last 4 weeks, I identified and helped fix a workflow problem (e.g., handoff gap, unclear expectation, missing template).', false),
(1, 23, 'execution', 'ob', 'In the last 4 weeks, I completed work that someone at a lower level could have done, because it felt faster or easier than delegating it.', true),
(1, 24, 'execution', 'ob', 'In the last 4 weeks, when a client request went beyond original scope, I raised the issue and documented the change (rather than just doing the extra work).', false),

-- Accountability PD (25-28)
(1, 25, 'accountability', 'pd', 'I view giving direct, corrective feedback as an act of kindness, not an act of aggression.', false),
(1, 26, 'accountability', 'pd', 'I hesitate to address underperformance in peers or staff because I don''t want to damage the relationship.', true),
(1, 27, 'accountability', 'pd', 'When a client expands scope without paying, I am willing to directly address or escalate the issue right away.', false),
(1, 28, 'accountability', 'pd', 'I frequently redo work myself because it is faster or easier than explaining what was wrong and holding the person accountable.', true),

-- Accountability CS (29-32)
(1, 29, 'accountability', 'cs', 'In our firm, important work has a clear owner, due date, and definition of "done" (not just "someone''s on it").', false),
(1, 30, 'accountability', 'cs', 'We use a shared system to track to-dos/commitments and status so reality is visible (not trapped in inboxes or someone''s head).', false),
(1, 31, 'accountability', 'cs', 'People delay surfacing risks or delays because they fear blame, conflict, or "looking bad."', true),
(1, 32, 'accountability', 'cs', 'Performance reviews in our firm are honest assessments of behavior, not just "nice" conversations to ensure retention.', false),

-- Accountability OB (33-36)
(1, 33, 'accountability', 'ob', 'In the last 4 weeks, I had a difficult conversation with a peer or team member about a performance or behavioral issue (not just technical).', false),
(1, 34, 'accountability', 'ob', 'In the last 4 weeks, I absorbed extra client work beyond the original scope without discussing additional fees.', true),
(1, 35, 'accountability', 'ob', 'In the last 4 weeks, when I made an error or misjudgment, I acknowledged it openly rather than minimizing or deflecting it.', false),
(1, 36, 'accountability', 'ob', 'In the last 4 weeks, when something went wrong with my work or on my team (missed deadline, budget issue, quality problem), I participated in identifying what to do differently next time.', false);
```

---

## 16) Out of Scope (MVP)

* User accounts / passwords
* Payment / billing
* Benchmarking
* AI coaching
* Per-person subscale visibility for leaders
* True PDF generation (print-friendly page only)
* CSV export
* Reminder emails
* Admin UI
* Self-service link recovery
* Data deletion / archival
* Historical report snapshots
* Email bounce automation
* Realtime fallback to polling
* Preview assessment feature
* Manual refresh button (rely on Realtime + browser refresh)

---

## 17) Implementation Checklist

### Phase 1: Foundation

* [ ] Next.js + TypeScript strict
* [ ] Supabase project
* [ ] Enable `pgcrypto` + `citext`
* [ ] Create tables + indexes + triggers
* [ ] Seed question version + questions
* [ ] Resend configured + domain verified
* [ ] Configure jose for JWT signing

### Phase 2: Team Creation

* [ ] Build create form + email parsing UI + client-side deduplication
* [ ] Implement Zod validation schemas
* [ ] Implement team creation transaction + IP rate limit (with lock timeout) + IP logging
* [ ] Create team_members + tokens (with timing-safe verification)
* [ ] Send Leader Welcome (both links) + participant invites
* [ ] Log email events
* [ ] Implement email retry logic

### Phase 3: Assessment Flow

* [ ] Intro + name capture
* [ ] Server-side deterministic shuffle (mulberry32)
* [ ] Mobile-first question UI + sessionStorage recovery
* [ ] Submit endpoint with Zod validation + atomic `submit_assessment` RPC (with subscales)
* [ ] Personal results email + Thank You page + Already Completed page
* [ ] Error handling for submission failures

### Phase 4: Dashboard

* [ ] Dashboard layout + completion lists
* [ ] Realtime token endpoint + JWT signing
* [ ] Supabase Realtime subscription + Live indicator + disconnect banner
* [ ] Copy dashboard link (with Clipboard API fallback)
* [ ] Resend (5-min rate limit check via email_events query) + email logs
* [ ] Add member (max 100)

### Phase 5: Reporting

* [ ] Generate report endpoint (overwrite) + report token + subscale aggregation
* [ ] Report page + view-only report page
* [ ] Copy report link (with fallback) + print CSS
* [ ] Report Ready email + email logs

### Phase 6: Testing & QA

* [ ] Scoring unit tests (all test cases in 7.8)
* [ ] Submission validation tests (36 required; invalid keys/values rejected; 1-5 range)
* [ ] Timing-safe comparison tests
* [ ] Mobile QA (iOS Safari, Android Chrome)
* [ ] Realtime QA (multi-tab, JWT refresh)
* [ ] Print-to-PDF QA (Chrome/Safari/Firefox)
* [ ] Clipboard fallback QA
* [ ] Security review (token handling, logging, RLS expectations)
* [ ] Accessibility audit (ARIA, keyboard, contrast)
* [ ] Load testing (scenarios per 13.5)

---

## 18) Changelog

| Version | Date         | Changes                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | —            | Original PRD                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2.0     | Dec 18, 2025 | MVP scope decisions, rate limit, sessionStorage, print-friendly export, etc.                                                                                                                                                                                                                                                                                                                                       |
| 2.1     | Dec 18, 2025 | Design system update, dashboard hierarchy, Live indicator, etc.                                                                                                                                                                                                                                                                                                                                                    |
| 2.2     | Dec 20, 2025 | Production hardening: resolved question text inconsistencies (seed = canonical), clarified privacy/visibility copy, server-side deterministic shuffle (secret not in client), DB-enforced 36-response validation, atomic score storage in submission RPC, DB-backed rate limiting (no in-memory), case-insensitive emails via CITEXT, email send logging + resend throttling, realtime-safe `team_members` schema. |
| 2.3     | Dec 20, 2025 | Issue resolution: (1) Added `member_computed_subscales` JSONB field + team subscale aggregation logic for reports, (2) Specified JWT auth for Realtime (jose library, 1h expiry, refresh strategy, token endpoint), (3) Added email resend rate limit enforcement query, (4) Added timing-safe token comparison requirement with implementation, (5) Specified mulberry32 PRNG (not "e.g."), (6) Added client-side email deduplication logic, (7) Added concrete Zod validation schemas, (8) Added comprehensive error handling strategy (Supabase/email/Realtime failures), (9) Added browser compatibility table with Clipboard API fallback, (10) Added response value 1-5 validation in submit_assessment, (11) Added lock timeout handling for rate limiting, (12) Added load testing specifications. |