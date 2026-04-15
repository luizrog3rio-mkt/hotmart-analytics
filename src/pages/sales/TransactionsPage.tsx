import { useState, useMemo, useCallback } from 'react'
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react'
import { useData } from '@/hooks/useData'
import type { DemoTransaction } from '@/services/demo-data'
import { filterTransactions } from '@/services/metrics'
import type { DateRange } from '@/types'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils'
import { DateRangePicker } from '@/components/filters/DateRangePicker'
import { FilterBar } from '@/components/filters/FilterBar'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ImportCSVModal } from '@/components/import/ImportCSVModal'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE_MAP: Record<string, BadgeVariant> = {
  approved: 'success',
  pending: 'warning',
  refunded: 'danger',
  cancelled: 'danger',
  disputed: 'warning',
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovado',
  pending: 'Pendente',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
  disputed: 'Disputado',
}

const PAYMENT_LABELS: Record<string, string> = {
  credit_card: 'Cartao de Credito',
  pix: 'PIX',
  boleto: 'Boleto',
  paypal: 'PayPal',
}

const SOURCE_LABELS: Record<string, string> = {
  organic: 'Organico',
  affiliate: 'Afiliado',
  campaign: 'Campanha',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransactionsPage() {
  const { data, refetch } = useData()
  const [importOpen, setImportOpen] = useState(false)

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  })

  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  // -- Filtered transactions ------------------------------------------------

  const filteredTransactions = useMemo(
    () =>
      filterTransactions(data.transactions, dateRange, {
        products: selectedProducts,
        status: selectedStatus,
        paymentMethods: selectedPaymentMethods,
        sources: selectedSources,
      }),
    [data.transactions, dateRange, selectedProducts, selectedStatus, selectedPaymentMethods, selectedSources],
  )

  // -- Summary metrics ------------------------------------------------------

  const summary = useMemo(() => {
    const approved = filteredTransactions.filter((t) => t.status === 'approved')
    const refunded = filteredTransactions.filter((t) => t.status === 'refunded')
    const totalApproved = approved.reduce((s, t) => s + t.amount, 0)
    const avgTicket = approved.length > 0 ? totalApproved / approved.length : 0
    const refundRate =
      filteredTransactions.length > 0
        ? (refunded.length / filteredTransactions.length) * 100
        : 0

    return {
      totalApproved,
      totalTransactions: filteredTransactions.length,
      avgTicket,
      refundRate,
    }
  }, [filteredTransactions])

  // -- Table columns --------------------------------------------------------

  const columns: Column<DemoTransaction>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'Data',
        sortable: true,
        sortValue: (row: DemoTransaction) => row.created_at,
        render: (row: DemoTransaction) => (
          <span className="whitespace-nowrap text-gray-600">
            {format(parseISO(row.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
          </span>
        ),
      },
      {
        key: 'buyer',
        header: 'Comprador',
        sortable: false,
        render: (row: DemoTransaction) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{row.buyer_name}</p>
            <p className="truncate text-xs text-gray-400">{row.buyer_email}</p>
          </div>
        ),
        className: 'max-w-[200px]',
      },
      {
        key: 'product',
        header: 'Produto',
        sortable: false,
        render: (row: DemoTransaction) => (
          <span className="truncate text-gray-700">{row.product_name}</span>
        ),
        className: 'max-w-[220px]',
      },
      {
        key: 'amount',
        header: 'Valor',
        sortable: true,
        sortValue: (row: DemoTransaction) => row.amount,
        render: (row: DemoTransaction) => (
          <span className="whitespace-nowrap font-medium text-gray-900">
            {formatCurrency(row.amount)}
          </span>
        ),
        align: 'right' as const,
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (row: DemoTransaction) => row.status,
        render: (row: DemoTransaction) => (
          <Badge variant={STATUS_BADGE_MAP[row.status] ?? 'default'}>
            {STATUS_LABELS[row.status] ?? row.status}
          </Badge>
        ),
      },
      {
        key: 'payment_method',
        header: 'Pagamento',
        sortable: false,
        render: (row: DemoTransaction) => (
          <span className="whitespace-nowrap text-gray-600">
            {PAYMENT_LABELS[row.payment_method] ?? row.payment_method}
          </span>
        ),
      },
      {
        key: 'source',
        header: 'Origem',
        sortable: false,
        render: (row: DemoTransaction) => (
          <span className="whitespace-nowrap text-gray-600">
            {SOURCE_LABELS[row.source] ?? row.source}
          </span>
        ),
      },
    ],
    [],
  )

  // -- Handlers -------------------------------------------------------------

  const handleClearFilters = useCallback(() => {
    setSelectedProducts([])
    setSelectedStatus([])
    setSelectedPaymentMethods([])
    setSelectedSources([])
  }, [])

  const handleExport = useCallback(() => {
    const header = 'Data,Comprador,Email,Produto,Valor,Status,Pagamento,Origem\n'
    const rows = filteredTransactions
      .map(
        (t) =>
          `${t.created_at},${t.buyer_name},${t.buyer_email},${t.product_name},${t.amount},${t.status},${t.payment_method},${t.source}`,
      )
      .join('\n')

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transacoes-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [filteredTransactions])

  // -- Render ---------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateRangePicker value={dateRange} onChange={setDateRange} />

        <div className="flex gap-2">
          <Button size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        products={data.products.map((p) => ({ id: p.id, name: p.name }))}
        selectedProducts={selectedProducts}
        onProductsChange={setSelectedProducts}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedPaymentMethods={selectedPaymentMethods}
        onPaymentMethodsChange={setSelectedPaymentMethods}
        selectedSources={selectedSources}
        onSourcesChange={setSelectedSources}
        onClearFilters={handleClearFilters}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Total Aprovado
              </p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">
                {formatCurrency(summary.totalApproved)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Total Transacoes
              </p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">
                {formatNumber(summary.totalTransactions)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50">
              <Receipt className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Ticket Medio
              </p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">
                {formatCurrency(summary.avgTicket)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
              <RotateCcw className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Taxa de Reembolso
              </p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">
                {formatPercent(summary.refundRate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data table */}
      <DataTable<DemoTransaction>
        columns={columns}
        data={filteredTransactions}
        rowKey={(row) => row.id}
        pageSize={15}
        emptyMessage="Nenhuma transacao encontrada para os filtros selecionados."
      />

      {/* Import modal */}
      <ImportCSVModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={refetch}
      />
    </div>
  )
}
