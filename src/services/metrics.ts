import { subDays, parseISO, isWithinInterval, format, differenceInDays } from 'date-fns'
import type { DemoTransaction, DemoDailyMetric, DemoData } from './demo-data'

export interface DateRange {
  from: Date
  to: Date
}

export interface KPIMetrics {
  totalRevenue: number
  previousRevenue: number
  totalSales: number
  previousSales: number
  avgTicket: number
  previousAvgTicket: number
  conversionRate: number
  previousConversionRate: number
  mrr: number
  previousMrr: number
  churnRate: number
  previousChurnRate: number
  ltv: number
  previousLtv: number
  refundCount: number
  previousRefundCount: number
  refundRate: number
  previousRefundRate: number
  refundAmount: number
  previousRefundAmount: number
}

export function filterTransactions(
  transactions: DemoTransaction[],
  range: DateRange,
  filters?: {
    products?: string[]
    status?: string[]
    paymentMethods?: string[]
    sources?: string[]
  }
): DemoTransaction[] {
  return transactions.filter(tx => {
    const txDate = parseISO(tx.created_at)
    if (!isWithinInterval(txDate, { start: range.from, end: range.to })) return false
    if (filters?.products?.length && !filters.products.includes(tx.product_id)) return false
    if (filters?.status?.length && !filters.status.includes(tx.status)) return false
    if (filters?.paymentMethods?.length && !filters.paymentMethods.includes(tx.payment_method)) return false
    if (filters?.sources?.length && !filters.sources.includes(tx.source)) return false
    return true
  })
}

export function calculateKPIs(data: DemoData, range: DateRange): KPIMetrics {
  const rangeDays = differenceInDays(range.to, range.from) + 1
  const previousRange: DateRange = {
    from: subDays(range.from, rangeDays),
    to: subDays(range.from, 1),
  }

  const currentTx = filterTransactions(data.transactions, range)
  const previousTx = filterTransactions(data.transactions, previousRange)

  const approvedCurrent = currentTx.filter(t => t.status === 'approved')
  const approvedPrevious = previousTx.filter(t => t.status === 'approved')

  const refundedCurrent = currentTx.filter(t => t.status === 'refunded')
  const refundedPrevious = previousTx.filter(t => t.status === 'refunded')

  const totalRevenue = approvedCurrent.reduce((sum, t) => sum + t.amount, 0)
  const previousRevenue = approvedPrevious.reduce((sum, t) => sum + t.amount, 0)

  const totalSales = approvedCurrent.length
  const previousSales = approvedPrevious.length

  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0
  const previousAvgTicket = previousSales > 0 ? previousRevenue / previousSales : 0

  // Simulated conversion rate
  const conversionRate = totalSales > 0 ? (totalSales / (totalSales * 3.2)) * 100 : 0
  const previousConversionRate = previousSales > 0 ? (previousSales / (previousSales * 3.5)) * 100 : 0

  // Get latest MRR from daily metrics
  const currentMetrics = data.dailyMetrics.filter(m =>
    isWithinInterval(parseISO(m.date), { start: range.from, end: range.to })
  )
  const previousMetrics = data.dailyMetrics.filter(m =>
    isWithinInterval(parseISO(m.date), { start: previousRange.from, end: previousRange.to })
  )

  const mrr = currentMetrics.length > 0 ? currentMetrics[currentMetrics.length - 1].mrr : 0
  const previousMrr = previousMetrics.length > 0 ? previousMetrics[previousMetrics.length - 1].mrr : 0

  const churnRate = currentMetrics.length > 0
    ? currentMetrics.reduce((sum, m) => sum + m.churn_rate, 0) / currentMetrics.length
    : 0
  const previousChurnRate = previousMetrics.length > 0
    ? previousMetrics.reduce((sum, m) => sum + m.churn_rate, 0) / previousMetrics.length
    : 0

  const ltv = avgTicket * (1 / (churnRate / 100 || 0.05))
  const previousLtv = previousAvgTicket * (1 / (previousChurnRate / 100 || 0.05))

  const refundAmount = refundedCurrent.reduce((sum, t) => sum + t.amount, 0)
  const previousRefundAmount = refundedPrevious.reduce((sum, t) => sum + t.amount, 0)

  return {
    totalRevenue,
    previousRevenue,
    totalSales,
    previousSales,
    avgTicket,
    previousAvgTicket,
    conversionRate,
    previousConversionRate,
    mrr,
    previousMrr,
    churnRate,
    previousChurnRate,
    ltv,
    previousLtv,
    refundCount: refundedCurrent.length,
    previousRefundCount: refundedPrevious.length,
    refundRate: currentTx.length > 0 ? (refundedCurrent.length / currentTx.length) * 100 : 0,
    previousRefundRate: previousTx.length > 0 ? (refundedPrevious.length / previousTx.length) * 100 : 0,
    refundAmount,
    previousRefundAmount,
  }
}

