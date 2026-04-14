import { parseISO, differenceInDays, format, subDays, startOfMonth } from 'date-fns'
import type { DemoTransaction } from './demo-data'
import type { DateRange } from './metrics'

// ============================================================
// RFM SEGMENTATION
// ============================================================

export interface RFMScore {
  buyerEmail: string
  buyerName: string
  recency: number       // days since last purchase
  frequency: number     // total purchases
  monetary: number      // total spent
  rScore: number        // 1-5
  fScore: number        // 1-5
  mScore: number        // 1-5
  segment: string
  segmentColor: string
}

export interface RFMSegmentSummary {
  segment: string
  color: string
  count: number
  percentage: number
  avgRecency: number
  avgFrequency: number
  avgMonetary: number
  recommendation: string
}

function scoreQuintile(value: number, quintiles: number[], inverse = false): number {
  if (inverse) {
    if (value <= quintiles[0]) return 5
    if (value <= quintiles[1]) return 4
    if (value <= quintiles[2]) return 3
    if (value <= quintiles[3]) return 2
    return 1
  }
  if (value >= quintiles[3]) return 5
  if (value >= quintiles[2]) return 4
  if (value >= quintiles[1]) return 3
  if (value >= quintiles[0]) return 2
  return 1
}

function getQuintiles(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  return [
    sorted[Math.floor(sorted.length * 0.2)],
    sorted[Math.floor(sorted.length * 0.4)],
    sorted[Math.floor(sorted.length * 0.6)],
    sorted[Math.floor(sorted.length * 0.8)],
  ]
}

function getSegment(r: number, f: number, m: number): { name: string; color: string } {
  if (r >= 4 && f >= 4 && m >= 4) return { name: 'Champions', color: '#22c55e' }
  if (r >= 3 && f >= 4) return { name: 'Clientes Fiéis', color: '#3b82f6' }
  if (r >= 4 && f <= 2) return { name: 'Novos Clientes', color: '#8b5cf6' }
  if (r >= 3 && f >= 2 && m >= 3) return { name: 'Potenciais Fiéis', color: '#06b6d4' }
  if (r <= 2 && f >= 3) return { name: 'Em Risco', color: '#f59e0b' }
  if (r <= 2 && f <= 2) return { name: 'Hibernando', color: '#ef4444' }
  if (r >= 3 && m >= 4) return { name: 'Alto Valor', color: '#10b981' }
  return { name: 'Regulares', color: '#6b7280' }
}

const SEGMENT_RECOMMENDATIONS: Record<string, string> = {
  'Champions': 'Recompense com acesso antecipado e programa VIP. Peça depoimentos.',
  'Clientes Fiéis': 'Ofereça upsell e cross-sell. Crie programa de fidelidade.',
  'Novos Clientes': 'Entregue valor rápido no onboarding. Envie conteúdo educacional.',
  'Potenciais Fiéis': 'Incentive segunda compra com desconto exclusivo.',
  'Em Risco': 'Campanha de reengajamento urgente. Oferta especial de retenção.',
  'Hibernando': 'Campanha de win-back com desconto agressivo ou novo produto.',
  'Alto Valor': 'Tratamento VIP. Ofereça mentoria ou produto premium.',
  'Regulares': 'Nutra com conteúdo e ofertas periódicas.',
}

export function calculateRFM(transactions: DemoTransaction[]): RFMScore[] {
  const now = new Date()
  const approved = transactions.filter(t => t.status === 'approved')

  // Group by buyer
  const buyers = new Map<string, { name: string; lastPurchase: Date; count: number; total: number }>()
  for (const tx of approved) {
    const email = tx.buyer_email
    const existing = buyers.get(email)
    const txDate = parseISO(tx.created_at)
    if (existing) {
      existing.count += 1
      existing.total += tx.amount
      if (txDate > existing.lastPurchase) existing.lastPurchase = txDate
    } else {
      buyers.set(email, { name: tx.buyer_name, lastPurchase: txDate, count: 1, total: tx.amount })
    }
  }

  if (buyers.size === 0) return []

  const entries = Array.from(buyers.entries())
  const recencies = entries.map(([, v]) => differenceInDays(now, v.lastPurchase))
  const frequencies = entries.map(([, v]) => v.count)
  const monetaries = entries.map(([, v]) => v.total)

  const rQ = getQuintiles(recencies)
  const fQ = getQuintiles(frequencies)
  const mQ = getQuintiles(monetaries)

  return entries.map(([email, data]) => {
    const recency = differenceInDays(now, data.lastPurchase)
    const rScore = scoreQuintile(recency, rQ, true) // inverse: lower recency = higher score
    const fScore = scoreQuintile(data.count, fQ)
    const mScore = scoreQuintile(data.total, mQ)
    const seg = getSegment(rScore, fScore, mScore)

    return {
      buyerEmail: email,
      buyerName: data.name,
      recency,
      frequency: data.count,
      monetary: data.total,
      rScore,
      fScore,
      mScore,
      segment: seg.name,
      segmentColor: seg.color,
    }
  })
}

