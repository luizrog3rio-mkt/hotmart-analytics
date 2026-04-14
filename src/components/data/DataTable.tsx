import { useState, useMemo, useCallback, type ReactNode } from 'react'
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Inbox,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  sortable?: boolean
  sortValue?: (row: T) => string | number
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  pageSize?: number
  exportable?: boolean
  onExport?: (format: 'csv' | 'xlsx') => void
  className?: string
  rowKey?: (row: T) => string
}

type SortDirection = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

// ---------------------------------------------------------------------------
// Skeleton row
// ---------------------------------------------------------------------------

function SkeletonRow<T>({ columns }: { columns: Column<T>[] }) {
  return (
    <tr className="animate-pulse">
      {columns.map((col) => (
        <td key={col.key} className="px-4 py-3.5">
          <div
            className="h-4 rounded bg-gray-200"
            style={{ width: col.width ?? '75%' }}
          />
        </td>
      ))}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Page number builder
// ---------------------------------------------------------------------------

function buildPageNumbers(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | 'ellipsis')[] = [1]

  if (current > 3) pages.push('ellipsis')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('ellipsis')

  pages.push(total)
  return pages
}

// ---------------------------------------------------------------------------
// Sort icon
// ---------------------------------------------------------------------------

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection | null }) {
  if (!active || !direction) {
    return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-300" />
  }
  if (direction === 'asc') {
    return <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
  }
  return <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum resultado encontrado.',
  searchable = false,
  searchPlaceholder = 'Buscar...',
  onSearch,
  pageSize = 10,
  exportable = false,
  onExport,
  className,
  rowKey,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDirection | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when data changes
  const dataLength = data.length
  useMemo(() => {
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLength, searchQuery])

  // -- Search handler -----------------------------------------------------
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      onSearch?.(value)
    },
    [onSearch],
  )

  // -- Sort handler -------------------------------------------------------
  const handleSort = useCallback((key: string) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((prevDir) => {
          if (prevDir === 'asc') return 'desc'
          // If desc, clear sort
          setSortKey(null)
          return null
        })
        return key
      }
      setSortDir('asc')
      return key
    })
    setCurrentPage(1)
  }, [])

  // -- Sorted data --------------------------------------------------------
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data

    const col = columns.find((c) => c.key === sortKey)
    if (!col) return data

    return [...data].sort((a, b) => {
      let aVal: unknown
      let bVal: unknown

      if (col.sortValue) {
        aVal = col.sortValue(a)
        bVal = col.sortValue(b)
      } else {
        aVal = getNestedValue(a, sortKey)
        bVal = getNestedValue(b, sortKey)
      }

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      let comparison: number
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else {
        comparison = String(aVal).localeCompare(String(bVal), 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        })
      }

      return sortDir === 'asc' ? comparison : -comparison
    })
  }, [data, sortKey, sortDir, columns])

  // -- Pagination ---------------------------------------------------------
  const totalItems = sortedData.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, safePage, pageSize])

  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, totalItems)
  const pageNumbers = buildPageNumbers(safePage, totalPages)

  const showToolbar = searchable || exportable

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden',
        className,
      )}
    >
      {/* Toolbar --------------------------------------------------------- */}
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          {searchable ? (
            <div className="relative min-w-[240px] max-w-sm flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  'block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900',
                  'placeholder:text-gray-400',
                  'transition-colors duration-150',
                  'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                )}
              />
            </div>
          ) : (
            <div />
          )}

          {exportable && onExport && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onExport('csv')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700',
                  'transition-colors duration-150',
                  'hover:bg-gray-50 active:bg-gray-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                )}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => onExport('xlsx')}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700',
                  'transition-colors duration-150',
                  'hover:bg-gray-50 active:bg-gray-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                )}
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                Excel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table ------------------------------------------------------------ */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
            <tr className="border-b border-gray-200">
              {columns.map((col) => {
                const isSorted = sortKey === col.key
                const direction = isSorted ? sortDir : null

                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500',
                      ALIGN_CLASS[col.align ?? 'left'],
                      col.sortable !== false &&
                        'cursor-pointer select-none hover:text-gray-700',
                      col.className,
                    )}
                    onClick={
                      col.sortable !== false
                        ? () => handleSort(col.key)
                        : undefined
                    }
                    aria-sort={
                      isSorted
                        ? direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable !== false && (
                        <SortIcon active={isSorted} direction={direction} />
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* Loading */}
            {loading &&
              Array.from({ length: pageSize }, (_, i) => (
                <SkeletonRow key={`skeleton-${i}`} columns={columns} />
              ))}

            {/* Empty */}
            {!loading && paginatedData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-10 w-10" aria-hidden="true" />
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Rows */}
            {!loading &&
              paginatedData.map((row, idx) => (
                <tr
                  key={rowKey ? rowKey(row) : idx}
                  className="transition-colors duration-100 hover:bg-gray-50/70"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3.5 text-sm text-gray-700',
                        ALIGN_CLASS[col.align ?? 'left'],
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(getNestedValue(row, col.key) ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination ------------------------------------------------------- */}
      {!loading && totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">
            Mostrando{' '}
            <span className="font-medium text-gray-700">{rangeStart}</span>
            {' - '}
            <span className="font-medium text-gray-700">{rangeEnd}</span>
            {' de '}
            <span className="font-medium text-gray-700">{totalItems}</span>
            {' resultados'}
          </p>

          <nav className="flex items-center gap-1" aria-label="Paginacao">
            {/* Previous */}
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm',
                'transition-colors duration-150',
                'hover:bg-gray-100 active:bg-gray-200',
                'disabled:pointer-events-none disabled:opacity-40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              )}
              aria-label="Pagina anterior"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            {/* Page numbers */}
            {pageNumbers.map((page, i) =>
              page === 'ellipsis' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="inline-flex h-8 w-8 items-center justify-center text-sm text-gray-400"
                >
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                    page === safePage
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
                  )}
                  aria-label={`Pagina ${page}`}
                  aria-current={page === safePage ? 'page' : undefined}
                >
                  {page}
                </button>
              ),
            )}

            {/* Next */}
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm',
                'transition-colors duration-150',
                'hover:bg-gray-100 active:bg-gray-200',
                'disabled:pointer-events-none disabled:opacity-40',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              )}
              aria-label="Proxima pagina"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}

DataTable.displayName = 'DataTable'

export { DataTable }
export type { DataTableProps }
