/**
 * Database type stub matching OSA PRD schema
 * This is a temporary stub - replace with generated types from Supabase CLI when available
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          leader_name: string;
          leader_email: string; // CITEXT
          firm_name: string;
          question_version_id: number;
          admin_token_hash: string;
          creator_ip: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          leader_name: string;
          leader_email: string;
          firm_name: string;
          question_version_id: number;
          admin_token_hash: string;
          creator_ip?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          leader_name?: string;
          leader_email?: string;
          firm_name?: string;
          question_version_id?: number;
          admin_token_hash?: string;
          creator_ip?: string | null;
          created_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          email: string; // CITEXT
          display_name: string | null;
          assessment_token_hash: string;
          is_leader: boolean;
          completed: boolean;
          completed_at: string | null;
          alignment_score: number | null; // NUMERIC(3,1)
          execution_score: number | null; // NUMERIC(3,1)
          accountability_score: number | null; // NUMERIC(3,1)
          member_computed_subscales: Json | null; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          email: string;
          display_name?: string | null;
          assessment_token_hash: string;
          is_leader?: boolean;
          completed?: boolean;
          completed_at?: string | null;
          alignment_score?: number | null;
          execution_score?: number | null;
          accountability_score?: number | null;
          member_computed_subscales?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          email?: string;
          display_name?: string | null;
          assessment_token_hash?: string;
          is_leader?: boolean;
          completed?: boolean;
          completed_at?: string | null;
          alignment_score?: number | null;
          execution_score?: number | null;
          accountability_score?: number | null;
          member_computed_subscales?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      responses: {
        Row: {
          id: string;
          team_member_id: string;
          question_id: number; // 1-36
          response_value: number; // 1-5
          created_at: string;
        };
        Insert: {
          id?: string;
          team_member_id: string;
          question_id: number;
          response_value: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_member_id?: string;
          question_id?: number;
          response_value?: number;
          created_at?: string;
        };
      };
      question_versions: {
        Row: {
          id: number;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          is_active?: boolean;
          created_at?: string;
        };
      };
      questions: {
        Row: {
          id: number;
          version_id: number;
          question_order: number; // 1-36
          dimension: 'alignment' | 'execution' | 'accountability';
          subscale: 'pd' | 'cs' | 'ob';
          question_text: string;
          is_reversed: boolean;
        };
        Insert: {
          id?: number;
          version_id: number;
          question_order: number;
          dimension: 'alignment' | 'execution' | 'accountability';
          subscale: 'pd' | 'cs' | 'ob';
          question_text: string;
          is_reversed?: boolean;
        };
        Update: {
          id?: number;
          version_id?: number;
          question_order?: number;
          dimension?: 'alignment' | 'execution' | 'accountability';
          subscale?: 'pd' | 'cs' | 'ob';
          question_text?: string;
          is_reversed?: boolean;
        };
      };
      team_reports: {
        Row: {
          id: string;
          team_id: string;
          report_token_hash: string;
          completion_count: number;
          total_count: number;
          scores_json: Json; // JSONB
          generated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          report_token_hash: string;
          completion_count: number;
          total_count: number;
          scores_json: Json;
          generated_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          report_token_hash?: string;
          completion_count?: number;
          total_count?: number;
          scores_json?: Json;
          generated_at?: string;
        };
      };
      email_events: {
        Row: {
          id: string;
          team_id: string | null;
          team_member_id: string | null;
          email_type: 'leader_welcome' | 'participant_invite' | 'participant_resend' | 'personal_results' | 'report_ready';
          recipient_email: string; // CITEXT
          provider_message_id: string | null;
          success: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id?: string | null;
          team_member_id?: string | null;
          email_type: 'leader_welcome' | 'participant_invite' | 'participant_resend' | 'personal_results' | 'report_ready';
          recipient_email: string;
          provider_message_id?: string | null;
          success?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string | null;
          team_member_id?: string | null;
          email_type?: 'leader_welcome' | 'participant_invite' | 'participant_resend' | 'personal_results' | 'report_ready';
          recipient_email?: string;
          provider_message_id?: string | null;
          success?: boolean;
          error?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      submit_assessment: {
        Args: {
          p_member_id: string;
          p_responses: Json;
          p_alignment_score: number;
          p_execution_score: number;
          p_accountability_score: number;
          p_subscales: Json;
        };
        Returns: void;
      };
      check_team_creation_rate_limit: {
        Args: {
          p_creator_ip: string;
        };
        Returns: {
          allowed: boolean;
          retry_after_seconds: number | null;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

