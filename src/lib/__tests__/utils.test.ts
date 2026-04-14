import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatNumber, formatPercent, formatCompactNumber, getPercentChange } from '@/lib/utils'

describe('formatCurrency', () => {
  it('formata zero como R$ 0,00', () => {
    expect(formatCurrency(0)).toBe('R$\u00a00,00')
  })

  it('formata R$ 100,00 corretamente', () => {
    expect(formatCurrency(100)).toBe('R$\u00a0100,00')
  })

  it('formata valor com centavos R$ 1.000,50', () => {
    expect(formatCurrency(1000.50)).toBe('R$\u00a01.000,50')
  })

  it('formata valor negativo', () => {
    const result = formatCurrency(-50)
    expect(result).toContain('50,00')
    // Deve incluir sinal negativo (formato pode variar por locale)
    expect(result).toMatch(/-/)
  })

  it('formata em USD quando especificado', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toContain('100,00')
    expect(result).toContain('US$')
  })
})

describe('formatNumber', () => {
  it('formata zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('formata 1.000 com separador de milhar', () => {
    expect(formatNumber(1000)).toBe('1.000')
  })

  it('formata 1.000.000 com separadores', () => {
    expect(formatNumber(1000000)).toBe('1.000.000')
  })
})

describe('formatPercent', () => {
  it('formata 0%', () => {
    expect(formatPercent(0)).toBe('0,0%')
  })

  it('formata 50%', () => {
    expect(formatPercent(50)).toBe('50,0%')
  })

  it('formata 100%', () => {
    expect(formatPercent(100)).toBe('100,0%')
  })

  it('formata 33.3333 arredondando para 1 casa', () => {
    expect(formatPercent(33.3333)).toBe('33,3%')
  })
})

describe('formatCompactNumber', () => {
  it('retorna valor como string quando menor que 1000', () => {
    expect(formatCompactNumber(500)).toBe('500')
  })

  it('formata 1500 como 1.5K', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K')
  })

  it('formata 1500000 como 1.5M', () => {
    expect(formatCompactNumber(1500000)).toBe('1.5M')
  })
})

describe('getPercentChange', () => {
  it('retorna 0% quando valores iguais', () => {
    expect(getPercentChange(100, 100)).toBe(0)
  })

  it('retorna 100% de aumento (50 → 100)', () => {
    expect(getPercentChange(100, 50)).toBe(100)
  })

  it('retorna -50% de queda (100 → 50)', () => {
    expect(getPercentChange(50, 100)).toBe(-50)
  })

  it('retorna 100 quando anterior é zero e atual positivo', () => {
    expect(getPercentChange(50, 0)).toBe(100)
  })

  it('retorna 0 quando anterior e atual são zero', () => {
    expect(getPercentChange(0, 0)).toBe(0)
  })
})

describe('cn', () => {
  it('mescla classes simples', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
  })

  it('resolve conflitos de tailwind (último vence)', () => {
    const result = cn('p-2', 'p-4')
    expect(result).toBe('p-4')
  })

  it('lida com valores condicionais', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })

  it('lida com entrada undefined', () => {
    const result = cn('base', undefined, 'extra')
    expect(result).toBe('base extra')
  })
})
