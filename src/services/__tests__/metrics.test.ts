import { describe, it, expect, beforeAll } from 'vitest'
import type { DemoTransaction, DemoData, DemoDailyMetric } from '@/services/demo-data'
import type { DateRange } from '@/services/metrics'
import {
  filterTransactions,
  calculateKPIs,
  getRevenueOverTime,
  getSalesByProduct,
  getPaymentMethodDistribution,
  getTopAffiliates,
  getSalesHeatmap,
  getFunnelData,
} from '@/services/metrics'

// Helper: cria um conjunto de transações controladas para testes
function createTestTransactions(): DemoTransaction[] {
  const base: Omit<DemoTransaction, 'id' | 'product_id' | 'product_name' | 'amount' | 'net_amount' | 'status' | 'payment_method' | 'created_at' | 'source' | 'affiliate_id' | 'affiliate_name'> = {
    buyer_email: 'comprador@test.com',
    buyer_name: 'Comprador Teste',
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    country: 'BR',
    state: 'SP',
  }

  return [
    { ...base, id: 'tx-1', product_id: 'p1', product_name: 'Curso A', amount: 200, net_amount: 180, status: 'approved', payment_method: 'credit_card', source: 'organic', affiliate_id: null, affiliate_name: null, created_at: '2026-04-01T10:00:00.000Z' },
    { ...base, id: 'tx-2', product_id: 'p1', product_name: 'Curso A', amount: 200, net_amount: 180, status: 'approved', payment_method: 'pix', source: 'affiliate', affiliate_id: 'aff-1', affiliate_name: 'Afiliado 1', created_at: '2026-04-02T14:00:00.000Z' },
    { ...base, id: 'tx-3', product_id: 'p2', product_name: 'Curso B', amount: 500, net_amount: 450, status: 'approved', payment_method: 'credit_card', source: 'organic', affiliate_id: null, affiliate_name: null, created_at: '2026-04-03T08:00:00.000Z' },
    { ...base, id: 'tx-4', product_id: 'p2', product_name: 'Curso B', amount: 500, net_amount: 450, status: 'refunded', payment_method: 'boleto', source: 'campaign', affiliate_id: null, affiliate_name: null, created_at: '2026-04-04T16:30:00.000Z' },
    { ...base, id: 'tx-5', product_id: 'p1', product_name: 'Curso A', amount: 200, net_amount: 180, status: 'pending', payment_method: 'boleto', source: 'organic', affiliate_id: null, affiliate_name: null, created_at: '2026-04-05T20:00:00.000Z' },
    { ...base, id: 'tx-6', product_id: 'p1', product_name: 'Curso A', amount: 200, net_amount: 180, status: 'approved', payment_method: 'pix', source: 'affiliate', affiliate_id: 'aff-2', affiliate_name: 'Afiliado 2', created_at: '2026-04-06T12:00:00.000Z', buyer_email: 'comprador2@test.com', buyer_name: 'Comprador 2' },
    { ...base, id: 'tx-7', product_id: 'p2', product_name: 'Curso B', amount: 500, net_amount: 450, status: 'approved', payment_method: 'credit_card', source: 'organic', affiliate_id: null, affiliate_name: null, created_at: '2026-04-07T09:30:00.000Z' },
    { ...base, id: 'tx-8', product_id: 'p1', product_name: 'Curso A', amount: 200, net_amount: 180, status: 'cancelled', payment_method: 'paypal', source: 'campaign', affiliate_id: null, affiliate_name: null, created_at: '2026-04-08T18:00:00.000Z' },
  ]
}

function createTestRange(): DateRange {
  return {
    from: new Date('2026-04-01T00:00:00.000Z'),
    to: new Date('2026-04-10T23:59:59.000Z'),
  }
}

