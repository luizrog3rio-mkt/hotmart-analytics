import { subDays, format, startOfDay, addHours } from 'date-fns'

// Demo data generator for development/preview without Supabase connection

const PRODUCT_NAMES = [
  'Curso Completo de Marketing Digital',
  'Masterclass de Copywriting',
  'Método de Vendas Online 2.0',
  'Mentoria Premium Anual',
  'Ebook: Funil de Vendas',
  'Workshop de Tráfego Pago',
]

const AFFILIATE_NAMES = [
  'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa',
  'Carlos Souza', 'Fernanda Lima', 'Rafael Mendes', 'Juliana Rocha',
  'Bruno Almeida', 'Camila Ferreira',
]

const BUYER_NAMES = [
  'Lucas Martins', 'Patricia Gomes', 'Ricardo Nascimento', 'Beatriz Ribeiro',
  'Felipe Carvalho', 'Amanda Dias', 'Thiago Moreira', 'Larissa Barbosa',
  'Gustavo Pereira', 'Isabela Araujo', 'Diego Nunes', 'Vanessa Campos',
]

const COUNTRIES = ['BR', 'PT', 'US', 'MX', 'CO', 'AR']
const STATES_BR = ['SP', 'RJ', 'MG', 'RS', 'PR', 'BA', 'SC', 'CE', 'PE', 'GO']

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

export interface DemoProduct {
  id: string
  name: string
  price: number
  type: 'digital' | 'subscription' | 'physical'
  status: 'active' | 'inactive'
}

export interface DemoAffiliate {
  id: string
  name: string
  email: string
  commission_rate: number
  total_sales: number
  total_revenue: number
}

export interface DemoTransaction {
  id: string
  product_id: string
  product_name: string
  buyer_email: string
  buyer_name: string
  amount: number
  net_amount: number
  status: 'approved' | 'cancelled' | 'refunded' | 'disputed' | 'pending'
  payment_method: 'credit_card' | 'boleto' | 'pix' | 'paypal'
  source: 'organic' | 'affiliate' | 'campaign'
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  affiliate_id: string | null
  affiliate_name: string | null
  country: string
  state: string | null
  created_at: string
}

export interface DemoRefund {
  id: string
  transaction_id: string
  amount: number
  reason: string
  requested_at: string
}

export interface DemoDailyMetric {
  date: string
  revenue: number
  sales_count: number
  refund_count: number
  mrr: number
  churn_rate: number
  avg_ticket: number
}

export interface DemoData {
  products: DemoProduct[]
  affiliates: DemoAffiliate[]
  transactions: DemoTransaction[]
  refunds: DemoRefund[]
  dailyMetrics: DemoDailyMetric[]
}

