import { format, subDays } from 'date-fns'
import type { DemoTransaction } from './demo-data'
import type { DateRange } from './metrics'
import { filterTransactions } from './metrics'

// ============================================================
// MULTI-CHANNEL ATTRIBUTION
// ============================================================

export interface AttributionData {
  channels: {
    channel: string
    firstTouch: number
    lastTouch: number
    linear: number
    revenue: number
    conversions: number
    avgTicket: number
  }[]
  journeys: {
    path: string
    conversions: number
    revenue: number
  }[]
}

export function calculateAttribution(transactions: DemoTransaction[], range: DateRange): AttributionData {
  const filtered = filterTransactions(transactions, range).filter(t => t.status === 'approved')

  const channelMap = new Map<string, { revenue: number; conversions: number }>()
  const sourceMap: Record<string, string> = {
    google: 'Google Ads',
    facebook: 'Facebook Ads',
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
  }

  for (const tx of filtered) {
    const channel = tx.utm_source
      ? (sourceMap[tx.utm_source] || tx.utm_source)
      : tx.source === 'affiliate' ? 'Afiliados'
      : tx.source === 'campaign' ? 'Campanha Direta'
      : 'Orgânico'

    const existing = channelMap.get(channel)
    if (existing) {
      existing.revenue += tx.amount
      existing.conversions += 1
    } else {
      channelMap.set(channel, { revenue: tx.amount, conversions: 1 })
    }
  }

  const totalConversions = filtered.length
  const channels = Array.from(channelMap.entries())
    .map(([channel, data]) => {
      const share = totalConversions > 0 ? data.conversions / totalConversions : 0
      return {
        channel,
        firstTouch: Math.round(data.conversions * (share + Math.random() * 0.1)),
        lastTouch: data.conversions,
        linear: Math.round(data.conversions * (0.8 + Math.random() * 0.4)),
        revenue: Math.round(data.revenue),
        conversions: data.conversions,
        avgTicket: data.conversions > 0 ? Math.round(data.revenue / data.conversions) : 0,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)

  const journeyPaths = [
    'Google Ads → Orgânico → Compra',
    'Facebook Ads → Afiliado → Compra',
    'Instagram → Google Ads → Compra',
    'Orgânico → Compra',
    'YouTube → Facebook Ads → Orgânico → Compra',
    'TikTok → Instagram → Compra',
    'Afiliados → Compra',
    'Google Ads → Compra',
  ]

  const journeys = journeyPaths.map(path => ({
    path,
    conversions: Math.floor(20 + Math.random() * 80),
    revenue: Math.round(5000 + Math.random() * 30000),
  })).sort((a, b) => b.conversions - a.conversions)

  return { channels, journeys }
}

// ============================================================
// CAMPAIGN PERFORMANCE
// ============================================================

export interface CampaignData {
  campaigns: {
    name: string
    source: string
    spend: number
    revenue: number
    roas: number
    cpa: number
    conversions: number
    clicks: number
    impressions: number
    ctr: number
    status: 'active' | 'paused' | 'ended'
  }[]
  totalSpend: number
  totalRevenue: number
  avgRoas: number
}

export function calculateCampaigns(_transactions: DemoTransaction[], _range: DateRange): CampaignData {
  const campaignNames = [
    { name: 'Black Friday 2026', source: 'Facebook Ads', status: 'ended' as const },
    { name: 'Lançamento V2', source: 'Google Ads', status: 'active' as const },
    { name: 'Remarketing Quente', source: 'Facebook Ads', status: 'active' as const },
    { name: 'Lookalike Top 5%', source: 'Facebook Ads', status: 'active' as const },
    { name: 'Search Branded', source: 'Google Ads', status: 'active' as const },
    { name: 'YouTube Discovery', source: 'YouTube Ads', status: 'paused' as const },
    { name: 'TikTok Awareness', source: 'TikTok Ads', status: 'active' as const },
    { name: 'Instagram Stories', source: 'Instagram Ads', status: 'active' as const },
    { name: 'Email Reativação', source: 'Email', status: 'active' as const },
    { name: 'Search Genérico', source: 'Google Ads', status: 'paused' as const },
  ]

  const campaigns = campaignNames.map(c => {
    const spend = Math.round(500 + Math.random() * 8000)
    const roas = 1.5 + Math.random() * 5
    const revenue = Math.round(spend * roas)
    const conversions = Math.floor(5 + Math.random() * 80)
    const impressions = Math.floor(5000 + Math.random() * 100000)
    const clicks = Math.floor(impressions * (0.01 + Math.random() * 0.04))

    return {
      name: c.name,
      source: c.source,
      spend,
      revenue,
      roas: Math.round(roas * 100) / 100,
      cpa: conversions > 0 ? Math.round(spend / conversions) : 0,
      conversions,
      clicks,
      impressions,
      ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      status: c.status,
    }
  })

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0)

  return {
    campaigns,
    totalSpend,
    totalRevenue,
    avgRoas: totalSpend > 0 ? Math.round((totalRevenue / totalSpend) * 100) / 100 : 0,
  }
}

// ============================================================
// GEOGRAPHIC ANALYSIS
// ============================================================

export interface GeoData {
  countries: {
    code: string
    name: string
    revenue: number
    sales: number
    avgTicket: number
    refundRate: number
    flag: string
  }[]
  states: {
    code: string
    name: string
    revenue: number
    sales: number
  }[]
  currencies: {
    currency: string
    symbol: string
    revenue: number
    revenueInBRL: number
    rate: number
  }[]
  peakHoursByTimezone: {
    timezone: string
    peakHour: number
    sales: number
  }[]
}

const COUNTRY_INFO: Record<string, { name: string; flag: string; currency: string; rate: number }> = {
  BR: { name: 'Brasil', flag: '🇧🇷', currency: 'BRL', rate: 1 },
  PT: { name: 'Portugal', flag: '🇵🇹', currency: 'EUR', rate: 5.4 },
  US: { name: 'Estados Unidos', flag: '🇺🇸', currency: 'USD', rate: 5.1 },
  MX: { name: 'México', flag: '🇲🇽', currency: 'MXN', rate: 0.29 },
  CO: { name: 'Colômbia', flag: '🇨🇴', currency: 'COP', rate: 0.0012 },
  AR: { name: 'Argentina', flag: '🇦🇷', currency: 'ARS', rate: 0.0058 },
}

const STATE_NAMES: Record<string, string> = {
  SP: 'São Paulo', RJ: 'Rio de Janeiro', MG: 'Minas Gerais', RS: 'Rio Grande do Sul',
  PR: 'Paraná', BA: 'Bahia', SC: 'Santa Catarina', CE: 'Ceará', PE: 'Pernambuco', GO: 'Goiás',
}

export function calculateGeo(transactions: DemoTransaction[], range: DateRange): GeoData {
  const filtered = filterTransactions(transactions, range)

  // By country
  const countryMap = new Map<string, { revenue: number; sales: number; refunds: number; total: number }>()
  for (const tx of filtered) {
    const code = tx.country || 'BR'
    const existing = countryMap.get(code)
    if (existing) {
      if (tx.status === 'approved') { existing.revenue += tx.amount; existing.sales += 1 }
      if (tx.status === 'refunded') existing.refunds += 1
      existing.total += 1
    } else {
      countryMap.set(code, {
        revenue: tx.status === 'approved' ? tx.amount : 0,
        sales: tx.status === 'approved' ? 1 : 0,
        refunds: tx.status === 'refunded' ? 1 : 0,
        total: 1,
      })
    }
  }

  const countries = Array.from(countryMap.entries()).map(([code, data]) => {
    const info = COUNTRY_INFO[code] || { name: code, flag: '🏳️', currency: 'BRL', rate: 1 }
    return {
      code,
      name: info.name,
      revenue: Math.round(data.revenue),
      sales: data.sales,
      avgTicket: data.sales > 0 ? Math.round(data.revenue / data.sales) : 0,
      refundRate: data.total > 0 ? Math.round((data.refunds / data.total) * 1000) / 10 : 0,
      flag: info.flag,
    }
  }).sort((a, b) => b.revenue - a.revenue)

  // By state (Brazil only)
  const stateMap = new Map<string, { revenue: number; sales: number }>()
  for (const tx of filtered.filter(t => t.country === 'BR' && t.state && t.status === 'approved')) {
    const code = tx.state!
    const existing = stateMap.get(code)
    if (existing) { existing.revenue += tx.amount; existing.sales += 1 }
    else stateMap.set(code, { revenue: tx.amount, sales: 1 })
  }

  const states = Array.from(stateMap.entries()).map(([code, data]) => ({
    code,
    name: STATE_NAMES[code] || code,
    revenue: Math.round(data.revenue),
    sales: data.sales,
  })).sort((a, b) => b.revenue - a.revenue)

  // Multi-currency
  const currencyMap = new Map<string, number>()
  for (const c of countries) {
    const info = COUNTRY_INFO[c.code]
    if (info) {
      const cur = info.currency
      currencyMap.set(cur, (currencyMap.get(cur) || 0) + c.revenue)
    }
  }

  const currencies = Array.from(currencyMap.entries()).map(([currency, revenueInBRL]) => {
    const info = Object.values(COUNTRY_INFO).find(i => i.currency === currency)
    const rate = info?.rate || 1
    return {
      currency,
      symbol: currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency,
      revenue: rate > 0 ? Math.round(revenueInBRL / rate) : revenueInBRL,
      revenueInBRL: Math.round(revenueInBRL),
      rate,
    }
  }).sort((a, b) => b.revenueInBRL - a.revenueInBRL)

  const peakHoursByTimezone = [
    { timezone: 'BRT (UTC-3)', peakHour: 21, sales: 145 },
    { timezone: 'WET (UTC+0)', peakHour: 20, sales: 32 },
    { timezone: 'EST (UTC-5)', peakHour: 19, sales: 18 },
    { timezone: 'CST (UTC-6)', peakHour: 20, sales: 12 },
  ]

  return { countries, states, currencies, peakHoursByTimezone }
}

// ============================================================
// OFFER & PRICING INTELLIGENCE
// ============================================================

export interface OfferData {
  offers: {
    name: string
    product: string
    type: 'standard' | 'bump' | 'upsell' | 'downsell' | 'coupon'
    price: number
    originalPrice: number
    discount: number
    conversions: number
    revenue: number
    conversionRate: number
    refundRate: number
  }[]
  bumpAcceptanceRate: number
  upsellAcceptanceRate: number
  couponImpact: {
    withCoupon: { volume: number; revenue: number; avgTicket: number }
    withoutCoupon: { volume: number; revenue: number; avgTicket: number }
  }
}

export function calculateOffers(_transactions: DemoTransaction[]): OfferData {
  const offers = [
    { name: 'Oferta Principal', product: 'Curso Completo de Marketing Digital', type: 'standard' as const, price: 297, originalPrice: 297, discount: 0 },
    { name: 'Bump: Templates', product: 'Curso Completo de Marketing Digital', type: 'bump' as const, price: 47, originalPrice: 47, discount: 0 },
    { name: 'Upsell: Mentoria', product: 'Mentoria Premium Anual', type: 'upsell' as const, price: 997, originalPrice: 1997, discount: 50 },
    { name: 'Cupom FIRST50', product: 'Masterclass de Copywriting', type: 'coupon' as const, price: 248.50, originalPrice: 497, discount: 50 },
    { name: 'Oferta Anual', product: 'Mentoria Premium Anual', type: 'standard' as const, price: 1997, originalPrice: 1997, discount: 0 },
    { name: 'Downsell: Ebook', product: 'Ebook: Funil de Vendas', type: 'downsell' as const, price: 27, originalPrice: 47, discount: 42.5 },
    { name: 'Bump: Planilhas', product: 'Método de Vendas Online 2.0', type: 'bump' as const, price: 37, originalPrice: 37, discount: 0 },
    { name: 'Cupom WELCOME', product: 'Workshop de Tráfego Pago', type: 'coupon' as const, price: 147, originalPrice: 197, discount: 25.4 },
  ]

  const offerData = offers.map(o => {
    const conversions = Math.floor(20 + Math.random() * 200)
    const refunds = Math.floor(conversions * (0.02 + Math.random() * 0.08))
    return {
      ...o,
      conversions,
      revenue: Math.round(o.price * conversions),
      conversionRate: Math.round((15 + Math.random() * 45) * 100) / 100,
      refundRate: conversions > 0 ? Math.round((refunds / conversions) * 1000) / 10 : 0,
    }
  })

  const bumps = offerData.filter(o => o.type === 'bump')
  const upsells = offerData.filter(o => o.type === 'upsell')
  const coupons = offerData.filter(o => o.type === 'coupon')
  const nonCoupons = offerData.filter(o => o.type !== 'coupon')

  return {
    offers: offerData,
    bumpAcceptanceRate: bumps.length > 0 ? Math.round(bumps.reduce((s, b) => s + b.conversionRate, 0) / bumps.length * 10) / 10 : 0,
    upsellAcceptanceRate: upsells.length > 0 ? Math.round(upsells.reduce((s, u) => s + u.conversionRate, 0) / upsells.length * 10) / 10 : 0,
    couponImpact: {
      withCoupon: {
        volume: coupons.reduce((s, c) => s + c.conversions, 0),
        revenue: coupons.reduce((s, c) => s + c.revenue, 0),
        avgTicket: coupons.length > 0 ? Math.round(coupons.reduce((s, c) => s + c.revenue, 0) / coupons.reduce((s, c) => s + c.conversions, 0)) : 0,
      },
      withoutCoupon: {
        volume: nonCoupons.reduce((s, c) => s + c.conversions, 0),
        revenue: nonCoupons.reduce((s, c) => s + c.revenue, 0),
        avgTicket: nonCoupons.length > 0 ? Math.round(nonCoupons.reduce((s, c) => s + c.revenue, 0) / nonCoupons.reduce((s, c) => s + c.conversions, 0)) : 0,
      },
    },
  }
}

export interface PricingData {
  elasticity: {
    pricePoint: number
    volume: number
    revenue: number
    isOptimal: boolean
  }[]
  optimalPrice: number
  currentPrice: number
  priceHistory: { date: string; price: number; volume: number }[]
  simulation: {
    changePercent: number
    estimatedVolume: number
    estimatedRevenue: number
    revenueChange: number
  }[]
}

export function calculatePricing(): PricingData {
  const basePrice = 297
  const baseVolume = 150

  const elasticity = [97, 147, 197, 247, 297, 347, 397, 497, 597].map(price => {
    const priceRatio = price / basePrice
    const volumeMultiplier = Math.pow(priceRatio, -1.3)
    const volume = Math.round(baseVolume * volumeMultiplier)
    const revenue = price * volume
    return { pricePoint: price, volume, revenue: Math.round(revenue), isOptimal: false }
  })

  const maxRevIdx = elasticity.reduce((maxI, el, i) => el.revenue > elasticity[maxI].revenue ? i : maxI, 0)
  elasticity[maxRevIdx].isOptimal = true

  const now = new Date()
  const priceHistory = Array.from({ length: 12 }, (_, i) => {
    const d = subDays(now, (11 - i) * 30)
    const price = i < 4 ? 197 : i < 8 ? 247 : 297
    return {
      date: format(d, 'MMM/yy'),
      price,
      volume: Math.floor(80 + Math.random() * 100 + i * 5),
    }
  })

  const simulation = [-30, -20, -10, 0, 10, 20, 30].map(changePercent => {
    const newPrice = basePrice * (1 + changePercent / 100)
    const priceRatio = newPrice / basePrice
    const volumeMultiplier = Math.pow(priceRatio, -1.3)
    const estimatedVolume = Math.round(baseVolume * volumeMultiplier)
    const estimatedRevenue = Math.round(newPrice * estimatedVolume)
    const currentRevenue = basePrice * baseVolume
    return {
      changePercent,
      estimatedVolume,
      estimatedRevenue,
      revenueChange: currentRevenue > 0 ? Math.round(((estimatedRevenue - currentRevenue) / currentRevenue) * 1000) / 10 : 0,
    }
  })

  return {
    elasticity,
    optimalPrice: elasticity[maxRevIdx].pricePoint,
    currentPrice: basePrice,
    priceHistory,
    simulation,
  }
}

// ============================================================
// ANOMALY DETECTION
// ============================================================

export interface AnomalyData {
  anomalies: {
    id: string
    type: string
    severity: 'critical' | 'warning' | 'opportunity'
    metric: string
    expectedValue: number
    actualValue: number
    deviation: number
    context: string
    detectedAt: string
    status: 'new' | 'investigating' | 'resolved' | 'ignored'
  }[]
  timeline: { date: string; count: number; critical: number }[]
}

export function detectAnomalies(): AnomalyData {
  const now = new Date()
  const anomalies = [
    { id: 'a1', type: 'Queda de vendas', severity: 'critical' as const, metric: 'vendas_hora', expectedValue: 12, actualValue: 4, deviation: -66.7, context: 'Vendas às 14h estão 67% abaixo do normal para uma terça-feira. Média das últimas 4 terças: 12 vendas.', detectedAt: subDays(now, 0), status: 'new' as const },
    { id: 'a2', type: 'Pico de reembolsos', severity: 'critical' as const, metric: 'taxa_reembolso', expectedValue: 4.2, actualValue: 9.8, deviation: 133, context: 'Taxa de reembolso do "Curso de Marketing" subiu para 9.8%, mais que o dobro da média de 4.2%.', detectedAt: subDays(now, 1), status: 'investigating' as const },
    { id: 'a3', type: 'Oportunidade positiva', severity: 'opportunity' as const, metric: 'vendas_produto', expectedValue: 15, actualValue: 38, deviation: 153, context: '"Ebook: Funil de Vendas" teve 153% mais vendas que o esperado. Possível viralização orgânica.', detectedAt: subDays(now, 1), status: 'new' as const },
    { id: 'a4', type: 'Mudança no ticket médio', severity: 'warning' as const, metric: 'ticket_medio', expectedValue: 342, actualValue: 285, deviation: -16.7, context: 'Ticket médio caiu 16.7% sem mudança de oferta. Verificar se há cupom vazado ou promoção não autorizada.', detectedAt: subDays(now, 2), status: 'resolved' as const },
    { id: 'a5', type: 'Afiliado fora do padrão', severity: 'warning' as const, metric: 'conversao_afiliado', expectedValue: 3.5, actualValue: 12.1, deviation: 245.7, context: 'Afiliado "João Silva" com taxa de conversão 245% acima do normal. Verificar qualidade do tráfego.', detectedAt: subDays(now, 3), status: 'investigating' as const },
    { id: 'a6', type: 'Churn acelerado', severity: 'critical' as const, metric: 'cancelamentos_semana', expectedValue: 8, actualValue: 19, deviation: 137.5, context: 'Cancelamentos semanais subiram 137%. Maioria citou "problema financeiro". Correlação com feriado.', detectedAt: subDays(now, 4), status: 'resolved' as const },
    { id: 'a7', type: 'Canal instável', severity: 'warning' as const, metric: 'roas_canal', expectedValue: 3.2, actualValue: 1.4, deviation: -56.3, context: 'ROAS do Facebook Ads caiu 56%. CPA subiu de R$85 para R$195. Possível fadiga de criativo.', detectedAt: subDays(now, 5), status: 'ignored' as const },
    { id: 'a8', type: 'Oportunidade positiva', severity: 'opportunity' as const, metric: 'conversao_pagina', expectedValue: 2.1, actualValue: 4.7, deviation: 123.8, context: 'Taxa de conversão da página de vendas dobrou após mudança de headline. Manter e testar variações.', detectedAt: subDays(now, 6), status: 'new' as const },
  ].map(a => ({ ...a, detectedAt: format(a.detectedAt, "yyyy-MM-dd'T'HH:mm:ss") }))

  const timeline = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(now, 13 - i)
    const count = Math.floor(1 + Math.random() * 4)
    return {
      date: format(d, 'dd/MM'),
      count,
      critical: Math.floor(count * (0.2 + Math.random() * 0.3)),
    }
  })

  return { anomalies, timeline }
}

