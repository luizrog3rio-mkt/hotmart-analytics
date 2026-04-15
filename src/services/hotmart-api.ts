/**
 * Hotmart API Client
 *
 * Handles OAuth2 authentication, data fetching, and mapping
 * from Hotmart's API to our internal schema.
 *
 * Hotmart API docs: https://developers.hotmart.com/docs/en/
 */

// ---------------------------------------------------------------------------
// Types — Hotmart API responses
// ---------------------------------------------------------------------------

export interface HotmartTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface HotmartSaleItem {
  transaction: string
  product: {
    id: number
    name: string
    ucode: string
  }
  buyer: {
    name: string
    email: string
    checkout_phone: string
  }
  producer: {
    name: string
  }
  purchase: {
    transaction: string
    order_date: number // timestamp ms
    approved_date: number
    status: string // 'APPROVED' | 'CANCELLED' | 'REFUNDED' | 'DISPUTED' | 'WAITING_PAYMENT' | 'EXPIRED'
    payment: {
      type: string // 'CREDIT_CARD' | 'BILLET' | 'PIX' | 'PAYPAL'
      installments_number: number
    }
    offer: {
      code: string
      payment_mode: string
    }
    price: {
      value: number
      currency_code: string
    }
    commission: {
      value: number
      currency_code: string
    }
    tracking: {
      source: string
      source_sck: string
      external_code: string
    }
  }
  affiliate?: {
    affiliate_code: string
    name: string
  }
}

export interface HotmartSalesResponse {
  items: HotmartSaleItem[]
  page_info: {
    total_results: number
    next_page_token: string | null
    items_per_page: number
    results_per_page: number
  }
}

export interface HotmartSubscription {
  subscriber_code: string
  subscription_id: number
  status: string // 'ACTIVE' | 'CANCELLED_BY_CUSTOMER' | 'CANCELLED_BY_SELLER' | 'CANCELLED_BY_ADMIN' | 'OVERDUE' | 'EXPIRED'
  plan: {
    id: number
    name: string
  }
  product: {
    id: number
    name: string
    ucode: string
  }
  price: {
    value: number
    currency_code: string
  }
  subscriber: {
    name: string
    email: string
  }
  accession_date: number
  end_accession_date: number | null
  request_date: number | null
  date_next_charge: number | null
}

export interface HotmartSubscriptionsResponse {
  items: HotmartSubscription[]
  page_info: {
    total_results: number
    next_page_token: string | null
  }
}

// ---------------------------------------------------------------------------
// Mapped types — internal schema
// ---------------------------------------------------------------------------

export interface MappedHotmartTransaction {
  hotmart_transaction_id: string
  product_name: string
  hotmart_product_id: string
  buyer_name: string
  buyer_email: string
  amount: number
  net_amount: number
  status: 'approved' | 'cancelled' | 'refunded' | 'disputed' | 'pending'
  payment_method: 'credit_card' | 'boleto' | 'pix' | 'paypal'
  source: 'organic' | 'affiliate' | 'campaign'
  utm_source: string | null
  utm_campaign: string | null
  affiliate_name: string | null
  affiliate_code: string | null
  currency: string
  created_at: string
}

export interface MappedHotmartSubscription {
  hotmart_subscription_id: string
  product_name: string
  hotmart_product_id: string
  buyer_name: string
  buyer_email: string
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  price: number
  started_at: string
  cancelled_at: string | null
  next_billing: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOTMART_API_BASE = 'https://developers.hotmart.com/payments/api/v1'
const HOTMART_OAUTH_URL = 'https://api-hot-connect.hotmart.com/oauth/token'

// ---------------------------------------------------------------------------
// OAuth2
// ---------------------------------------------------------------------------

export async function exchangeCodeForToken(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<HotmartTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })

  const res = await fetch(HOTMART_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Hotmart OAuth error (${res.status}): ${err}`)
  }

  return res.json()
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<HotmartTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })

  const res = await fetch(HOTMART_OAUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Hotmart token refresh error (${res.status}): ${err}`)
  }

  return res.json()
}

export function getOAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  })
  return `https://app-connect.hotmart.com/oauth/authorize?${params.toString()}`
}