export function generateDemoData(days = 90): DemoData {
  // Seed for consistency
  const products: DemoProduct[] = PRODUCT_NAMES.map((name, i) => ({
    id: `prod-${i}`,
    name,
    price: [297, 497, 997, 1997, 47, 197][i],
    type: i === 3 ? 'subscription' : 'digital' as DemoProduct['type'],
    status: 'active' as const,
  }))

  const affiliates: DemoAffiliate[] = AFFILIATE_NAMES.map((name, i) => ({
    id: `aff-${i}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
    commission_rate: randomBetween(20, 50),
    total_sales: 0,
    total_revenue: 0,
  }))

  const transactions: DemoTransaction[] = []
  const refunds: DemoRefund[] = []
  const dailyMetrics: DemoDailyMetric[] = []

  const today = startOfDay(new Date())

  for (let d = days; d >= 0; d--) {
    const date = subDays(today, d)
    const dayOfWeek = date.getDay()
    // More sales on weekdays, seasonal trend
    const baseSales = dayOfWeek === 0 || dayOfWeek === 6
      ? Math.floor(randomBetween(8, 18))
      : Math.floor(randomBetween(15, 35))

    // Trend: slight increase over time
    const trendMultiplier = 1 + (days - d) * 0.003
    const salesCount = Math.floor(baseSales * trendMultiplier)

    let dayRevenue = 0
    let dayRefunds = 0

    for (let s = 0; s < salesCount; s++) {
      const product = randomItem(products)
      const isAffiliate = Math.random() < 0.35
      const affiliate = isAffiliate ? randomItem(affiliates) : null
      const hour = Math.floor(randomBetween(6, 23))
      const minute = Math.floor(randomBetween(0, 59))
      const txDate = addHours(date, hour)
      txDate.setMinutes(minute)

      const statusRoll = Math.random()
      const status: DemoTransaction['status'] =
        statusRoll < 0.85 ? 'approved' :
        statusRoll < 0.90 ? 'pending' :
        statusRoll < 0.95 ? 'refunded' :
        statusRoll < 0.98 ? 'cancelled' : 'disputed'

      const paymentRoll = Math.random()
      const payment_method: DemoTransaction['payment_method'] =
        paymentRoll < 0.55 ? 'credit_card' :
        paymentRoll < 0.75 ? 'pix' :
        paymentRoll < 0.90 ? 'boleto' : 'paypal'

      const amount = product.price * (1 + randomBetween(-0.1, 0.1))
      const netAmount = amount * (isAffiliate ? 0.7 : 0.92)

      const buyerName = randomItem(BUYER_NAMES)
      const country = Math.random() < 0.8 ? 'BR' : randomItem(COUNTRIES)

      const tx: DemoTransaction = {
        id: randomId(),
        product_id: product.id,
        product_name: product.name,
        buyer_email: `${buyerName.toLowerCase().replace(' ', '.')}${Math.floor(Math.random() * 999)}@email.com`,
        buyer_name: buyerName,
        amount: Math.round(amount * 100) / 100,
        net_amount: Math.round(netAmount * 100) / 100,
        status,
        payment_method,
        source: isAffiliate ? 'affiliate' : Math.random() < 0.4 ? 'campaign' : 'organic',
        utm_source: Math.random() < 0.5 ? randomItem(['google', 'facebook', 'instagram', 'youtube', 'tiktok']) : null,
        utm_medium: Math.random() < 0.5 ? randomItem(['cpc', 'social', 'email', 'organic']) : null,
        utm_campaign: Math.random() < 0.3 ? randomItem(['black-friday', 'lancamento-v2', 'remarketing', 'lookalike']) : null,
        affiliate_id: affiliate?.id ?? null,
        affiliate_name: affiliate?.name ?? null,
        country,
        state: country === 'BR' ? randomItem(STATES_BR) : null,
        created_at: txDate.toISOString(),
      }

      transactions.push(tx)

      if (status === 'approved') {
        dayRevenue += amount
        if (affiliate) {
          affiliate.total_sales += 1
          affiliate.total_revenue += amount
        }
      }

      if (status === 'refunded') {
        dayRefunds++
        refunds.push({
          id: randomId(),
          transaction_id: tx.id,
          amount: tx.amount,
          reason: randomItem([
            'Produto não atendeu expectativas',
            'Compra duplicada',
            'Dificuldade de acesso',
            'Mudança de planos',
            'Problema financeiro',
          ]),
          requested_at: txDate.toISOString(),
        })
      }
    }

    dailyMetrics.push({
      date: format(date, 'yyyy-MM-dd'),
      revenue: Math.round(dayRevenue * 100) / 100,
      sales_count: salesCount,
      refund_count: dayRefunds,
      mrr: Math.round(randomBetween(15000, 25000) * trendMultiplier * 100) / 100,
      churn_rate: Math.round(randomBetween(2, 8) * 100) / 100,
      avg_ticket: salesCount > 0 ? Math.round((dayRevenue / salesCount) * 100) / 100 : 0,
    })
  }

  return { products, affiliates, transactions, refunds, dailyMetrics }
}

// Singleton cached demo data
let _demoData: DemoData | null = null

export function getDemoData(): DemoData {
  if (!_demoData) {
    _demoData = generateDemoData(90)
  }
  return _demoData
}

// Empty dataset for authenticated users with no data yet
export const EMPTY_DATA: DemoData = {
  products: [],
  affiliates: [],
  transactions: [],
  refunds: [],
  dailyMetrics: [],
}