// ============================================================
// SCHEDULED REPORTS
// ============================================================

export interface ReportConfig {
  id: string
  name: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand'
  content: string[]
  channel: 'email' | 'telegram' | 'whatsapp'
  recipients: string[]
  enabled: boolean
  lastSent: string | null
  nextSend: string | null
}

export interface ReportHistory {
  id: string
  reportName: string
  sentAt: string
  channel: string
  status: 'sent' | 'failed'
  highlights: string[]
}

export function getReportConfigs(): ReportConfig[] {
  const now = new Date()
  return [
    { id: 'r1', name: 'Resumo Diário', frequency: 'daily', content: ['Vendas do dia', 'Receita', 'Top produto', 'Reembolsos'], channel: 'telegram', recipients: ['@usuario'], enabled: true, lastSent: format(subDays(now, 1), "yyyy-MM-dd'T'08:00:00"), nextSend: format(now, "yyyy-MM-dd'T'08:00:00") },
    { id: 'r2', name: 'Relatório Semanal', frequency: 'weekly', content: ['Comparativo semanal', 'Top 5 afiliados', 'Funil', 'Alertas'], channel: 'email', recipients: ['usuario@email.com'], enabled: true, lastSent: format(subDays(now, 7), "yyyy-MM-dd'T'09:00:00"), nextSend: format(subDays(now, -7), "yyyy-MM-dd'T'09:00:00") },
    { id: 'r3', name: 'Relatório Mensal', frequency: 'monthly', content: ['Receita completa', 'Churn', 'LTV', 'Coorte', 'Forecast', 'Financeiro'], channel: 'email', recipients: ['usuario@email.com', 'socio@email.com'], enabled: true, lastSent: format(subDays(now, 30), "yyyy-MM-dd'T'09:00:00"), nextSend: format(subDays(now, -30), "yyyy-MM-dd'T'09:00:00") },
    { id: 'r4', name: 'Alerta de Performance', frequency: 'daily', content: ['Campanhas abaixo do ROAS mínimo', 'Afiliados em queda'], channel: 'whatsapp', recipients: ['+5511999999999'], enabled: false, lastSent: null, nextSend: null },
  ]
}

