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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      answers: {
        Row: {
          audio_checksum_sha256: string | null
          audio_size_bytes: number | null
          audio_storage_key: string | null
          created_at: string
          duration_seconds: number
          ended_at: string | null
          id: string
          interview_id: string
          media_asset_id: string | null
          media_content_type: string | null
          media_has_video: boolean
          normalized_storage_key: string | null
          processing_status: string
          question_id: string
          recording_session_id: string | null
          sequence_number: number
          started_at: string | null
          status: string
          transcription_status: string
          updated_at: string
          video_checksum_sha256: string | null
          video_size_bytes: number | null
          video_storage_key: string | null
        }
        Insert: {
          audio_checksum_sha256?: string | null
          audio_size_bytes?: number | null
          audio_storage_key?: string | null
          created_at?: string
          duration_seconds: number
          ended_at?: string | null
          id: string
          interview_id: string
          media_asset_id?: string | null
          media_content_type?: string | null
          media_has_video: boolean
          normalized_storage_key?: string | null
          processing_status: string
          question_id: string
          recording_session_id?: string | null
          sequence_number: number
          started_at?: string | null
          status: string
          transcription_status: string
          updated_at?: string
          video_checksum_sha256?: string | null
          video_size_bytes?: number | null
          video_storage_key?: string | null
        }
        Update: {
          audio_checksum_sha256?: string | null
          audio_size_bytes?: number | null
          audio_storage_key?: string | null
          created_at?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          interview_id?: string
          media_asset_id?: string | null
          media_content_type?: string | null
          media_has_video?: boolean
          normalized_storage_key?: string | null
          processing_status?: string
          question_id?: string
          recording_session_id?: string | null
          sequence_number?: number
          started_at?: string | null
          status?: string
          transcription_status?: string
          updated_at?: string
          video_checksum_sha256?: string | null
          video_size_bytes?: number | null
          video_storage_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_metrics: {
        Row: {
          answer_id: string
          claims_json: Json
          completeness_score: number
          correctness_score: number
          correctness_status: string
          correctness_summary: string
          created_at: string
          evidence_json: Json
          evidence_score: number
          feedback_json: Json
          id: string
          ideal_answer_outline_json: Json
          model: string
          overall_content_score: number
          practice_drills_json: Json
          prompt_version: string
          provider: string
          question_type: string
          reasoning_summary: string
          relevance_score: number
          schema_version: string
          star_analysis_json: Json | null
          strengths_json: Json
          structure_score: number
          technical_depth_score: number
          topic_coverage_json: Json
          updated_at: string
          weaknesses_json: Json
        }
        Insert: {
          answer_id: string
          claims_json: Json
          completeness_score: number
          correctness_score: number
          correctness_status: string
          correctness_summary: string
          created_at?: string
          evidence_json: Json
          evidence_score: number
          feedback_json: Json
          id: string
          ideal_answer_outline_json: Json
          model: string
          overall_content_score: number
          practice_drills_json: Json
          prompt_version: string
          provider: string
          question_type: string
          reasoning_summary: string
          relevance_score: number
          schema_version: string
          star_analysis_json?: Json | null
          strengths_json: Json
          structure_score: number
          technical_depth_score: number
          topic_coverage_json: Json
          updated_at?: string
          weaknesses_json: Json
        }
        Update: {
          answer_id?: string
          claims_json?: Json
          completeness_score?: number
          correctness_score?: number
          correctness_status?: string
          correctness_summary?: string
          created_at?: string
          evidence_json?: Json
          evidence_score?: number
          feedback_json?: Json
          id?: string
          ideal_answer_outline_json?: Json
          model?: string
          overall_content_score?: number
          practice_drills_json?: Json
          prompt_version?: string
          provider?: string
          question_type?: string
          reasoning_summary?: string
          relevance_score?: number
          schema_version?: string
          star_analysis_json?: Json | null
          strengths_json?: Json
          structure_score?: number
          technical_depth_score?: number
          topic_coverage_json?: Json
          updated_at?: string
          weaknesses_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_metrics_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          completed_at: string | null
          created_at: string
          current_question_index: number
          deleted_at: string | null
          difficulty_level: string
          evaluation_schema_version: string
          id: string
          interview_type: string
          job_id: string | null
          learner_id: string
          metrics_schema_version: string
          role_profile_id: string | null
          scoring_algorithm_version: string
          started_at: string | null
          status: string
          target_duration_minutes: number
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_question_index: number
          deleted_at?: string | null
          difficulty_level: string
          evaluation_schema_version: string
          id: string
          interview_type: string
          job_id?: string | null
          learner_id: string
          metrics_schema_version: string
          role_profile_id?: string | null
          scoring_algorithm_version: string
          started_at?: string | null
          status: string
          target_duration_minutes: number
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_question_index?: number
          deleted_at?: string | null
          difficulty_level?: string
          evaluation_schema_version?: string
          id?: string
          interview_type?: string
          job_id?: string | null
          learner_id?: string
          metrics_schema_version?: string
          role_profile_id?: string | null
          scoring_algorithm_version?: string
          started_at?: string | null
          status?: string
          target_duration_minutes?: number
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_role_profile_id_fkey"
            columns: ["role_profile_id"]
            isOneToOne: false
            referencedRelation: "role_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string | null
          created_at: string
          id: string
          raw_text: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          id: string
          raw_text: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          id?: string
          raw_text?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_edges: {
        Row: {
          created_at: string
          edge_type: string
          id: string
          source_topic_id: string
          target_topic_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          edge_type: string
          id: string
          source_topic_id: string
          target_topic_id: string
          updated_at?: string
          weight: number
        }
        Update: {
          created_at?: string
          edge_type?: string
          id?: string
          source_topic_id?: string
          target_topic_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_edges_source_topic_id_fkey"
            columns: ["source_topic_id"]
            isOneToOne: false
            referencedRelation: "knowledge_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_target_topic_id_fkey"
            columns: ["target_topic_id"]
            isOneToOne: false
            referencedRelation: "knowledge_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_topics: {
        Row: {
          answer_count: number
          average_score: number
          category: string
          created_at: string
          display_name: string
          id: string
          last_seen_at: string
          mastery_score: number
          normalized_name: string
          updated_at: string
        }
        Insert: {
          answer_count: number
          average_score: number
          category: string
          created_at?: string
          display_name: string
          id: string
          last_seen_at: string
          mastery_score: number
          normalized_name: string
          updated_at?: string
        }
        Update: {
          answer_count?: number
          average_score?: number
          category?: string
          created_at?: string
          display_name?: string
          id?: string
          last_seen_at?: string
          mastery_score?: number
          normalized_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      learner_topic_progress: {
        Row: {
          attempts: number
          average_score: number
          correct_attempts: number
          created_at: string
          id: string
          last_answer_id: string | null
          last_interview_id: string | null
          last_score: number
          learner_id: string
          mastery_score: number
          topic_id: string
          updated_at: string
        }
        Insert: {
          attempts: number
          average_score: number
          correct_attempts: number
          created_at?: string
          id: string
          last_answer_id?: string | null
          last_interview_id?: string | null
          last_score: number
          learner_id: string
          mastery_score: number
          topic_id: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          average_score?: number
          correct_attempts?: number
          created_at?: string
          id?: string
          last_answer_id?: string | null
          last_interview_id?: string | null
          last_score?: number
          learner_id?: string
          mastery_score?: number
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learner_topic_progress_last_answer_id_fkey"
            columns: ["last_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_topic_progress_last_interview_id_fkey"
            columns: ["last_interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "knowledge_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          category: string
          competency: string
          created_at: string
          difficulty: string
          expected_topics: Json
          follow_up_depth: number
          id: string
          interview_id: string
          interviewer_persona: string | null
          parent_question_id: string | null
          prompt_version: string
          question_source: string
          question_text: string
          question_type: string
          root_question_id: string | null
          sequence_number: number
          target_competency: string
          updated_at: string
        }
        Insert: {
          category: string
          competency: string
          created_at?: string
          difficulty: string
          expected_topics: Json
          follow_up_depth: number
          id: string
          interview_id: string
          interviewer_persona?: string | null
          parent_question_id?: string | null
          prompt_version: string
          question_source: string
          question_text: string
          question_type: string
          root_question_id?: string | null
          sequence_number: number
          target_competency: string
          updated_at?: string
        }
        Update: {
          category?: string
          competency?: string
          created_at?: string
          difficulty?: string
          expected_topics?: Json
          follow_up_depth?: number
          id?: string
          interview_id?: string
          interviewer_persona?: string | null
          parent_question_id?: string | null
          prompt_version?: string
          question_source?: string
          question_text?: string
          question_type?: string
          root_question_id?: string | null
          sequence_number?: number
          target_competency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_root_question_id_fkey"
            columns: ["root_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_profiles: {
        Row: {
          behavioral_competencies: Json
          created_at: string
          domain: string
          id: string
          interview_topics: Json
          job_id: string
          preferred_experience: Json
          prompt_version: string
          responsibilities: Json
          role_title: string
          schema_version: string
          seniority: string
          technical_skills: Json
          tools: Json
          updated_at: string
        }
        Insert: {
          behavioral_competencies: Json
          created_at?: string
          domain: string
          id: string
          interview_topics: Json
          job_id: string
          preferred_experience: Json
          prompt_version: string
          responsibilities: Json
          role_title: string
          schema_version: string
          seniority: string
          technical_skills: Json
          tools: Json
          updated_at?: string
        }
        Update: {
          behavioral_competencies?: Json
          created_at?: string
          domain?: string
          id?: string
          interview_topics?: Json
          job_id?: string
          preferred_experience?: Json
          prompt_version?: string
          responsibilities?: Json
          role_title?: string
          schema_version?: string
          seniority?: string
          technical_skills?: Json
          tools?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_profiles_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_memories: {
        Row: {
          confidence: number
          created_at: string
          entity_key: string
          entity_value: string
          id: string
          interview_id: string
          memory_type: string
          metadata_json: Json
          question_id: string | null
          quote: string | null
          turn_number: number
          updated_at: string
        }
        Insert: {
          confidence: number
          created_at?: string
          entity_key: string
          entity_value: string
          id: string
          interview_id: string
          memory_type: string
          metadata_json: Json
          question_id?: string | null
          quote?: string | null
          turn_number: number
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          entity_key?: string
          entity_value?: string
          id?: string
          interview_id?: string
          memory_type?: string
          metadata_json?: Json
          question_id?: string | null
          quote?: string | null
          turn_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_memories_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_memories_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      speech_metrics: {
        Row: {
          answer_id: string
          created_at: string
          filler_count: number
          filler_density: number
          filler_words_json: Json
          id: string
          pause_count: number
          pauses_json: Json
          schema_version: string
          speaking_duration_seconds: number
          total_pause_seconds: number
          total_words: number
          updated_at: string
          wpm: number
        }
        Insert: {
          answer_id: string
          created_at?: string
          filler_count: number
          filler_density: number
          filler_words_json: Json
          id: string
          pause_count: number
          pauses_json: Json
          schema_version: string
          speaking_duration_seconds: number
          total_pause_seconds: number
          total_words: number
          updated_at?: string
          wpm: number
        }
        Update: {
          answer_id?: string
          created_at?: string
          filler_count?: number
          filler_density?: number
          filler_words_json?: Json
          id?: string
          pause_count?: number
          pauses_json?: Json
          schema_version?: string
          speaking_duration_seconds?: number
          total_pause_seconds?: number
          total_words?: number
          updated_at?: string
          wpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "speech_metrics_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          answer_id: string
          created_at: string
          full_text: string
          id: string
          language: string
          model_provider: string
          model_version: string
          provider_confidence: number
          quality_label: string
          quality_notes: string
          quality_score: number
          schema_version: string
          segments_json: Json
          source_agreement_score: number | null
          updated_at: string
          word_count: number
          words_json: Json
        }
        Insert: {
          answer_id: string
          created_at?: string
          full_text: string
          id: string
          language: string
          model_provider: string
          model_version: string
          provider_confidence: number
          quality_label: string
          quality_notes: string
          quality_score: number
          schema_version: string
          segments_json: Json
          source_agreement_score?: number | null
          updated_at?: string
          word_count: number
          words_json: Json
        }
        Update: {
          answer_id?: string
          created_at?: string
          full_text?: string
          id?: string
          language?: string
          model_provider?: string
          model_version?: string
          provider_confidence?: number
          quality_label?: string
          quality_notes?: string
          quality_score?: number
          schema_version?: string
          segments_json?: Json
          source_agreement_score?: number | null
          updated_at?: string
          word_count?: number
          words_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_metrics: {
        Row: {
          analysis_duration_seconds: number
          answer_id: string
          capability_status: string
          created_at: string
          expression_confidence: number | null
          expression_signal: string
          eye_contact_ratio: number | null
          face_centering_score: number | null
          face_detected_ratio: number | null
          face_presence_events_json: Json
          frame_count: number
          id: string
          improvements_json: Json
          model_version: string
          multiple_people_ratio: number | null
          provider: string
          strengths_json: Json
          tracking_confidence: number | null
          updated_at: string
          valid_frame_count: number
          visual_communication_score: number | null
        }
        Insert: {
          analysis_duration_seconds: number
          answer_id: string
          capability_status: string
          created_at?: string
          expression_confidence?: number | null
          expression_signal: string
          eye_contact_ratio?: number | null
          face_centering_score?: number | null
          face_detected_ratio?: number | null
          face_presence_events_json: Json
          frame_count: number
          id: string
          improvements_json: Json
          model_version: string
          multiple_people_ratio?: number | null
          provider: string
          strengths_json: Json
          tracking_confidence?: number | null
          updated_at?: string
          valid_frame_count: number
          visual_communication_score?: number | null
        }
        Update: {
          analysis_duration_seconds?: number
          answer_id?: string
          capability_status?: string
          created_at?: string
          expression_confidence?: number | null
          expression_signal?: string
          eye_contact_ratio?: number | null
          face_centering_score?: number | null
          face_detected_ratio?: number | null
          face_presence_events_json?: Json
          frame_count?: number
          id?: string
          improvements_json?: Json
          model_version?: string
          multiple_people_ratio?: number | null
          provider?: string
          strengths_json?: Json
          tracking_confidence?: number | null
          updated_at?: string
          valid_frame_count?: number
          visual_communication_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vision_metrics_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

