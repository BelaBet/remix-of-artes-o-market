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
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      artisan_billing: {
        Row: {
          account_check_digit: string | null
          account_number: string | null
          account_type: string | null
          artisan_user_id: string
          bank_code: string | null
          branch_number: string | null
          can_withdraw: boolean
          commission_bps: number | null
          created_at: string
          holder_document: string | null
          holder_name: string | null
          kyc_status: string
          kyc_url: string | null
          kyc_url_expires_at: string | null
          pagarme_recipient_id: string | null
          recipient_status: string | null
          updated_at: string
        }
        Insert: {
          account_check_digit?: string | null
          account_number?: string | null
          account_type?: string | null
          artisan_user_id: string
          bank_code?: string | null
          branch_number?: string | null
          can_withdraw?: boolean
          commission_bps?: number | null
          created_at?: string
          holder_document?: string | null
          holder_name?: string | null
          kyc_status?: string
          kyc_url?: string | null
          kyc_url_expires_at?: string | null
          pagarme_recipient_id?: string | null
          recipient_status?: string | null
          updated_at?: string
        }
        Update: {
          account_check_digit?: string | null
          account_number?: string | null
          account_type?: string | null
          artisan_user_id?: string
          bank_code?: string | null
          branch_number?: string | null
          can_withdraw?: boolean
          commission_bps?: number | null
          created_at?: string
          holder_document?: string | null
          holder_name?: string | null
          kyc_status?: string
          kyc_url?: string | null
          kyc_url_expires_at?: string | null
          pagarme_recipient_id?: string | null
          recipient_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          created_at: string
          error: string | null
          id: string
          order_id: string | null
          recipient: string
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          recipient: string
          status?: string
          template: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          order_id?: string | null
          recipient?: string
          status?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          artisan_amount_cents: number
          artisan_user_id: string | null
          commission_bps: number
          created_at: string
          id: string
          order_id: string
          platform_fee_cents: number
          product_id: string | null
          product_name: string
          quantity: number
          total_cents: number
          unit_price_cents: number
        }
        Insert: {
          artisan_amount_cents: number
          artisan_user_id?: string | null
          commission_bps: number
          created_at?: string
          id?: string
          order_id: string
          platform_fee_cents: number
          product_id?: string | null
          product_name: string
          quantity: number
          total_cents: number
          unit_price_cents: number
        }
        Update: {
          artisan_amount_cents?: number
          artisan_user_id?: string | null
          commission_bps?: number
          created_at?: string
          id?: string
          order_id?: string
          platform_fee_cents?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_cents?: number
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          boleto_barcode: string | null
          boleto_url: string | null
          buyer_document: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          buyer_user_id: string | null
          canceled_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          pagarme_charge_id: string | null
          pagarme_order_id: string | null
          paid_at: string | null
          payment_method: string
          pix_expires_at: string | null
          pix_qr_code: string | null
          pix_qr_code_url: string | null
          refund_reason: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cents: number
          status: string
          subtotal_cents: number
          total_cents: number
          tracking_carrier: string | null
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          boleto_barcode?: string | null
          boleto_url?: string | null
          buyer_document: string
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          buyer_user_id?: string | null
          canceled_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          paid_at?: string | null
          payment_method: string
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          refund_reason?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: string
          subtotal_cents: number
          total_cents: number
          tracking_carrier?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          boleto_barcode?: string | null
          boleto_url?: string | null
          buyer_document?: string
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          buyer_user_id?: string | null
          canceled_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          pagarme_charge_id?: string | null
          pagarme_order_id?: string | null
          paid_at?: string | null
          payment_method?: string
          pix_expires_at?: string | null
          pix_qr_code?: string | null
          pix_qr_code_url?: string | null
          refund_reason?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cents?: number
          status?: string
          subtotal_cents?: number
          total_cents?: number
          tracking_carrier?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          default_commission_bps: number
          id: boolean
          support_email: string | null
          updated_at: string
        }
        Insert: {
          default_commission_bps?: number
          id?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          default_commission_bps?: number
          id?: boolean
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          artisan_user_id: string
          category: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_cents: number
          state: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          artisan_user_id: string
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_cents: number
          state?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          artisan_user_id?: string
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_cents?: number
          state?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          shop_name: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          shop_name?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          shop_name?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          artisan_user_id: string
          comment: string | null
          created_at: string
          id: string
          product_name: string | null
          rating: number
          reviewer_city: string | null
          reviewer_name: string
        }
        Insert: {
          artisan_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          product_name?: string | null
          rating: number
          reviewer_city?: string | null
          reviewer_name: string
        }
        Update: {
          artisan_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          product_name?: string | null
          rating?: number
          reviewer_city?: string | null
          reviewer_name?: string
        }
        Relationships: []
      }
      shipping_rates: {
        Row: {
          estimated_days: number
          flat_cents: number
          free_above_cents: number | null
          id: string
          region: string
          updated_at: string
        }
        Insert: {
          estimated_days?: number
          flat_cents: number
          free_above_cents?: number | null
          id?: string
          region: string
          updated_at?: string
        }
        Update: {
          estimated_days?: number
          flat_cents?: number
          free_above_cents?: number | null
          id?: string
          region?: string
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
      artesao_pode_vender: {
        Args: { _artisan_user_id: string }
        Returns: boolean
      }
      calcular_frete: {
        Args: { _subtotal_cents: number; _uf: string }
        Returns: number
      }
      comissao_bps: { Args: { _artisan_user_id: string }; Returns: number }
      decrement_stock: {
        Args: { _product_id: string; _qty: number }
        Returns: number
      }
      promote_to_admin: { Args: { _email: string }; Returns: string }
      regiao_da_uf: { Args: { _uf: string }; Returns: string }
    }
    Enums: {
      app_role: "buyer" | "artisan" | "admin"
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
      app_role: ["buyer", "artisan", "admin"],
    },
  },
} as const
