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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip: string | null
          meta: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_post_revisions: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category_id: string | null
          content: Json | null
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          post_id: string
          reason: string | null
          revision_number: number
          seo_score: number | null
          slug: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          tags: string[]
          title: string | null
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: Json | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          post_id: string
          reason?: string | null
          revision_number: number
          seo_score?: number | null
          slug?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          tags?: string[]
          title?: string | null
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: Json | null
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          post_id?: string
          reason?: string | null
          revision_number?: number
          seo_score?: number | null
          slug?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          tags?: string[]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          category_id: string | null
          content: Json | null
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          last_editor_id: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          read_time: number
          scheduled_at: string | null
          seo_report: Json | null
          seo_score: number | null
          slug: string
          status: Database["public"]["Enums"]["post_status"]
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: Json | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          last_editor_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time?: number
          scheduled_at?: string | null
          seo_report?: Json | null
          seo_score?: number | null
          slug: string
          status?: Database["public"]["Enums"]["post_status"]
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          category_id?: string | null
          content?: Json | null
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          last_editor_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time?: number
          scheduled_at?: string | null
          seo_report?: Json | null
          seo_score?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["post_status"]
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_section_versions: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          note: string | null
          section_key: string
          title: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          id?: string
          note?: string | null
          section_key: string
          title?: string | null
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          note?: string | null
          section_key?: string
          title?: string | null
          version?: number
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          data: Json
          draft_data: Json | null
          id: string
          is_visible: boolean
          last_published_at: string | null
          last_saved_at: string | null
          last_saved_by: string | null
          section_key: string
          sort_order: number
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          data?: Json
          draft_data?: Json | null
          id?: string
          is_visible?: boolean
          last_published_at?: string | null
          last_saved_at?: string | null
          last_saved_by?: string | null
          section_key: string
          sort_order?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          data?: Json
          draft_data?: Json | null
          id?: string
          is_visible?: boolean
          last_published_at?: string | null
          last_saved_at?: string | null
          last_saved_by?: string | null
          section_key?: string
          sort_order?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ip_lists: {
        Row: {
          created_at: string
          id: string
          ip: string
          list_type: string
          note: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          list_type: string
          note?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          list_type?: string
          note?: string | null
        }
        Relationships: []
      }
      media: {
        Row: {
          alt: string | null
          caption: string | null
          created_at: string
          description: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          path: string
          size_bytes: number | null
          title: string | null
          updated_at: string
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          caption?: string | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          path: string
          size_bytes?: number | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          caption?: string | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          path?: string
          size_bytes?: number | null
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      media_usage: {
        Row: {
          context: string
          context_id: string
          created_at: string
          field: string
          id: string
          media_id: string
        }
        Insert: {
          context: string
          context_id: string
          created_at?: string
          field: string
          id?: string
          media_id: string
        }
        Update: {
          context?: string
          context_id?: string
          created_at?: string
          field?: string
          id?: string
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_usage_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          group_name: string | null
          href: string
          id: string
          label: string
          location: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          group_name?: string | null
          href: string
          id?: string
          label: string
          location: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          group_name?: string | null
          href?: string
          id?: string
          label?: string
          location?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          active: boolean
          code: number
          created_at: string
          destination: string
          hits: number
          id: string
          last_hit_at: string | null
          notes: string | null
          preserve_query: boolean
          source: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: number
          created_at?: string
          destination: string
          hits?: number
          id?: string
          last_hit_at?: string | null
          notes?: string | null
          preserve_query?: boolean
          source: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: number
          created_at?: string
          destination?: string
          hits?: number
          id?: string
          last_hit_at?: string | null
          notes?: string | null
          preserve_query?: boolean
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          data: Json
          id: number
          updated_at: string
        }
        Insert: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: number
          updated_at?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_redirect_hit: { Args: { _source: string }; Returns: undefined }
      publish_due_scheduled_posts: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "super_admin" | "editor" | "author"
      post_status: "draft" | "published" | "scheduled" | "archived"
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
      app_role: ["super_admin", "editor", "author"],
      post_status: ["draft", "published", "scheduled", "archived"],
    },
  },
} as const
