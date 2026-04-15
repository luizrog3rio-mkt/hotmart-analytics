import { describe, it, expect } from 'vitest'
import {
  mapSaleToTransaction,
  mapHotmartSubscription,
  mapWebhookToTransaction,
  getOAuthUrl,
  type HotmartSaleItem,
  type HotmartSubscription,
  type HotmartWebhookPayload,
} from '../hotmart-api'

const makeSale = (overrides: Partial<HotmartSaleItem> = {}): HotmartSaleItem => ({
  transaction: 'TX-001',
  product: { id: 123, name: 'Curso Completo', ucode: 'HT-001' },
  buyer: { name: 'João Silva', email: 'joao@test.com', checkout_phone: '+5511999999999' },
  producer: { name: 'Producer' },
  purchase: {
    transaction: 'TX-001',
    order_date: 1713100800000, // 2024-04-14T12:00:00.000Z
    approved_date: 1713100900000,
    status: 'APPROVED',
    payment: { type: 'CREDIT_CARD', installments_number: 1 },
    offer: { code: 'OFFER-1', payment_mode: 'SINGLE' },
    price: { value: 297, currency_code: 'BRL' },
    commission: { value: 29.7, currency_code: 'BRL' },
    tracking: { source: '', source_sck: '', external_code: '' },
  },
  ...overrides,
})

describe('mapSaleToTransaction', () => {
  it('maps a basic sale to internal format', () => {
    const result = mapSaleToTransaction(makeSale())
    expect(result.hotmart_transaction_id).toBe('TX-001')
    expect(result.product_name).toBe('Curso Completo')
    expect(result.hotmart_product_id).toBe('HT-001')
    expect(result.buyer_name).toBe('João Silva')
    expect(result.buyer_email).toBe('joao@test.com')
    expect(result.amount).toBe(297)
    expect(result.net_amount).toBe(297 - 29.7)
    expect(result.status).toBe('approved')
    expect(result.payment_method).toBe('credit_card')
    expect(result.source).toBe('organic')
    expect(result.currency).toBe('BRL')
  })

  it('maps affiliate sale correctly', () => {
    const result = mapSaleToTransaction(makeSale({
      affiliate: { affiliate_code: 'AF-001', name: 'Maria Afiliada' },
    }))
    expect(result.source).toBe('affiliate')
    expect(result.affiliate_name).toBe('Maria Afiliada')
    expect(result.affiliate_code).toBe('AF-001')
  })

  it('maps campaign sale with UTMs', () => {
    const sale = makeSale()
    sale.purchase.tracking = { source: 'facebook', source_sck: 'black-friday', external_code: '' }
    const result = mapSaleToTransaction(sale)
    expect(result.source).toBe('campaign')
    expect(result.utm_source).toBe('facebook')
    expect(result.utm_campaign).toBe('black-friday')
  })

  it('maps various statuses correctly', () => {
    const statuses: Record<string, string> = {
      APPROVED: 'approved',
      COMPLETE: 'approved',
      CANCELLED: 'cancelled',
      REFUNDED: 'refunded',
      CHARGEBACK: 'disputed',
      DISPUTE: 'disputed',
      WAITING_PAYMENT: 'pending',
      EXPIRED: 'cancelled',
    }

    for (const [hotmartStatus, expectedStatus] of Object.entries(statuses)) {
      const sale = makeSale()
      sale.purchase.status = hotmartStatus
      const result = mapSaleToTransaction(sale)
      expect(result.status).toBe(expectedStatus)
    }
  })

  it('maps various payment methods correctly', () => {
    const methods: Record<string, string> = {
      CREDIT_CARD: 'credit_card',
      BILLET: 'boleto',
      PIX: 'pix',
      PAYPAL: 'paypal',
    }

    for (const [hotmartMethod, expectedMethod] of Object.entries(methods)) {
      const sale = makeSale()
      sale.purchase.payment.type = hotmartMethod
      const result = mapSaleToTransaction(sale)
      expect(result.payment_method).toBe(expectedMethod)
    }
  })
})

describe('mapHotmartSubscription', () => {
  const makeSub = (overrides: Partial<HotmartSubscription> = {}): HotmartSubscription => ({
    subscriber_code: 'SUB-001',
    subscription_id: 456,
    status: 'ACTIVE',
    plan: { id: 1, name: 'Premium' },
    product: { id: 123, name: 'Mentoria', ucode: 'HT-004' },
    price: { value: 1997, currency_code: 'BRL' },
    subscriber: { name: 'Ana Costa', email: 'ana@test.com' },
    accession_date: 1713100800000,
    end_accession_date: null,
    request_date: null,
    date_next_charge: 1715692800000,
    ...overrides,
  })

  it('maps active subscription', () => {
    const result = mapHotmartSubscription(makeSub())
    expect(result.hotmart_subscription_id).toBe('456')
    expect(result.product_name).toBe('Mentoria')
    expect(result.status).toBe('active')
    expect(result.price).toBe(1997)
    expect(result.cancelled_at).toBeNull()
    expect(result.next_billing).not.toBeNull()
  })

  it('maps cancelled subscription', () => {
    const result = mapHotmartSubscription(makeSub({
      status: 'CANCELLED_BY_CUSTOMER',
      end_accession_date: 1715000000000,
    }))
    expect(result.status).toBe('cancelled')
    expect(result.cancelled_at).not.toBeNull()
  })

  it('maps overdue subscription', () => {
    const result = mapHotmartSubscription(makeSub({ status: 'OVERDUE' }))
    expect(result.status).toBe('past_due')
  })
})

describe('mapWebhookToTransaction', () => {
  const makePayload = (): HotmartWebhookPayload => ({
    id: 'evt-001',
    creation_date: Date.now(),
    event: 'PURCHASE_APPROVED',
    version: '2.0.0',
    data: {
      product: { id: 123, name: 'Curso', ucode: 'HT-001' },
      buyer: { name: 'Pedro', email: 'pedro@test.com' },
      purchase: {
        transaction: 'TX-002',
        status: 'APPROVED',
        price: { value: 497, currency_value: 'BRL' },
        payment: { type: 'PIX' },
        order_date: Date.now(),
        approved_date: Date.now(),
      },
    },
  })

  it('maps webhook payload to transaction', () => {
    const result = mapWebhookToTransaction(makePayload())
    expect(result.hotmart_transaction_id).toBe('TX-002')
    expect(result.amount).toBe(497)
    expect(result.payment_method).toBe('pix')
    expect(result.status).toBe('approved')
    expect(result.source).toBe('organic')
  })

  it('maps webhook with affiliate', () => {
    const payload = makePayload()
    payload.data.affiliate = { name: 'Afiliado Test', affiliate_code: 'AF-123' }
    const result = mapWebhookToTransaction(payload)
    expect(result.source).toBe('affiliate')
    expect(result.affiliate_name).toBe('Afiliado Test')
  })
})

describe('getOAuthUrl', () => {
  it('generates correct OAuth URL', () => {
    const url = getOAuthUrl('my-client-id', 'https://app.com/callback')
    expect(url).toContain('client_id=my-client-id')
    expect(url).toContain('redirect_uri=')
    expect(url).toContain('response_type=code')
    expect(url).toContain('app-connect.hotmart.com')
  })
})
