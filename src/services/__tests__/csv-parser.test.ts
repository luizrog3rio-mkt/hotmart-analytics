import { describe, it, expect } from 'vitest'
import { parseFile, mapToTransactions } from '@/services/csv-parser'

// Helper: cria um File a partir de string CSV
function createCSVFile(content: string, name = 'test.csv'): File {
  const blob = new Blob([content], { type: 'text/csv' })
  return new File([blob], name, { type: 'text/csv' })
}

describe('parseFile', () => {
  it('faz parse de CSV com headers em portugues', async () => {
    const csv = `Produto,Valor,Status,Forma de Pagamento,Email,Data
Curso A,297,Aprovada,Cartão de Crédito,joao@test.com,2026-04-01
Curso B,497,Aprovada,PIX,maria@test.com,2026-04-02
Curso A,297,Reembolsada,Boleto,pedro@test.com,2026-04-03`

    const file = createCSVFile(csv)
    const result = await parseFile(file)

    expect(result.rowCount).toBe(3)
    expect(result.errors.length).toBe(0)
    expect(result.headers).toContain('product_name') // "Produto" mapeado
    expect(result.headers).toContain('amount')       // "Valor" mapeado
    expect(result.headers).toContain('status')       // "Status" mapeado
  })

  it('faz parse de CSV com headers em ingles', async () => {
    const csv = `Product Name,Amount,Status,Payment Method,Buyer Email,Date
Course A,297,approved,credit_card,joao@test.com,2026-04-01
Course B,497,approved,pix,maria@test.com,2026-04-02`

    const file = createCSVFile(csv)
    const result = await parseFile(file)

    expect(result.rowCount).toBe(2)
    expect(result.headers).toContain('product_name')
    expect(result.headers).toContain('amount')
  })

  it('retorna erro para formato desconhecido', async () => {
    const blob = new Blob(['random data'], { type: 'application/pdf' })
    const file = new File([blob], 'data.pdf', { type: 'application/pdf' })
    const result = await parseFile(file)

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('Formato não suportado')
    expect(result.data.length).toBe(0)
  })

  it('lida com CSV vazio graciosamente', async () => {
    const csv = `Produto,Valor,Status`
    const file = createCSVFile(csv)
    const result = await parseFile(file)

    expect(result.rowCount).toBe(0)
    expect(result.errors.length).toBe(0)
  })

  it('mapeia colunas alternativas (Preço, E-mail do Comprador)', async () => {
    const csv = `Preço,E-mail do Comprador,Status da Transação,Nome do Produto
297,joao@test.com,Aprovada,Curso X`

    const file = createCSVFile(csv)
    const result = await parseFile(file)

    expect(result.headers).toContain('amount')
    expect(result.headers).toContain('buyer_email')
    expect(result.headers).toContain('status')
    expect(result.headers).toContain('product_name')
  })
})

describe('mapToTransactions + normalizeStatus', () => {
  it('normaliza "aprovada" para "approved"', async () => {
    const csv = `Produto,Valor,Status,Email
Curso A,297,Aprovada,joao@test.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(mapped[0].status).toBe('approved')
  })

  it('normaliza "reembolsada" para "refunded"', async () => {
    const csv = `Produto,Valor,Status,Email
Curso A,297,Reembolsada,joao@test.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(mapped[0].status).toBe('refunded')
  })

  it('normaliza "cancelada" para "cancelled"', async () => {
    const csv = `Produto,Valor,Status,Email
Curso A,297,Cancelada,joao@test.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(mapped[0].status).toBe('cancelled')
  })

  it('normaliza "disputada" para "disputed"', async () => {
    const csv = `Produto,Valor,Status,Email
Curso A,297,Disputada,joao@test.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(mapped[0].status).toBe('disputed')
  })

  it('normaliza status reais da Hotmart (masculino e feminino)', async () => {
    const csv = `Produto,Valor,Status,Email
A,100,Aprovado,a@t.com
B,100,Aprovada,b@t.com
C,100,Completa,c@t.com
D,100,Reembolsado,d@t.com
E,100,Cancelado,e@t.com
F,100,Expirada,f@t.com
G,100,Chargeback,g@t.com
H,100,Reclamado,h@t.com
I,100,Atrasado,i@t.com
J,100,Aguardando pagamento,j@t.com
K,100,Em Análise,k@t.com
L,100,Boleto Gerado,l@t.com
M,100,Iniciada,m@t.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(mapped[0].status).toBe('approved')  // Aprovado
    expect(mapped[1].status).toBe('approved')  // Aprovada
    expect(mapped[2].status).toBe('approved')  // Completa (passou da garantia)
    expect(mapped[3].status).toBe('refunded')  // Reembolsado
    expect(mapped[4].status).toBe('cancelled') // Cancelado
    expect(mapped[5].status).toBe('cancelled') // Expirada
    expect(mapped[6].status).toBe('disputed')  // Chargeback
    expect(mapped[7].status).toBe('disputed')  // Reclamado
    expect(mapped[8].status).toBe('pending')   // Atrasado
    expect(mapped[9].status).toBe('pending')   // Aguardando
    expect(mapped[10].status).toBe('pending')  // Em Análise
    expect(mapped[11].status).toBe('pending')  // Boleto Gerado
    expect(mapped[12].status).toBe('pending')  // Iniciada
  })

  it('status desconhecido vira "pending"', async () => {
    const csv = `Produto,Valor,Status,Email
Curso A,297,Processando,joao@test.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(mapped[0].status).toBe('pending')
  })

  it('normaliza metodo de pagamento corretamente', async () => {
    const csv = `Produto,Valor,Status,Forma de Pagamento,Email
A,100,Aprovada,Cartão de Crédito,a@t.com
B,200,Aprovada,PIX,b@t.com
C,300,Aprovada,Boleto Bancário,c@t.com
D,400,Aprovada,PayPal,d@t.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(mapped[0].payment_method).toBe('credit_card')
    expect(mapped[1].payment_method).toBe('pix')
    expect(mapped[2].payment_method).toBe('boleto')
    expect(mapped[3].payment_method).toBe('paypal')
  })

  it('mapeia amount como numero', async () => {
    const csv = `Produto,Valor,Status,Email
Curso A,297.50,Aprovada,a@t.com`

    const file = createCSVFile(csv)
    const parsed = await parseFile(file)
    const mapped = mapToTransactions(parsed)

    expect(typeof mapped[0].amount).toBe('number')
    expect(mapped[0].amount).toBe(297.5)
  })
})