export function getRevenueOverTime(
  transactions: DemoTransaction[],
  range: DateRange,
): { date: string; revenue: number; previousRevenue: number }[] {
  const rangeDays = differenceInDays(range.to, range.from) + 1
  const result: { date: string; revenue: number; previousRevenue: number }[] = []

  for (let i = 0; i < rangeDays; i++) {
    const date = subDays(range.to, rangeDays - 1 - i)
    const previousDate = subDays(date, rangeDays)
    const dateStr = format(date, 'yyyy-MM-dd')
    const previousDateStr = format(previousDate, 'yyyy-MM-dd')

    const dayRevenue = transactions
      .filter(t => t.status === 'approved' && t.created_at.startsWith(dateStr))
      .reduce((sum, t) => sum + t.amount, 0)

    const prevRevenue = transactions
      .filter(t => t.status === 'approved' && t.created_at.startsWith(previousDateStr))
      .reduce((sum, t) => sum + t.amount, 0)

    result.push({
      date: format(date, 'dd/MM'),
      revenue: Math.round(dayRevenue * 100) / 100,
      previousRevenue: Math.round(prevRevenue * 100) / 100,
    })
  }

  return result
}

export function getSalesByProduct(
  transactions: DemoTransaction[],
  range: DateRange,
): { name: string; revenue: number; count: number }[] {
  const filtered = filterTransactions(transactions, range).filter(t => t.status === 'approved')
  const map = new Map<string, { name: string; revenue: number; count: number }>()

  for (const tx of filtered) {
    const existing = map.get(tx.product_id)
    if (existing) {
      existing.revenue += tx.amount
      existing.count += 1
    } else {
      map.set(tx.product_id, {
        name: tx.product_name,
        revenue: tx.amount,
        count: 1,
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
}

export function getPaymentMethodDistribution(
  transactions: DemoTransaction[],
  range: DateRange,
): { name: string; value: number; fill: string }[] {
  const filtered = filterTransactions(transactions, range).filter(t => t.status === 'approved')
  const methods: Record<string, number> = {}

  for (const tx of filtered) {
    methods[tx.payment_method] = (methods[tx.payment_method] || 0) + 1
  }

  const labels: Record<string, string> = {
    credit_card: 'Cartão de Crédito',
    pix: 'PIX',
    boleto: 'Boleto',
    paypal: 'PayPal',
  }

  const colors: Record<string, string> = {
    credit_card: '#3b82f6',
    pix: '#22c55e',
    boleto: '#f59e0b',
    paypal: '#8b5cf6',
  }

  return Object.entries(methods).map(([method, count]) => ({
    name: labels[method] || method,
    value: count,
    fill: colors[method] || '#6b7280',
  }))
}

export function getTopAffiliates(
  transactions: DemoTransaction[],
  range: DateRange,
  limit = 10,
): { name: string; revenue: number; sales: number }[] {
  const filtered = filterTransactions(transactions, range)
    .filter(t => t.status === 'approved' && t.affiliate_id)

  const map = new Map<string, { name: string; revenue: number; sales: number }>()

  for (const tx of filtered) {
    const name = tx.affiliate_name || 'Desconhecido'
    const existing = map.get(tx.affiliate_id!)
    if (existing) {
      existing.revenue += tx.amount
      existing.sales += 1
    } else {
      map.set(tx.affiliate_id!, { name, revenue: tx.amount, sales: 1 })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

export function getSalesHeatmap(
  transactions: DemoTransaction[],
  range: DateRange,
): { day: number; hour: number; value: number }[] {
  const filtered = filterTransactions(transactions, range).filter(t => t.status === 'approved')
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

  for (const tx of filtered) {
    const date = parseISO(tx.created_at)
    const day = date.getDay()
    const hour = date.getHours()
    grid[day][hour] += 1
  }

  const result: { day: number; hour: number; value: number }[] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      result.push({ day, hour, value: grid[day][hour] })
    }
  }

  return result
}

export function getFunnelData(): { name: string; value: number; fill: string }[] {
  const visitors = Math.floor(Math.random() * 5000) + 10000
  const checkoutStarted = Math.floor(visitors * (0.15 + Math.random() * 0.1))
  const paymentSubmitted = Math.floor(checkoutStarted * (0.55 + Math.random() * 0.15))
  const paymentApproved = Math.floor(paymentSubmitted * (0.75 + Math.random() * 0.15))

  return [
    { name: 'Visitas na Página', value: visitors, fill: '#3b82f6' },
    { name: 'Checkout Iniciado', value: checkoutStarted, fill: '#60a5fa' },
    { name: 'Pagamento Submetido', value: paymentSubmitted, fill: '#93c5fd' },
    { name: 'Pagamento Aprovado', value: paymentApproved, fill: '#22c55e' },
  ]
}

export function getMonthlyRevenue(
  metrics: DemoDailyMetric[],
): { month: string; revenue: number }[] {
  const map = new Map<string, number>()

  for (const m of metrics) {
    const month = m.date.slice(0, 7) // yyyy-MM
    map.set(month, (map.get(month) || 0) + m.revenue)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => ({
      month: format(parseISO(`${month}-01`), 'MMM/yy'),
      revenue: Math.round(revenue * 100) / 100,
    }))
}
