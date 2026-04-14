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

// Known Hotmart CSV column mappings
const HOTMART_COLUMN_MAP: Record<string, string> = {
  // Portuguese headers
  'transação': 'transaction_id',
  'transacao': 'transaction_id',
  'código da transação': 'transaction_id',
  'codigo da transacao': 'transaction_id',
  'produto': 'product_name',
  'nome do produto': 'product_name',
  'comprador': 'buyer_name',
  'nome do comprador': 'buyer_name',
  'e-mail do comprador': 'buyer_email',
  'email do comprador': 'buyer_email',
  'email': 'buyer_email',
  'valor': 'amount',
  'valor da venda': 'amount',
  'preço': 'amount',
  'preco': 'amount',
  'valor líquido': 'net_amount',
  'valor liquido': 'net_amount',
  'comissão': 'commission',
  'comissao': 'commission',
  'status': 'status',
  'status da transação': 'status',
  'status da transacao': 'status',
  'forma de pagamento': 'payment_method',
  'método de pagamento': 'payment_method',
  'metodo de pagamento': 'payment_method',
  'data': 'date',
  'data da compra': 'date',
  'data da venda': 'date',
  'data da transação': 'date',
  'origem': 'source',
  'fonte': 'source',
  'afiliado': 'affiliate_name',
  'nome do afiliado': 'affiliate_name',
  'país': 'country',
  'pais': 'country',
  'estado': 'state',
  // English headers
  'transaction': 'transaction_id',
  'transaction id': 'transaction_id',
  'product': 'product_name',
  'product name': 'product_name',
  'buyer': 'buyer_name',
  'buyer name': 'buyer_name',
  'buyer email': 'buyer_email',
  'amount': 'amount',
  'sale amount': 'amount',
  'net amount': 'net_amount',
  'commission': 'commission',
  'payment method': 'payment_method',
  'date': 'date',
  'purchase date': 'date',
  'source': 'source',
  'affiliate': 'affiliate_name',
  'affiliate name': 'affiliate_name',
  'country': 'country',
}

function normalizeHeader(header: string): string {
  const normalized = header.trim().toLowerCase()
  return HOTMART_COLUMN_MAP[normalized] || normalized.replace(/\s+/g, '_')
}

function parseCSVContent(content: string): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
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

  return {
    data,
    headers,
    rowCount: data.length,
    errors: [],
  }
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

// Map parsed data to transaction format
export interface MappedTransaction {
  product_name: string
  buyer_email: string
  buyer_name: string
  amount: number
  net_amount: number
  status: string
  payment_method: string
  source: string
  affiliate_name: string | null
  country: string | null
  state: string | null
  date: string
}

export function mapToTransactions(parsed: ParseResult): MappedTransaction[] {
  return parsed.data.map(row => ({
    product_name: String(row.product_name || row.produto || ''),
    buyer_email: String(row.buyer_email || row.email || ''),
    buyer_name: String(row.buyer_name || row.comprador || ''),
    amount: Number(row.amount || row.valor || 0),
    net_amount: Number(row.net_amount || row.valor_liquido || row.amount || 0),
    status: normalizeStatus(String(row.status || 'approved')),
    payment_method: normalizePaymentMethod(String(row.payment_method || 'credit_card')),
    source: String(row.source || 'organic'),
    affiliate_name: row.affiliate_name ? String(row.affiliate_name) : null,
    country: row.country ? String(row.country) : null,
    state: row.state ? String(row.state) : null,
    date: String(row.date || new Date().toISOString()),
  }))
}

function normalizeStatus(status: string): string {
  const s = status.toLowerCase().trim()
  if (s.includes('aprov') || s === 'approved' || s === 'complete') return 'approved'
  if (s.includes('cancel') || s === 'cancelled') return 'cancelled'
  if (s.includes('reembol') || s === 'refunded') return 'refunded'
  if (s.includes('disput') || s === 'disputed') return 'disputed'
  return 'pending'
}

function normalizePaymentMethod(method: string): string {
  const m = method.toLowerCase().trim()
  if (m.includes('cart') || m.includes('credit') || m.includes('crédito')) return 'credit_card'
  if (m.includes('pix')) return 'pix'
  if (m.includes('bolet')) return 'boleto'
  if (m.includes('paypal')) return 'paypal'
  return 'credit_card'
}