function createTestDemoData(): DemoData {
  const transactions = createTestTransactions()
  const dailyMetrics: DemoDailyMetric[] = [
    { date: '2026-04-01', revenue: 200, sales_count: 1, refund_count: 0, mrr: 20000, churn_rate: 3.5, avg_ticket: 200 },
    { date: '2026-04-02', revenue: 200, sales_count: 1, refund_count: 0, mrr: 20100, churn_rate: 3.2, avg_ticket: 200 },
    { date: '2026-04-03', revenue: 500, sales_count: 1, refund_count: 0, mrr: 20200, churn_rate: 3.0, avg_ticket: 500 },
    { date: '2026-04-04', revenue: 0, sales_count: 0, refund_count: 1, mrr: 20000, churn_rate: 4.0, avg_ticket: 0 },
    { date: '2026-04-05', revenue: 0, sales_count: 0, refund_count: 0, mrr: 20100, churn_rate: 3.8, avg_ticket: 0 },
    { date: '2026-04-06', revenue: 200, sales_count: 1, refund_count: 0, mrr: 20300, churn_rate: 3.1, avg_ticket: 200 },
    { date: '2026-04-07', revenue: 500, sales_count: 1, refund_count: 0, mrr: 20500, churn_rate: 2.9, avg_ticket: 500 },
    { date: '2026-04-08', revenue: 0, sales_count: 0, refund_count: 0, mrr: 20400, churn_rate: 3.4, avg_ticket: 0 },
  ]

  return {
    products: [
      { id: 'p1', name: 'Curso A', price: 200, type: 'digital', status: 'active' },
      { id: 'p2', name: 'Curso B', price: 500, type: 'digital', status: 'active' },
    ],
    affiliates: [
      { id: 'aff-1', name: 'Afiliado 1', email: 'aff1@test.com', commission_rate: 30, total_sales: 1, total_revenue: 200 },
      { id: 'aff-2', name: 'Afiliado 2', email: 'aff2@test.com', commission_rate: 25, total_sales: 1, total_revenue: 200 },
    ],
    transactions,
    refunds: [],
    dailyMetrics,
  }
}

describe('filterTransactions', () => {
  const transactions = createTestTransactions()
  const range = createTestRange()

  it('filtra por range de datas', () => {
    const narrowRange: DateRange = {
      from: new Date('2026-04-01T00:00:00.000Z'),
      to: new Date('2026-04-03T23:59:59.000Z'),
    }
    const result = filterTransactions(transactions, narrowRange)
    expect(result.length).toBe(3) // tx-1, tx-2, tx-3
  })

  it('filtra por produto', () => {
    const result = filterTransactions(transactions, range, { products: ['p1'] })
    expect(result.every(t => t.product_id === 'p1')).toBe(true)
    expect(result.length).toBe(5) // tx-1, tx-2, tx-5, tx-6, tx-8
  })

  it('filtra por status', () => {
    const result = filterTransactions(transactions, range, { status: ['approved'] })
    expect(result.every(t => t.status === 'approved')).toBe(true)
    expect(result.length).toBe(5) // tx-1, tx-2, tx-3, tx-6, tx-7
  })

  it('filtra por metodo de pagamento', () => {
    const result = filterTransactions(transactions, range, { paymentMethods: ['pix'] })
    expect(result.every(t => t.payment_method === 'pix')).toBe(true)
    expect(result.length).toBe(2) // tx-2, tx-6
  })

  it('filtra com combinacao de filtros', () => {
    const result = filterTransactions(transactions, range, {
      products: ['p1'],
      status: ['approved'],
      paymentMethods: ['pix'],
    })
    expect(result.length).toBe(2) // tx-2, tx-6
    expect(result.every(t => t.product_id === 'p1' && t.status === 'approved' && t.payment_method === 'pix')).toBe(true)
  })

  it('retorna vazio quando nenhuma transacao no range', () => {
    const emptyRange: DateRange = {
      from: new Date('2025-01-01T00:00:00.000Z'),
      to: new Date('2025-01-02T23:59:59.000Z'),
    }
    const result = filterTransactions(transactions, emptyRange)
    expect(result.length).toBe(0)
  })
})

describe('calculateKPIs', () => {
  const data = createTestDemoData()
  const range = createTestRange()

  it('calcula totalRevenue corretamente (soma das approved)', () => {
    const kpis = calculateKPIs(data, range)
    // Approved: tx-1(200) + tx-2(200) + tx-3(500) + tx-6(200) + tx-7(500) = 1600
    expect(kpis.totalRevenue).toBe(1600)
  })

  it('calcula totalSales corretamente', () => {
    const kpis = calculateKPIs(data, range)
    expect(kpis.totalSales).toBe(5) // 5 transacoes approved
  })

  it('calcula avgTicket corretamente', () => {
    const kpis = calculateKPIs(data, range)
    expect(kpis.avgTicket).toBe(1600 / 5) // 320
  })

  it('calcula refundRate corretamente', () => {
    const kpis = calculateKPIs(data, range)
    // 1 refunded de 8 total = 12.5%
    expect(kpis.refundRate).toBeCloseTo(12.5, 1)
  })

  it('calcula refundCount corretamente', () => {
    const kpis = calculateKPIs(data, range)
    expect(kpis.refundCount).toBe(1)
  })
})

