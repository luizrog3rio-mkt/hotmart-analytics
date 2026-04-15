/**
 * Anomaly Detection Edge Function
 *
 * Analyzes daily metrics using moving average + standard deviation,
 * adjusted for day-of-week seasonality. Logs detected anomalies.
 *
 * POST /detect-anomalies — run for authenticated user
 *
 * Can also be invoked by pg_cron for scheduled detection.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface DailyMetric {
  date: string
  revenue: number
  sales_count: number
  refund_count: number
  mrr: number
  churn_rate: number
  avg_ticket: number
}

interface AnomalyResult {
  type: string
  severity: 'critical' | 'warning' | 'info' | 'opportunity'
  metric: string
  expected_value: number
  actual_value: number
  deviation_pct: number
  context_json: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Statistical helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function dayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay()
}

// ---------------------------------------------------------------------------
// Anomaly detection logic
// ---------------------------------------------------------------------------

function detectAnomalies(metrics: DailyMetric[], currentDate: string): AnomalyResult[] {
  const anomalies: AnomalyResult[] = []

  if (metrics.length < 14) return anomalies // Need at least 2 weeks of data

  const today = metrics.find(m => m.date === currentDate)
  if (!today) return anomalies

  const todayDow = dayOfWeek(currentDate)

  // Get same day-of-week metrics (seasonality adjustment)
  const sameDowMetrics = metrics
    .filter(m => m.date !== currentDate && dayOfWeek(m.date) === todayDow)
    .slice(-8) // last 8 same-day entries (~2 months)

  // Also get last 30 days for general trend
  const last30 = metrics.filter(m => m.date !== currentDate).slice(-30)

  // --- Revenue anomaly ---
  const revenueValues = sameDowMetrics.length >= 3
    ? sameDowMetrics.map(m => m.revenue)
    : last30.map(m => m.revenue)

  const revMean = mean(revenueValues)
  const revStd = stddev(revenueValues)

  if (revMean > 0 && revStd > 0) {
    const deviation = ((today.revenue - revMean) / revMean) * 100

    if (today.revenue < revMean - 2 * revStd) {
      anomalies.push({
        type: 'sales_drop',
        severity: Math.abs(deviation) > 50 ? 'critical' : 'warning',
        metric: 'revenue',
        expected_value: Math.round(revMean * 100) / 100,
        actual_value: today.revenue,
        deviation_pct: Math.round(deviation * 100) / 100,
        context_json: {
          day_of_week: todayDow,
          mean_30d: Math.round(mean(last30.map(m => m.revenue)) * 100) / 100,
          std_dev: Math.round(revStd * 100) / 100,
          message: `Receita ${Math.abs(Math.round(deviation))}% abaixo do esperado para ${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][todayDow]}.`,
        },
      })
    } else if (today.revenue > revMean + 2.5 * revStd) {
      anomalies.push({
        type: 'positive_opportunity',
        severity: 'opportunity',
        metric: 'revenue',
        expected_value: Math.round(revMean * 100) / 100,
        actual_value: today.revenue,
        deviation_pct: Math.round(deviation * 100) / 100,
        context_json: {
          message: `Receita ${Math.round(deviation)}% acima do esperado! Investigue o que impulsionou esse pico.`,
        },
      })
    }
  }

  // --- Refund spike ---
  const refundValues = last30.map(m => m.refund_count)
  const refundMean = mean(refundValues)
  const refundStd = stddev(refundValues)

  if (refundMean > 0 && today.refund_count > refundMean + 2 * refundStd) {
    const deviation = ((today.refund_count - refundMean) / refundMean) * 100
    anomalies.push({
      type: 'refund_spike',
      severity: deviation > 100 ? 'critical' : 'warning',
      metric: 'refund_count',
      expected_value: Math.round(refundMean * 100) / 100,
      actual_value: today.refund_count,
      deviation_pct: Math.round(deviation * 100) / 100,
      context_json: {
        message: `Reembolsos ${Math.round(deviation)}% acima do normal. Media: ${refundMean.toFixed(1)}, hoje: ${today.refund_count}.`,
      },
    })
  }

  // --- Ticket medio change ---
  const ticketValues = last30.filter(m => m.avg_ticket > 0).map(m => m.avg_ticket)
  const ticketMean = mean(ticketValues)
  const ticketStd = stddev(ticketValues)

  if (ticketMean > 0 && today.avg_ticket > 0 && ticketStd > 0) {
    const deviation = ((today.avg_ticket - ticketMean) / ticketMean) * 100
    if (Math.abs(deviation) > 15 && Math.abs(today.avg_ticket - ticketMean) > 2 * ticketStd) {
      anomalies.push({
        type: 'ticket_change',
        severity: 'warning',
        metric: 'avg_ticket',
        expected_value: Math.round(ticketMean * 100) / 100,
        actual_value: today.avg_ticket,
        deviation_pct: Math.round(deviation * 100) / 100,
        context_json: {
          message: `Ticket medio ${deviation > 0 ? 'subiu' : 'caiu'} ${Math.abs(Math.round(deviation))}% vs. media.`,
        },
      })
    }
  }

  // --- Churn spike ---
  const churnValues = last30.filter(m => m.churn_rate > 0).map(m => m.churn_rate)
  const churnMean = mean(churnValues)

  if (churnMean > 0 && today.churn_rate > churnMean * 1.5) {
    const deviation = ((today.churn_rate - churnMean) / churnMean) * 100
    anomalies.push({
      type: 'churn_spike',
      severity: deviation > 100 ? 'critical' : 'warning',
      metric: 'churn_rate',
      expected_value: Math.round(churnMean * 100) / 100,
      actual_value: today.churn_rate,
      deviation_pct: Math.round(deviation * 100) / 100,
      context_json: {
        message: `Taxa de churn ${Math.round(deviation)}% acima do padrao. Verifique cancelamentos recentes.`,
      },
    })
  }

  return anomalies
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch last 90 days of metrics
    const { data: metrics } = await supabase
      .from('daily_metrics')
      .select('date, revenue, sales_count, refund_count, mrr, churn_rate, avg_ticket')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    if (!metrics || metrics.length < 14) {
      return new Response(
        JSON.stringify({ anomalies: [], message: 'Need at least 14 days of data for anomaly detection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const anomalies = detectAnomalies(
      metrics.map(m => ({
        ...m,
        revenue: Number(m.revenue),
        sales_count: Number(m.sales_count),
        refund_count: Number(m.refund_count),
        mrr: Number(m.mrr),
        churn_rate: Number(m.churn_rate),
        avg_ticket: Number(m.avg_ticket),
      })),
      today,
    )

    // Insert new anomalies
    if (anomalies.length > 0) {
      const rows = anomalies.map(a => ({
        user_id: user.id,
        type: a.type,
        severity: a.severity,
        metric: a.metric,
        expected_value: a.expected_value,
        actual_value: a.actual_value,
        deviation_pct: a.deviation_pct,
        context_json: a.context_json,
        status: 'new',
        detected_at: new Date().toISOString(),
      }))

      await supabase.from('anomaly_logs').insert(rows)
    }

    return new Response(
      JSON.stringify({ anomalies, count: anomalies.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('detect-anomalies error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
