/**
 * Generate Report Edge Function
 *
 * Generates summary reports (daily, weekly, monthly) for a user
 * and returns structured data that can be sent via email/Telegram.
 *
 * POST /generate-report { frequency: 'daily' | 'weekly' | 'monthly' }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ReportData {
  period: { start: string; end: string }
  revenue: { current: number; previous: number; change_pct: number }
  sales: { current: number; previous: number; change_pct: number }
  refunds: { current: number; previous: number; change_pct: number }
  avg_ticket: { current: number; previous: number; change_pct: number }
  mrr: number
  churn_rate: number
  top_products: Array<{ name: string; revenue: number; sales: number }>
  top_affiliates: Array<{ name: string; revenue: number; sales: number }>
  insights: string[]
}

function changePct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100 * 100) / 100
}

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

    const body = await req.json().catch(() => ({}))
    const frequency = body.frequency || 'daily'

    // Determine date ranges
    const now = new Date()
    let periodDays: number
    switch (frequency) {
      case 'weekly': periodDays = 7; break
      case 'monthly': periodDays = 30; break
      default: periodDays = 1; break
    }

    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)
    const previousStart = new Date(currentStart.getTime() - periodDays * 24 * 60 * 60 * 1000)

    const fmt = (d: Date) => d.toISOString().split('T')[0]

    // Fetch metrics for both periods
    const { data: currentMetrics } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', fmt(currentStart))
      .lte('date', fmt(now))

    const { data: previousMetrics } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', fmt(previousStart))
      .lt('date', fmt(currentStart))

    const sumMetric = (data: typeof currentMetrics, field: 'revenue' | 'sales_count' | 'refund_count') =>
      (data || []).reduce((acc, m) => acc + Number(m[field]), 0)

    const avgMetric = (data: typeof currentMetrics, field: 'avg_ticket' | 'churn_rate' | 'mrr') => {
      const vals = (data || []).map(m => Number(m[field])).filter(v => v > 0)
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    }

    const curRevenue = sumMetric(currentMetrics, 'revenue')
    const prevRevenue = sumMetric(previousMetrics, 'revenue')
    const curSales = sumMetric(currentMetrics, 'sales_count')
    const prevSales = sumMetric(previousMetrics, 'sales_count')
    const curRefunds = sumMetric(currentMetrics, 'refund_count')
    const prevRefunds = sumMetric(previousMetrics, 'refund_count')
    const curTicket = avgMetric(currentMetrics, 'avg_ticket')
    const prevTicket = avgMetric(previousMetrics, 'avg_ticket')

    // Top products
    const { data: transactions } = await supabase
      .from('transactions')
      .select('product_id, amount')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .gte('created_at', currentStart.toISOString())

    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .eq('user_id', user.id)

    const productNameMap = new Map((products || []).map(p => [p.id, p.name]))
    const productStats = new Map<string, { revenue: number; sales: number }>()

    for (const tx of transactions || []) {
      const stats = productStats.get(tx.product_id) || { revenue: 0, sales: 0 }
      stats.revenue += Number(tx.amount)
      stats.sales += 1
      productStats.set(tx.product_id, stats)
    }

    const topProducts = [...productStats.entries()]
      .map(([id, stats]) => ({ name: productNameMap.get(id) || 'Unknown', ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Top affiliates
    const { data: affiliateTx } = await supabase
      .from('transactions')
      .select('affiliate_id, amount')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .eq('source', 'affiliate')
      .not('affiliate_id', 'is', null)
      .gte('created_at', currentStart.toISOString())

    const { data: affiliates } = await supabase
      .from('affiliates')
      .select('id, name')
      .eq('user_id', user.id)

    const affNameMap = new Map((affiliates || []).map(a => [a.id, a.name]))
    const affStats = new Map<string, { revenue: number; sales: number }>()

    for (const tx of affiliateTx || []) {
      if (!tx.affiliate_id) continue
      const stats = affStats.get(tx.affiliate_id) || { revenue: 0, sales: 0 }
      stats.revenue += Number(tx.amount)
      stats.sales += 1
      affStats.set(tx.affiliate_id, stats)
    }

    const topAffiliates = [...affStats.entries()]
      .map(([id, stats]) => ({ name: affNameMap.get(id) || 'Unknown', ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Generate insights
    const insights: string[] = []
    const revChange = changePct(curRevenue, prevRevenue)

    if (revChange > 10) insights.push(`Receita cresceu ${revChange}% em relacao ao periodo anterior.`)
    else if (revChange < -10) insights.push(`Receita caiu ${Math.abs(revChange)}% — investigue possiveis causas.`)

    if (topProducts.length > 0) {
      insights.push(`Produto top: "${topProducts[0].name}" com R$ ${topProducts[0].revenue.toFixed(2)} em vendas.`)
    }

    if (curRefunds > prevRefunds * 1.5 && prevRefunds > 0) {
      insights.push(`Atencao: reembolsos subiram ${changePct(curRefunds, prevRefunds)}% — verifique a qualidade.`)
    }

    const report: ReportData = {
      period: { start: fmt(currentStart), end: fmt(now) },
      revenue: { current: curRevenue, previous: prevRevenue, change_pct: revChange },
      sales: { current: curSales, previous: prevSales, change_pct: changePct(curSales, prevSales) },
      refunds: { current: curRefunds, previous: prevRefunds, change_pct: changePct(curRefunds, prevRefunds) },
      avg_ticket: { current: Math.round(curTicket * 100) / 100, previous: Math.round(prevTicket * 100) / 100, change_pct: changePct(curTicket, prevTicket) },
      mrr: Math.round(avgMetric(currentMetrics, 'mrr') * 100) / 100,
      churn_rate: Math.round(avgMetric(currentMetrics, 'churn_rate') * 100) / 100,
      top_products: topProducts,
      top_affiliates: topAffiliates,
      insights,
    }

    return new Response(
      JSON.stringify({ report, frequency }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('generate-report error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
