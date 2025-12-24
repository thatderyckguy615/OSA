-- OSA Schema Verification Checklist
-- Run these queries in Supabase SQL Editor to verify the migration

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

-- Check pgcrypto extension exists
SELECT EXISTS(
  SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
) AS pgcrypto_exists;

-- Check citext extension exists
SELECT EXISTS(
  SELECT 1 FROM pg_extension WHERE extname = 'citext'
) AS citext_exists;

-- ============================================================================
-- 2. TABLES (7 total)
-- ============================================================================

-- List all tables (should include: teams, team_members, responses, question_versions, questions, team_reports, email_events)
SELECT 
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('teams', 'team_members', 'responses', 'question_versions', 'questions', 'team_reports', 'email_events')
ORDER BY tablename;

-- Verify teams table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'teams'
ORDER BY ordinal_position;

-- Verify team_members table structure (should have member_computed_subscales JSONB)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'team_members'
ORDER BY ordinal_position;

-- Verify responses table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'responses'
ORDER BY ordinal_position;

-- Verify question_versions table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'question_versions'
ORDER BY ordinal_position;

-- Verify questions table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'questions'
ORDER BY ordinal_position;

-- Verify team_reports table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'team_reports'
ORDER BY ordinal_position;

-- Verify email_events table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'email_events'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. INDEXES (10 total)
-- ============================================================================

-- List all indexes (should include all PRD-specified indexes)
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('teams', 'team_members', 'responses', 'question_versions', 'questions', 'team_reports', 'email_events')
ORDER BY tablename, indexname;

-- Verify specific indexes exist
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_question_versions_active',
    'idx_questions_version',
    'idx_teams_admin_token_hash',
    'idx_teams_creator_ip_created_at',
    'idx_team_members_token_hash',
    'idx_team_members_team_completed',
    'idx_responses_member',
    'idx_team_reports_token_hash',
    'idx_email_events_member_type_created',
    'idx_email_events_recipient_created'
  )
ORDER BY indexname;

-- Verify unique constraint on teams.admin_token_hash
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.teams'::regclass
  AND conname LIKE '%admin_token_hash%';

-- Verify unique constraint on team_members.assessment_token_hash
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.team_members'::regclass
  AND conname LIKE '%assessment_token_hash%';

-- Verify unique constraint on team_members(team_id, email)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.team_members'::regclass
  AND contype = 'u';

-- Verify unique constraint on responses(team_member_id, question_id)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.responses'::regclass
  AND contype = 'u';

-- Verify unique constraint on team_reports(team_id)
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.team_reports'::regclass
  AND contype = 'u';

-- ============================================================================
-- 4. FUNCTIONS (3 total)
-- ============================================================================

-- List all functions (should include: set_updated_at, submit_assessment, check_team_creation_rate_limit)
SELECT 
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('set_updated_at', 'submit_assessment', 'check_team_creation_rate_limit')
ORDER BY routine_name;

-- Verify set_updated_at function signature
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'set_updated_at';

-- Verify submit_assessment function signature
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'submit_assessment';

-- Verify check_team_creation_rate_limit function signature (should return TABLE)
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'check_team_creation_rate_limit';

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Verify trg_team_members_updated_at trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_team_members_updated_at';

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Verify RLS is enabled on all 5 tables
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('teams', 'team_members', 'responses', 'team_reports', 'email_events')
ORDER BY tablename;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- List all policies on team_members (should include "Leaders can view their team members")
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'team_members';

-- Verify the specific policy exists and uses JWT team_id claim
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'team_members'
  AND policyname = 'Leaders can view their team members';

-- ============================================================================
-- 8. SEED DATA VERIFICATION
-- ============================================================================

-- Verify exactly 1 active question version exists
SELECT 
  id,
  name,
  is_active,
  created_at
FROM question_versions
WHERE is_active = true;

-- Count should be exactly 1
SELECT COUNT(*) AS active_version_count
FROM question_versions
WHERE is_active = true;

-- Verify exactly 36 questions exist for version_id = 1
SELECT 
  version_id,
  COUNT(*) AS question_count
FROM questions
WHERE version_id = 1
GROUP BY version_id;

-- Should return exactly 36
SELECT COUNT(*) AS total_questions
FROM questions
WHERE version_id = 1;

