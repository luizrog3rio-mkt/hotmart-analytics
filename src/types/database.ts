export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string;
          hotmart_token: string | null;
          plan: string;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string;
          hotmart_token?: string | null;
          plan?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          hotmart_token?: string | null;
          plan?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          // No foreign keys on profiles
        ];
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          hotmart_product_id: string | null;
          name: string;
          description: string | null;
          price: number;
          type: "digital" | "subscription" | "physical";
          status: "active" | "inactive";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hotmart_product_id?: string | null;
          name: string;
          description?: string | null;
          price: number;
          type: "digital" | "subscription" | "physical";
          status?: "active" | "inactive";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hotmart_product_id?: string | null;
          name?: string;
          description?: string | null;
          price?: number;
          type?: "digital" | "subscription" | "physical";
          status?: "active" | "inactive";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          buyer_email: string;
          buyer_name: string;
          amount: number;
          net_amount: number;
          status: "approved" | "cancelled" | "refunded" | "disputed" | "pending";
          payment_method: "credit_card" | "boleto" | "pix" | "paypal";
          source: "organic" | "affiliate" | "campaign";
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_content: string | null;
          affiliate_id: string | null;
          country: string | null;
          state: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          buyer_email: string;
          buyer_name: string;
          amount: number;
          net_amount: number;
          status: "approved" | "cancelled" | "refunded" | "disputed" | "pending";
          payment_method: "credit_card" | "boleto" | "pix" | "paypal";
          source: "organic" | "affiliate" | "campaign";
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          affiliate_id?: string | null;
          country?: string | null;
          state?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          buyer_email?: string;
          buyer_name?: string;
          amount?: number;
          net_amount?: number;
          status?: "approved" | "cancelled" | "refunded" | "disputed" | "pending";
          payment_method?: "credit_card" | "boleto" | "pix" | "paypal";
          source?: "organic" | "affiliate" | "campaign";
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_content?: string | null;
          affiliate_id?: string | null;
          country?: string | null;
          state?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_affiliate_id_fkey";
            columns: ["affiliate_id"];
            isOneToOne: false;
            referencedRelation: "affiliates";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          product_id: string;
          buyer_email: string;
          status: "active" | "cancelled" | "past_due" | "trialing";
          started_at: string;
          cancelled_at: string | null;
          next_billing: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          product_id: string;
          buyer_email: string;
          status: "active" | "cancelled" | "past_due" | "trialing";
          started_at: string;
          cancelled_at?: string | null;
          next_billing?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          product_id?: string;
          buyer_email?: string;
          status?: "active" | "cancelled" | "past_due" | "trialing";
          started_at?: string;
          cancelled_at?: string | null;
          next_billing?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      affiliates: {
        Row: {
          id: string;
          user_id: string;
          hotmart_affiliate_id: string | null;
          name: string;
          email: string;
          commission_rate: number;
          total_sales: number;
          total_revenue: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hotmart_affiliate_id?: string | null;
          name: string;
          email: string;
          commission_rate: number;
          total_sales?: number;
          total_revenue?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hotmart_affiliate_id?: string | null;
          name?: string;
          email?: string;
          commission_rate?: number;
          total_sales?: number;
          total_revenue?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "affiliates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      refunds: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string;
          amount: number;
          reason: string | null;
          requested_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id: string;
          amount: number;
          reason?: string | null;
          requested_at: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string;
          amount?: number;
          reason?: string | null;
          requested_at?: string;
          processed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_metrics: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          revenue: number;
          sales_count: number;
          refund_count: number;
          mrr: number;
          churn_rate: number;
          avg_ticket: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          revenue: number;
          sales_count: number;
          refund_count: number;
          mrr: number;
          churn_rate: number;
          avg_ticket: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          revenue?: number;
          sales_count?: number;
          refund_count?: number;
          mrr?: number;
          churn_rate?: number;
          avg_ticket?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_metrics_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      imports: {
        Row: {
          id: string;
          user_id: string;
          filename: string;
          row_count: number;
          status: "processing" | "completed" | "failed";
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filename: string;
          row_count: number;
          status?: "processing" | "completed" | "failed";
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filename?: string;
          row_count?: number;
          status?: "processing" | "completed" | "failed";
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "imports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts_config: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          threshold: number;
          channel: "email" | "telegram" | "whatsapp";
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          threshold: number;
          channel: "email" | "telegram" | "whatsapp";
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          threshold?: number;
          channel?: "email" | "telegram" | "whatsapp";
          enabled?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_config_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          type: "revenue" | "sales" | "refund_rate" | "churn_rate";
          target: number;
          period: "daily" | "weekly" | "monthly";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "revenue" | "sales" | "refund_rate" | "churn_rate";
          target: number;
          period: "daily" | "weekly" | "monthly";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "revenue" | "sales" | "refund_rate" | "churn_rate";
          target?: number;
          period?: "daily" | "weekly" | "monthly";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      transaction_status:
        | "approved"
        | "cancelled"
        | "refunded"
        | "disputed"
        | "pending";
      payment_method: "credit_card" | "boleto" | "pix" | "paypal";
      transaction_source: "organic" | "affiliate" | "campaign";
      subscription_status: "active" | "cancelled" | "past_due" | "trialing";
      product_type: "digital" | "subscription" | "physical";
      product_status: "active" | "inactive";
      import_status: "processing" | "completed" | "failed";
      alert_channel: "email" | "telegram" | "whatsapp";
      goal_type: "revenue" | "sales" | "refund_rate" | "churn_rate";
      goal_period: "daily" | "weekly" | "monthly";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
