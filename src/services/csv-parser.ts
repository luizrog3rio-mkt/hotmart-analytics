import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export interface ParsedRow {
  [key: string]: string | number | null
}

export interface ParseResult {
  data: ParsedRow[]
  headers: string[]
  rowCount: number
  errors: string[]
}

// ---------------------------------------------------------------------------
// Hotmart CSV column mapping (exact headers from the export)
// ---------------------------------------------------------------------------

const HOTMART_COLUMN_MAP: Record<string, string> = {
  // Transaction
  'código da transação': 'transaction_id',
  'codigo da transacao': 'transaction_id',
  'status da transação': 'status',
  'status da transacao': 'status',
  'data da transação': 'date',
  'data da transacao': 'date',
  'confirmação do pagamento': 'payment_confirmed_at',

  // Producer
  'produtor(a)': 'producer_name',

  // Product
  'código do produto': 'hotmart_product_id',
  'codigo do produto': 'hotmart_product_id',
  'produto': 'product_name',
  'código do preço': 'price_code',
  'nome deste preço': 'price_name',

  // Currency & amounts
  'taxa de conversão (moeda de compra)': 'exchange_rate',
  'moeda de compra': 'purchase_currency',
  'valor de compra com impostos': 'amount_with_taxes',
  'impostos locais de compra + taxa de parcelamento': 'local_taxes_installment',
  'valor de compra sem impostos': 'amount',
  'taxa de conversão (moeda de recebimento)': 'receiving_exchange_rate',
  'moeda de recebimento': 'receiving_currency',
  'faturamento bruto (sem impostos)': 'gross_revenue',
  'faturamento líquido': 'net_amount',
  'faturamento liquido': 'net_amount',

  // Revenue split
  'venda feita como': 'sold_as',
  'faturamento líquido do(a) produtor(a)': 'producer_net',
  'faturamento liquido do(a) produtor(a)': 'producer_net',
  'comissão do(a) afiliado(a)': 'affiliate_commission',
  'comissao do(a) afiliado(a)': 'affiliate_commission',
  'faturamento do(a) coprodutor(a)': 'coproducer_revenue',

  // Fees
  'moeda das taxas': 'fee_currency',
  'taxa de processamento': 'processing_fee',
  'taxa de streaming': 'streaming_fee',
  'outras taxas': 'other_fees',

  // Affiliate & tracking
  'nome do(a) afiliado(a)': 'affiliate_name',
  'canal usado para venda': 'sales_channel',
  'código src': 'utm_source',
  'codigo src': 'utm_source',
  'código sck': 'utm_campaign',
  'codigo sck': 'utm_campaign',

  // Payment
  'método de pagamento': 'payment_method',
  'metodo de pagamento': 'payment_method',
  'tipo de cobrança': 'billing_type',
  'tipo de cobranca': 'billing_type',
  'quantidade total de parcelas': 'total_installments',
  'quantidade de cobranças': 'charge_count',
  'quantidade de cobrancas': 'charge_count',
  'data de vencimento (vouchers)': 'voucher_due_date',
  'código de cupom': 'coupon_code',
  'codigo de cupom': 'coupon_code',
  'período gratuito (trial)': 'free_trial',
  'periodo gratuito (trial)': 'free_trial',
  'quantidade de itens': 'item_count',

  // Buyer
  'comprador(a)': 'buyer_name',
  'email do(a) comprador(a)': 'buyer_email',
  'país': 'country',
  'pais': 'country',
  'telefone': 'phone',
  'documento': 'document',
  'código postal': 'postal_code',
  'cidade': 'city',
  'estado / província': 'state',
  'estado / provincia': 'state',
  'endereço': 'address',
  'endereco': 'address',
  'bairro': 'neighborhood',
  'número': 'number',
  'numero': 'number',
  'complemento': 'complement',
  'instagram': 'instagram',

  // Subscription
  'código do assinante': 'subscriber_code',
  'codigo do assinante': 'subscriber_code',

  // Tax & misc
  'tax solutions': 'tax_solutions',
  'tax collected': 'tax_collected',
  'tax jurisdiction': 'tax_jurisdiction',
  'ferramenta de venda': 'sales_tool',
  'transação do produto principal': 'main_product_transaction',
  'tipo da antecipação de assinatura': 'subscription_anticipation',
  'motivo de recusa de cartão': 'card_decline_reason',
  'motivo de recusa de cartao': 'card_decline_reason',
  'imposto sobre serviço hotmart': 'hotmart_service_tax',
  'impostos locais': 'local_taxes',
  'taxa de parcelamento': 'installment_fee',
  'valor do frete bruto': 'gross_shipping',

  // Simplified Portuguese headers (common in manual exports)
  'valor': 'amount',
  'preço': 'amount',
  'preco': 'amount',
  'forma de pagamento': 'payment_method',
  'nome do produto': 'product_name',
  'e-mail do comprador': 'buyer_email',
  'e-mail': 'buyer_email',

  // English fallbacks
  'transaction': 'transaction_id',
  'transaction id': 'transaction_id',
  'product': 'product_name',
  'product name': 'product_name',
  'buyer': 'buyer_name',
  'buyer name': 'buyer_name',
  'buyer email': 'buyer_email',
  'amount': 'amount',
  'net amount': 'net_amount',
  'status': 'status',
  'payment method': 'payment_method',
  'date': 'date',
  'source': 'source',
  'affiliate': 'affiliate_name',
  'affiliate name': 'affiliate_name',
  'country': 'country',
  'state': 'state',
  'email': 'buyer_email',
}

