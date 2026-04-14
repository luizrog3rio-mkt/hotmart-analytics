import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getDemoData } from '@/services/demo-data'
import type { DemoData, DemoTransaction, DemoProduct, DemoAffiliate, DemoRefund, DemoDailyMetric } from '@/services/demo-data'

interface UseDataReturn {
  data: DemoData
  isRealData: boolean
  loading: boolean
  refetch: () => Promise<void>
}

export function useData(): UseDataReturn {
  const { user, isDemoMode } = useAuth()
  const [realData, setRealData] = useState<DemoData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchRealData = useCallback(async () => {
    if (isDemoMode || !user) return

    setLoading(true)
    try {
      // Check if user has any transactions
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (!count || count === 0) {
        // No real data — will fallback to demo
        setRealData(null)
        setLoading(false)
        return
      }

      // Fetch all data in parallel
      const [productsRes, affiliatesRes, transactionsRes, refundsRes, metricsRes] = await Promise.all([
        supabase.from('products').select('*').eq('user_id', user.id),
        supabase.from('affiliates').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('refunds').select('*').eq('user_id', user.id),
        supabase.from('daily_metrics').select('*').eq('user_id', user.id).order('date', { ascending: true }),
      ])

      // Map Supabase rows to demo data format
      const products: DemoProduct[] = (productsRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        type: p.type as DemoProduct['type'],
        status: p.status as DemoProduct['status'],
      }))

      const affiliates: DemoAffiliate[] = (affiliatesRes.data || []).map(a => ({
        id: a.id,
        name: a.name,
        email: a.email || '',
        commission_rate: Number(a.commission_rate),
        total_sales: a.total_sales,
        total_revenue: Number(a.total_revenue),
      }))

      // Build product name lookup
      const productNames = new Map(products.map(p => [p.id, p.name]))
      const affiliateNames = new Map(affiliates.map(a => [a.id, a.name]))

      const transactions: DemoTransaction[] = (transactionsRes.data || []).map(t => ({
        id: t.id,
        product_id: t.product_id,
        product_name: productNames.get(t.product_id) || 'Produto',
        buyer_email: t.buyer_email,
        buyer_name: t.buyer_name,
        amount: Number(t.amount),
        net_amount: Number(t.net_amount),
        status: t.status as DemoTransaction['status'],
        payment_method: t.payment_method as DemoTransaction['payment_method'],
        source: t.source as DemoTransaction['source'],
        utm_source: t.utm_source,
        utm_medium: t.utm_medium,
        utm_campaign: t.utm_campaign,
        affiliate_id: t.affiliate_id,
        affiliate_name: t.affiliate_id ? (affiliateNames.get(t.affiliate_id) || null) : null,
        country: t.country || 'BR',
        state: t.state,
        created_at: t.created_at,
      }))

      const refunds: DemoRefund[] = (refundsRes.data || []).map(r => ({
        id: r.id,
        transaction_id: r.transaction_id,
        amount: Number(r.amount),
        reason: r.reason || '',
        requested_at: r.requested_at,
      }))

      const dailyMetrics: DemoDailyMetric[] = (metricsRes.data || []).map(m => ({
        date: m.date,
        revenue: Number(m.revenue),
        sales_count: m.sales_count,
        refund_count: m.refund_count,
        mrr: Number(m.mrr),
        churn_rate: Number(m.churn_rate),
        avg_ticket: Number(m.avg_ticket),
      }))

      setRealData({ products, affiliates, transactions, refunds, dailyMetrics })
    } catch (err) {
      console.error('Failed to fetch real data:', err)
      setRealData(null)
    } finally {
      setLoading(false)
    }
  }, [user, isDemoMode])

  useEffect(() => {
    fetchRealData()
  }, [fetchRealData])

  const demoData = useMemo(() => getDemoData(), [])
  const data = realData || demoData
  const isRealData = realData !== null

  return { data, isRealData, loading, refetch: fetchRealData }
}
