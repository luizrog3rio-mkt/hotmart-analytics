import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterBarProps {
  products: { id: string; name: string }[]
  selectedProducts: string[]
  onProductsChange: (ids: string[]) => void
  selectedStatus: string[]
  onStatusChange: (status: string[]) => void
  selectedPaymentMethods: string[]
  onPaymentMethodsChange: (methods: string[]) => void
  selectedSources: string[]
  onSourcesChange: (sources: string[]) => void
  onClearFilters: () => void
  className?: string
}

interface DropdownOption {
  value: string
  label: string
}

// ---------------------------------------------------------------------------
// Static options
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: DropdownOption[] = [
  { value: 'approved', label: 'Aprovada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'refunded', label: 'Reembolsada' },
  { value: 'disputed', label: 'Em Disputa' },
  { value: 'pending', label: 'Pendente' },
]

const PAYMENT_OPTIONS: DropdownOption[] = [
  { value: 'credit_card', label: 'Cartao' },
  { value: 'pix', label: 'PIX' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'paypal', label: 'PayPal' },
]

const SOURCE_OPTIONS: DropdownOption[] = [
  { value: 'organic', label: 'Organico' },
  { value: 'affiliate', label: 'Afiliado' },
  { value: 'campaign', label: 'Campanha' },
]

// ---------------------------------------------------------------------------
// MultiSelectDropdown
// ---------------------------------------------------------------------------

interface MultiSelectDropdownProps {
  label: string
  options: DropdownOption[]
  selected: string[]
  onChange: (values: string[]) => void
}

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    },
    [],
  )

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const allSelected = selected.length === options.length
  const noneSelected = selected.length === 0

  const handleToggleAll = useCallback(() => {
    if (allSelected) {
      onChange([])
    } else {
      onChange(options.map((o) => o.value))
    }
  }, [allSelected, onChange, options])

  const handleToggle = useCallback(
    (value: string) => {
      if (selected.includes(value)) {
        onChange(selected.filter((v) => v !== value))
      } else {
        onChange([...selected, value])
      }
    },
    [selected, onChange],
  )

  const activeCount = selected.length

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20 text-gray-900'
            : activeCount > 0
              ? 'border-blue-300 text-gray-900 hover:border-blue-400'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50',
        )}
      >
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-gray-400 transition-transform duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1',
            'min-w-[220px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
          )}
        >
          {/* "Todos" toggle */}
          <button
            type="button"
            onClick={handleToggleAll}
            className={cn(
              'flex w-full items-center gap-2.5 px-3 py-2 text-sm',
              'transition-colors duration-100 hover:bg-gray-50',
              allSelected ? 'text-blue-700 font-medium' : 'text-gray-700',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                'transition-colors duration-150',
                allSelected
                  ? 'border-blue-600 bg-blue-600'
                  : noneSelected
                    ? 'border-gray-300 bg-white'
                    : 'border-blue-400 bg-blue-100',
              )}
            >
              {(allSelected || !noneSelected) && (
                <Check className="h-3 w-3 text-white" aria-hidden="true" />
              )}
            </span>
            Todos
          </button>

          <div
            className="mx-2 my-1 border-t border-gray-100"
            aria-hidden="true"
          />

          {/* Option list */}
          {options.map((option) => {
            const isChecked = selected.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleToggle(option.value)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700',
                  'transition-colors duration-100 hover:bg-gray-50',
                  isChecked && 'font-medium text-gray-900',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    'transition-colors duration-150',
                    isChecked
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300 bg-white',
                  )}
                >
                  {isChecked && (
                    <Check
                      className="h-3 w-3 text-white"
                      aria-hidden="true"
                    />
                  )}
                </span>
                {option.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

function FilterBar({
  products,
  selectedProducts,
  onProductsChange,
  selectedStatus,
  onStatusChange,
  selectedPaymentMethods,
  onPaymentMethodsChange,
  selectedSources,
  onSourcesChange,
  onClearFilters,
  className,
}: FilterBarProps) {
  const productOptions = useMemo<DropdownOption[]>(
    () => products.map((p) => ({ value: p.id, label: p.name })),
    [products],
  )

  const totalActiveFilters =
    selectedProducts.length +
    selectedStatus.length +
    selectedPaymentMethods.length +
    selectedSources.length

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <MultiSelectDropdown
          label="Produto"
          options={productOptions}
          selected={selectedProducts}
          onChange={onProductsChange}
        />

        <MultiSelectDropdown
          label="Status"
          options={STATUS_OPTIONS}
          selected={selectedStatus}
          onChange={onStatusChange}
        />

        <MultiSelectDropdown
          label="Pagamento"
          options={PAYMENT_OPTIONS}
          selected={selectedPaymentMethods}
          onChange={onPaymentMethodsChange}
        />

        <MultiSelectDropdown
          label="Origem"
          options={SOURCE_OPTIONS}
          selected={selectedSources}
          onChange={onSourcesChange}
        />

        {/* Clear filters */}
        {totalActiveFilters > 0 && (
          <>
            <div className="h-6 w-px bg-gray-200" aria-hidden="true" />
            <button
              type="button"
              onClick={onClearFilters}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600',
                'transition-colors duration-150',
                'hover:bg-red-50 active:bg-red-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Limpar filtros
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700">
                {totalActiveFilters}
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

FilterBar.displayName = 'FilterBar'

export { FilterBar }
export type { FilterBarProps }
