-- ============================================
-- Hotmart Sales Analytics - Cron Jobs
-- Requires: pg_cron extension (enable via Dashboard > Database > Extensions)
-- ============================================

-- Remove previous schedules if re-applying
do $$
begin
  if exists (select 1 from pg_proc where proname = 'unschedule' and pronamespace = (select oid from pg_namespace where nspname = 'cron')) then
    perform cron.unschedule(jobname) from cron.job where jobname in ('refresh-daily-metrics', 'refresh-materialized-views');
  end if;
exception when others then
  -- no prior jobs, ignore
  null;
end $$;

-- Daily metrics snapshot for all onboarded users (01:00 UTC)
select cron.schedule(
  'refresh-daily-metrics',
  '0 1 * * *',
  $$
  do $inner$
  declare
    uid uuid;
  begin
    for uid in select id from public.profiles where onboarding_completed = true
    loop
      perform public.calculate_daily_metrics(uid, current_date - interval '1 day');
    end loop;
  end $inner$;
  $$
);

-- Refresh materialized views (01:30 UTC)
select cron.schedule(
  'refresh-materialized-views',
  '30 1 * * *',
  $$
  refresh materialized view concurrently public.mv_monthly_revenue;
  refresh materialized view concurrently public.mv_product_performance;
  $$
);