-- Verify all 36 questions have required fields populated
SELECT 
  COUNT(*) AS total,
  COUNT(DISTINCT question_order) AS distinct_orders,
  COUNT(CASE WHEN dimension IS NULL THEN 1 END) AS null_dimensions,
  COUNT(CASE WHEN subscale IS NULL THEN 1 END) AS null_subscales,
  COUNT(CASE WHEN question_text IS NULL OR question_text = '' THEN 1 END) AS null_or_empty_text
FROM questions
WHERE version_id = 1;

-- Verify question_order spans 1-36 exactly (no gaps, no duplicates)
SELECT 
  question_order,
  COUNT(*) AS count
FROM questions
WHERE version_id = 1
GROUP BY question_order
HAVING COUNT(*) > 1 OR question_order NOT BETWEEN 1 AND 36
ORDER BY question_order;

-- Should return 0 rows (no duplicates, all in range 1-36)

-- Verify dimension distribution (should be 12 each: alignment, execution, accountability)
SELECT 
  dimension,
  COUNT(*) AS count
FROM questions
WHERE version_id = 1
GROUP BY dimension
ORDER BY dimension;

-- Verify subscale distribution (should be 4 per dimension+subscale combination)
SELECT 
  dimension,
  subscale,
  COUNT(*) AS count
FROM questions
WHERE version_id = 1
GROUP BY dimension, subscale
ORDER BY dimension, subscale;

-- Verify reverse-coded questions (should be 12 total, marked with is_reversed = true)
SELECT 
  is_reversed,
  COUNT(*) AS count
FROM questions
WHERE version_id = 1
GROUP BY is_reversed;

-- List reverse-coded questions (should match PRD [R] markers)
SELECT 
  question_order,
  dimension,
  subscale,
  is_reversed,
  LEFT(question_text, 50) AS question_preview
FROM questions
WHERE version_id = 1
  AND is_reversed = true
ORDER BY question_order;

-- ============================================================================
-- 9. CONSTRAINT VERIFICATION
-- ============================================================================

-- Verify CHECK constraints on questions.dimension
SELECT 
  conname,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.questions'::regclass
  AND contype = 'c'
  AND conname LIKE '%dimension%';

-- Verify CHECK constraints on questions.subscale
SELECT 
  conname,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.questions'::regclass
  AND contype = 'c'
  AND conname LIKE '%subscale%';

-- Verify CHECK constraints on responses.question_id (1-36)
SELECT 
  conname,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.responses'::regclass
  AND contype = 'c'
  AND conname LIKE '%question_id%';

-- Verify CHECK constraints on responses.response_value (1-5)
SELECT 
  conname,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.responses'::regclass
  AND contype = 'c'
  AND conname LIKE '%response_value%';

-- Verify CHECK constraints on email_events.email_type
SELECT 
  conname,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.email_events'::regclass
  AND contype = 'c'
  AND conname LIKE '%email_type%';

-- ============================================================================
-- 10. FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- List all foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('teams', 'team_members', 'responses', 'questions', 'team_reports', 'email_events')
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- SUMMARY CHECKLIST
-- ============================================================================

/*
EXPECTED RESULTS SUMMARY:

✓ Extensions (2):
  - pgcrypto: EXISTS
  - citext: EXISTS

✓ Tables (7):
  - teams
  - team_members
  - responses
  - question_versions
  - questions
  - team_reports
  - email_events

✓ Indexes (10):
  - idx_question_versions_active (unique partial)
  - idx_questions_version
  - idx_teams_admin_token_hash
  - idx_teams_creator_ip_created_at
  - idx_team_members_token_hash
  - idx_team_members_team_completed
  - idx_responses_member
  - idx_team_reports_token_hash
  - idx_email_events_member_type_created
  - idx_email_events_recipient_created

✓ Functions (3):
  - set_updated_at() RETURNS TRIGGER
  - submit_assessment(...) RETURNS VOID
  - check_team_creation_rate_limit(text) RETURNS TABLE(allowed boolean, retry_after_seconds integer)

✓ Trigger (1):
  - trg_team_members_updated_at on team_members

✓ RLS Enabled (5 tables):
  - teams: true
  - team_members: true
  - responses: true
  - team_reports: true
  - email_events: true

✓ RLS Policy (1):
  - "Leaders can view their team members" on team_members FOR SELECT TO authenticated

✓ Seed Data:
  - question_versions: exactly 1 row with is_active = true
  - questions: exactly 36 rows for version_id = 1
  - question_order: 1-36 with no gaps or duplicates
  - dimensions: 12 each (alignment, execution, accountability)
  - subscales: 4 per dimension+subscale combination
  - is_reversed: 12 questions marked true (reverse-coded)
*/

