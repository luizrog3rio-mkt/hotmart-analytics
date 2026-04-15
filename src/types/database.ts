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
          hotmart_refresh_token: string | null;
          hotmart_token_expires_at: string | null;
          hotmart_client_id: string | null;
          hotmart_client_secret: string | null;
          hotmart_last_sync_at: string | null;
          plan: string;
          onboarding_completed: boolean;
          onboarding_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string;
          hotmart_token?: string | null;
          hotmart_refresh_token?: string | null;
          hotmart_token_expires_at?: string | null;
          hotmart_client_id?: string | null;
          hotmart_client_secret?: string | null;
          hotmart_last_sync_at?: string | null;
          plan?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string;
          hotmart_token?: string | null;
          hotmart_refresh_token?: string | null;
          hotmart_token_expires_at?: string | null;
          hotmart_client_id?: string | null;
          hotmart_client_secret?: string | null;
          hotmart_last_sync_at?: string | null;
          plan?: string;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
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
          transaction_id?: string;
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
      campaigns: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          source: string;
          medium: string;
          spend: number;
          impressions: number;
          clicks: number;
          conversions: number;
          revenue: number;
          start_date: string;
          end_date: string | null;
          status: "active" | "paused" | "ended";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          source: string;
          medium: string;
          spend?: number;
          impressions?: number;
          clicks?: number;
          conversions?: number;
          revenue?: number;
          start_date: string;
          end_date?: string | null;
          status?: "active" | "paused" | "ended";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          source?: string;
          medium?: string;
          spend?: number;
          impressions?: number;
          clicks?: number;
          conversions?: number;
          revenue?: number;
          start_date?: string;
          end_date?: string | null;
          status?: "active" | "paused" | "ended";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      abandoned_checkouts: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          buyer_email: string | null;
          buyer_name: string | null;
          step_reached: "page_view" | "checkout_started" | "form_filled" | "payment_selected" | "payment_submitted";
          device: string | null;
          browser: string | null;
          source: string | null;
          utm_source: string | null;
          utm_campaign: string | null;
          amount: number | null;
          recovered: boolean;
          recovered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          buyer_email?: string | null;
          buyer_name?: string | null;
          step_reached?: "page_view" | "checkout_started" | "form_filled" | "payment_selected" | "payment_submitted";
          device?: string | null;
          browser?: string | null;
          source?: string | null;
          utm_source?: string | null;
          utm_campaign?: string | null;
          amount?: number | null;
          recovered?: boolean;
          recovered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          buyer_email?: string | null;
          buyer_name?: string | null;
          step_reached?: "page_view" | "checkout_started" | "form_filled" | "payment_selected" | "payment_submitted";
          device?: string | null;
          browser?: string | null;
          source?: string | null;
          utm_source?: string | null;
          utm_campaign?: string | null;
          amount?: number | null;
          recovered?: boolean;
          recovered_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "abandoned_checkouts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "abandoned_checkouts_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      failed_payments: {
        Row: {
          id: string;
          user_id: string;
          transaction_id: string | null;
          buyer_email: string;
          buyer_name: string | null;
          amount: number;
          reason: "insufficient_funds" | "expired_card" | "fraud_suspected" | "limit_exceeded" | "processing_error" | "unknown";
          card_brand: string | null;
          retry_count: number;
          max_retries: number;
          recovered: boolean;
          recovered_at: string | null;
          next_retry_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_id?: string | null;
          buyer_email: string;
          buyer_name?: string | null;
          amount: number;
          reason?: "insufficient_funds" | "expired_card" | "fraud_suspected" | "limit_exceeded" | "processing_error" | "unknown";
          card_brand?: string | null;
          retry_count?: number;
          max_retries?: number;
          recovered?: boolean;
          recovered_at?: string | null;
          next_retry_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_id?: string | null;
          buyer_email?: string;
          buyer_name?: string | null;
          amount?: number;
          reason?: "insufficient_funds" | "expired_card" | "fraud_suspected" | "limit_exceeded" | "processing_error" | "unknown";
          card_brand?: string | null;
          retry_count?: number;
          max_retries?: number;
          recovered?: boolean;
          recovered_at?: string | null;
          next_retry_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "failed_payments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "failed_payments_transaction_id_fkey";
            columns: ["transaction_id"];
            isOneToOne: false;
            referencedRelation: "transactions";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_reports: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          frequency: "daily" | "weekly" | "monthly";
          content_type: "summary" | "full" | "financial" | "marketing";
          channel: "email" | "telegram" | "whatsapp";
          recipients: string[];
          enabled: boolean;
          last_sent_at: string | null;
          next_send_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          frequency?: "daily" | "weekly" | "monthly";
          content_type?: "summary" | "full" | "financial" | "marketing";
          channel?: "email" | "telegram" | "whatsapp";
          recipients?: string[];
          enabled?: boolean;
          last_sent_at?: string | null;
          next_send_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          frequency?: "daily" | "weekly" | "monthly";
          content_type?: "summary" | "full" | "financial" | "marketing";
          channel?: "email" | "telegram" | "whatsapp";
          recipients?: string[];
          enabled?: boolean;
          last_sent_at?: string | null;
          next_send_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      anomaly_logs: {
        Row: {
          id: string;
          user_id: string;
          type: "sales_drop" | "refund_spike" | "ticket_change" | "affiliate_anomaly" | "churn_spike" | "channel_unstable" | "positive_opportunity";
          severity: "critical" | "warning" | "info" | "opportunity";
          metric: string;
          expected_value: number;
          actual_value: number;
          deviation_pct: number;
          context_json: Json;
          status: "new" | "investigating" | "resolved" | "ignored";
          resolved_at: string | null;
          detected_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "sales_drop" | "refund_spike" | "ticket_change" | "affiliate_anomaly" | "churn_spike" | "channel_unstable" | "positive_opportunity";
          severity?: "critical" | "warning" | "info" | "opportunity";
          metric: string;
          expected_value: number;
          actual_value: number;
          deviation_pct: number;
          context_json?: Json;
          status?: "new" | "investigating" | "resolved" | "ignored";
          resolved_at?: string | null;
          detected_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "sales_drop" | "refund_spike" | "ticket_change" | "affiliate_anomaly" | "churn_spike" | "channel_unstable" | "positive_opportunity";
          severity?: "critical" | "warning" | "info" | "opportunity";
          metric?: string;
          expected_value?: number;
          actual_value?: number;
          deviation_pct?: number;
          context_json?: Json;
          status?: "new" | "investigating" | "resolved" | "ignored";
          resolved_at?: string | null;
          detected_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anomaly_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_dashboards: {
        Row: {
          id: string;
          user_id: string;
          dashboard_type: "overview" | "sales" | "financial" | "marketing" | "affiliates" | "custom";
          title: string;
          access_token: string;
          password_hash: string | null;
          view_count: number;
          expires_at: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          dashboard_type: "overview" | "sales" | "financial" | "marketing" | "affiliates" | "custom";
          title: string;
          access_token?: string;
          password_hash?: string | null;
          view_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          dashboard_type?: "overview" | "sales" | "financial" | "marketing" | "affiliates" | "custom";
          title?: string;
          access_token?: string;
          password_hash?: string | null;
          view_count?: number;
          expires_at?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_dashboards_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          id: string;
          user_id: string;
          member_email: string;
          member_user_id: string | null;
          role: "admin" | "financial" | "marketing" | "viewer";
          status: "pending" | "active" | "revoked";
          invited_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          member_email: string;
          member_user_id?: string | null;
          role?: "admin" | "financial" | "marketing" | "viewer";
          status?: "pending" | "active" | "revoked";
          invited_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          member_email?: string;
          member_user_id?: string | null;
          role?: "admin" | "financial" | "marketing" | "viewer";
          status?: "pending" | "active" | "revoked";
          invited_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id: string;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      hotmart_sync_log: {
        Row: {
          id: string;
          user_id: string;
          sync_type: "full" | "incremental" | "webhook";
          status: "running" | "completed" | "failed";
          records_fetched: number;
          records_created: number;
          records_updated: number;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          sync_type?: "full" | "incremental" | "webhook";
          status?: "running" | "completed" | "failed";
          records_fetched?: number;
          records_created?: number;
          records_updated?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          sync_type?: "full" | "incremental" | "webhook";
          status?: "running" | "completed" | "failed";
          records_fetched?: number;
          records_created?: number;
          records_updated?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "hotmart_sync_log_user_id_fkey";
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
      calculate_daily_metrics: {
        Args: { p_user_id: string; p_date: string };
        Returns: undefined;
      };
      recalculate_metrics: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      transaction_status: "approved" | "cancelled" | "refunded" | "disputed" | "pending";
      payment_method: "credit_card" | "boleto" | "pix" | "paypal";
      transaction_source: "organic" | "affiliate" | "campaign";
      subscription_status: "active" | "cancelled" | "past_due" | "trialing";
      product_type: "digital" | "subscription" | "physical";
      product_status: "active" | "inactive";
      import_status: "processing" | "completed" | "failed";
      alert_channel: "email" | "telegram" | "whatsapp";
      goal_type: "revenue" | "sales" | "refund_rate" | "churn_rate";
      goal_period: "daily" | "weekly" | "monthly";
      campaign_status: "active" | "paused" | "ended";
      checkout_step: "page_view" | "checkout_started" | "form_filled" | "payment_selected" | "payment_submitted";
      failure_reason: "insufficient_funds" | "expired_card" | "fraud_suspected" | "limit_exceeded" | "processing_error" | "unknown";
      report_frequency: "daily" | "weekly" | "monthly";
      anomaly_type: "sales_drop" | "refund_spike" | "ticket_change" | "affiliate_anomaly" | "churn_spike" | "channel_unstable" | "positive_opportunity";
      anomaly_severity: "critical" | "warning" | "info" | "opportunity";
      anomaly_status: "new" | "investigating" | "resolved" | "ignored";
      dashboard_type: "overview" | "sales" | "financial" | "marketing" | "affiliates" | "custom";
      team_role: "admin" | "financial" | "marketing" | "viewer";
      team_status: "pending" | "active" | "revoked";
      sync_type: "full" | "incremental" | "webhook";
      sync_status: "running" | "completed" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
