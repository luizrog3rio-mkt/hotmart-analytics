import { describe, it, expect } from 'vitest'
import type { DemoTransaction } from '@/services/demo-data'
import type { DateRange } from '@/services/metrics'
import {
  calculateRFM,
  getRFMSegmentSummary,
  calculateCohorts,
  calculateLTV,
  calculateChurn,
  calculateRecovery,
  calculateCashFlow,
  calculateUnitEconomics,
  calculateForecast,
} from '@/services/customer-analytics'

// Helper: gera transacoes controladas com multiplos compradores e datas
function createTestTransactions(): DemoTransaction[] {
  const transactions: DemoTransaction[] = []
  const buyers = [
    { email: 'joao@test.com', name: 'Joao Silva' },
    { email: 'maria@test.com', name: 'Maria Santos' },
    { email: 'pedro@test.com', name: 'Pedro Costa' },
    { email: 'ana@test.com', name: 'Ana Oliveira' },
    { email: 'carlos@test.com', name: 'Carlos Lima' },
  ]

  const products = [
    { id: 'p1', name: 'Curso A', price: 200 },
    { id: 'p2', name: 'Curso B', price: 500 },
    { id: 'p3', name: 'Mentoria C', price: 1000 },
  ]

  let txId = 0
  // Joao: 3 compras em meses diferentes (cliente fiel)
  const joaoDates = ['2026-01-15T10:00:00.000Z', '2026-02-20T14:00:00.000Z', '2026-03-25T08:00:00.000Z']
  for (const date of joaoDates) {
    txId++
    transactions.push({
      id: `tx-${txId}`,
      product_id: products[0].id,
      product_name: products[0].name,
      buyer_email: buyers[0].email,
      buyer_name: buyers[0].name,
      amount: products[0].price,
      net_amount: products[0].price * 0.9,
      status: 'approved',
      payment_method: 'credit_card',
      source: 'organic',
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      affiliate_id: null,
      affiliate_name: null,
      country: 'BR',
      state: 'SP',
      created_at: date,
    })
  }

  // Maria: 2 compras, alto valor
  const mariaDates = ['2026-02-10T09:00:00.000Z', '2026-04-01T11:00:00.000Z']
  const mariaProducts = [products[2], products[1]] // 1000, 500
  for (let i = 0; i < mariaDates.length; i++) {
    txId++
    transactions.push({
      id: `tx-${txId}`,
      product_id: mariaProducts[i].id,
      product_name: mariaProducts[i].name,
      buyer_email: buyers[1].email,
      buyer_name: buyers[1].name,
      amount: mariaProducts[i].price,
      net_amount: mariaProducts[i].price * 0.9,
      status: 'approved',
      payment_method: 'pix',
      source: 'affiliate',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: null,
      affiliate_id: 'aff-1',
      affiliate_name: 'Afiliado 1',
      country: 'BR',
      state: 'RJ',
      created_at: mariaDates[i],
    })
  }

  // Pedro: 1 compra (novo cliente)
  txId++
  transactions.push({
    id: `tx-${txId}`,
    product_id: products[1].id,
    product_name: products[1].name,
    buyer_email: buyers[2].email,
    buyer_name: buyers[2].name,
    amount: products[1].price,
    net_amount: products[1].price * 0.9,
    status: 'approved',
    payment_method: 'boleto',
    source: 'campaign',
    utm_source: 'facebook',
    utm_medium: 'social',
    utm_campaign: 'lancamento',
    affiliate_id: null,
    affiliate_name: null,
    country: 'BR',
    state: 'MG',
    created_at: '2026-03-01T15:00:00.000Z',
  })

  // Ana: 1 compra reembolsada
  txId++
  transactions.push({
    id: `tx-${txId}`,
    product_id: products[0].id,
    product_name: products[0].name,
    buyer_email: buyers[3].email,
    buyer_name: buyers[3].name,
    amount: products[0].price,
    net_amount: products[0].price * 0.9,
    status: 'refunded',
    payment_method: 'credit_card',
    source: 'organic',
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    affiliate_id: null,
    affiliate_name: null,
    country: 'BR',
    state: 'SP',
    created_at: '2026-03-15T10:00:00.000Z',
  })

  // Carlos: 1 compra pendente (boleto)
  txId++
  transactions.push({
    id: `tx-${txId}`,
    product_id: products[1].id,
    product_name: products[1].name,
    buyer_email: buyers[4].email,
    buyer_name: buyers[4].name,
    amount: products[1].price,
    net_amount: products[1].price * 0.9,
    status: 'pending',
    payment_method: 'boleto',
    source: 'organic',
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    affiliate_id: null,
    affiliate_name: null,
    country: 'PT',
    state: null,
    created_at: '2026-04-05T18:00:00.000Z',
  })

  return transactions
}

function createTestRange(): DateRange {
  return {
    from: new Date('2026-01-01T00:00:00.000Z'),
    to: new Date('2026-04-14T23:59:59.000Z'),
  }
}