function normalizeHeader(header: string): string {
  const normalized = header.trim().toLowerCase()
  return HOTMART_COLUMN_MAP[normalized] || normalized.replace(/\s+/g, '_')
}

// ---------------------------------------------------------------------------
// Detect delimiter (Hotmart uses ;)
// ---------------------------------------------------------------------------

function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || ''
  const semicolons = (firstLine.match(/;/g) || []).length
  const commas = (firstLine.match(/,/g) || []).length
  return semicolons > commas ? ';' : ','
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

function parseCSVContent(content: string): Promise<ParseResult> {
  const delimiter = detectDelimiter(content)

  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      delimiter,
      skipEmptyLines: true,
      dynamicTyping: false, // keep as strings to handle BR number format
      complete(results) {
        const headers = (results.meta.fields || []).map(normalizeHeader)
        const data = (results.data as Record<string, unknown>[]).map((row) => {
          const mapped: ParsedRow = {}
          const originalHeaders = results.meta.fields || []
          originalHeaders.forEach((origHeader: string, i: number) => {
            const key = headers[i]
            const value = row[origHeader]
            mapped[key] = value as string | number | null
          })
          return mapped
        })

        const errors = results.errors.map(e => `Linha ${e.row}: ${e.message}`)

        resolve({
          data,
          headers,
          rowCount: data.length,
          errors,
        })
      },
    })
  })
}

function parseXLSXContent(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheet]
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

  if (jsonData.length === 0) {
    return { data: [], headers: [], rowCount: 0, errors: [] }
  }

  const originalHeaders = Object.keys(jsonData[0])
  const headers = originalHeaders.map(normalizeHeader)

  const data = jsonData.map(row => {
    const mapped: ParsedRow = {}
    originalHeaders.forEach((origHeader, i) => {
      mapped[headers[i]] = row[origHeader] as string | number | null
    })
    return mapped
  })

  return { data, headers, rowCount: data.length, errors: [] }
}

export async function parseFile(file: File): Promise<ParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv' || extension === 'txt') {
    const content = await file.text()
    return parseCSVContent(content)
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer()
    return parseXLSXContent(buffer)
  }

  return {
    data: [],
    headers: [],
    rowCount: 0,
    errors: [`Formato não suportado: .${extension}. Use CSV ou Excel (.xlsx).`],
  }
}

// ---------------------------------------------------------------------------
// Date parsing (DD/MM/YYYY HH:mm:ss → ISO)
// ---------------------------------------------------------------------------