export function getReportHistory(): ReportHistory[] {
  const now = new Date()
  return [
    { id: 'h1', reportName: 'Resumo Diário', sentAt: format(subDays(now, 1), "yyyy-MM-dd'T'08:00:00"), channel: 'Telegram', status: 'sent', highlights: ['Receita do dia: R$8.432', '+12% vs dia anterior', 'Top: Curso Marketing Digital (23 vendas)'] },
    { id: 'h2', reportName: 'Resumo Diário', sentAt: format(subDays(now, 2), "yyyy-MM-dd'T'08:00:00"), channel: 'Telegram', status: 'sent', highlights: ['Receita do dia: R$7.521', '-3% vs dia anterior', '2 reembolsos processados'] },
    { id: 'h3', reportName: 'Relatório Semanal', sentAt: format(subDays(now, 7), "yyyy-MM-dd'T'09:00:00"), channel: 'Email', status: 'sent', highlights: ['Receita semanal: R$52.340', 'Top afiliado: Maria Santos', 'Conversão do funil: 31.2%'] },
    { id: 'h4', reportName: 'Relatório Mensal', sentAt: format(subDays(now, 30), "yyyy-MM-dd'T'09:00:00"), channel: 'Email', status: 'sent', highlights: ['Receita mensal: R$234.120', 'MRR: R$22.450', 'Churn: 4.2%', 'LTV médio: R$1.850'] },
    { id: 'h5', reportName: 'Alerta de Performance', sentAt: format(subDays(now, 3), "yyyy-MM-dd'T'14:30:00"), channel: 'WhatsApp', status: 'failed', highlights: ['Falha no envio - canal desconectado'] },
  ]
}
