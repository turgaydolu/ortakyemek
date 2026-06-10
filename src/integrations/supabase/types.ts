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
      campaign_participants: {
        Row: {
          campaign_id: string
          id: string
          joined_at: string
          quantity: number
          store_id: string | null
          user_id: string
          selected_delivery_time: string | null
        }
        Insert: {
          campaign_id: string
          id?: string
          joined_at?: string
          quantity?: number
          store_id?: string | null
          user_id: string
          selected_delivery_time?: string | null
        }
        Update: {
          campaign_id?: string
          id?: string
          joined_at?: string
          quantity?: number
          store_id?: string | null
          user_id?: string
          selected_delivery_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          current_participants: number
          description: string | null
          expires_at: string
          free_delivery: boolean
          id: string
          item_name: string
          price: number
          restaurant_id: string
          status: Database["public"]["Enums"]["campaign_status"]
          target_participants: number
          title: string
          updated_at: string
          delivery_time: string | null
          delivery_time_2: string | null
          delivery_method: string | null
        }
        Insert: {
          created_at?: string
          current_participants?: number
          description?: string | null
          expires_at: string
          free_delivery?: boolean
          id?: string
          item_name: string
          price: number
          restaurant_id: string
          status?: Database["public"]["Enums"]["campaign_status"]
          target_participants: number
          title: string
          updated_at?: string
          delivery_time?: string | null
          delivery_time_2?: string | null
          delivery_method?: string | null
        }
        Update: {
          created_at?: string
          current_participants?: number
          description?: string | null
          expires_at?: string
          free_delivery?: boolean
          id?: string
          item_name?: string
          price?: number
          restaurant_id?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          target_participants?: number
          title?: string
          updated_at?: string
          delivery_time?: string | null
          delivery_time_2?: string | null
          delivery_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          available: boolean
          category: string | null
          combo_price: number | null
          created_at: string
          description: string | null
          extras: Json | null
          id: string
          image_url: string | null
          mall_delivery_price: number | null
          dine_in_price: number | null
          name: string
          price: number
          restaurant_id: string
          takeaway_price: number | null
          updated_at: string
        }
        Insert: {
          available?: boolean
          category?: string | null
          combo_price?: number | null
          created_at?: string
          description?: string | null
          extras?: Json | null
          id?: string
          image_url?: string | null
          mall_delivery_price?: number | null
          dine_in_price?: number | null
          name: string
          price: number
          restaurant_id: string
          takeaway_price?: number | null
          updated_at?: string
        }
        Update: {
          available?: boolean
          category?: string | null
          combo_price?: number | null
          created_at?: string
          description?: string | null
          extras?: Json | null
          id?: string
          image_url?: string | null
          mall_delivery_price?: number | null
          dine_in_price?: number | null
          name?: string
          price?: number
          restaurant_id?: string
          takeaway_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          event_type: string
          is_enabled: boolean
          title_template: string
          body_template: string
        }
        Insert: {
          event_type: string
          is_enabled?: boolean
          title_template: string
          body_template: string
        }
        Update: {
          event_type?: string
          is_enabled?: boolean
          title_template?: string
          body_template?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          broadcast: boolean
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          broadcast?: boolean
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          broadcast?: boolean
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          extras: Json | null
          id: string
          item_name: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          extras?: Json | null
          id?: string
          item_name: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          extras?: Json | null
          id?: string
          item_name?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          approved_at: string | null
          campaign_id: string | null
          created_at: string
          delivered_at: string | null
          delivery_deadline: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id: string
          notes: string | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          store_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          id?: string
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          campaign_id?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          id?: string
          notes?: string | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          onboarded: boolean
          phone: string | null
          restaurant_id: string | null
          store_id: string | null
          updated_at: string
          approved: boolean
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          onboarded?: boolean
          phone?: string | null
          restaurant_id?: string | null
          store_id?: string | null
          updated_at?: string
          approved?: boolean
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          onboarded?: boolean
          phone?: string | null
          restaurant_id?: string | null
          store_id?: string | null
          updated_at?: string
          approved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          cuisine: string | null
          delivery_note: string | null
          description: string | null
          id: string
          logo_url: string | null
          min_order_amount: number | null
          min_order_count: number | null
          name: string
          owner_id: string
          status: Database["public"]["Enums"]["restaurant_status"]
          updated_at: string
          allow_takeaway: boolean | null
          allow_dine_in: boolean | null
        }
        Insert: {
          created_at?: string
          cuisine?: string | null
          delivery_note?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          min_order_amount?: number | null
          min_order_count?: number | null
          name: string
          owner_id: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          allow_takeaway?: boolean | null
          allow_dine_in?: boolean | null
        }
        Update: {
          created_at?: string
          cuisine?: string | null
          delivery_note?: string | null
          description?: string | null
          id?: string
          logo_url?: string | null
          min_order_amount?: number | null
          min_order_count?: number | null
          name?: string
          owner_id?: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          updated_at?: string
          allow_takeaway?: boolean | null
          allow_dine_in?: boolean | null
        }
        Relationships: []
      }
      restaurant_reviews: {
        Row: {
          id: string
          restaurant_id: string
          user_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          user_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          user_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          }
        ]
      }
      stores: {
        Row: {
          created_at: string
          floor: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          floor?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          floor?: string | null
          id?: string
          manager_id?: string | null
          name?: string
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
      current_restaurant_id: { Args: never; Returns: string }
      current_store_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "staff" | "manager" | "restaurant" | "admin"
      campaign_status:
        | "active"
        | "reached"
        | "confirmed"
        | "expired"
        | "cancelled"
        | "completed"
        | "archived_confirmed"
        | "archived_cancelled"
      delivery_method: "delivery" | "takeaway" | "dine_in" | "mall_delivery"
      order_status:
        | "pending"
        | "approved"
        | "preparing"
        | "delivered"
        | "cancelled"
        | "rejected"
      order_type: "individual" | "group" | "campaign"
      payment_method:
        | "meal_card_metropol"
        | "meal_card_sodexo"
        | "meal_card_multinet"
        | "meal_card_setcard"
        | "credit_card"
        | "cash"
      restaurant_status: "open" | "closed" | "not_accepting"
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
      app_role: ["staff", "manager", "restaurant", "admin"],
      campaign_status: [
        "active",
        "reached",
        "confirmed",
        "expired",
        "cancelled",
        "completed",
        "archived_confirmed",
        "archived_cancelled",
      ],
      delivery_method: ["delivery", "takeaway", "dine_in", "mall_delivery"],
      order_status: [
        "pending",
        "approved",
        "preparing",
        "delivered",
        "cancelled",
        "rejected",
      ],
      order_type: ["individual", "group", "campaign"],
      payment_method: [
        "meal_card_metropol",
        "meal_card_sodexo",
        "meal_card_multinet",
        "meal_card_setcard",
        "credit_card",
        "cash",
      ],
      restaurant_status: ["open", "closed", "not_accepting"],
    },
  },
} as const
