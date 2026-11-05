export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          penance_every: number
          penance_mode: Database["public"]["Enums"]["penance_mode"]
          timezone: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          penance_every?: number
          penance_mode?: Database["public"]["Enums"]["penance_mode"]
          timezone?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          penance_every?: number
          penance_mode?: Database["public"]["Enums"]["penance_mode"]
          timezone?: string
        }
        Relationships: []
      }
      month_closures: {
        Row: {
          closed_at: string
          group_id: string
          month: string
          snapshot: Json
        }
        Insert: {
          closed_at?: string
          group_id: string
          month: string
          snapshot: Json
        }
        Update: {
          closed_at?: string
          group_id?: string
          month?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "month_closures_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      penance_assignments: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          custom: boolean
          custom_text: string | null
          decided_at: string | null
          decided_by: string | null
          done_at: string | null
          group_id: string
          id: string
          kind: Database["public"]["Enums"]["penance_kind"]
          month: string
          penance_id: string | null
          profile_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          threshold: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          custom?: boolean
          custom_text?: string | null
          decided_at?: string | null
          decided_by?: string | null
          done_at?: string | null
          group_id: string
          id?: string
          kind: Database["public"]["Enums"]["penance_kind"]
          month: string
          penance_id?: string | null
          profile_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          threshold?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          custom?: boolean
          custom_text?: string | null
          decided_at?: string | null
          decided_by?: string | null
          done_at?: string | null
          group_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["penance_kind"]
          month?: string
          penance_id?: string | null
          profile_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "penance_assignments_decided_by_group_id_fkey"
            columns: ["decided_by", "group_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "penance_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penance_assignments_penance_id_group_id_fkey"
            columns: ["penance_id", "group_id"]
            isOneToOne: false
            referencedRelation: "penances"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "penance_assignments_profile_id_group_id_fkey"
            columns: ["profile_id", "group_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      penances: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          id: string
          kind: Database["public"]["Enums"]["penance_kind"]
          text: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          id?: string
          kind: Database["public"]["Enums"]["penance_kind"]
          text: string
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["penance_kind"]
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "penances_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          color: Database["public"]["Enums"]["girl_color"]
          created_at: string
          display_name: string
          group_id: string
          id: string
          last_seen_closure: string | null
          role: Database["public"]["Enums"]["profile_role"]
        }
        Insert: {
          avatar_url?: string | null
          color: Database["public"]["Enums"]["girl_color"]
          created_at?: string
          display_name: string
          group_id: string
          id: string
          last_seen_closure?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Update: {
          avatar_url?: string | null
          color?: Database["public"]["Enums"]["girl_color"]
          created_at?: string
          display_name?: string
          group_id?: string
          id?: string
          last_seen_closure?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      push_outbox: {
        Row: {
          assignment_id: string | null
          created_at: string
          event: string
          group_id: string
          id: number
          month: string | null
          sent_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          created_at?: string
          event: string
          group_id: string
          id?: never
          month?: string | null
          sent_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          created_at?: string
          event?: string
          group_id?: string
          id?: never
          month?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_outbox_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "penance_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_outbox_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          group_id: string
          id: string
          p256dh: string
          profile_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          group_id: string
          id?: string
          p256dh: string
          profile_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          group_id?: string
          id?: string
          p256dh?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_group_id_fkey"
            columns: ["profile_id", "group_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      stamps: {
        Row: {
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          month: string
          profile_id: string
          voided_at: string | null
          voided_by: string | null
          word_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          month?: string
          profile_id: string
          voided_at?: string | null
          voided_by?: string | null
          word_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          month?: string
          profile_id?: string
          voided_at?: string | null
          voided_by?: string | null
          word_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stamps_created_by_group_id_fkey"
            columns: ["created_by", "group_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "stamps_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamps_profile_id_group_id_fkey"
            columns: ["profile_id", "group_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "stamps_voided_by_group_id_fkey"
            columns: ["voided_by", "group_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "stamps_word_id_group_id_fkey"
            columns: ["word_id", "group_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
      words: {
        Row: {
          active: boolean
          created_at: string
          group_id: string
          icon: Database["public"]["Enums"]["word_icon"]
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_id: string
          icon: Database["public"]["Enums"]["word_icon"]
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          group_id?: string
          icon?: Database["public"]["Enums"]["word_icon"]
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "words_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      monthly_board: {
        Row: {
          group_id: string | null
          month: string | null
          profile_id: string | null
          stamps: number | null
          word_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stamps_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stamps_profile_id_group_id_fkey"
            columns: ["profile_id", "group_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id", "group_id"]
          },
          {
            foreignKeyName: "stamps_word_id_group_id_fkey"
            columns: ["word_id", "group_id"]
            isOneToOne: false
            referencedRelation: "words"
            referencedColumns: ["id", "group_id"]
          },
        ]
      }
    }
    Functions: {
      auth_email_taken: { Args: { p_email: string }; Returns: boolean }
      claim_push_outbox: {
        Args: { p_limit?: number }
        Returns: {
          assignment_id: string | null
          created_at: string
          event: string
          group_id: string
          id: number
          month: string | null
          sent_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "push_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      close_month: {
        Args: { p_group: string; p_month: string }
        Returns: {
          closed_at: string
          group_id: string
          month: string
          snapshot: Json
        }
        SetofOptions: {
          from: "*"
          to: "month_closures"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      close_pending_months: {
        Args: never
        Returns: {
          closed_group: string
          closed_month: string
        }[]
      }
      create_group: {
        Args: {
          p_avatar: string
          p_color: Database["public"]["Enums"]["girl_color"]
          p_display_name: string
          p_group_name: string
          p_user: string
        }
        Returns: {
          avatar_url: string | null
          color: Database["public"]["Enums"]["girl_color"]
          created_at: string
          display_name: string
          group_id: string
          id: string
          last_seen_closure: string | null
          role: Database["public"]["Enums"]["profile_role"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_invite_code: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      join_group: {
        Args: {
          p_avatar: string
          p_code: string
          p_color: Database["public"]["Enums"]["girl_color"]
          p_display_name: string
          p_user: string
        }
        Returns: {
          avatar_url: string | null
          color: Database["public"]["Enums"]["girl_color"]
          created_at: string
          display_name: string
          group_id: string
          id: string
          last_seen_closure: string | null
          role: Database["public"]["Enums"]["profile_role"]
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      month_start: { Args: { p_ts: string; p_tz: string }; Returns: string }
      month_totals: {
        Args: { p_group: string; p_month: string }
        Returns: {
          color: Database["public"]["Enums"]["girl_color"]
          display_name: string
          profile_id: string
          total: number
        }[]
      }
      my_group_id: { Args: never; Returns: string }
      preview_invite: { Args: { p_code: string }; Returns: Json }
      regenerate_invite_code: { Args: never; Returns: string }
      seed_group_defaults: { Args: { p_group: string }; Returns: undefined }
    }
    Enums: {
      assignment_status: "pending" | "done"
      girl_color:
        | "fucsia"
        | "blu"
        | "verde"
        | "viola"
        | "arancio"
        | "petrolio"
        | "ocra"
        | "ardesia"
      penance_kind: "small" | "monthly"
      penance_mode: "deck" | "custom"
      profile_role: "admin" | "member"
      word_icon:
        | "peperoncino"
        | "aeroplano"
        | "nuvola"
        | "bomba"
        | "fulmine"
        | "asterisco"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_status: ["pending", "done"],
      girl_color: [
        "fucsia",
        "blu",
        "verde",
        "viola",
        "arancio",
        "petrolio",
        "ocra",
        "ardesia",
      ],
      penance_kind: ["small", "monthly"],
      penance_mode: ["deck", "custom"],
      profile_role: ["admin", "member"],
      word_icon: [
        "peperoncino",
        "aeroplano",
        "nuvola",
        "bomba",
        "fulmine",
        "asterisco",
      ],
    },
  },
} as const

