-- ============================================
-- Hotmart Sales Analytics - Extended Schema
-- Migration 002: API integration, sync, sharing, teams
-- ============================================

-- ============================================
-- ALTER PROFILES — add OAuth fields
-- ============================================
alter table public.profiles
  add column if not exists hotmart_refresh_token text,
  add column if not exists hotmart_token_expires_at timestamptz,
  add column if not exists hotmart_client_id text,
  add column if not exists hotmart_client_secret text,
  add column if not exists hotmart_last_sync_at timestamptz,
  add column if not exists onboarding_step integer not null default 0;

-- ============================================
-- CAMPAIGNS
-- ============================================
create table if not exists public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  source text not null,           -- facebook, google, tiktok, etc.
  medium text not null,           -- cpc, cpm, social, etc.
  spend numeric(12,2) not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  conversions integer not null default 0,
  revenue numeric(12,2) not null default 0,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  created_at timestamptz not null default now()
);

create index if not exists idx_campaigns_user_id on public.campaigns(user_id);
create index if not exists idx_campaigns_dates on public.campaigns(user_id, start_date, end_date);

-- ============================================
-- ABANDONED CHECKOUTS
-- ============================================
create table if not exists public.abandoned_checkouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  buyer_email text,
  buyer_name text,
  step_reached text not null default 'checkout_started'
    check (step_reached in ('page_view', 'checkout_started', 'form_filled', 'payment_selected', 'payment_submitted')),
  device text,                    -- desktop, mobile, tablet
  browser text,
  source text,                    -- organic, affiliate, campaign
  utm_source text,
  utm_campaign text,
  amount numeric(12,2),
  recovered boolean not null default false,
  recovered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_abandoned_checkouts_user on public.abandoned_checkouts(user_id);
create index if not exists idx_abandoned_checkouts_date on public.abandoned_checkouts(user_id, created_at);

-- ============================================
-- FAILED PAYMENTS
-- ============================================
create table if not exists public.failed_payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  buyer_email text not null,
  buyer_name text,
  amount numeric(12,2) not null,
  reason text not null default 'unknown'
    check (reason in ('insufficient_funds', 'expired_card', 'fraud_suspected', 'limit_exceeded', 'processing_error', 'unknown')),
  card_brand text,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  recovered boolean not null default false,
  recovered_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_failed_payments_user on public.failed_payments(user_id);

-- ============================================
-- SCHEDULED REPORTS
-- ============================================
create table if not exists public.scheduled_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  frequency text not null default 'weekly'
    check (frequency in ('daily', 'weekly', 'monthly')),
  content_type text not null default 'full'
    check (content_type in ('summary', 'full', 'financial', 'marketing')),
  channel text not null default 'email'
    check (channel in ('email', 'telegram', 'whatsapp')),
  recipients text[] not null default '{}',
  enabled boolean not null default true,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_scheduled_reports_user on public.scheduled_reports(user_id);
create index if not exists idx_scheduled_reports_next on public.scheduled_reports(next_send_at) where enabled = true;

-- ============================================
-- ANOMALY LOGS
-- ============================================
create table if not exists public.anomaly_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null
    check (type in ('sales_drop', 'refund_spike', 'ticket_change', 'affiliate_anomaly', 'churn_spike', 'channel_unstable', 'positive_opportunity')),
  severity text not null default 'warning'
    check (severity in ('critical', 'warning', 'info', 'opportunity')),
  metric text not null,
  expected_value numeric(12,2) not null,
  actual_value numeric(12,2) not null,
  deviation_pct numeric(8,2) not null,
  context_json jsonb not null default '{}',
  status text not null default 'new'
    check (status in ('new', 'investigating', 'resolved', 'ignored')),
  resolved_at timestamptz,
  detected_at timestamptz not null default now()
);

create index if not exists idx_anomaly_logs_user on public.anomaly_logs(user_id);
create index if not exists idx_anomaly_logs_date on public.anomaly_logs(user_id, detected_at);
create index if not exists idx_anomaly_logs_status on public.anomaly_logs(user_id, status);

