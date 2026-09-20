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
      contact_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string
          plan_interest: string | null
          property_type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone: string
          plan_interest?: string | null
          property_type?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
          plan_interest?: string | null
          property_type?: string
        }
        Relationships: []
      }
      contract_acceptances: {
        Row: {
          accept_ip: string | null
          accepted_at: string
          contract_code: string | null
          contract_version: string
          cpf_cnpj: string
          created_at: string
          email: string | null
          fields: Json
          full_name: string
          id: string
          monthly_price_cents: number | null
          payment_method: string
          periodicity: string
          phone: string | null
          plan_name: string
          plan_slug: string
          service_address: string
          subscription_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accept_ip?: string | null
          accepted_at?: string
          contract_code?: string | null
          contract_version?: string
          cpf_cnpj: string
          created_at?: string
          email?: string | null
          fields?: Json
          full_name: string
          id?: string
          monthly_price_cents?: number | null
          payment_method?: string
          periodicity?: string
          phone?: string | null
          plan_name: string
          plan_slug: string
          service_address: string
          subscription_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accept_ip?: string | null
          accepted_at?: string
          contract_code?: string | null
          contract_version?: string
          cpf_cnpj?: string
          created_at?: string
          email?: string | null
          fields?: Json
          full_name?: string
          id?: string
          monthly_price_cents?: number | null
          payment_method?: string
          periodicity?: string
          phone?: string | null
          plan_name?: string
          plan_slug?: string
          service_address?: string
          subscription_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_acceptances_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          id: string
          mode: string
          provider: string
          updated_at: string
        }
        Insert: {
          id?: string
          mode?: string
          provider?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mode?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          checkout_url: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          method: string | null
          paid_at: string | null
          provider: string | null
          provider_mode: string | null
          provider_payment_id: string | null
          reference: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          checkout_url?: string | null
          created_at?: string
          description?: string
          due_date: string
          id?: string
          method?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_mode?: string | null
          provider_payment_id?: string | null
          reference?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          checkout_url?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          method?: string | null
          paid_at?: string | null
          provider?: string | null
          provider_mode?: string | null
          provider_payment_id?: string | null
          reference?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          created_at: string
          price_cents: number | null
          price_note: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          price_cents?: number | null
          price_note?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          price_cents?: number | null
          price_note?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          address_number: string | null
          city_uf: string | null
          client_type: string
          complement: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          neighborhood: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          city_uf?: string | null
          client_type?: string
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          neighborhood?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_number?: string | null
          city_uf?: string | null
          client_type?: string
          complement?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          neighborhood?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          address: string
          cnpj: string | null
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          notes: string | null
          property_name: string
          property_type: string
          referrer_id: string
          reward_cents: number
          reward_status: string
          status: string
          updated_at: string
        }
        Insert: {
          address: string
          cnpj?: string | null
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_name: string
          property_type?: string
          referrer_id: string
          reward_cents?: number
          reward_status?: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string
          cnpj?: string | null
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          property_name?: string
          property_type?: string
          referrer_id?: string
          reward_cents?: number
          reward_status?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: string
          request_id: string | null
          storage_path: string
          uploaded_by: string | null
          user_id: string
          work_order_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          request_id?: string | null
          storage_path: string
          uploaded_by?: string | null
          user_id: string
          work_order_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: string
          request_id?: string | null
          storage_path?: string
          uploaded_by?: string | null
          user_id?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_photos_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          category: string
          client_responded_at: string | null
          client_response_note: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          materials_needed: string | null
          preferred_date: string | null
          request_code: string | null
          schedule_status: string
          scheduled_at: string | null
          scheduled_technician: string | null
          status: string
          team_message: string | null
          title: string
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          category?: string
          client_responded_at?: string | null
          client_response_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          materials_needed?: string | null
          preferred_date?: string | null
          request_code?: string | null
          schedule_status?: string
          scheduled_at?: string | null
          scheduled_technician?: string | null
          status?: string
          team_message?: string | null
          title: string
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          category?: string
          client_responded_at?: string | null
          client_response_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          materials_needed?: string | null
          preferred_date?: string | null
          request_code?: string | null
          schedule_status?: string
          scheduled_at?: string | null
          scheduled_technician?: string | null
          status?: string
          team_message?: string | null
          title?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          activation_requested_at: string | null
          contract_notes: string | null
          contract_number: string | null
          created_at: string
          id: string
          monthly_price_cents: number | null
          next_billing_date: string | null
          payment_choice: string | null
          payment_method: string | null
          plan_name: string
          plan_slug: string
          provider: string | null
          provider_mode: string | null
          provider_subscription_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activation_requested_at?: string | null
          contract_notes?: string | null
          contract_number?: string | null
          created_at?: string
          id?: string
          monthly_price_cents?: number | null
          next_billing_date?: string | null
          payment_choice?: string | null
          payment_method?: string | null
          plan_name: string
          plan_slug: string
          provider?: string | null
          provider_mode?: string | null
          provider_subscription_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activation_requested_at?: string | null
          contract_notes?: string | null
          contract_number?: string | null
          created_at?: string
          id?: string
          monthly_price_cents?: number | null
          next_billing_date?: string | null
          payment_choice?: string | null
          payment_method?: string | null
          plan_name?: string
          plan_slug?: string
          provider?: string | null
          provider_mode?: string | null
          provider_subscription_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
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
      work_orders: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          hours_spent: number | null
          id: string
          os_number: string
          request_id: string | null
          scheduled_for: string | null
          status: string
          technician: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          hours_spent?: number | null
          id?: string
          os_number: string
          request_id?: string | null
          scheduled_for?: string | null
          status?: string
          technician?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          hours_spent?: number | null
          id?: string
          os_number?: string
          request_id?: string | null
          scheduled_for?: string | null
          status?: string
          technician?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_contract_code: { Args: never; Returns: string }
      generate_request_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