export function getRFMSegmentSummary(rfmScores: RFMScore[]): RFMSegmentSummary[] {
  const map = new Map<string, { color: string; scores: RFMScore[] }>()
  for (const s of rfmScores) {
    const existing = map.get(s.segment)
    if (existing) {
      existing.scores.push(s)
    } else {
      map.set(s.segment, { color: s.segmentColor, scores: [s] })
    }
  }

  const total = rfmScores.length
  return Array.from(map.entries())
    .map(([segment, { color, scores }]) => ({
      segment,
      color,
      count: scores.length,
      percentage: (scores.length / total) * 100,
      avgRecency: scores.reduce((s, r) => s + r.recency, 0) / scores.length,
      avgFrequency: scores.reduce((s, r) => s + r.frequency, 0) / scores.length,
      avgMonetary: scores.reduce((s, r) => s + r.monetary, 0) / scores.length,
      recommendation: SEGMENT_RECOMMENDATIONS[segment] || '',
    }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// COHORT ANALYSIS
// ============================================================

export interface CohortData {
  cohort: string           // "2026-01"
  cohortLabel: string      // "Jan/26"
  totalCustomers: number
  retention: number[]      // retention[0] = month 0 (100%), retention[1] = month 1, etc.
  revenue: number[]        // revenue by month
}

export function calculateCohorts(transactions: DemoTransaction[]): CohortData[] {
  const approved = transactions.filter(t => t.status === 'approved')

  // Group by buyer → find first purchase month
  const buyerFirstMonth = new Map<string, string>()
  const buyerMonths = new Map<string, Set<string>>()
  const buyerMonthRevenue = new Map<string, Map<string, number>>()

  for (const tx of approved) {
    const month = tx.created_at.slice(0, 7)
    const email = tx.buyer_email

    if (!buyerFirstMonth.has(email) || month < buyerFirstMonth.get(email)!) {
      buyerFirstMonth.set(email, month)
    }

    if (!buyerMonths.has(email)) buyerMonths.set(email, new Set())
    buyerMonths.get(email)!.add(month)

    if (!buyerMonthRevenue.has(email)) buyerMonthRevenue.set(email, new Map())
    const rev = buyerMonthRevenue.get(email)!
    rev.set(month, (rev.get(month) || 0) + tx.amount)
  }

  // Get all months sorted
  const allMonths = Array.from(new Set(approved.map(t => t.created_at.slice(0, 7)))).sort()

  // Build cohorts
  const cohortMap = new Map<string, { customers: Set<string>; retention: Map<string, Set<string>>; revenue: Map<string, number> }>()

  for (const [email, firstMonth] of buyerFirstMonth) {
    if (!cohortMap.has(firstMonth)) {
      cohortMap.set(firstMonth, {
        customers: new Set(),
        retention: new Map(),
        revenue: new Map(),
      })
    }

    const cohort = cohortMap.get(firstMonth)!
    cohort.customers.add(email)

    for (const month of buyerMonths.get(email)!) {
      if (!cohort.retention.has(month)) cohort.retention.set(month, new Set())
      cohort.retention.get(month)!.add(email)

      const rev = buyerMonthRevenue.get(email)?.get(month) || 0
      cohort.revenue.set(month, (cohort.revenue.get(month) || 0) + rev)
    }
  }

  return Array.from(cohortMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohortMonth, data]) => {
      const monthIndex = allMonths.indexOf(cohortMonth)
      const maxPeriods = allMonths.length - monthIndex
      const totalCustomers = data.customers.size

      const retention: number[] = []
      const revenue: number[] = []

      for (let i = 0; i < Math.min(maxPeriods, 6); i++) {
        const month = allMonths[monthIndex + i]
        const retainedCount = data.retention.get(month)?.size || 0
        retention.push(totalCustomers > 0 ? (retainedCount / totalCustomers) * 100 : 0)
        revenue.push(data.revenue.get(month) || 0)
      }

      const date = parseISO(`${cohortMonth}-01`)
      return {
        cohort: cohortMonth,
        cohortLabel: format(date, "MMM/yy"),
        totalCustomers,
        retention,
        revenue,
      }
    })
}

// ============================================================
// LTV ANALYSIS
// ============================================================

export interface LTVData {
  overall: number
  byProduct: { product: string; ltv: number; customers: number }[]
  bySource: { source: string; ltv: number; customers: number }[]
  ltvToCac: number
  paybackDays: number
  distribution: { range: string; count: number }[]
}

export function calculateLTV(transactions: DemoTransaction[]): LTVData {
  const approved = transactions.filter(t => t.status === 'approved')

  // Lifetime value per customer
  const customerSpend = new Map<string, { total: number; products: Set<string>; source: string; firstDate: Date }>()
  for (const tx of approved) {
    const existing = customerSpend.get(tx.buyer_email)
    if (existing) {
      existing.total += tx.amount
      existing.products.add(tx.product_id)
    } else {
      customerSpend.set(tx.buyer_email, {
        total: tx.amount,
        products: new Set([tx.product_id]),
        source: tx.source,
        firstDate: parseISO(tx.created_at),
      })
    }
  }

  const customers = Array.from(customerSpend.values())
  const overall = customers.length > 0
    ? customers.reduce((s, c) => s + c.total, 0) / customers.length
    : 0

  // By product
  const productLtv = new Map<string, { name: string; total: number; customers: Set<string> }>()
  for (const tx of approved) {
    const existing = productLtv.get(tx.product_id)
    if (existing) {
      existing.total += tx.amount
      existing.customers.add(tx.buyer_email)
    } else {
      productLtv.set(tx.product_id, { name: tx.product_name, total: tx.amount, customers: new Set([tx.buyer_email]) })
    }
  }

  const byProduct = Array.from(productLtv.values()).map(p => ({
    product: p.name,
    ltv: p.customers.size > 0 ? p.total / p.customers.size : 0,
    customers: p.customers.size,
  })).sort((a, b) => b.ltv - a.ltv)

  // By source
  const sourceLtv = new Map<string, { total: number; customers: Set<string> }>()
  for (const [email, data] of customerSpend) {
    const existing = sourceLtv.get(data.source)
    if (existing) {
      existing.total += data.total
      existing.customers.add(email)
    } else {
      sourceLtv.set(data.source, { total: data.total, customers: new Set([email]) })
    }
  }

  const sourceLabels: Record<string, string> = { organic: 'Orgânico', affiliate: 'Afiliado', campaign: 'Campanha' }
  const bySource = Array.from(sourceLtv.entries()).map(([source, data]) => ({
    source: sourceLabels[source] || source,
    ltv: data.customers.size > 0 ? data.total / data.customers.size : 0,
    customers: data.customers.size,
  })).sort((a, b) => b.ltv - a.ltv)

  // Distribution
  const ranges = [
    { range: 'R$0-100', min: 0, max: 100 },
    { range: 'R$100-300', min: 100, max: 300 },
    { range: 'R$300-500', min: 300, max: 500 },
    { range: 'R$500-1000', min: 500, max: 1000 },
    { range: 'R$1000-2000', min: 1000, max: 2000 },
    { range: 'R$2000+', min: 2000, max: Infinity },
  ]

  const distribution = ranges.map(r => ({
    range: r.range,
    count: customers.filter(c => c.total >= r.min && c.total < r.max).length,
  }))

  // Simulated CAC
  const avgCac = 85
  const ltvToCac = avgCac > 0 ? overall / avgCac : 0
  const paybackDays = overall > 0 ? Math.round((avgCac / overall) * 90) : 0

  return { overall, byProduct, bySource, ltvToCac, paybackDays, distribution }
}

// ============================================================
// CHURN ANALYSIS
// ============================================================

export interface ChurnData {
  currentRate: number
  previousRate: number
  voluntaryRate: number
  involuntaryRate: number
  churnedMRR: number
  recoveredMRR: number
  monthlyRates: { month: string; rate: number; voluntary: number; involuntary: number }[]
  reasons: { reason: string; count: number; percentage: number }[]
  retentionByPlan: { plan: string; retention: number }[]
}

export function calculateChurn(_transactions: DemoTransaction[], _range: DateRange): ChurnData {
  // Simulate churn data based on transaction patterns
  const months: { month: string; rate: number; voluntary: number; involuntary: number }[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = subDays(now, i * 30)
    const month = format(d, 'MMM/yy')
    const baseRate = 3.5 + Math.random() * 4
    const voluntary = baseRate * (0.55 + Math.random() * 0.15)
    months.push({
      month,
      rate: Math.round(baseRate * 100) / 100,
      voluntary: Math.round(voluntary * 100) / 100,
      involuntary: Math.round((baseRate - voluntary) * 100) / 100,
    })
  }

  const currentRate = months[months.length - 1].rate
  const previousRate = months.length > 1 ? months[months.length - 2].rate : currentRate

  const reasons = [
    { reason: 'Não utiliza mais o produto', count: 35, percentage: 28 },
    { reason: 'Preço alto', count: 25, percentage: 20 },
    { reason: 'Encontrou alternativa melhor', count: 20, percentage: 16 },
    { reason: 'Falha no pagamento', count: 18, percentage: 14.4 },
    { reason: 'Problema financeiro', count: 15, percentage: 12 },
    { reason: 'Suporte insatisfatório', count: 8, percentage: 6.4 },
    { reason: 'Outro', count: 4, percentage: 3.2 },
  ]

  const retentionByPlan = [
    { plan: 'Mensal', retention: 72 },
    { plan: 'Trimestral', retention: 85 },
    { plan: 'Anual', retention: 94 },
  ]

  return {
    currentRate,
    previousRate,
    voluntaryRate: months[months.length - 1].voluntary,
    involuntaryRate: months[months.length - 1].involuntary,
    churnedMRR: 3200 + Math.random() * 2000,
    recoveredMRR: 800 + Math.random() * 1200,
    monthlyRates: months,
    reasons,
    retentionByPlan,
  }
}

// ============================================================
// RECOVERY ANALYTICS (Boletos, Cards, Abandonment)
// ============================================================

export interface RecoveryData {
  boletos: {
    generated: number
    paid: number
    conversionRate: number
    lostRevenue: number
    avgDaysToPay: number
    byDay: { day: string; generated: number; paid: number }[]
  }
  failedCards: {
    total: number
    recovered: number
    recoveryRate: number
    lostRevenue: number
    byReason: { reason: string; count: number; percentage: number }[]
  }
  abandonedCheckouts: {
    total: number
    steps: { step: string; count: number; dropRate: number }[]
    lostRevenue: number
    byDevice: { device: string; rate: number }[]
  }
  totalRecoverable: number
}

export function calculateRecovery(transactions: DemoTransaction[]): RecoveryData {
  const boletoTx = transactions.filter(t => t.payment_method === 'boleto')
  const approvedBoleto = boletoTx.filter(t => t.status === 'approved')
  const totalBoletoValue = boletoTx.reduce((s, t) => s + t.amount, 0)
  const paidBoletoValue = approvedBoleto.reduce((s, t) => s + t.amount, 0)

  const boletosByDay: { day: string; generated: number; paid: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i)
    const dateStr = format(d, 'dd/MM')
    const generated = Math.floor(8 + Math.random() * 15)
    const paid = Math.floor(generated * (0.3 + Math.random() * 0.25))
    boletosByDay.push({ day: dateStr, generated, paid })
  }

  const failedReasons = [
    { reason: 'Saldo insuficiente', count: 42, percentage: 35 },
    { reason: 'Cartão expirado', count: 24, percentage: 20 },
    { reason: 'Limite excedido', count: 22, percentage: 18.3 },
    { reason: 'Suspeita de fraude', count: 18, percentage: 15 },
    { reason: 'Dados incorretos', count: 14, percentage: 11.7 },
  ]

  const checkoutSteps = [
    { step: 'Página de vendas', count: 15000, dropRate: 0 },
    { step: 'Início do checkout', count: 3200, dropRate: 78.7 },
    { step: 'Preenchimento de dados', count: 2400, dropRate: 25 },
    { step: 'Escolha de pagamento', count: 1900, dropRate: 20.8 },
    { step: 'Confirmação', count: 1500, dropRate: 21.1 },
  ]

  const abandonedLostRevenue = (3200 - 1500) * 350 // avg ticket * abandoned
  const failedTotal = 120
  const failedRecovered = Math.floor(failedTotal * 0.35)

  return {
    boletos: {
      generated: boletoTx.length,
      paid: approvedBoleto.length,
      conversionRate: boletoTx.length > 0 ? (approvedBoleto.length / boletoTx.length) * 100 : 0,
      lostRevenue: totalBoletoValue - paidBoletoValue,
      avgDaysToPay: 1.8,
      byDay: boletosByDay,
    },
    failedCards: {
      total: failedTotal,
      recovered: failedRecovered,
      recoveryRate: (failedRecovered / failedTotal) * 100,
      lostRevenue: (failedTotal - failedRecovered) * 450,
      byReason: failedReasons,
    },
    abandonedCheckouts: {
      total: 3200 - 1500,
      steps: checkoutSteps,
      lostRevenue: abandonedLostRevenue,
      byDevice: [
        { device: 'Desktop', rate: 35 },
        { device: 'Mobile', rate: 52 },
        { device: 'Tablet', rate: 41 },
      ],
    },
    totalRecoverable: (totalBoletoValue - paidBoletoValue) * 0.3 +
      (failedTotal - failedRecovered) * 450 * 0.25 +
      abandonedLostRevenue * 0.1,
  }
}

