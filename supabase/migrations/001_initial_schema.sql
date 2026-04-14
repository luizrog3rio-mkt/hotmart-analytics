-- ============================================
-- Hotmart Sales Analytics - Initial Schema
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  hotmart_token text,  -- encrypted OAuth token
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  onboarding_completed boolean not null default false,
  onboarding_step integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- PRODUCTS
-- ============================================
create table public.products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hotmart_product_id text,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  type text not null default 'digital' check (type in ('digital', 'subscription', 'physical')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index idx_products_user_id on public.products(user_id);

-- ============================================
-- AFFILIATES
-- ============================================
create table public.affiliates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  hotmart_affiliate_id text,
  name text not null,
  email text,
  commission_rate numeric(5,2) not null default 0,
  total_sales integer not null default 0,
  total_revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_affiliates_user_id on public.affiliates(user_id);

-- ============================================
-- TRANSACTIONS
-- ============================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_email text not null,
  buyer_name text not null,
  amount numeric(12,2) not null,
  net_amount numeric(12,2) not null,
  status text not null default 'approved' check (status in ('approved', 'cancelled', 'refunded', 'disputed', 'pending')),
  payment_method text not null default 'credit_card' check (payment_method in ('credit_card', 'boleto', 'pix', 'paypal')),
  source text not null default 'organic' check (source in ('organic', 'affiliate', 'campaign')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  affiliate_id uuid references public.affiliates(id) on delete set null,
  country text,
  state text,
  created_at timestamptz not null default now()
);

create index idx_transactions_user_id on public.transactions(user_id);
create index idx_transactions_product_id on public.transactions(product_id);
create index idx_transactions_created_at on public.transactions(created_at);
create index idx_transactions_status on public.transactions(status);
create index idx_transactions_user_date on public.transactions(user_id, created_at);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_email text not null,
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due', 'trialing')),
  started_at timestamptz not null default now(),
  cancelled_at timestamptz,
  next_billing timestamptz
);

create index idx_subscriptions_user_id on public.subscriptions(user_id);

-- ============================================
-- REFUNDS
-- ============================================
create table public.refunds (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  amount numeric(12,2) not null,
  reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index idx_refunds_user_id on public.refunds(user_id);

-- ============================================
-- DAILY METRICS (pre-calculated snapshots)
-- ============================================
create table public.daily_metrics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  revenue numeric(12,2) not null default 0,
  sales_count integer not null default 0,
  refund_count integer not null default 0,
  mrr numeric(12,2) not null default 0,
  churn_rate numeric(5,2) not null default 0,
  avg_ticket numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);

create index idx_daily_metrics_user_date on public.daily_metrics(user_id, date);

-- ============================================
-- IMPORTS (CSV/Excel upload history)
-- ============================================
create table public.imports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  filename text not null,
  file_path text,
  row_count integer not null default 0,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);

-- ============================================
-- ALERTS CONFIG
-- ============================================
create table public.alerts_config (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  threshold numeric(12,2) not null,
  channel text not null default 'email' check (channel in ('email', 'telegram', 'whatsapp')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================
-- GOALS
-- ============================================
create table public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('revenue', 'sales', 'refund_rate', 'churn_rate')),
  target numeric(12,2) not null,
  period text not null default 'monthly' check (period in ('daily', 'weekly', 'monthly')),
  created_at timestamptz not null default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.affiliates enable row level security;
alter table public.refunds enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.imports enable row level security;
alter table public.alerts_config enable row level security;
alter table public.goals enable row level security;

-- Profiles: users can only see/edit their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Generic policy for all user-owned tables
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'products', 'transactions', 'subscriptions', 'affiliates',
    'refunds', 'daily_metrics', 'imports', 'alerts_config', 'goals'
  ])
  loop
    execute format(
      'create policy "Users can view own %1$s" on public.%1$s for select using (auth.uid() = user_id)',
      tbl
    );
    execute format(
      'create policy "Users can insert own %1$s" on public.%1$s for insert with check (auth.uid() = user_id)',
      tbl
    );
    execute format(
      'create policy "Users can update own %1$s" on public.%1$s for update using (auth.uid() = user_id)',
      tbl
    );
    execute format(
      'create policy "Users can delete own %1$s" on public.%1$s for delete using (auth.uid() = user_id)',
      tbl
    );
  end loop;
end $$;

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();