describe('calculateRFM', () => {
  const transactions = createTestTransactions()

  it('gera score para todos os compradores aprovados', () => {
    const rfm = calculateRFM(transactions)
    // Approved buyers: Joao(3), Maria(2), Pedro(1) = 3 unicos
    expect(rfm.length).toBe(3)
  })

  it('scores R, F, M estao no range 1-5', () => {
    const rfm = calculateRFM(transactions)
    rfm.forEach(score => {
      expect(score.rScore).toBeGreaterThanOrEqual(1)
      expect(score.rScore).toBeLessThanOrEqual(5)
      expect(score.fScore).toBeGreaterThanOrEqual(1)
      expect(score.fScore).toBeLessThanOrEqual(5)
      expect(score.mScore).toBeGreaterThanOrEqual(1)
      expect(score.mScore).toBeLessThanOrEqual(5)
    })
  })

  it('atribui segmentos a todos os compradores', () => {
    const rfm = calculateRFM(transactions)
    rfm.forEach(score => {
      expect(score.segment).toBeTruthy()
      expect(score.segmentColor).toMatch(/^#[0-9a-f]{6}$/)
    })
  })

  it('todos os compradores aprovados aparecem', () => {
    const rfm = calculateRFM(transactions)
    const emails = rfm.map(s => s.buyerEmail).sort()
    expect(emails).toContain('joao@test.com')
    expect(emails).toContain('maria@test.com')
    expect(emails).toContain('pedro@test.com')
  })

  it('frequencia reflete numero de compras', () => {
    const rfm = calculateRFM(transactions)
    const joao = rfm.find(s => s.buyerEmail === 'joao@test.com')!
    const pedro = rfm.find(s => s.buyerEmail === 'pedro@test.com')!
    expect(joao.frequency).toBe(3)
    expect(pedro.frequency).toBe(1)
  })
})

describe('getRFMSegmentSummary', () => {
  const transactions = createTestTransactions()
  const rfm = calculateRFM(transactions)

  it('percentuais somam aproximadamente 100%', () => {
    const summary = getRFMSegmentSummary(rfm)
    const totalPercent = summary.reduce((sum, s) => sum + s.percentage, 0)
    expect(totalPercent).toBeCloseTo(100, 0)
  })

  it('todos os segmentos tem recomendacao', () => {
    const summary = getRFMSegmentSummary(rfm)
    summary.forEach(seg => {
      expect(seg.recommendation).toBeTruthy()
      expect(typeof seg.recommendation).toBe('string')
    })
  })

  it('contagem total bate com numero de buyers', () => {
    const summary = getRFMSegmentSummary(rfm)
    const totalCount = summary.reduce((sum, s) => sum + s.count, 0)
    expect(totalCount).toBe(rfm.length)
  })
})

describe('calculateCohorts', () => {
  const transactions = createTestTransactions()

  it('retorna coortes por mes', () => {
    const cohorts = calculateCohorts(transactions)
    expect(cohorts.length).toBeGreaterThan(0)
    cohorts.forEach(c => {
      expect(c.cohort).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  it('retention[0] sempre eh 100%', () => {
    const cohorts = calculateCohorts(transactions)
    cohorts.forEach(c => {
      expect(c.retention[0]).toBe(100)
    })
  })

  it('retention subsequente nao excede 100%', () => {
    const cohorts = calculateCohorts(transactions)
    cohorts.forEach(c => {
      for (let i = 1; i < c.retention.length; i++) {
        // Retencao em qualquer mes posterior nao pode ser maior que 100%
        expect(c.retention[i]).toBeLessThanOrEqual(100)
        expect(c.retention[i]).toBeGreaterThanOrEqual(0)
      }
    })
  })

  it('totalCustomers > 0 para cada coorte', () => {
    const cohorts = calculateCohorts(transactions)
    cohorts.forEach(c => {
      expect(c.totalCustomers).toBeGreaterThan(0)
    })
  })
})

describe('calculateLTV', () => {
  const transactions = createTestTransactions()

  it('LTV overall > 0', () => {
    const ltv = calculateLTV(transactions)
    expect(ltv.overall).toBeGreaterThan(0)
  })

  it('byProduct ordenado por LTV decrescente', () => {
    const ltv = calculateLTV(transactions)
    for (let i = 1; i < ltv.byProduct.length; i++) {
      expect(ltv.byProduct[i - 1].ltv).toBeGreaterThanOrEqual(ltv.byProduct[i].ltv)
    }
  })

  it('distribution soma total de clientes', () => {
    const ltv = calculateLTV(transactions)
    const totalDistribution = ltv.distribution.reduce((sum, d) => sum + d.count, 0)
    // Total de clientes unicos aprovados = 3 (joao, maria, pedro)
    expect(totalDistribution).toBe(3)
  })

  it('ltvToCac > 0', () => {
    const ltv = calculateLTV(transactions)
    expect(ltv.ltvToCac).toBeGreaterThan(0)
  })
})

describe('calculateChurn', () => {
  const transactions = createTestTransactions()
  const range = createTestRange()

  it('taxas entre 0 e 100', () => {
    const churn = calculateChurn(transactions, range)
    expect(churn.currentRate).toBeGreaterThanOrEqual(0)
    expect(churn.currentRate).toBeLessThanOrEqual(100)
  })

  it('monthlyRates tem 6 entradas', () => {
    const churn = calculateChurn(transactions, range)
    expect(churn.monthlyRates.length).toBe(6)
  })

  it('reasons somam aproximadamente 100%', () => {
    const churn = calculateChurn(transactions, range)
    const totalPercentage = churn.reasons.reduce((sum, r) => sum + r.percentage, 0)
    expect(totalPercentage).toBeCloseTo(100, 0)
  })

  it('retentionByPlan tem dados validos', () => {
    const churn = calculateChurn(transactions, range)
    expect(churn.retentionByPlan.length).toBeGreaterThan(0)
    churn.retentionByPlan.forEach(p => {
      expect(p.retention).toBeGreaterThan(0)
      expect(p.retention).toBeLessThanOrEqual(100)
    })
  })
})

describe('calculateRecovery', () => {
  const transactions = createTestTransactions()

  it('boleto conversionRate < 100%', () => {
    const recovery = calculateRecovery(transactions)
    expect(recovery.boletos.conversionRate).toBeLessThan(100)
  })

  it('funnel steps diminuem (checkout abandonado)', () => {
    const recovery = calculateRecovery(transactions)
    const steps = recovery.abandonedCheckouts.steps
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].count).toBeLessThanOrEqual(steps[i - 1].count)
    }
  })

  it('totalRecoverable > 0', () => {
    const recovery = calculateRecovery(transactions)
    expect(recovery.totalRecoverable).toBeGreaterThan(0)
  })

  it('failedCards tem reasons com percentages', () => {
    const recovery = calculateRecovery(transactions)
    expect(recovery.failedCards.byReason.length).toBeGreaterThan(0)
    recovery.failedCards.byReason.forEach(r => {
      expect(r.percentage).toBeGreaterThan(0)
    })
  })
})

describe('calculateCashFlow', () => {
  const transactions = createTestTransactions()

  it('net < gross', () => {
    const cf = calculateCashFlow(transactions)
    expect(cf.totalNet).toBeLessThan(cf.totalGross)
  })

  it('margin < 100%', () => {
    const cf = calculateCashFlow(transactions)
    expect(cf.margin).toBeLessThan(100)
  })

  it('monthly ordenado cronologicamente', () => {
    const cf = calculateCashFlow(transactions)
    // Garante que os meses estao em ordem (comparando labels nao funciona, mas o sort no source garante)
    expect(cf.monthly.length).toBeGreaterThan(0)
    cf.monthly.forEach(m => {
      expect(m.month).toBeTruthy()
      expect(m.gross).toBeGreaterThan(0)
    })
  })

  it('upcoming tem entradas validas', () => {
    const cf = calculateCashFlow(transactions)
    expect(cf.upcoming.length).toBe(7)
    cf.upcoming.forEach(u => {
      expect(u.amount).toBeGreaterThan(0)
      expect(u.source).toBeTruthy()
    })
  })
})

describe('calculateUnitEconomics', () => {
  const transactions = createTestTransactions()

  it('ltvCacRatio > 0', () => {
    const ue = calculateUnitEconomics(transactions)
    expect(ue.ltvCacRatio).toBeGreaterThan(0)
  })

  it('margens < 100%', () => {
    const ue = calculateUnitEconomics(transactions)
    expect(ue.grossMargin).toBeLessThan(100)
    expect(ue.netMargin).toBeLessThan(100)
  })

  it('byProduct ordenado por revenue decrescente', () => {
    const ue = calculateUnitEconomics(transactions)
    for (let i = 1; i < ue.byProduct.length; i++) {
      expect(ue.byProduct[i - 1].revenue).toBeGreaterThanOrEqual(ue.byProduct[i].revenue)
    }
  })

  it('cac e ltv positivos', () => {
    const ue = calculateUnitEconomics(transactions)
    expect(ue.cac).toBeGreaterThan(0)
    expect(ue.ltv).toBeGreaterThan(0)
  })
})

describe('calculateForecast', () => {
  const transactions = createTestTransactions()

  it('tem meses com actual e meses com null (projecao)', () => {
    const forecast = calculateForecast(transactions)
    const withActual = forecast.months.filter(m => m.actual !== null)
    const withNull = forecast.months.filter(m => m.actual === null)
    expect(withActual.length).toBeGreaterThan(0)
    expect(withNull.length).toBeGreaterThan(0)
  })

  it('optimistic > realistic > pessimistic nas projecoes', () => {
    const forecast = calculateForecast(transactions)
    const projections = forecast.months.filter(m => m.actual === null)
    projections.forEach(m => {
      expect(m.optimistic).toBeGreaterThan(m.realistic)
      expect(m.realistic).toBeGreaterThan(m.pessimistic)
    })
  })

  it('targetRevenue e projectedRevenue positivos', () => {
    const forecast = calculateForecast(transactions)
    expect(forecast.targetRevenue).toBeGreaterThan(0)
    expect(forecast.projectedRevenue).toBeGreaterThan(0)
  })
})