// ============================================================
// FINANCIAL ANALYTICS
// ============================================================

export interface CashFlowData {
  monthly: { month: string; gross: number; fees: number; commissions: number; adSpend: number; net: number }[]
  upcoming: { date: string; amount: number; source: string }[]
  totalGross: number
  totalNet: number
  margin: number
}

export function calculateCashFlow(transactions: DemoTransaction[]): CashFlowData {
  const approved = transactions.filter(t => t.status === 'approved')
  const months = new Map<string, { gross: number; affiliate: number }>()

  for (const tx of approved) {
    const month = tx.created_at.slice(0, 7)
    const existing = months.get(month)
    if (existing) {
      existing.gross += tx.amount
      if (tx.affiliate_id) existing.affiliate += tx.amount * 0.3
    } else {
      months.set(month, {
        gross: tx.amount,
        affiliate: tx.affiliate_id ? tx.amount * 0.3 : 0,
      })
    }
  }

  const monthly = Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const fees = data.gross * 0.099 // Hotmart fee ~9.9%
      const adSpend = data.gross * (0.15 + Math.random() * 0.1) // 15-25% ads
      const net = data.gross - fees - data.affiliate - adSpend
      const date = parseISO(`${month}-01`)
      return {
        month: format(date, 'MMM/yy'),
        gross: Math.round(data.gross),
        fees: Math.round(fees),
        commissions: Math.round(data.affiliate),
        adSpend: Math.round(adSpend),
        net: Math.round(net),
      }
    })

  const totalGross = monthly.reduce((s, m) => s + m.gross, 0)
  const totalNet = monthly.reduce((s, m) => s + m.net, 0)

  // Simulated upcoming receivables
  const upcoming = Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(new Date(), -i * 3 - 1), 'dd/MM'),
    amount: Math.round(2000 + Math.random() * 8000),
    source: i % 2 === 0 ? 'Vendas aprovadas' : 'Liberação Hotmart',
  }))

  return {
    monthly,
    upcoming,
    totalGross,
    totalNet,
    margin: totalGross > 0 ? (totalNet / totalGross) * 100 : 0,
  }
}

