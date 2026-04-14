import { describe, it, expect } from 'vitest'
import { generateDemoData } from '@/services/demo-data'
import type { DateRange } from '@/services/metrics'
import {
  calculateAttribution,
  calculateCampaigns,
  calculateGeo,
  calculateOffers,
  calculatePricing,
  detectAnomalies,
  getReportConfigs,
  getReportHistory,
} from '@/services/marketing-analytics'

// Usa dados demo gerados para ter volume realista
const demoData = generateDemoData(90)
const transactions = demoData.transactions
const range: DateRange = {
  from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  to: new Date(),
}

describe('calculateAttribution', () => {
  it('channels nao esta vazio', () => {
    const result = calculateAttribution(transactions, range)
    expect(result.channels.length).toBeGreaterThan(0)
  })

  it('todos os canais tem revenue > 0', () => {
    const result = calculateAttribution(transactions, range)
    result.channels.forEach(ch => {
      expect(ch.revenue).toBeGreaterThan(0)
    })
  })

  it('todos os canais tem conversions > 0', () => {
    const result = calculateAttribution(transactions, range)
    result.channels.forEach(ch => {
      expect(ch.conversions).toBeGreaterThan(0)
    })
  })

  it('journeys nao esta vazio', () => {
    const result = calculateAttribution(transactions, range)
    expect(result.journeys.length).toBeGreaterThan(0)
  })

  it('channels ordenados por revenue decrescente', () => {
    const result = calculateAttribution(transactions, range)
    for (let i = 1; i < result.channels.length; i++) {
      expect(result.channels[i - 1].revenue).toBeGreaterThanOrEqual(result.channels[i].revenue)
    }
  })
})

describe('calculateCampaigns', () => {
  it('retorna exatamente 10 campanhas', () => {
    const result = calculateCampaigns(transactions, range)
    expect(result.campaigns.length).toBe(10)
  })

  it('todas as campanhas tem ROAS > 0', () => {
    const result = calculateCampaigns(transactions, range)
    result.campaigns.forEach(c => {
      expect(c.roas).toBeGreaterThan(0)
    })
  })

  it('totalSpend > 0', () => {
    const result = calculateCampaigns(transactions, range)
    expect(result.totalSpend).toBeGreaterThan(0)
  })

  it('totalRevenue > 0', () => {
    const result = calculateCampaigns(transactions, range)
    expect(result.totalRevenue).toBeGreaterThan(0)
  })

  it('avgRoas > 0', () => {
    const result = calculateCampaigns(transactions, range)
    expect(result.avgRoas).toBeGreaterThan(0)
  })

  it('campanhas tem status validos', () => {
    const result = calculateCampaigns(transactions, range)
    const validStatuses = ['active', 'paused', 'ended']
    result.campaigns.forEach(c => {
      expect(validStatuses).toContain(c.status)
    })
  })
})

describe('calculateGeo', () => {
  it('countries ordenados por revenue decrescente', () => {
    const result = calculateGeo(transactions, range)
    for (let i = 1; i < result.countries.length; i++) {
      expect(result.countries[i - 1].revenue).toBeGreaterThanOrEqual(result.countries[i].revenue)
    }
  })

  it('Brasil eh o primeiro (mais transacoes sao BR)', () => {
    const result = calculateGeo(transactions, range)
    expect(result.countries[0].code).toBe('BR')
    expect(result.countries[0].name).toBe('Brasil')
  })

  it('states contem estados brasileiros', () => {
    const result = calculateGeo(transactions, range)
    expect(result.states.length).toBeGreaterThan(0)
    result.states.forEach(s => {
      expect(s.code).toBeTruthy()
      expect(s.revenue).toBeGreaterThan(0)
    })
  })

  it('currencies tem pelo menos BRL', () => {
    const result = calculateGeo(transactions, range)
    const currencies = result.currencies.map(c => c.currency)
    expect(currencies).toContain('BRL')
  })
})

describe('calculateOffers', () => {
  it('offers tem tipos corretos', () => {
    const result = calculateOffers(transactions)
    const validTypes = ['standard', 'bump', 'upsell', 'downsell', 'coupon']
    result.offers.forEach(o => {
      expect(validTypes).toContain(o.type)
    })
  })

  it('bumpAcceptanceRate > 0', () => {
    const result = calculateOffers(transactions)
    expect(result.bumpAcceptanceRate).toBeGreaterThan(0)
  })

  it('upsellAcceptanceRate > 0', () => {
    const result = calculateOffers(transactions)
    expect(result.upsellAcceptanceRate).toBeGreaterThan(0)
  })

  it('couponImpact tem dados validos', () => {
    const result = calculateOffers(transactions)
    expect(result.couponImpact.withCoupon.volume).toBeGreaterThan(0)
    expect(result.couponImpact.withoutCoupon.volume).toBeGreaterThan(0)
  })

  it('cada oferta tem conversions e revenue', () => {
    const result = calculateOffers(transactions)
    result.offers.forEach(o => {
      expect(o.conversions).toBeGreaterThan(0)
      expect(o.revenue).toBeGreaterThan(0)
    })
  })
})

