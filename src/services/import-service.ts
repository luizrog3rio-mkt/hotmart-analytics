import { supabase } from '@/lib/supabase'
import type { MappedTransaction } from './csv-parser'

interface ImportResult {
  success: boolean
  productsCreated: number
  transactionsCreated: number
  errors: string[]
}

export async function importTransactionsToSupabase(
  userId: string,
  mapped: MappedTransaction[],
  filename: string,
): Promise<ImportResult> {
  const errors: string[] = []
  let productsCreated = 0
  let transactionsCreated = 0

  try {
    // 1. Create import record
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
      return { success: false, productsCreated: 0, transactionsCreated: 0, errors: [`Erro ao criar registro de importação: ${importErr.message}`] }
    }

    // 2. Extract unique product names and create products
    const uniqueProducts = [...new Set(mapped.map(t => t.product_name).filter(Boolean))]
    const productIdMap = new Map<string, string>()

    for (const productName of uniqueProducts) {
      // Check if product already exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', userId)
        .eq('name', productName)
        .limit(1)
        .single()

      if (existing) {
        productIdMap.set(productName, existing.id)
      } else {
        // Get price from first transaction with this product
        const firstTx = mapped.find(t => t.product_name === productName)
        const { data: newProduct, error: prodErr } = await supabase
          .from('products')
          .insert({
            user_id: userId,
            name: productName,
            price: firstTx?.amount || 0,
            type: 'digital',
            status: 'active',
          })
          .select('id')
          .single()

        if (prodErr) {
          errors.push(`Erro ao criar produto "${productName}": ${prodErr.message}`)
        } else if (newProduct) {
          productIdMap.set(productName, newProduct.id)
          productsCreated++
        }
      }
    }

    // 3. Insert transactions in batches of 50
    const batchSize = 50
    for (let i = 0; i < mapped.length; i += batchSize) {
      const batch = mapped.slice(i, i + batchSize)
      const rows = batch
        .filter(t => productIdMap.has(t.product_name))
        .map(t => ({
          user_id: userId,
          product_id: productIdMap.get(t.product_name)!,
          buyer_email: t.buyer_email || 'desconhecido@email.com',
          buyer_name: t.buyer_name || 'Desconhecido',
          amount: t.amount,
          net_amount: t.net_amount || t.amount * 0.9,
          status: t.status as 'approved' | 'cancelled' | 'refunded' | 'disputed' | 'pending',
          payment_method: t.payment_method as 'credit_card' | 'boleto' | 'pix' | 'paypal',
          source: t.source as 'organic' | 'affiliate' | 'campaign',
          country: t.country || 'BR',
          state: t.state,
          created_at: t.date || new Date().toISOString(),
        }))

      if (rows.length > 0) {
        const { error: txErr, data: inserted } = await supabase
          .from('transactions')
          .insert(rows)
          .select('id')

        if (txErr) {
          errors.push(`Erro no lote ${Math.floor(i / batchSize) + 1}: ${txErr.message}`)
        } else {
          transactionsCreated += inserted?.length || 0
        }
      }
    }

    // 4. Update import record with result
    const finalStatus = errors.length === 0 ? 'completed' : (transactionsCreated > 0 ? 'completed' : 'failed')
    await supabase
      .from('imports')
      .update({
        status: finalStatus,
        row_count: transactionsCreated,
        error_message: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('id', importRecord.id)

    return {
      success: transactionsCreated > 0,
      productsCreated,
      transactionsCreated,
      errors,
    }
  } catch (err) {
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
  if (goals.revenue) inserts.push({ user_id: userId, type: 'revenue' as GoalType, target: goals.revenue, period: 'monthly' as GoalPeriod })
  if (goals.sales) inserts.push({ user_id: userId, type: 'sales' as GoalType, target: goals.sales, period: 'daily' as GoalPeriod })
  if (goals.refundRate) inserts.push({ user_id: userId, type: 'refund_rate' as GoalType, target: goals.refundRate, period: 'monthly' as GoalPeriod })

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
