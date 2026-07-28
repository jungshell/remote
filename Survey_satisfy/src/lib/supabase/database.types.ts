export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      surveys: {
        Row: {
          id: string;
          title: string;
          division: string;
          business: string;
          sub_business: string;
          program_type: string;
          custom_questions: Json;
          target_responses: number;
          status: string;
          year: number;
          round: number;
          respondent_type: string;
          created_at: string;
          starts_at: string | null;
          ends_at: string | null;
          owner_user_id: string | null;
        };
        Insert: {
          id: string;
          title: string;
          division: string;
          business: string;
          sub_business: string;
          program_type: string;
          custom_questions?: Json;
          target_responses?: number;
          status?: string;
          year?: number;
          round?: number;
          respondent_type?: string;
          created_at?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          owner_user_id?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          division?: string;
          business?: string;
          sub_business?: string;
          program_type?: string;
          custom_questions?: Json;
          target_responses?: number;
          status?: string;
          year?: number;
          round?: number;
          respondent_type?: string;
          created_at?: string;
          starts_at?: string | null;
          ends_at?: string | null;
          owner_user_id?: string | null;
        };
        Relationships: [];
      };
      platform_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          name: string;
          division: string;
          business: string;
          sub_business: string;
          program_type: string;
          businesses: Json;
          role: string;
          status: string;
          created_at: string;
          approved_at: string | null;
          approved_by: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash: string;
          name: string;
          division: string;
          business?: string;
          sub_business?: string;
          program_type?: string;
          businesses?: Json;
          role?: string;
          status?: string;
          created_at?: string;
          approved_at?: string | null;
          approved_by?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string;
          name?: string;
          division?: string;
          business?: string;
          sub_business?: string;
          program_type?: string;
          businesses?: Json;
          role?: string;
          status?: string;
          created_at?: string;
          approved_at?: string | null;
          approved_by?: string | null;
        };
        Relationships: [];
      };
      user_sessions: {
        Row: {
          token: string;
          user_id: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          token: string;
          user_id: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          token?: string;
          user_id?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      survey_responses: {
        Row: {
          id: string;
          survey_id: string;
          division: string;
          business: string;
          sub_business: string;
          program_type: string;
          phone_last4: string | null;
          answers: Json;
          submitted_at: string;
          edit_token: string | null;
        };
        Insert: {
          id?: string;
          survey_id: string;
          division: string;
          business: string;
          sub_business: string;
          program_type: string;
          phone_last4?: string | null;
          answers?: Json;
          submitted_at?: string;
          edit_token?: string | null;
        };
        Update: {
          id?: string;
          survey_id?: string;
          division?: string;
          business?: string;
          sub_business?: string;
          program_type?: string;
          phone_last4?: string | null;
          answers?: Json;
          submitted_at?: string;
          edit_token?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
      survey_templates: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          division: string;
          business: string;
          sub_business: string;
          program_type: string;
          respondent_type: string;
          selected_question_ids: Json;
          custom_questions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          name: string;
          division?: string;
          business?: string;
          sub_business?: string;
          program_type?: string;
          respondent_type?: string;
          selected_question_ids?: Json;
          custom_questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          name?: string;
          division?: string;
          business?: string;
          sub_business?: string;
          program_type?: string;
          respondent_type?: string;
          selected_question_ids?: Json;
          custom_questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_templates_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "platform_users";
            referencedColumns: ["id"];
          },
        ];
      };
      improvement_actions: {
        Row: {
          id: string;
          survey_id: string;
          title: string;
          source: string;
          owner_name: string;
          due_date: string | null;
          status: string;
          related_question_id: string | null;
          related_question_label: string | null;
          memo: string;
          division: string;
          year: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          survey_id: string;
          title: string;
          source?: string;
          owner_name?: string;
          due_date?: string | null;
          status?: string;
          related_question_id?: string | null;
          related_question_label?: string | null;
          memo?: string;
          division: string;
          year?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          survey_id?: string;
          title?: string;
          source?: string;
          owner_name?: string;
          due_date?: string | null;
          status?: string;
          related_question_id?: string | null;
          related_question_label?: string | null;
          memo?: string;
          division?: string;
          year?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "improvement_actions_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type SurveyRow = Database["public"]["Tables"]["surveys"]["Row"];
export type SurveyResponseRow = Database["public"]["Tables"]["survey_responses"]["Row"];
export type SurveyResponseInsert = Database["public"]["Tables"]["survey_responses"]["Insert"];
export type SurveyTemplateRow = Database["public"]["Tables"]["survey_templates"]["Row"];
export type ImprovementActionRow = Database["public"]["Tables"]["improvement_actions"]["Row"];
export type ImprovementActionInsert = Database["public"]["Tables"]["improvement_actions"]["Insert"];