export interface UnitEconomicsData {
  cac: number
  ltv: number
  ltvCacRatio: number
  paybackMonths: number
  grossMargin: number
  netMargin: number
  byProduct: {
    product: string
    revenue: number
    cogs: number
    margin: number
    marginPercent: number
  }[]
}

export function calculateUnitEconomics(transactions: DemoTransaction[]): UnitEconomicsData {
  const approved = transactions.filter(t => t.status === 'approved')
  const uniqueCustomers = new Set(approved.map(t => t.buyer_email)).size
  const totalRevenue = approved.reduce((s, t) => s + t.amount, 0)

  const totalAdSpend = totalRevenue * 0.2
  const cac = uniqueCustomers > 0 ? totalAdSpend / uniqueCustomers : 0
  const ltv = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0
  const ltvCacRatio = cac > 0 ? ltv / cac : 0

  const totalFees = totalRevenue * 0.099
  const totalCommissions = approved.filter(t => t.affiliate_id).reduce((s, t) => s + t.amount * 0.3, 0)
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalFees - totalCommissions) / totalRevenue) * 100 : 0
  const netMargin = totalRevenue > 0 ? ((totalRevenue - totalFees - totalCommissions - totalAdSpend) / totalRevenue) * 100 : 0

  // By product
  const productMap = new Map<string, { name: string; revenue: number; affiliateCost: number }>()
  for (const tx of approved) {
    const existing = productMap.get(tx.product_id)
    const affCost = tx.affiliate_id ? tx.amount * 0.3 : 0
    if (existing) {
      existing.revenue += tx.amount
      existing.affiliateCost += affCost
    } else {
      productMap.set(tx.product_id, { name: tx.product_name, revenue: tx.amount, affiliateCost: affCost })
    }
  }

  const byProduct = Array.from(productMap.values()).map(p => {
    const fees = p.revenue * 0.099
    const cogs = fees + p.affiliateCost
    const margin = p.revenue - cogs
    return {
      product: p.name,
      revenue: Math.round(p.revenue),
      cogs: Math.round(cogs),
      margin: Math.round(margin),
      marginPercent: p.revenue > 0 ? (margin / p.revenue) * 100 : 0,
    }
  }).sort((a, b) => b.revenue - a.revenue)

  return {
    cac: Math.round(cac),
    ltv: Math.round(ltv),
    ltvCacRatio: Math.round(ltvCacRatio * 10) / 10,
    paybackMonths: cac > 0 ? Math.round((cac / (ltv / 12)) * 10) / 10 : 0,
    grossMargin: Math.round(grossMargin * 10) / 10,
    netMargin: Math.round(netMargin * 10) / 10,
    byProduct,
  }
}

