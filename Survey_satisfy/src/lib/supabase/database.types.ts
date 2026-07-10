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
          ends_at: string | null;
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
          ends_at?: string | null;
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
          ends_at?: string | null;
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