describe('calculatePricing', () => {
  it('exatamente um ponto de preco eh isOptimal', () => {
    const result = calculatePricing()
    const optimals = result.elasticity.filter(e => e.isOptimal)
    expect(optimals.length).toBe(1)
  })

  it('optimalPrice esta dentro do range de precos testados', () => {
    const result = calculatePricing()
    const prices = result.elasticity.map(e => e.pricePoint)
    expect(result.optimalPrice).toBeGreaterThanOrEqual(Math.min(...prices))
    expect(result.optimalPrice).toBeLessThanOrEqual(Math.max(...prices))
  })

  it('simulation tem 7 entradas', () => {
    const result = calculatePricing()
    expect(result.simulation.length).toBe(7)
  })

  it('simulation inclui ponto zero (sem mudanca)', () => {
    const result = calculatePricing()
    const zero = result.simulation.find(s => s.changePercent === 0)
    expect(zero).toBeDefined()
  })

  it('priceHistory tem 12 meses', () => {
    const result = calculatePricing()
    expect(result.priceHistory.length).toBe(12)
  })

  it('currentPrice esta definido', () => {
    const result = calculatePricing()
    expect(result.currentPrice).toBeGreaterThan(0)
  })
})

describe('detectAnomalies', () => {
  it('anomalias tem severidades validas', () => {
    const result = detectAnomalies()
    const validSeverities = ['critical', 'warning', 'opportunity']
    result.anomalies.forEach(a => {
      expect(validSeverities).toContain(a.severity)
    })
  })

  it('anomalias tem status validos', () => {
    const result = detectAnomalies()
    const validStatuses = ['new', 'investigating', 'resolved', 'ignored']
    result.anomalies.forEach(a => {
      expect(validStatuses).toContain(a.status)
    })
  })

  it('timeline tem 14 entradas', () => {
    const result = detectAnomalies()
    expect(result.timeline.length).toBe(14)
  })

  it('timeline entries tem count >= 0', () => {
    const result = detectAnomalies()
    result.timeline.forEach(t => {
      expect(t.count).toBeGreaterThanOrEqual(0)
      expect(t.critical).toBeGreaterThanOrEqual(0)
      expect(t.critical).toBeLessThanOrEqual(t.count)
    })
  })

  it('anomalias tem contexto', () => {
    const result = detectAnomalies()
    result.anomalies.forEach(a => {
      expect(a.context).toBeTruthy()
      expect(a.context.length).toBeGreaterThan(10)
    })
  })
})

describe('getReportConfigs', () => {
  it('retorna 4 configs', () => {
    const configs = getReportConfigs()
    expect(configs.length).toBe(4)
  })

  it('todos tem frequency valida', () => {
    const configs = getReportConfigs()
    const validFrequencies = ['daily', 'weekly', 'monthly', 'on_demand']
    configs.forEach(c => {
      expect(validFrequencies).toContain(c.frequency)
    })
  })

  it('todos tem channel valido', () => {
    const configs = getReportConfigs()
    const validChannels = ['email', 'telegram', 'whatsapp']
    configs.forEach(c => {
      expect(validChannels).toContain(c.channel)
    })
  })

  it('todos tem id e name', () => {
    const configs = getReportConfigs()
    configs.forEach(c => {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
    })
  })

  it('todos tem content com pelo menos 1 item', () => {
    const configs = getReportConfigs()
    configs.forEach(c => {
      expect(c.content.length).toBeGreaterThan(0)
    })
  })
})

describe('getReportHistory', () => {
  it('retorna entradas com status validos', () => {
    const history = getReportHistory()
    expect(history.length).toBeGreaterThan(0)
    const validStatuses = ['sent', 'failed']
    history.forEach(h => {
      expect(validStatuses).toContain(h.status)
    })
  })

  it('todos tem reportName e sentAt', () => {
    const history = getReportHistory()
    history.forEach(h => {
      expect(h.reportName).toBeTruthy()
      expect(h.sentAt).toBeTruthy()
    })
  })

  it('todos tem highlights', () => {
    const history = getReportHistory()
    history.forEach(h => {
      expect(h.highlights.length).toBeGreaterThan(0)
    })
  })
})
