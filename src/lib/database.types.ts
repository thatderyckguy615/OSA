export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      email_events: {
        Row: {
          created_at: string | null
          email_type: string
          error: string | null
          id: string
          provider_message_id: string | null
          recipient_email: string
          success: boolean
          team_id: string | null
          team_member_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_type: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_email: string
          success?: boolean
          team_id?: string | null
          team_member_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_type?: string
          error?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_email?: string
          success?: boolean
          team_id?: string | null
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      question_versions: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          dimension: string
          id: number
          is_reversed: boolean | null
          question_order: number
          question_text: string
          subscale: string
          version_id: number
        }
        Insert: {
          dimension: string
          id?: number
          is_reversed?: boolean | null
          question_order: number
          question_text: string
          subscale: string
          version_id: number
        }
        Update: {
          dimension?: string
          id?: number
          is_reversed?: boolean | null
          question_order?: number
          question_text?: string
          subscale?: string
          version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          created_at: string | null
          id: string
          question_id: number
          response_value: number
          team_member_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id: number
          response_value: number
          team_member_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: number
          response_value?: number
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "responses_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accountability_score: number | null
          alignment_score: number | null
          assessment_token_hash: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          display_name: string | null
          email: string
          execution_score: number | null
          id: string
          is_leader: boolean | null
          member_computed_subscales: Json | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          accountability_score?: number | null
          alignment_score?: number | null
          assessment_token_hash: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email: string
          execution_score?: number | null
          id?: string
          is_leader?: boolean | null
          member_computed_subscales?: Json | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          accountability_score?: number | null
          alignment_score?: number | null
          assessment_token_hash?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string
          execution_score?: number | null
          id?: string
          is_leader?: boolean | null
          member_computed_subscales?: Json | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_reports: {
        Row: {
          completion_count: number
          generated_at: string | null
          id: string
          report_token_hash: string
          scores_json: Json
          team_id: string
          total_count: number
        }
        Insert: {
          completion_count: number
          generated_at?: string | null
          id?: string
          report_token_hash: string
          scores_json: Json
          team_id: string
          total_count: number
        }
        Update: {
          completion_count?: number
          generated_at?: string | null
          id?: string
          report_token_hash?: string
          scores_json?: Json
          team_id?: string
          total_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          admin_token_hash: string
          created_at: string | null
          creator_ip: string | null
          firm_name: string
          id: string
          leader_email: string
          leader_name: string
          question_version_id: number
        }
        Insert: {
          admin_token_hash: string
          created_at?: string | null
          creator_ip?: string | null
          firm_name: string
          id?: string
          leader_email: string
          leader_name: string
          question_version_id: number
        }
        Update: {
          admin_token_hash?: string
          created_at?: string | null
          creator_ip?: string | null
          firm_name?: string
          id?: string
          leader_email?: string
          leader_name?: string
          question_version_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_question_version_id_fkey"
            columns: ["question_version_id"]
            isOneToOne: false
            referencedRelation: "question_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_team_creation_rate_limit: {
        Args: { p_creator_ip: string }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      submit_assessment: {
        Args: {
          p_accountability_score: number
          p_alignment_score: number
          p_execution_score: number
          p_member_id: string
          p_responses: Json
          p_subscales: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