function parseHotmartDate(dateStr: string): string {
  if (!dateStr || dateStr === '(none)') return new Date().toISOString()

  // DD/MM/YYYY HH:mm:ss
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (match) {
    const [, dd, mm, yyyy, hh, min, ss] = match
    return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`).toISOString()
  }

  // Try ISO or other common formats
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

// ---------------------------------------------------------------------------
// Number parsing (handles BR format: "1.234,56" → 1234.56)
// ---------------------------------------------------------------------------

function parseNumber(value: string | number | null): number {
  if (value === null || value === undefined || value === '' || value === '(none)') return 0
  if (typeof value === 'number') return value

  const str = String(value).trim()
  // If it has comma as decimal separator (BR format)
  if (str.includes(',') && str.includes('.')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (str.includes(',') && !str.includes('.')) {
    return parseFloat(str.replace(',', '.')) || 0
  }
  return parseFloat(str) || 0
}

// ---------------------------------------------------------------------------
// Clean Hotmart "(none)" values
// ---------------------------------------------------------------------------

function cleanNone(value: string | number | null): string | null {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  if (str === '(none)' || str === '') return null
  return str
}

// ---------------------------------------------------------------------------
// Map parsed data to transaction format
// ---------------------------------------------------------------------------

export interface MappedTransaction {
  transaction_id: string | null
  hotmart_product_id: string | null
  product_name: string
  buyer_email: string
  buyer_name: string
  amount: number
  net_amount: number
  status: string
  payment_method: string
  source: string
  utm_source: string | null
  utm_campaign: string | null
  affiliate_name: string | null
  affiliate_commission: number
  country: string | null
  state: string | null
  date: string
  billing_type: string | null
  coupon_code: string | null
  card_decline_reason: string | null
}

export function mapToTransactions(parsed: ParseResult): MappedTransaction[] {
  return parsed.data
    .filter(row => {
      // Skip completely empty rows
      const name = String(row.product_name || row.produto || '').trim()
      return name.length > 0
    })
    .map(row => {
      const affiliateName = cleanNone(row.affiliate_name)
      const utmSource = cleanNone(row.utm_source)
      const salesChannel = cleanNone(row.sales_channel)

      // Detect source: affiliate > campaign > organic
      let source = 'organic'
      if (affiliateName) {
        source = 'affiliate'
      } else if (utmSource || salesChannel) {
        source = 'campaign'
      }

      return {
        transaction_id: cleanNone(row.transaction_id),
        hotmart_product_id: cleanNone(row.hotmart_product_id),
        product_name: String(row.product_name || '').trim(),
        buyer_email: String(row.buyer_email || '').trim(),
        buyer_name: String(row.buyer_name || '').trim(),
        amount: parseNumber(row.amount || row.gross_revenue),
        net_amount: parseNumber(row.net_amount),
        status: normalizeStatus(String(row.status || '')),
        payment_method: normalizePaymentMethod(String(row.payment_method || '')),
        source,
        utm_source: utmSource,
        utm_campaign: cleanNone(row.utm_campaign),
        affiliate_name: affiliateName,
        affiliate_commission: parseNumber(row.affiliate_commission),
        country: cleanNone(row.country),
        state: cleanNone(row.state),
        date: parseHotmartDate(String(row.date || '')),
        billing_type: cleanNone(row.billing_type),
        coupon_code: cleanNone(row.coupon_code),
        card_decline_reason: cleanNone(row.card_decline_reason),
      }
    })
}

// Hotmart transaction statuses:
//   Aprovada  → approved (pagamento identificado, acesso liberado)
//   Completa  → approved (passou da garantia — não pode mais reembolsar)
//   Reembolsada / Chargeback → refunded / disputed
//   Reclamada → disputed (cancelamento solicitado, reembolso não liberado)
//   Cancelada / Expirada → cancelled
//   Atrasada / Aguardando / Em Análise / Boleto Gerado / Iniciada → pending
function normalizeStatus(status: string): string {
  const s = status.toLowerCase().trim()

  // approved: venda válida (inclui Completa — garantia expirou)
  if (s.includes('aprovad') || s.includes('complet') || s === 'approved') return 'approved'

  // refunded: reembolso processado
  if (s.includes('reembolsad') || s === 'refunded') return 'refunded'

  // disputed: chargeback, reclamação ou disputa ativa
  if (s.includes('chargeback') || s.includes('reclamad') || s.includes('disput')) return 'disputed'

  // cancelled: cancelamento ou expiração do boleto
  if (s.includes('cancelad') || s.includes('expirad') || s === 'cancelled') return 'cancelled'

  // pending: aguardando / análise / atraso / boleto gerado / iniciada
  return 'pending'
}

function normalizePaymentMethod(method: string): string {
  const m = method.toLowerCase().trim()
  if (m.includes('cart') || m.includes('credit') || m.includes('crédito') || m.includes('credito')) return 'credit_card'
  if (m.includes('pix')) return 'pix'
  if (m.includes('bolet')) return 'boleto'
  if (m.includes('paypal')) return 'paypal'
  if (m.includes('parcelado hotmart')) return 'credit_card'
  return 'credit_card'
}
