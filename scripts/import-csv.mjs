import { readFileSync } from 'fs'
import Papa from 'papaparse'

const PROJECT_ID = 'qttxajnsrrfvcvfvmkxh'
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const USER_ID = 'af013f7d-4a5e-4a0a-864c-0e3397c0c3f3'
const CSV_PATH = process.argv[2]

if (!TOKEN) { console.error('SUPABASE_ACCESS_TOKEN not set'); process.exit(1) }
if (!CSV_PATH) { console.error('Usage: node import-csv.mjs <path-to-csv>'); process.exit(1) }

// -- Supabase query helper ----------------------------------------------------

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${body}`)
  return JSON.parse(body)
}

// -- Parse CSV ----------------------------------------------------------------

console.log('Parsing CSV...')
const content = readFileSync(CSV_PATH, 'utf-8')
const { data: rows, meta } = Papa.parse(content, { header: true, delimiter: ';', skipEmptyLines: true })
console.log(`  ${rows.length} rows, ${meta.fields.length} columns`)

// -- Normalize helpers --------------------------------------------------------

function clean(val) {
  if (!val || val === '(none)' || val.trim() === '') return null
  return val.trim()
}

function num(val) {
  if (!val || val === '(none)') return 0
  const s = String(val).trim()
  if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0
  return parseFloat(s) || 0
}

function parseDate(d) {
  if (!d || d === '(none)') return new Date().toISOString()
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}`
  return new Date().toISOString()
}

function status(s) {
  const v = (s || '').toLowerCase()
  if (v.includes('aprovado')) return 'approved'
  if (v.includes('cancelado')) return 'cancelled'
  if (v.includes('reembolsado')) return 'refunded'
  if (v.includes('disputa')) return 'disputed'
  return 'pending'
}

function payment(m) {
  const v = (m || '').toLowerCase()
  if (v.includes('pix')) return 'pix'
  if (v.includes('bolet')) return 'boleto'
  if (v.includes('paypal')) return 'paypal'
  return 'credit_card'
}

// -- 1. Create products -------------------------------------------------------

console.log('Creating products...')
const productMap = new Map()
for (const r of rows) {
  const hid = clean(r['Código do produto'])
  const name = clean(r['Produto'])
  if (!name) continue
  const key = hid || name
  if (!productMap.has(key)) {
    const billing = (r['Tipo de cobrança'] || '').toLowerCase()
    productMap.set(key, { name, hid, price: num(r['Valor de compra sem impostos']), type: billing.includes('assinatura') ? 'subscription' : 'digital' })
  }
}

console.log(`  ${productMap.size} unique products`)

const productIdMap = new Map()
for (const [key, info] of productMap) {
  const esc = (s) => s ? s.replace(/'/g, "''") : ''
  const insertSql = `INSERT INTO public.products (user_id, name, hotmart_product_id, price, type, status)
    VALUES ('${USER_ID}', '${esc(info.name)}', ${info.hid ? `'${esc(info.hid)}'` : 'NULL'}, ${info.price}, '${info.type}', 'active')
    ON CONFLICT DO NOTHING
    RETURNING id;`

  try {
    const result = await sql(insertSql)
    if (result.length > 0) {
      productIdMap.set(key, result[0].id)
    } else {
      // Already exists, find it
      const existing = await sql(`SELECT id FROM public.products WHERE user_id = '${USER_ID}' AND name = '${esc(info.name)}' LIMIT 1;`)
      if (existing.length > 0) productIdMap.set(key, existing[0].id)
    }
  } catch (err) {
    console.error(`  Error creating product "${info.name}":`, err.message.slice(0, 100))
  }
}

console.log(`  ${productIdMap.size} products resolved`)

// -- 2. Create import record --------------------------------------------------

const importRes = await sql(`INSERT INTO public.imports (user_id, filename, row_count, status)
  VALUES ('${USER_ID}', '${CSV_PATH.split(/[/\\]/).pop()}', ${rows.length}, 'processing')
  RETURNING id;`)
const importId = importRes[0].id
console.log(`Import record: ${importId}`)

// -- 3. Insert transactions in batches ----------------------------------------

console.log('Inserting transactions...')
const batchSize = 200
let inserted = 0
let skipped = 0
let errors = 0

for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize)
  const values = []

  for (const r of batch) {
    const hid = clean(r['Código do produto'])
    const name = clean(r['Produto'])
    if (!name) { skipped++; continue }
    const key = hid || name
    const pid = productIdMap.get(key)
    if (!pid) { skipped++; continue }

    const affiliateName = clean(r['Nome do(a) Afiliado(a)'])
    const utmSrc = clean(r['Código SRC'])
    const channel = clean(r['Canal usado para venda'])
    const affCommission = num(r['Comissão do(a) Afiliado(a)'])

    // Source: only "affiliate" if there's actual commission > 0
    let src = 'organic'
    if (affCommission > 0) src = 'affiliate'
    else if (utmSrc || channel) src = 'campaign'

    const esc = (s) => s ? s.replace(/'/g, "''") : ''
    const buyerName = clean(r['Comprador(a)']) || 'Desconhecido'
    const buyerEmail = clean(r['Email do(a) Comprador(a)']) || 'desconhecido@email.com'
    const amount = num(r['Valor de compra sem impostos']) || num(r['Faturamento bruto (sem impostos)'])
    const netAmount = num(r['Faturamento líquido']) || amount * 0.9
    const country = clean(r['País']) || 'BR'
    const state = clean(r['Estado / Província'])
    const utmCampaign = clean(r['Código SCK'])

    values.push(`('${USER_ID}', '${pid}', '${esc(buyerEmail)}', '${esc(buyerName)}', ${amount}, ${netAmount}, '${status(r['Status da transação'])}', '${payment(r['Método de pagamento'])}', '${src}', ${utmSrc ? `'${esc(utmSrc)}'` : 'NULL'}, ${utmCampaign ? `'${esc(utmCampaign)}'` : 'NULL'}, '${esc(country)}', ${state ? `'${esc(state)}'` : 'NULL'}, '${parseDate(r['Data da transação'])}')`)
  }

  if (values.length === 0) continue

  const insertSql = `INSERT INTO public.transactions (user_id, product_id, buyer_email, buyer_name, amount, net_amount, status, payment_method, source, utm_source, utm_campaign, country, state, created_at)
    VALUES ${values.join(',\n')};`

  try {
    await sql(insertSql)
    inserted += values.length
    process.stdout.write(`  Batch ${Math.floor(i / batchSize) + 1}: ${inserted} inserted\r`)
  } catch (err) {
    errors++
    console.error(`\n  Batch ${Math.floor(i / batchSize) + 1} error:`, err.message.slice(0, 150))
  }
}

console.log(`\n  Done: ${inserted} inserted, ${skipped} skipped, ${errors} batch errors`)

// -- 4. Finalize import record ------------------------------------------------

await sql(`UPDATE public.imports SET status = 'completed', row_count = ${inserted} WHERE id = '${importId}';`)
console.log('Import complete!')