describe('getRevenueOverTime', () => {
  const transactions = createTestTransactions()
  const range = createTestRange()

  it('retorna array com formato de data dd/MM', () => {
    const result = getRevenueOverTime(transactions, range)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].date).toMatch(/^\d{2}\/\d{2}$/)
  })

  it('soma receita por dia corretamente', () => {
    const result = getRevenueOverTime(transactions, range)
    // Cada entry tem revenue e previousRevenue
    result.forEach(entry => {
      expect(entry).toHaveProperty('revenue')
      expect(entry).toHaveProperty('previousRevenue')
      expect(entry.revenue).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('getSalesByProduct', () => {
  const transactions = createTestTransactions()
  const range = createTestRange()

  it('agrupa vendas por produto corretamente', () => {
    const result = getSalesByProduct(transactions, range)
    expect(result.length).toBe(2) // p1 e p2
  })

  it('ordena por receita decrescente', () => {
    const result = getSalesByProduct(transactions, range)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].revenue).toBeGreaterThanOrEqual(result[i].revenue)
    }
  })

  it('conta vendas aprovadas apenas', () => {
    const result = getSalesByProduct(transactions, range)
    const totalCount = result.reduce((sum, p) => sum + p.count, 0)
    expect(totalCount).toBe(5) // apenas approved
  })
})

describe('getPaymentMethodDistribution', () => {
  const transactions = createTestTransactions()
  const range = createTestRange()

  it('retorna labels corretos em portugues', () => {
    const result = getPaymentMethodDistribution(transactions, range)
    const names = result.map(r => r.name)
    // Deve incluir pelo menos cartao e pix (dos approved)
    expect(names.some(n => n === 'Cartão de Crédito' || n === 'PIX')).toBe(true)
  })

  it('conta apenas transacoes aprovadas', () => {
    const result = getPaymentMethodDistribution(transactions, range)
    const total = result.reduce((sum, r) => sum + r.value, 0)
    expect(total).toBe(5) // 5 approved
  })

  it('cada metodo tem cor definida', () => {
    const result = getPaymentMethodDistribution(transactions, range)
    result.forEach(r => {
      expect(r.fill).toMatch(/^#[0-9a-f]{6}$/)
    })
  })
})

describe('getTopAffiliates', () => {
  const transactions = createTestTransactions()
  const range = createTestRange()

  it('retorna afiliados com ranking correto', () => {
    const result = getTopAffiliates(transactions, range)
    expect(result.length).toBe(2) // aff-1 e aff-2
  })

  it('ordena por receita decrescente', () => {
    const result = getTopAffiliates(transactions, range)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].revenue).toBeGreaterThanOrEqual(result[i].revenue)
    }
  })

  it('respeita parametro limit', () => {
    const result = getTopAffiliates(transactions, range, 1)
    expect(result.length).toBe(1)
  })
})

describe('getSalesHeatmap', () => {
  const transactions = createTestTransactions()
  const range = createTestRange()

  it('retorna 168 entradas (7 dias x 24 horas)', () => {
    const result = getSalesHeatmap(transactions, range)
    expect(result.length).toBe(168)
  })

  it('cada entrada tem day (0-6), hour (0-23) e value >= 0', () => {
    const result = getSalesHeatmap(transactions, range)
    result.forEach(entry => {
      expect(entry.day).toBeGreaterThanOrEqual(0)
      expect(entry.day).toBeLessThanOrEqual(6)
      expect(entry.hour).toBeGreaterThanOrEqual(0)
      expect(entry.hour).toBeLessThanOrEqual(23)
      expect(entry.value).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('getFunnelData', () => {
  it('retorna 4 etapas', () => {
    const result = getFunnelData()
    expect(result.length).toBe(4)
  })

  it('valores decrescem ao longo do funil', () => {
    const result = getFunnelData()
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeLessThan(result[i - 1].value)
    }
  })

  it('cada etapa tem name, value e fill', () => {
    const result = getFunnelData()
    result.forEach(step => {
      expect(step.name).toBeTruthy()
      expect(step.value).toBeGreaterThan(0)
      expect(step.fill).toMatch(/^#[0-9a-f]{6}$/)
    })
  })
})
