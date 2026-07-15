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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      articles: {
        Row: {
          article_slug: string
          author_id: string | null
          author_name: string | null
          body: string
          category_slug: string
          created_at: string
          hero_image: string | null
          id: string
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          source_published_at: string | null
          source_url: string | null
          subtitle: string | null
          summary: string
          tags: string[] | null
          thread_id: string | null
          title: string
          twitter_post: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          article_slug: string
          author_id?: string | null
          author_name?: string | null
          body: string
          category_slug: string
          created_at?: string
          hero_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          source_published_at?: string | null
          source_url?: string | null
          subtitle?: string | null
          summary: string
          tags?: string[] | null
          thread_id?: string | null
          title: string
          twitter_post?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          article_slug?: string
          author_id?: string | null
          author_name?: string | null
          body?: string
          category_slug?: string
          created_at?: string
          hero_image?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          source_published_at?: string | null
          source_url?: string | null
          subtitle?: string | null
          summary?: string
          tags?: string[] | null
          thread_id?: string | null
          title?: string
          twitter_post?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "story_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_crime_stats: {
        Row: {
          city_name: string
          created_at: string
          crime_count: number
          id: string
          last_incident_at: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          city_name: string
          created_at?: string
          crime_count?: number
          id?: string
          last_incident_at?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          city_name?: string
          created_at?: string
          crime_count?: number
          id?: string
          last_incident_at?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          article_id: string
          comment_text: string
          commenter_email: string | null
          commenter_name: string
          created_at: string
          id: string
          is_approved: boolean
          is_verified: boolean
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          article_id: string
          comment_text: string
          commenter_email?: string | null
          commenter_name: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_verified?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          article_id?: string
          comment_text?: string
          commenter_email?: string | null
          commenter_name?: string
          created_at?: string
          id?: string
          is_approved?: boolean
          is_verified?: boolean
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      crime_type_stats: {
        Row: {
          created_at: string
          crime_count: number
          crime_type: string
          display_name: string
          id: string
          last_incident_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crime_count?: number
          crime_type: string
          display_name: string
          id?: string
          last_incident_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crime_count?: number
          crime_type?: string
          display_name?: string
          id?: string
          last_incident_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fraud_accounts: {
        Row: {
          account_handle: string | null
          account_link: string | null
          account_name: string
          created_at: string
          id: string
          last_reported_at: string | null
          moderator_note: string | null
          platform: string
          reports_count: number
          status: string
          total_reported_loss: number
          updated_at: string
          views_count: number
        }
        Insert: {
          account_handle?: string | null
          account_link?: string | null
          account_name: string
          created_at?: string
          id?: string
          last_reported_at?: string | null
          moderator_note?: string | null
          platform: string
          reports_count?: number
          status?: string
          total_reported_loss?: number
          updated_at?: string
          views_count?: number
        }
        Update: {
          account_handle?: string | null
          account_link?: string | null
          account_name?: string
          created_at?: string
          id?: string
          last_reported_at?: string | null
          moderator_note?: string | null
          platform?: string
          reports_count?: number
          status?: string
          total_reported_loss?: number
          updated_at?: string
          views_count?: number
        }
        Relationships: []
      }
      fraud_admin_notes: {
        Row: {
          admin_name: string | null
          admin_user_id: string | null
          created_at: string
          fraud_account_id: string
          id: string
          note: string
        }
        Insert: {
          admin_name?: string | null
          admin_user_id?: string | null
          created_at?: string
          fraud_account_id: string
          id?: string
          note: string
        }
        Update: {
          admin_name?: string | null
          admin_user_id?: string | null
          created_at?: string
          fraud_account_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_admin_notes_fraud_account_id_fkey"
            columns: ["fraud_account_id"]
            isOneToOne: false
            referencedRelation: "fraud_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_reports: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          description: string
          evidence_files: string[] | null
          fraud_account_id: string
          id: string
          incident_date: string
          ip_address: string | null
          is_public: boolean
          payment_method: string
          reference_id: string
          region: string | null
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description: string
          evidence_files?: string[] | null
          fraud_account_id: string
          id?: string
          incident_date: string
          ip_address?: string | null
          is_public?: boolean
          payment_method: string
          reference_id?: string
          region?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string
          evidence_files?: string[] | null
          fraud_account_id?: string
          id?: string
          incident_date?: string
          ip_address?: string | null
          is_public?: boolean
          payment_method?: string
          reference_id?: string
          region?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_reports_fraud_account_id_fkey"
            columns: ["fraud_account_id"]
            isOneToOne: false
            referencedRelation: "fraud_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_search_analytics: {
        Row: {
          created_at: string
          id: string
          query: string
          results_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          results_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          results_count?: number
        }
        Relationships: []
      }
      ingestion_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          source: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      newsroom_articles: {
        Row: {
          created_at: string
          error_message: string | null
          generated_article_id: string | null
          id: string
          image_style: string | null
          matched_thread_id: string | null
          original_headline: string
          original_summary: string
          processing_status: string
          run_id: string
          source_name: string
          source_published_at: string | null
          source_url: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          generated_article_id?: string | null
          id?: string
          image_style?: string | null
          matched_thread_id?: string | null
          original_headline: string
          original_summary: string
          processing_status?: string
          run_id: string
          source_name: string
          source_published_at?: string | null
          source_url?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          generated_article_id?: string | null
          id?: string
          image_style?: string | null
          matched_thread_id?: string | null
          original_headline?: string
          original_summary?: string
          processing_status?: string
          run_id?: string
          source_name?: string
          source_published_at?: string | null
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_articles_generated_article_id_fkey"
            columns: ["generated_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_articles_matched_thread_id_fkey"
            columns: ["matched_thread_id"]
            isOneToOne: false
            referencedRelation: "story_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsroom_articles_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "newsroom_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      newsroom_runs: {
        Row: {
          articles_created: number
          articles_found: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          started_at: string
          status: string
          trigger_type: string
        }
        Insert: {
          articles_created?: number
          articles_found?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          trigger_type: string
        }
        Update: {
          articles_created?: number
          articles_found?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsroom_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posted_articles: {
        Row: {
          article_title: string
          article_url: string
          created_at: string
          error_message: string | null
          id: string
          post_text: string
          posted_at: string | null
          posted_to_x: boolean
          status: string
          x_post_id: string | null
        }
        Insert: {
          article_title: string
          article_url: string
          created_at?: string
          error_message?: string | null
          id?: string
          post_text: string
          posted_at?: string | null
          posted_to_x?: boolean
          status?: string
          x_post_id?: string | null
        }
        Update: {
          article_title?: string
          article_url?: string
          created_at?: string
          error_message?: string | null
          id?: string
          post_text?: string
          posted_at?: string | null
          posted_to_x?: boolean
          status?: string
          x_post_id?: string | null
        }
        Relationships: []
      }
      processed_tweets: {
        Row: {
          author_username: string
          created_at: string
          error_message: string | null
          generated_article_id: string | null
          id: string
          processing_status: string
          tweet_created_at: string | null
          tweet_id: string
          tweet_media_urls: string[] | null
          tweet_text: string
        }
        Insert: {
          author_username: string
          created_at?: string
          error_message?: string | null
          generated_article_id?: string | null
          id?: string
          processing_status?: string
          tweet_created_at?: string | null
          tweet_id: string
          tweet_media_urls?: string[] | null
          tweet_text: string
        }
        Update: {
          author_username?: string
          created_at?: string
          error_message?: string | null
          generated_article_id?: string | null
          id?: string
          processing_status?: string
          tweet_created_at?: string | null
          tweet_id?: string
          tweet_media_urls?: string[] | null
          tweet_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_tweets_generated_article_id_fkey"
            columns: ["generated_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rejected_items: {
        Row: {
          confidence: number | null
          detail: string | null
          id: string
          original_headline: string
          original_url: string | null
          reason: string
          rejected_at: string
          source: string | null
        }
        Insert: {
          confidence?: number | null
          detail?: string | null
          id?: string
          original_headline: string
          original_url?: string | null
          reason: string
          rejected_at?: string
          source?: string | null
        }
        Update: {
          confidence?: number | null
          detail?: string | null
          id?: string
          original_headline?: string
          original_url?: string | null
          reason?: string
          rejected_at?: string
          source?: string | null
        }
        Relationships: []
      }
      run_logs: {
        Row: {
          created_at: string
          id: string
          message: string | null
          run_time: string
          selected_article_url: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          run_time?: string
          selected_article_url?: string | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          run_time?: string
          selected_article_url?: string | null
          status?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label?: string | null
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      sources: {
        Row: {
          active: boolean
          created_at: string
          domain: string
          id: string
          name: string
          requires_topic_gate: boolean
          rss_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          domain: string
          id?: string
          name: string
          requires_topic_gate?: boolean
          rss_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          domain?: string
          id?: string
          name?: string
          requires_topic_gate?: boolean
          rss_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      story_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_live: boolean
          live_ended_at: string | null
          live_started_at: string | null
          summary: string | null
          thread_slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          is_live?: boolean
          live_ended_at?: string | null
          live_started_at?: string | null
          summary?: string | null
          thread_slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_live?: boolean
          live_ended_at?: string | null
          live_started_at?: string | null
          summary?: string | null
          thread_slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      thread_updates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_key_point: boolean
          key_point_label: string | null
          published_at: string
          source_article_id: string | null
          thread_id: string
          title: string
          twitter_post: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_key_point?: boolean
          key_point_label?: string | null
          published_at?: string
          source_article_id?: string | null
          thread_id: string
          title: string
          twitter_post?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_key_point?: boolean
          key_point_label?: string | null
          published_at?: string
          source_article_id?: string | null
          thread_id?: string
          title?: string
          twitter_post?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thread_updates_source_article_id_fkey"
            columns: ["source_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_updates_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "story_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          article_id: string
          code: string
          comment_text: string
          commenter_name: string
          created_at: string
          email: string
          expire_at: string
          id: string
          ip_address: string | null
          used: boolean
        }
        Insert: {
          article_id: string
          code: string
          comment_text: string
          commenter_name: string
          created_at?: string
          email: string
          expire_at: string
          id?: string
          ip_address?: string | null
          used?: boolean
        }
        Update: {
          article_id?: string
          code?: string
          comment_text?: string
          commenter_name?: string
          created_at?: string
          email?: string
          expire_at?: string
          id?: string
          ip_address?: string | null
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_comments: {
        Row: {
          article_id: string | null
          comment_text: string | null
          commenter_name: string | null
          created_at: string | null
          id: string | null
          is_approved: boolean | null
          is_verified: boolean | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          article_id?: string | null
          comment_text?: string | null
          commenter_name?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          article_id?: string | null
          comment_text?: string | null
          commenter_name?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "public_comments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_audit_log: {
        Args: {
          _action: string
          _details?: Json
          _resource_id?: string
          _resource_type: string
        }
        Returns: string
      }
      generate_article_slug: { Args: { title: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_fraud_account_views: {
        Args: { account_id: string }
        Returns: undefined
      }
      increment_view_count: { Args: { article_id: string }; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_fraud_report: {
        Args: {
          p_account_handle?: string
          p_account_link?: string
          p_account_name: string
          p_amount?: number
          p_currency?: string
          p_description?: string
          p_evidence_files?: string[]
          p_incident_date?: string
          p_payment_method?: string
          p_platform: string
          p_reference_id?: string
          p_region?: string
          p_reporter_email?: string
          p_reporter_name?: string
          p_reporter_phone?: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "contributor" | "reader"
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
    Enums: {
      app_role: ["admin", "editor", "contributor", "reader"],
    },
  },
} as const
