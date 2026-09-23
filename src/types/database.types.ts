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
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      farmers: {
        Row: {
          created_at: string
          id: string
          location_reference: string
          name: string
          notes: string
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_reference: string
          name: string
          notes?: string
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          id?: string
          location_reference?: string
          name?: string
          notes?: string
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      fields: {
        Row: {
          created_at: string
          farmer_id: string
          id: string
          location_reference: string
          name: string
          notes: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_id: string
          id?: string
          location_reference: string
          name: string
          notes?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_id?: string
          id?: string
          location_reference?: string
          name?: string
          notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fields_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_kasbon_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "fields_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_cycles: {
        Row: {
          commodity: string
          created_at: string
          default_receiving_method: string
          ended_at: string | null
          field_id: string
          first_harvest_at: string | null
          harvest_interval_days: number
          id: string
          last_harvest_at: string | null
          notes: string
          status: string
          updated_at: string
        }
        Insert: {
          commodity: string
          created_at?: string
          default_receiving_method: string
          ended_at?: string | null
          field_id: string
          first_harvest_at?: string | null
          harvest_interval_days: number
          id?: string
          last_harvest_at?: string | null
          notes?: string
          status?: string
          updated_at?: string
        }
        Update: {
          commodity?: string
          created_at?: string
          default_receiving_method?: string
          ended_at?: string | null
          field_id?: string
          first_harvest_at?: string | null
          harvest_interval_days?: number
          id?: string
          last_harvest_at?: string | null
          notes?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_cycles_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_schedule_changes: {
        Row: {
          change_type: string
          created_at: string
          id: string
          new_receiving_method: string | null
          new_scheduled_date: string | null
          previous_receiving_method: string | null
          previous_scheduled_date: string | null
          schedule_id: string
          scope: string
        }
        Insert: {
          change_type: string
          created_at?: string
          id?: string
          new_receiving_method?: string | null
          new_scheduled_date?: string | null
          previous_receiving_method?: string | null
          previous_scheduled_date?: string | null
          schedule_id: string
          scope?: string
        }
        Update: {
          change_type?: string
          created_at?: string
          id?: string
          new_receiving_method?: string | null
          new_scheduled_date?: string | null
          previous_receiving_method?: string | null
          previous_scheduled_date?: string | null
          schedule_id?: string
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_schedule_changes_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "harvest_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_schedules: {
        Row: {
          completed_at: string | null
          created_at: string
          cycle_id: string
          id: string
          notes: string
          receiving_method: string
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          cycle_id: string
          id?: string
          notes?: string
          receiving_method: string
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          cycle_id?: string
          id?: string
          notes?: string
          receiving_method?: string
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "harvest_schedules_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "harvest_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      kasbon_ledger_entries: {
        Row: {
          amount: number
          created_at: string
          entry_date: string
          entry_type: string
          farmer_id: string
          id: string
          notes: string
          related_totalan_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          entry_date: string
          entry_type: string
          farmer_id: string
          id?: string
          notes?: string
          related_totalan_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          entry_date?: string
          entry_type?: string
          farmer_id?: string
          id?: string
          notes?: string
          related_totalan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kasbon_ledger_entries_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_kasbon_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "kasbon_ledger_entries_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kasbon_ledger_entries_related_totalan_id_fkey"
            columns: ["related_totalan_id"]
            isOneToOne: true
            referencedRelation: "totalans"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_number_counters: {
        Row: {
          created_at: string
          last_sequence: number
          operational_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_sequence?: number
          operational_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_sequence?: number
          operational_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_change_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          reason: string
          sale_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          reason: string
          sale_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          reason?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_change_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_payment_states"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_change_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          commodity: string
          created_at: string
          deduction_weight_kg: number
          grade: string
          gross_weight_kg: number
          id: string
          net_weight_kg: number | null
          price_per_kg: number
          sale_id: string
          subtotal: number | null
          updated_at: string
        }
        Insert: {
          commodity: string
          created_at?: string
          deduction_weight_kg?: number
          grade: string
          gross_weight_kg: number
          id?: string
          net_weight_kg?: number | null
          price_per_kg: number
          sale_id: string
          subtotal?: number | null
          updated_at?: string
        }
        Update: {
          commodity?: string
          created_at?: string
          deduction_weight_kg?: number
          grade?: string
          gross_weight_kg?: number
          id?: string
          net_weight_kg?: number | null
          price_per_kg?: number
          sale_id?: string
          subtotal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_payment_states"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_number_counters: {
        Row: {
          created_at: string
          last_sequence: number
          sale_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          last_sequence?: number
          sale_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          last_sequence?: number
          sale_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      sale_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_date: string
          remaining_balance_after: number
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_date: string
          remaining_balance_after: number
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_date?: string
          remaining_balance_after?: number
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_payment_states"
            referencedColumns: ["sale_id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_stock_allocations: {
        Row: {
          allocated_gross_weight_kg: number
          created_at: string
          id: string
          purchase_container_weight_id: string | null
          purchase_item_id: string
          release_reason: string | null
          released_at: string | null
          sale_item_id: string
        }
        Insert: {
          allocated_gross_weight_kg: number
          created_at?: string
          id?: string
          purchase_container_weight_id?: string | null
          purchase_item_id: string
          release_reason?: string | null
          released_at?: string | null
          sale_item_id: string
        }
        Update: {
          allocated_gross_weight_kg?: number
          created_at?: string
          id?: string
          purchase_container_weight_id?: string | null
          purchase_item_id?: string
          release_reason?: string | null
          released_at?: string | null
          sale_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_stock_allocations_purchase_container_weight_id_fkey"
            columns: ["purchase_container_weight_id"]
            isOneToOne: false
            referencedRelation: "available_sale_container_stock"
            referencedColumns: ["purchase_container_weight_id"]
          },
          {
            foreignKeyName: "sale_stock_allocations_purchase_container_weight_id_fkey"
            columns: ["purchase_container_weight_id"]
            isOneToOne: false
            referencedRelation: "transaction_container_weights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_stock_allocations_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "available_sale_container_stock"
            referencedColumns: ["purchase_item_id"]
          },
          {
            foreignKeyName: "sale_stock_allocations_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "available_sale_direct_stock"
            referencedColumns: ["purchase_item_id"]
          },
          {
            foreignKeyName: "sale_stock_allocations_purchase_item_id_fkey"
            columns: ["purchase_item_id"]
            isOneToOne: false
            referencedRelation: "transaction_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_stock_allocations_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          buyer_name: string
          buyer_type: string
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          delivery_method: string
          expedition_cost: number | null
          expedition_name: string | null
          expedition_rate_per_kg: number | null
          id: string
          sale_date: string
          sale_number: string
          status: string
          total_amount: number
          total_deduction_weight_kg: number
          total_gross_weight_kg: number
          total_net_weight_kg: number
          updated_at: string
        }
        Insert: {
          buyer_name: string
          buyer_type: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          delivery_method: string
          expedition_cost?: number | null
          expedition_name?: string | null
          expedition_rate_per_kg?: number | null
          id?: string
          sale_date: string
          sale_number: string
          status?: string
          total_amount?: number
          total_deduction_weight_kg?: number
          total_gross_weight_kg?: number
          total_net_weight_kg?: number
          updated_at?: string
        }
        Update: {
          buyer_name?: string
          buyer_type?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          delivery_method?: string
          expedition_cost?: number | null
          expedition_name?: string | null
          expedition_rate_per_kg?: number | null
          id?: string
          sale_date?: string
          sale_number?: string
          status?: string
          total_amount?: number
          total_deduction_weight_kg?: number
          total_gross_weight_kg?: number
          total_net_weight_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      totalan_transactions: {
        Row: {
          created_at: string
          totalan_id: string
          transaction_id: string
        }
        Insert: {
          created_at?: string
          totalan_id: string
          transaction_id: string
        }
        Update: {
          created_at?: string
          totalan_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "totalan_transactions_totalan_id_fkey"
            columns: ["totalan_id"]
            isOneToOne: false
            referencedRelation: "totalans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totalan_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "available_sale_container_stock"
            referencedColumns: ["purchase_transaction_id"]
          },
          {
            foreignKeyName: "totalan_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "available_sale_direct_stock"
            referencedColumns: ["purchase_transaction_id"]
          },
          {
            foreignKeyName: "totalan_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transaction_payment_states"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "totalan_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      totalans: {
        Row: {
          created_at: string
          farmer_id: string
          final_payment_amount: number
          finalized_at: string
          gross_harvest_amount: number
          id: string
          kasbon_deduction_amount: number
          status: string
          total_net_weight_kg: number
          totalan_number: string
        }
        Insert: {
          created_at?: string
          farmer_id: string
          final_payment_amount: number
          finalized_at?: string
          gross_harvest_amount: number
          id?: string
          kasbon_deduction_amount?: number
          status?: string
          total_net_weight_kg: number
          totalan_number: string
        }
        Update: {
          created_at?: string
          farmer_id?: string
          final_payment_amount?: number
          finalized_at?: string
          gross_harvest_amount?: number
          id?: string
          kasbon_deduction_amount?: number
          status?: string
          total_net_weight_kg?: number
          totalan_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "totalans_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_kasbon_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "totalans_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_container_weights: {
        Row: {
          container_type: string
          created_at: string
          id: string
          sequence_number: number
          transaction_item_id: string
          weight_kg: number
        }
        Insert: {
          container_type: string
          created_at?: string
          id?: string
          sequence_number: number
          transaction_item_id: string
          weight_kg: number
        }
        Update: {
          container_type?: string
          created_at?: string
          id?: string
          sequence_number?: number
          transaction_item_id?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_container_weights_transaction_item_id_fkey"
            columns: ["transaction_item_id"]
            isOneToOne: false
            referencedRelation: "available_sale_container_stock"
            referencedColumns: ["purchase_item_id"]
          },
          {
            foreignKeyName: "transaction_container_weights_transaction_item_id_fkey"
            columns: ["transaction_item_id"]
            isOneToOne: false
            referencedRelation: "available_sale_direct_stock"
            referencedColumns: ["purchase_item_id"]
          },
          {
            foreignKeyName: "transaction_container_weights_transaction_item_id_fkey"
            columns: ["transaction_item_id"]
            isOneToOne: false
            referencedRelation: "transaction_items"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_items: {
        Row: {
          commodity: string
          created_at: string
          deduction_weight_kg: number
          grade: string
          gross_weight_kg: number
          id: string
          net_weight_kg: number | null
          price_per_kg: number
          subtotal: number | null
          transaction_id: string
          weighing_method: string
        }
        Insert: {
          commodity: string
          created_at?: string
          deduction_weight_kg?: number
          grade: string
          gross_weight_kg: number
          id?: string
          net_weight_kg?: number | null
          price_per_kg: number
          subtotal?: number | null
          transaction_id: string
          weighing_method: string
        }
        Update: {
          commodity?: string
          created_at?: string
          deduction_weight_kg?: number
          grade?: string
          gross_weight_kg?: number
          id?: string
          net_weight_kg?: number | null
          price_per_kg?: number
          subtotal?: number | null
          transaction_id?: string
          weighing_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "available_sale_container_stock"
            referencedColumns: ["purchase_transaction_id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "available_sale_direct_stock"
            referencedColumns: ["purchase_transaction_id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transaction_payment_states"
            referencedColumns: ["transaction_id"]
          },
          {
            foreignKeyName: "transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string
          cycle_id: string | null
          farmer_id: string | null
          id: string
          notes: string
          payment_status: string
          schedule_id: string | null
          seller_name_snapshot: string
          seller_type: string
          total_amount: number
          total_net_weight_kg: number
          transaction_date: string
          transaction_number: string
          transaction_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id?: string | null
          farmer_id?: string | null
          id?: string
          notes?: string
          payment_status: string
          schedule_id?: string | null
          seller_name_snapshot: string
          seller_type: string
          total_amount?: number
          total_net_weight_kg?: number
          transaction_date: string
          transaction_number: string
          transaction_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string | null
          farmer_id?: string | null
          id?: string
          notes?: string
          payment_status?: string
          schedule_id?: string | null
          seller_name_snapshot?: string
          seller_type?: string
          total_amount?: number
          total_net_weight_kg?: number
          transaction_date?: string
          transaction_number?: string
          transaction_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "harvest_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_kasbon_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "transactions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "harvest_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_sale_container_stock: {
        Row: {
          commodity: string | null
          container_type: string | null
          farmer_id: string | null
          grade: string | null
          purchase_container_weight_id: string | null
          purchase_item_id: string | null
          purchase_transaction_id: string | null
          seller_name_snapshot: string | null
          seller_type: string | null
          sequence_number: number | null
          weighing_method: string | null
          weight_kg: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_kasbon_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "transactions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      available_sale_direct_stock: {
        Row: {
          allocated_gross_weight_kg: number | null
          available_gross_weight_kg: number | null
          commodity: string | null
          farmer_id: string | null
          grade: string | null
          gross_weight_kg: number | null
          purchase_item_id: string | null
          purchase_transaction_id: string | null
          seller_name_snapshot: string | null
          seller_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmer_kasbon_balances"
            referencedColumns: ["farmer_id"]
          },
          {
            foreignKeyName: "transactions_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_kasbon_balances: {
        Row: {
          balance_amount: number | null
          farmer_id: string | null
        }
        Relationships: []
      }
      sale_payment_states: {
        Row: {
          effective_payment_status: string | null
          remaining_balance_amount: number | null
          sale_id: string | null
          total_paid_amount: number | null
        }
        Relationships: []
      }
      transaction_payment_states: {
        Row: {
          effective_payment_status: string | null
          transaction_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cancel_sale: {
        Args: { p_reason: string; p_sale_id: string }
        Returns: string
      }
      correct_sale: {
        Args: {
          p_buyer_name: string
          p_buyer_type: string
          p_delivery_method: string
          p_expedition_name: string
          p_expedition_rate_per_kg: number
          p_items: Json
          p_reason: string
          p_sale_id: string
        }
        Returns: string
      }
      create_purchase: {
        Args: { p_payload: Json }
        Returns: {
          transaction_id: string
          transaction_number: string
        }[]
      }
      create_sale: {
        Args: {
          p_buyer_name: string
          p_buyer_type: string
          p_delivery_method: string
          p_expedition_name: string
          p_expedition_rate_per_kg: number
          p_initial_payment_amount?: number
          p_items: Json
          p_sale_date: string
        }
        Returns: string
      }
      delete_sale_without_payments: {
        Args: { p_sale_id: string }
        Returns: undefined
      }
      is_current_admin: { Args: never; Returns: boolean }
      record_sale_payment: {
        Args: { p_amount: number; p_payment_date: string; p_sale_id: string }
        Returns: string
      }
      update_purchase: {
        Args: { p_payload: Json; p_transaction_id: string }
        Returns: {
          transaction_id: string
          transaction_number: string
        }[]
      }
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
    Enums: {},
  },
} as const
