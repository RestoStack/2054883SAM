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
      order_items: {
        Row: {
          category: string | null
          guest_index: number
          id: string
          item_name: string
          order_id: string
          price_cents: number
          qty: number
          sent_at: string
          server_id: string
          was_upsell: boolean
        }
        Insert: {
          category?: string | null
          guest_index?: number
          id?: string
          item_name: string
          order_id: string
          price_cents: number
          qty?: number
          sent_at?: string
          server_id: string
          was_upsell?: boolean
        }
        Update: {
          category?: string | null
          guest_index?: number
          id?: string
          item_name?: string
          order_id?: string
          price_cents?: number
          qty?: number
          sent_at?: string
          server_id?: string
          was_upsell?: boolean
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
            foreignKeyName: "order_items_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          id: string
          party_size: number
          sent_at: string
          server_id: string
          table_number: number
          total_cents: number
        }
        Insert: {
          id?: string
          party_size: number
          sent_at?: string
          server_id: string
          table_number: number
          total_cents: number
        }
        Update: {
          id?: string
          party_size?: number
          sent_at?: string
          server_id?: string
          table_number?: number
          total_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_sessions: {
        Row: {
          created_at: string
          expires_at: string
          server_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          server_id: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          server_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_sessions_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          active: boolean
          color: string
          created_at: string
          failed_attempts: number
          id: string
          locked_until: string | null
          name: string
          pin_hash: string
          pin_salt: string
          role: Database["public"]["Enums"]["server_role"]
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          name: string
          pin_hash: string
          pin_salt: string
          role?: Database["public"]["Enums"]["server_role"]
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          failed_attempts?: number
          id?: string
          locked_until?: string | null
          name?: string
          pin_hash?: string
          pin_salt?: string
          role?: Database["public"]["Enums"]["server_role"]
        }
        Relationships: []
      }
      shifts: {
        Row: {
          clock_in_at: string
          clock_out_at: string | null
          id: string
          server_id: string
          tips_cents: number
        }
        Insert: {
          clock_in_at?: string
          clock_out_at?: string | null
          id?: string
          server_id: string
          tips_cents?: number
        }
        Update: {
          clock_in_at?: string
          clock_out_at?: string | null
          id?: string
          server_id?: string
          tips_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "shifts_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      table_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          server_id: string
          table_number: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          server_id: string
          table_number?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          server_id?: string
          table_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "table_ratings_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_events: {
        Row: {
          accepted: boolean
          id: string
          server_id: string
          shown_at: string
        }
        Insert: {
          accepted?: boolean
          id?: string
          server_id: string
          shown_at?: string
        }
        Update: {
          accepted?: boolean
          id?: string
          server_id?: string
          shown_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upsell_events_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_bookings: {
        Row: {
          created_at: string
          customer_id: string | null
          date: string
          duration_minutes: number
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          party_size: number
          restaurant_id: string
          section: string | null
          source: Database["public"]["Enums"]["v2_booking_source"]
          status: Database["public"]["Enums"]["v2_booking_status"]
          table_number: string | null
          time: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          date: string
          duration_minutes?: number
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          party_size: number
          restaurant_id: string
          section?: string | null
          source?: Database["public"]["Enums"]["v2_booking_source"]
          status?: Database["public"]["Enums"]["v2_booking_status"]
          table_number?: string | null
          time: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          date?: string
          duration_minutes?: number
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          restaurant_id?: string
          section?: string | null
          source?: Database["public"]["Enums"]["v2_booking_source"]
          status?: Database["public"]["Enums"]["v2_booking_status"]
          table_number?: string | null
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v2_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_bookings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_customers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_visit: string | null
          loyalty_points: number
          notes: string | null
          phone: string | null
          restaurant_id: string
          total_spent: number
          visit_count: number
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_visit?: string | null
          loyalty_points?: number
          notes?: string | null
          phone?: string | null
          restaurant_id: string
          total_spent?: number
          visit_count?: number
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_visit?: string | null
          loyalty_points?: number
          notes?: string | null
          phone?: string | null
          restaurant_id?: string
          total_spent?: number
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "v2_customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_loyalty_transactions: {
        Row: {
          balance_after: number
          created_at: string
          customer_id: string
          description: string | null
          id: string
          order_id: string | null
          points_earned: number
          points_redeemed: number
          restaurant_id: string
        }
        Insert: {
          balance_after?: number
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          order_id?: string | null
          points_earned?: number
          points_redeemed?: number
          restaurant_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points_earned?: number
          points_redeemed?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v2_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v2_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_loyalty_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_menu_categories: {
        Row: {
          id: string
          name: string
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "v2_menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_menu_items: {
        Row: {
          allergens: string[] | null
          category_id: string | null
          created_at: string
          description: string | null
          food_cost: number | null
          id: string
          image_url: string | null
          is_available: boolean
          is_popular: boolean
          name: string
          price: number
          restaurant_id: string
        }
        Insert: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          food_cost?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_popular?: boolean
          name: string
          price: number
          restaurant_id: string
        }
        Update: {
          allergens?: string[] | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          food_cost?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_popular?: boolean
          name?: string
          price?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "v2_menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_order_items: {
        Row: {
          id: string
          item_name: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          price: number
          qty: number
          seat_number: number | null
          status: Database["public"]["Enums"]["v2_order_item_status"]
          was_upsell: boolean
        }
        Insert: {
          id?: string
          item_name: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          price: number
          qty?: number
          seat_number?: number | null
          status?: Database["public"]["Enums"]["v2_order_item_status"]
          was_upsell?: boolean
        }
        Update: {
          id?: string
          item_name?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          price?: number
          qty?: number
          seat_number?: number | null
          status?: Database["public"]["Enums"]["v2_order_item_status"]
          was_upsell?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "v2_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "v2_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v2_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_orders: {
        Row: {
          booking_id: string | null
          closed_at: string | null
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          opened_at: string | null
          party_size: number | null
          restaurant_id: string
          server_id: string | null
          status: Database["public"]["Enums"]["v2_order_status"]
          subtotal: number
          table_id: string | null
          tax: number
          tip: number
          total: number
        }
        Insert: {
          booking_id?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          party_size?: number | null
          restaurant_id: string
          server_id?: string | null
          status?: Database["public"]["Enums"]["v2_order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          tip?: number
          total?: number
        }
        Update: {
          booking_id?: string | null
          closed_at?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          party_size?: number | null
          restaurant_id?: string
          server_id?: string | null
          status?: Database["public"]["Enums"]["v2_order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          tip?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "v2_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "v2_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "v2_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_orders_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "v2_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "v2_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_restaurants: {
        Row: {
          address: string | null
          booking_headline: string | null
          booking_welcome: string | null
          brand_accent: string | null
          brand_primary: string | null
          city: string | null
          cover_url: string | null
          created_at: string
          cuisine: string | null
          currency: string
          hours: Json | null
          id: string
          logo_url: string | null
          name: string
          custom_domain: string | null
          google_business_url: string | null
          integrations: Json
          menu_source_url: string | null
          onboarding_completed_at: string | null
          phone: string | null
          plan: string
          seating_plan_url: string | null
          slug: string
          timezone: string | null
          trial_started_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          booking_headline?: string | null
          booking_welcome?: string | null
          brand_accent?: string | null
          brand_primary?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          cuisine?: string | null
          currency?: string
          custom_domain?: string | null
          google_business_url?: string | null
          hours?: Json | null
          id?: string
          integrations?: Json
          logo_url?: string | null
          menu_source_url?: string | null
          name: string
          onboarding_completed_at?: string | null
          phone?: string | null
          plan?: string
          seating_plan_url?: string | null
          slug: string
          timezone?: string | null
          trial_started_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          booking_headline?: string | null
          booking_welcome?: string | null
          brand_accent?: string | null
          brand_primary?: string | null
          city?: string | null
          cover_url?: string | null
          created_at?: string
          cuisine?: string | null
          currency?: string
          hours?: Json | null
          id?: string
          logo_url?: string | null
          name?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          plan?: string
          slug?: string
          timezone?: string | null
          trial_started_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      v2_shifts: {
        Row: {
          clock_in_at: string
          clock_out_at: string | null
          id: string
          restaurant_id: string
          sales_total: number
          tips_total: number
          user_id: string
        }
        Insert: {
          clock_in_at?: string
          clock_out_at?: string | null
          id?: string
          restaurant_id: string
          sales_total?: number
          tips_total?: number
          user_id: string
        }
        Update: {
          clock_in_at?: string
          clock_out_at?: string | null
          id?: string
          restaurant_id?: string
          sales_total?: number
          tips_total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "v2_shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v2_users"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_tables: {
        Row: {
          capacity: number
          current_booking_id: string | null
          height: number | null
          id: string
          position_x: number | null
          position_y: number | null
          restaurant_id: string
          section: string | null
          shape: Database["public"]["Enums"]["v2_table_shape"]
          status: Database["public"]["Enums"]["v2_table_status"]
          table_number: string
          width: number | null
        }
        Insert: {
          capacity: number
          current_booking_id?: string | null
          height?: number | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          restaurant_id: string
          section?: string | null
          shape?: Database["public"]["Enums"]["v2_table_shape"]
          status?: Database["public"]["Enums"]["v2_table_status"]
          table_number: string
          width?: number | null
        }
        Update: {
          capacity?: number
          current_booking_id?: string | null
          height?: number | null
          id?: string
          position_x?: number | null
          position_y?: number | null
          restaurant_id?: string
          section?: string | null
          shape?: Database["public"]["Enums"]["v2_table_shape"]
          status?: Database["public"]["Enums"]["v2_table_status"]
          table_number?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "v2_tables_current_booking_id_fkey"
            columns: ["current_booking_id"]
            isOneToOne: false
            referencedRelation: "v2_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "v2_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      v2_users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          hourly_wage: number | null
          id: string
          is_active: boolean
          pin: string | null
          restaurant_id: string
          role: Database["public"]["Enums"]["v2_user_role"]
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hourly_wage?: number | null
          id?: string
          is_active?: boolean
          pin?: string | null
          restaurant_id: string
          role: Database["public"]["Enums"]["v2_user_role"]
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hourly_wage?: number | null
          id?: string
          is_active?: boolean
          pin?: string | null
          restaurant_id?: string
          role?: Database["public"]["Enums"]["v2_user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "v2_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "v2_restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          restaurant: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone: string
          restaurant: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          restaurant?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      v2_current_restaurant_id: { Args: never; Returns: string }
      v2_get_staff_tiles: {
        Args: { _slug: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["v2_user_role"]
        }[]
      }
      v2_link_current_user_to_staff: {
        Args: never
        Returns: {
          auth_user_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          pin: string | null
          restaurant_id: string
          role: Database["public"]["Enums"]["v2_user_role"]
        }
        SetofOptions: {
          from: "*"
          to: "v2_users"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      v2_public_create_booking: {
        Args: {
          _date: string
          _guest_email: string
          _guest_name: string
          _guest_phone: string
          _notes: string
          _party_size: number
          _section: string
          _slug: string
          _time: string
        }
        Returns: string
      }
      v2_public_get_menu: {
        Args: { _slug: string }
        Returns: {
          category_name: string
          description: string
          id: string
          image_url: string
          name: string
          price: number
        }[]
      }
      v2_public_get_restaurant: {
        Args: { _slug: string }
        Returns: {
          address: string
          booking_headline: string
          booking_welcome: string
          brand_accent: string
          brand_primary: string
          city: string
          cover_url: string
          cuisine: string
          hours: Json
          id: string
          logo_url: string
          name: string
          phone: string
          slug: string
        }[]
      }
      v2_signup_create_restaurant: {
        Args: {
          _city: string
          _full_name: string
          _restaurant_name: string
          _slug: string
          _plan?: string
        }
        Returns: {
          out_restaurant_id: string
          out_slug: string
        }[]
      }
      v2_is_platform_admin: {
        Args: never
        Returns: boolean
      }
      v2_claim_platform_admin: {
        Args: never
        Returns: boolean
      }
      v2_platform_list_restaurants: {
        Args: never
        Returns: {
          id: string
          name: string
          slug: string
          city: string | null
          created_at: string
          owner_email: string | null
          owner_name: string | null
          staff_count: number
          guest_count: number
          booking_count: number
          waitlist_count: number
          order_count: number
          covers_booked: number
          revenue: number
          last_booking_at: string | null
        }[]
      }
      v2_platform_overview: {
        Args: never
        Returns: Json
      }
    }
    Enums: {
      server_role: "server" | "admin"
      v2_booking_source: "walk_in" | "phone" | "online" | "app"
      v2_booking_status:
        | "pending"
        | "confirmed"
        | "seated"
        | "completed"
        | "cancelled"
        | "no_show"
      v2_order_item_status: "pending" | "fired" | "ready" | "delivered"
      v2_order_status:
        | "open"
        | "sent"
        | "ready"
        | "delivered"
        | "closed"
        | "voided"
      v2_table_shape: "round" | "square" | "rectangle"
      v2_table_status: "available" | "occupied" | "reserved" | "cleaning"
      v2_user_role: "admin" | "hostess" | "server"
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
      server_role: ["server", "admin"],
      v2_booking_source: ["walk_in", "phone", "online", "app"],
      v2_booking_status: [
        "pending",
        "confirmed",
        "seated",
        "completed",
        "cancelled",
        "no_show",
      ],
      v2_order_item_status: ["pending", "fired", "ready", "delivered"],
      v2_order_status: [
        "open",
        "sent",
        "ready",
        "delivered",
        "closed",
        "voided",
      ],
      v2_table_shape: ["round", "square", "rectangle"],
      v2_table_status: ["available", "occupied", "reserved", "cleaning"],
      v2_user_role: ["admin", "hostess", "server"],
    },
  },
} as const
