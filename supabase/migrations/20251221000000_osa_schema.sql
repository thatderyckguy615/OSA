-- OSA schema migration (PRD v2.3)

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;   -- for case-insensitive emails

-- Tables

-- question_versions
CREATE TABLE question_versions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_question_versions_active
  ON question_versions(is_active)
  WHERE is_active = TRUE;

-- questions
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

-- teams
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

-- team_members
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

-- responses
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

-- team_reports
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

-- email_events
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

-- Triggers

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

-- Row-Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

-- Policy for Realtime JWT access
CREATE POLICY "Leaders can view their team members"
ON team_members FOR SELECT
TO authenticated
USING (
  team_id = (current_setting('request.jwt.claims', true)::jsonb->>'team_id')::uuid
);

-- Functions

-- submit_assessment (atomic submission + strict validation + subscale storage)
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

-- check_team_creation_rate_limit (max 2 teams per IP per rolling hour)
CREATE OR REPLACE FUNCTION check_team_creation_rate_limit(p_creator_ip TEXT)
RETURNS TABLE(allowed BOOLEAN, retry_after_seconds INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_second_most_recent_created_at TIMESTAMPTZ;
  v_retry_seconds INTEGER;
BEGIN
  -- If IP cannot be determined, store NULL and do not block creation (PRD)
  IF p_creator_ip IS NULL OR btrim(p_creator_ip) = '' THEN
    RETURN QUERY SELECT TRUE, NULL::INTEGER;
    RETURN;
  END IF;

  -- Set lock timeout to prevent indefinite waits (5 seconds)
  PERFORM set_config('lock_timeout', '5s', TRUE);

  -- advisory lock based on ip hash
  PERFORM pg_advisory_xact_lock(hashtext(p_creator_ip));

  SELECT COUNT(*) INTO v_count
  FROM teams
  WHERE creator_ip = p_creator_ip
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_count < 2 THEN
    RETURN QUERY SELECT TRUE, NULL::INTEGER;
    RETURN;
  END IF;

  -- Compute retry time: when the 2nd most recent creation falls outside the 1-hour window
  SELECT created_at INTO v_second_most_recent_created_at
  FROM teams
  WHERE creator_ip = p_creator_ip
    AND created_at > NOW() - INTERVAL '1 hour'
  ORDER BY created_at DESC
  OFFSET 1
  LIMIT 1;

  IF v_second_most_recent_created_at IS NULL THEN
    -- Defensive fallback (should not happen when v_count >= 2)
    RETURN QUERY SELECT FALSE, 3600;
    RETURN;
  END IF;

  v_retry_seconds := GREATEST(
    CEIL(EXTRACT(EPOCH FROM (v_second_most_recent_created_at + INTERVAL '1 hour' - NOW())))::INTEGER,
    0
  );

  RETURN QUERY SELECT FALSE, v_retry_seconds;
END;
$$ LANGUAGE plpgsql;


