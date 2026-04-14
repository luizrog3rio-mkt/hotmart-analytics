export type { Database, Json } from "./database";

import type { Database } from "./database";

// ---------------------------------------------------------------------------
// Helper: extract a Row type from any table name
// ---------------------------------------------------------------------------
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// ---------------------------------------------------------------------------
// Union types (derived from the database enums for single-source-of-truth)
// ---------------------------------------------------------------------------
export type TransactionStatus =
  | "approved"
  | "cancelled"
  | "refunded"
  | "disputed"
  | "pending";

export type PaymentMethod =
  | "credit_card"
  | "boleto"
  | "pix"
  | "paypal";

export type TransactionSource =
  | "organic"
  | "affiliate"
  | "campaign";

export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "past_due"
  | "trialing";

export type ProductType =
  | "digital"
  | "subscription"
  | "physical";

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------
export interface DateRange {
  from: Date;
  to: Date;
}

export interface KPIData {
  label: string;
  value: number;
  previousValue: number;
  format: "currency" | "number" | "percent";
  icon: string;
}

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
}

export interface FilterState {
  dateRange: DateRange;
  products: string[];
  status: TransactionStatus[];
  paymentMethods: PaymentMethod[];
  sources: TransactionSource[];
}