-- ============================================
-- SHARED DASHBOARDS
-- ============================================
create table if not exists public.shared_dashboards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dashboard_type text not null
    check (dashboard_type in ('overview', 'sales', 'financial', 'marketing', 'affiliates', 'custom')),
  title text not null,
  access_token text not null unique default encode(gen_random_bytes(32), 'hex'),
  password_hash text,             -- bcrypt hash, null = no password
  view_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_shared_dashboards_token on public.shared_dashboards(access_token);
create index if not exists idx_shared_dashboards_user on public.shared_dashboards(user_id);

-- ============================================
-- TEAM MEMBERS
-- ============================================
create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,  -- owner
  member_email text not null,
  member_user_id uuid references public.profiles(id) on delete set null,   -- linked after accept
  role text not null default 'viewer'
    check (role in ('admin', 'financial', 'marketing', 'viewer')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(user_id, member_email)
);

create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_team_members_email on public.team_members(member_email);

-- ============================================
-- ACTIVITY LOG
-- ============================================
create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,           -- 'login', 'export', 'import', 'share', 'invite', etc.
  resource_type text,             -- 'dashboard', 'report', 'settings', etc.
  resource_id text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_log_user on public.activity_log(user_id, created_at);

-- ============================================
-- HOTMART SYNC LOG
-- ============================================
create table if not exists public.hotmart_sync_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sync_type text not null default 'full'
    check (sync_type in ('full', 'incremental', 'webhook')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  records_fetched integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_sync_log_user on public.hotmart_sync_log(user_id, started_at);

-- ============================================
-- RLS for new tables
-- ============================================
alter table public.campaigns enable row level security;
alter table public.abandoned_checkouts enable row level security;
alter table public.failed_payments enable row level security;
alter table public.scheduled_reports enable row level security;
alter table public.anomaly_logs enable row level security;
alter table public.shared_dashboards enable row level security;
alter table public.team_members enable row level security;
alter table public.activity_log enable row level security;
alter table public.hotmart_sync_log enable row level security;

do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'campaigns', 'abandoned_checkouts', 'failed_payments',
    'scheduled_reports', 'anomaly_logs', 'shared_dashboards',
    'team_members', 'activity_log', 'hotmart_sync_log'
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

-- Shared dashboards: allow public read via access_token (no auth required)
create policy "Public access via token"
  on public.shared_dashboards for select
  using (is_active = true and (expires_at is null or expires_at > now()));

-- Team members: members can view teams they belong to
create policy "Members can view their invites"
  on public.team_members for select
  using (member_email = (select email from public.profiles where id = auth.uid()));

-- ============================================
-- FUNCTION: Calculate daily metrics snapshot
-- ============================================
create or replace function public.calculate_daily_metrics(p_user_id uuid, p_date date)
returns void as $$
declare
  v_revenue numeric(12,2);
  v_sales_count integer;
  v_refund_count integer;
  v_mrr numeric(12,2);
  v_churn_rate numeric(5,2);
  v_avg_ticket numeric(12,2);
begin
  -- Revenue & sales for the day
  select
    coalesce(sum(amount), 0),
    count(*)
  into v_revenue, v_sales_count
  from public.transactions
  where user_id = p_user_id
    and status = 'approved'
    and created_at::date = p_date;

  -- Refunds for the day
  select count(*)
  into v_refund_count
  from public.refunds
  where user_id = p_user_id
    and requested_at::date = p_date;

  -- MRR (active subscriptions)
  select coalesce(sum(pr.price), 0)
  into v_mrr
  from public.subscriptions s
  join public.products pr on pr.id = s.product_id
  where s.user_id = p_user_id
    and s.status = 'active'
    and s.started_at::date <= p_date;

  -- Churn rate (cancelled this month / active start of month)
  declare
    v_month_start date := date_trunc('month', p_date)::date;
    v_active_start integer;
    v_cancelled integer;
  begin
    select count(*) into v_active_start
    from public.subscriptions
    where user_id = p_user_id
      and started_at::date < v_month_start
      and (cancelled_at is null or cancelled_at::date >= v_month_start);

    select count(*) into v_cancelled
    from public.subscriptions
    where user_id = p_user_id
      and cancelled_at::date between v_month_start and p_date;

    v_churn_rate := case when v_active_start > 0
      then round((v_cancelled::numeric / v_active_start) * 100, 2)
      else 0 end;
  end;

  -- Average ticket
  v_avg_ticket := case when v_sales_count > 0
    then round(v_revenue / v_sales_count, 2)
    else 0 end;

  -- Upsert
  insert into public.daily_metrics (user_id, date, revenue, sales_count, refund_count, mrr, churn_rate, avg_ticket)
  values (p_user_id, p_date, v_revenue, v_sales_count, v_refund_count, v_mrr, v_churn_rate, v_avg_ticket)
  on conflict (user_id, date) do update set
    revenue = excluded.revenue,
    sales_count = excluded.sales_count,
    refund_count = excluded.refund_count,
    mrr = excluded.mrr,
    churn_rate = excluded.churn_rate,
    avg_ticket = excluded.avg_ticket;
end;
$$ language plpgsql security definer;

-- ============================================
-- FUNCTION: Recalculate all daily metrics for a user (past 90 days)
-- ============================================
create or replace function public.recalculate_metrics(p_user_id uuid)
returns void as $$
declare
  d date;
begin
  for d in select generate_series(current_date - interval '90 days', current_date, '1 day')::date
  loop
    perform public.calculate_daily_metrics(p_user_id, d);
  end loop;
end;
$$ language plpgsql security definer;

-- ============================================
-- MATERIALIZED VIEW: Monthly revenue summary
-- ============================================
create materialized view if not exists public.mv_monthly_revenue as
select
  user_id,
  date_trunc('month', created_at)::date as month,
  count(*) filter (where status = 'approved') as sales_count,
  coalesce(sum(amount) filter (where status = 'approved'), 0) as gross_revenue,
  coalesce(sum(net_amount) filter (where status = 'approved'), 0) as net_revenue,
  count(*) filter (where status = 'refunded') as refund_count,
  coalesce(sum(amount) filter (where status = 'refunded'), 0) as refund_amount,
  count(distinct buyer_email) as unique_buyers
from public.transactions
group by user_id, date_trunc('month', created_at)::date;

create unique index if not exists idx_mv_monthly_revenue
  on public.mv_monthly_revenue(user_id, month);

-- ============================================
-- MATERIALIZED VIEW: Product performance
-- ============================================
create materialized view if not exists public.mv_product_performance as
select
  t.user_id,
  t.product_id,
  p.name as product_name,
  p.price as current_price,
  count(*) filter (where t.status = 'approved') as total_sales,
  coalesce(sum(t.amount) filter (where t.status = 'approved'), 0) as total_revenue,
  coalesce(avg(t.amount) filter (where t.status = 'approved'), 0) as avg_ticket,
  count(*) filter (where t.status = 'refunded') as total_refunds,
  case when count(*) filter (where t.status = 'approved') > 0
    then round(count(*) filter (where t.status = 'refunded')::numeric / count(*) filter (where t.status = 'approved') * 100, 2)
    else 0 end as refund_rate
from public.transactions t
join public.products p on p.id = t.product_id
group by t.user_id, t.product_id, p.name, p.price;

create unique index if not exists idx_mv_product_performance
  on public.mv_product_performance(user_id, product_id);

-- ============================================
-- pg_cron: Schedule daily metrics refresh (runs at 01:00 UTC)
-- Note: pg_cron must be enabled in your Supabase project settings
-- ============================================
-- Uncomment after enabling pg_cron in Supabase Dashboard > Database > Extensions:
--
-- select cron.schedule(
--   'refresh-daily-metrics',
--   '0 1 * * *',
--   $$
--   do $inner$
--   declare
--     uid uuid;
--   begin
--     for uid in select id from public.profiles where onboarding_completed = true
--     loop
--       perform public.calculate_daily_metrics(uid, current_date - interval '1 day');
--     end loop;
--   end $inner$;
--   $$
-- );
--
-- select cron.schedule(
--   'refresh-materialized-views',
--   '30 1 * * *',
--   $$
--   refresh materialized view concurrently public.mv_monthly_revenue;
--   refresh materialized view concurrently public.mv_product_performance;
--   $$
-- );
