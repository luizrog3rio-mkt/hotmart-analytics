import { supabase } from '@/lib/supabase'
import type { MappedTransaction } from './csv-parser'

export interface ImportResult {
  success: boolean
  productsCreated: number
  transactionsCreated: number
  errors: string[]
}

export type ImportProgress = {
  phase: 'products' | 'transactions' | 'finalizing'
  current: number
  total: number
}

export async function importTransactionsToSupabase(
  userId: string,
  mapped: MappedTransaction[],
  filename: string,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportResult> {
  const errors: string[] = []
  let productsCreated = 0
  let transactionsCreated = 0

  try {
    // 1. Create import record
    console.log('[Import] Creating import record...')
    const { data: importRecord, error: importErr } = await supabase
      .from('imports')
      .insert({
        user_id: userId,
        filename,
        row_count: mapped.length,
        status: 'processing',
      })
      .select('id')
      .single()

    if (importErr) {
      console.error('[Import] Import record failed:', importErr)
      return { success: false, productsCreated: 0, transactionsCreated: 0, errors: [`Erro ao criar registro: ${importErr.message} (${importErr.code})`] }
    }
    console.log('[Import] Import record created:', importRecord.id)

    // 2. Resolve products — fetch all existing products once, then bulk-create missing ones
    onProgress?.({ phase: 'products', current: 0, total: 1 })

    type ProductType = "digital" | "subscription" | "physical"
    const productMap = new Map<string, { name: string; hotmartId: string | null; price: number; type: ProductType }>()
    for (const t of mapped) {
      const key = t.hotmart_product_id || t.product_name
      if (!productMap.has(key)) {
        const billingType = t.billing_type?.toLowerCase() || ''
        productMap.set(key, {
          name: t.product_name,
          hotmartId: t.hotmart_product_id,
          price: t.amount,
          type: (billingType.includes('assinatura') ? 'subscription' : 'digital') as ProductType,
        })
      }
    }

    // Fetch ALL user's products in one call
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, name, hotmart_product_id')
      .eq('user_id', userId)

    const productIdMap = new Map<string, string>()
    const existingByHotmartId = new Map<string, string>()
    const existingByName = new Map<string, string>()

    for (const p of existingProducts || []) {
      if (p.hotmart_product_id) existingByHotmartId.set(p.hotmart_product_id, p.id)
      existingByName.set(p.name, p.id)
    }

    // Match existing products, collect ones to create
    const toCreate: { user_id: string; name: string; hotmart_product_id: string | null; price: number; type: "digital" | "subscription" | "physical"; status: "active" | "inactive" }[] = []
    const createKeys: string[] = []

    for (const [key, info] of productMap) {
      const existingId = (info.hotmartId && existingByHotmartId.get(info.hotmartId)) || existingByName.get(info.name)
      if (existingId) {
        productIdMap.set(key, existingId)
      } else {
        toCreate.push({
          user_id: userId,
          name: info.name,
          hotmart_product_id: info.hotmartId,
          price: info.price || 0,
          type: info.type,
          status: 'active',
        })
        createKeys.push(key)
      }
    }

    // Bulk-create missing products in one INSERT
    if (toCreate.length > 0) {
      console.log('[Import] Creating', toCreate.length, 'products...')
      const { data: newProducts, error: prodErr } = await supabase
        .from('products')
        .insert(toCreate)
        .select('id, name, hotmart_product_id')

      if (prodErr) {
        console.error('[Import] Product creation failed:', prodErr)
        errors.push(`Erro ao criar produtos: ${prodErr.message}`)
      } else if (newProducts) {
        productsCreated = newProducts.length
        for (const np of newProducts) {
          const key = createKeys.find(k => {
            const info = productMap.get(k)
            return info && (info.hotmartId === np.hotmart_product_id || info.name === np.name)
          })
          if (key) productIdMap.set(key, np.id)
        }
        console.log('[Import]', productsCreated, 'products created')
      }
    }

    onProgress?.({ phase: 'products', current: 1, total: 1 })

    // 3. Insert transactions in larger batches (500 rows each)
    const batchSize = 500
    const totalBatches = Math.ceil(mapped.length / batchSize)
    console.log('[Import] Inserting transactions in', totalBatches, 'batches of', batchSize)

    for (let i = 0; i < mapped.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1
      onProgress?.({ phase: 'transactions', current: batchNum, total: totalBatches })

      const batch = mapped.slice(i, i + batchSize)
      const rows = batch
        .filter(t => {
          const key = t.hotmart_product_id || t.product_name
          return productIdMap.has(key)
        })
        .map(t => {
          const key = t.hotmart_product_id || t.product_name
          return {
            user_id: userId,
            product_id: productIdMap.get(key)!,
            buyer_email: t.buyer_email || 'desconhecido@email.com',
            buyer_name: t.buyer_name || 'Desconhecido',
            amount: t.amount,
            net_amount: t.net_amount || t.amount * 0.9,
            status: t.status as 'approved' | 'cancelled' | 'refunded' | 'disputed' | 'pending',
            payment_method: t.payment_method as 'credit_card' | 'boleto' | 'pix' | 'paypal',
            source: t.source as 'organic' | 'affiliate' | 'campaign',
            utm_source: t.utm_source,
            utm_campaign: t.utm_campaign,
            country: t.country || 'BR',
            state: t.state,
            created_at: t.date || new Date().toISOString(),
          }
        })

      if (rows.length > 0) {
        const { error: txErr, data: inserted } = await supabase
          .from('transactions')
          .insert(rows)
          .select('id')

        if (txErr) {
          console.error('[Import] Batch', batchNum, 'failed:', txErr)
          errors.push(`Lote ${batchNum}: ${txErr.message}`)
        } else {
          transactionsCreated += inserted?.length || 0
          console.log('[Import] Batch', batchNum, ':', inserted?.length, 'rows inserted')
        }
      }
    }

    // 4. Finalize import record
    onProgress?.({ phase: 'finalizing', current: 1, total: 1 })

    const finalStatus = errors.length === 0 ? 'completed' : (transactionsCreated > 0 ? 'completed' : 'failed')
    await supabase
      .from('imports')
      .update({
        status: finalStatus,
        row_count: transactionsCreated,
        error_message: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('id', importRecord.id)

    console.log('[Import] Done:', { transactionsCreated, productsCreated, errors: errors.length })

    return { success: transactionsCreated > 0, productsCreated, transactionsCreated, errors }
  } catch (err) {
    console.error('[Import] Unhandled error:', err)
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { success: false, productsCreated: 0, transactionsCreated: 0, errors: [msg] }
  }
}

export async function completeOnboarding(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', userId)

  if (error) {
    console.error('Failed to complete onboarding:', error.message)
    return false
  }
  return true
}

export async function updateOnboardingStep(_userId: string, _step: number): Promise<void> {
  // Step tracking handled locally — only onboarding_completed matters in DB
}

export async function saveGoals(
  userId: string,
  goals: { revenue?: number; sales?: number; refundRate?: number },
): Promise<void> {
  type GoalType = 'revenue' | 'sales' | 'refund_rate' | 'churn_rate'
  type GoalPeriod = 'daily' | 'weekly' | 'monthly'
  const inserts: { user_id: string; type: GoalType; target: number; period: GoalPeriod }[] = []
  if (goals.revenue) inserts.push({ user_id: userId, type: 'revenue', target: goals.revenue, period: 'monthly' })
  if (goals.sales) inserts.push({ user_id: userId, type: 'sales', target: goals.sales, period: 'daily' })
  if (goals.refundRate) inserts.push({ user_id: userId, type: 'refund_rate', target: goals.refundRate, period: 'monthly' })

  if (inserts.length > 0) {
    await supabase.from('goals').insert(inserts).select()
  }
}

export async function updateProfile(
  userId: string,
  data: { full_name?: string; avatar_url?: string },
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)

  return !error
}