// ---------------------------------------------------------------------------
// API Client
// ---------------------------------------------------------------------------

async function hotmartFetch<T>(
  accessToken: string,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${HOTMART_API_BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (res.status === 401) {
    throw new Error('HOTMART_TOKEN_EXPIRED')
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Hotmart API error (${res.status}): ${err}`)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Fetch sales (paginated)
// ---------------------------------------------------------------------------

export async function fetchSalesHistory(
  accessToken: string,
  startDate?: Date,
  endDate?: Date,
  pageToken?: string,
): Promise<HotmartSalesResponse> {
  const params: Record<string, string> = {}

  if (startDate) {
    params.start_date = startDate.getTime().toString()
  }
  if (endDate) {
    params.end_date = endDate.getTime().toString()
  }
  if (pageToken) {
    params.page_token = pageToken
  }

  return hotmartFetch<HotmartSalesResponse>(accessToken, '/sales/history', params)
}

export async function fetchAllSales(
  accessToken: string,
  startDate?: Date,
  endDate?: Date,
): Promise<HotmartSaleItem[]> {
  const allItems: HotmartSaleItem[] = []
  let pageToken: string | null = null

  do {
    const response = await fetchSalesHistory(
      accessToken,
      startDate,
      endDate,
      pageToken ?? undefined,
    )
    allItems.push(...response.items)
    pageToken = response.page_info.next_page_token
  } while (pageToken)

  return allItems
}

// ---------------------------------------------------------------------------
// Fetch subscriptions (paginated)
// ---------------------------------------------------------------------------

export async function fetchSubscriptions(
  accessToken: string,
  pageToken?: string,
): Promise<HotmartSubscriptionsResponse> {
  const params: Record<string, string> = {}
  if (pageToken) params.page_token = pageToken

  return hotmartFetch<HotmartSubscriptionsResponse>(accessToken, '/subscriptions', params)
}

export async function fetchAllSubscriptions(
  accessToken: string,
): Promise<HotmartSubscription[]> {
  const allItems: HotmartSubscription[] = []
  let pageToken: string | null = null

  do {
    const response = await fetchSubscriptions(accessToken, pageToken ?? undefined)
    allItems.push(...response.items)
    pageToken = response.page_info.next_page_token
  } while (pageToken)

  return allItems
}

// ---------------------------------------------------------------------------
// Mapping: Hotmart → Internal schema
// ---------------------------------------------------------------------------

function mapHotmartStatus(status: string): MappedHotmartTransaction['status'] {
  const mapping: Record<string, MappedHotmartTransaction['status']> = {
    APPROVED: 'approved',
    COMPLETE: 'approved',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
    CHARGEBACK: 'disputed',
    DISPUTE: 'disputed',
    WAITING_PAYMENT: 'pending',
    EXPIRED: 'cancelled',
    DELAYED: 'pending',
    OVERDUE: 'pending',
    PRINTED_BILLET: 'pending',
    NO_FUNDS: 'cancelled',
  }
  return mapping[status] || 'pending'
}

function mapPaymentMethod(type: string): MappedHotmartTransaction['payment_method'] {
  const mapping: Record<string, MappedHotmartTransaction['payment_method']> = {
    CREDIT_CARD: 'credit_card',
    BILLET: 'boleto',
    PIX: 'pix',
    PAYPAL: 'paypal',
    GOOGLE_PAY: 'credit_card',
    APPLE_PAY: 'credit_card',
  }
  return mapping[type] || 'credit_card'
}

function mapSubscriptionStatus(status: string): MappedHotmartSubscription['status'] {
  const mapping: Record<string, MappedHotmartSubscription['status']> = {
    ACTIVE: 'active',
    CANCELLED_BY_CUSTOMER: 'cancelled',
    CANCELLED_BY_SELLER: 'cancelled',
    CANCELLED_BY_ADMIN: 'cancelled',
    OVERDUE: 'past_due',
    EXPIRED: 'cancelled',
    STARTED: 'trialing',
    TRIAL: 'trialing',
  }
  return mapping[status] || 'active'
}

export function mapSaleToTransaction(sale: HotmartSaleItem): MappedHotmartTransaction {
  const tracking = sale.purchase.tracking
  const hasUtm = !!(tracking.source || tracking.source_sck)
  const hasAffiliate = !!sale.affiliate

  let source: MappedHotmartTransaction['source'] = 'organic'
  if (hasAffiliate) source = 'affiliate'
  else if (hasUtm) source = 'campaign'

  return {
    hotmart_transaction_id: sale.purchase.transaction,
    product_name: sale.product.name,
    hotmart_product_id: sale.product.ucode,
    buyer_name: sale.buyer.name,
    buyer_email: sale.buyer.email,
    amount: sale.purchase.price.value,
    net_amount: sale.purchase.price.value - (sale.purchase.commission?.value || 0),
    status: mapHotmartStatus(sale.purchase.status),
    payment_method: mapPaymentMethod(sale.purchase.payment.type),
    source,
    utm_source: tracking.source || null,
    utm_campaign: tracking.source_sck || null,
    affiliate_name: sale.affiliate?.name || null,
    affiliate_code: sale.affiliate?.affiliate_code || null,
    currency: sale.purchase.price.currency_code,
    created_at: new Date(sale.purchase.order_date).toISOString(),
  }
}

export function mapHotmartSubscription(sub: HotmartSubscription): MappedHotmartSubscription {
  return {
    hotmart_subscription_id: sub.subscription_id.toString(),
    product_name: sub.product.name,
    hotmart_product_id: sub.product.ucode,
    buyer_name: sub.subscriber.name,
    buyer_email: sub.subscriber.email,
    status: mapSubscriptionStatus(sub.status),
    price: sub.price.value,
    started_at: new Date(sub.accession_date).toISOString(),
    cancelled_at: sub.end_accession_date ? new Date(sub.end_accession_date).toISOString() : null,
    next_billing: sub.date_next_charge ? new Date(sub.date_next_charge).toISOString() : null,
  }
}

// ---------------------------------------------------------------------------
// Webhook event types
// ---------------------------------------------------------------------------

export type HotmartWebhookEvent =
  | 'PURCHASE_APPROVED'
  | 'PURCHASE_COMPLETE'
  | 'PURCHASE_CANCELED'
  | 'PURCHASE_REFUNDED'
  | 'PURCHASE_CHARGEBACK'
  | 'PURCHASE_DELAYED'
  | 'PURCHASE_BILLET_PRINTED'
  | 'SUBSCRIPTION_CANCELLATION'
  | 'SWITCH_PLAN'

export interface HotmartWebhookPayload {
  id: string
  creation_date: number
  event: HotmartWebhookEvent
  version: string
  data: {
    product: {
      id: number
      name: string
      ucode: string
    }
    buyer: {
      name: string
      email: string
    }
    purchase: {
      transaction: string
      status: string
      price: {
        value: number
        currency_value: string
      }
      payment: {
        type: string
      }
      order_date: number
      approved_date: number
    }
    subscription?: {
      subscriber: {
        code: string
      }
      plan: {
        id: number
        name: string
      }
      status: string
    }
    affiliate?: {
      name: string
      affiliate_code: string
    }
  }
}

export function mapWebhookToTransaction(payload: HotmartWebhookPayload): MappedHotmartTransaction {
  const { data } = payload
  const hasAffiliate = !!data.affiliate

  return {
    hotmart_transaction_id: data.purchase.transaction,
    product_name: data.product.name,
    hotmart_product_id: data.product.ucode,
    buyer_name: data.buyer.name,
    buyer_email: data.buyer.email,
    amount: data.purchase.price.value,
    net_amount: data.purchase.price.value * 0.9, // estimate, corrected on next sync
    status: mapHotmartStatus(data.purchase.status),
    payment_method: mapPaymentMethod(data.purchase.payment.type),
    source: hasAffiliate ? 'affiliate' : 'organic',
    utm_source: null,
    utm_campaign: null,
    affiliate_name: data.affiliate?.name || null,
    affiliate_code: data.affiliate?.affiliate_code || null,
    currency: data.purchase.price.currency_value || 'BRL',
    created_at: new Date(data.purchase.order_date).toISOString(),
  }
}