export interface ForecastData {
  months: { month: string; actual: number | null; optimistic: number; realistic: number; pessimistic: number }[]
  targetRevenue: number
  projectedRevenue: number
  onTrack: boolean
}

export function calculateForecast(transactions: DemoTransaction[]): ForecastData {
  const approved = transactions.filter(t => t.status === 'approved')
  const monthlyRevenue = new Map<string, number>()

  for (const tx of approved) {
    const month = tx.created_at.slice(0, 7)
    monthlyRevenue.set(month, (monthlyRevenue.get(month) || 0) + tx.amount)
  }

  const sorted = Array.from(monthlyRevenue.entries()).sort(([a], [b]) => a.localeCompare(b))
  const recentMonths = sorted.slice(-3)
  const avgGrowth = recentMonths.length >= 2
    ? (recentMonths[recentMonths.length - 1][1] - recentMonths[0][1]) / recentMonths[0][1] / recentMonths.length
    : 0.05

  const lastRevenue = sorted.length > 0 ? sorted[sorted.length - 1][1] : 0

  const months: ForecastData['months'] = []

  // Historical months
  for (const [month, revenue] of sorted.slice(-4)) {
    const date = parseISO(`${month}-01`)
    months.push({
      month: format(date, 'MMM/yy'),
      actual: Math.round(revenue),
      optimistic: Math.round(revenue),
      realistic: Math.round(revenue),
      pessimistic: Math.round(revenue),
    })
  }

  // Forecast 3 months
  for (let i = 1; i <= 3; i++) {
    const projected = lastRevenue * (1 + avgGrowth * i)
    const d = subDays(new Date(), -30 * i)
    months.push({
      month: format(startOfMonth(d), 'MMM/yy'),
      actual: null,
      optimistic: Math.round(projected * 1.15),
      realistic: Math.round(projected),
      pessimistic: Math.round(projected * 0.85),
    })
  }

  const targetRevenue = Math.round(lastRevenue * 1.2)
  const projectedRevenue = Math.round(lastRevenue * (1 + avgGrowth))

  return {
    months,
    targetRevenue,
    projectedRevenue,
    onTrack: projectedRevenue >= targetRevenue,
  }
}
