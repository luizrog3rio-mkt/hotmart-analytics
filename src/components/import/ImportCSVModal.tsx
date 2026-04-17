import { useState, useCallback, useRef, type DragEvent } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { parseFile, mapToTransactions, type ParseResult, type MappedTransaction } from '@/services/csv-parser'
import { importTransactionsToSupabase } from '@/services/import-service'
import { formatNumber } from '@/lib/utils'

type Step = 'upload' | 'preview' | 'importing' | 'done'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function ImportCSVModal({ open, onClose, onImported }: Props) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [mapped, setMapped] = useState<MappedTransaction[]>([])
  const [importResult, setImportResult] = useState<{
    success: boolean
    productsCreated: number
    transactionsCreated: number
    errors: string[]
  } | null>(null)

  // -- Reset ------------------------------------------------------------------

  const reset = useCallback(() => {
    setStep('upload')
    setDragOver(false)
    setFileName('')
    setParseResult(null)
    setMapped([])
    setImportResult(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  // -- File handling ----------------------------------------------------------

  const processFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls', 'txt'].includes(ext || '')) {
      toast.error('Formato não suportado. Use CSV ou Excel.')
      return
    }

    setFileName(file.name)

    try {
      const result = await parseFile(file)

      if (result.rowCount === 0) {
        toast.error('Arquivo vazio ou sem dados válidos.')
        return
      }

      const transactions = mapToTransactions(result)
      setParseResult(result)
      setMapped(transactions)
      setStep('preview')
    } catch {
      toast.error('Erro ao processar o arquivo.')
    }
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) processFile(file)
      // reset input so same file can be re-selected
      e.target.value = ''
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) processFile(file)
    },
    [processFile],
  )

  // -- Import -----------------------------------------------------------------

  const handleImport = useCallback(async () => {
    if (!user || mapped.length === 0) {
      toast.error('Sessão expirada. Faça login novamente.')
      return
    }

    setStep('importing')

    try {
      // Verify Supabase session is alive
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        toast.error('Sessão expirada. Faça login novamente.')
        setImportResult({ success: false, productsCreated: 0, transactionsCreated: 0, errors: ['Sessão do Supabase não encontrada. Faça login novamente.'] })
        setStep('done')
        return
      }
      console.log('[Import] Session OK, user:', sessionData.session.user.id)

      const result = await importTransactionsToSupabase(user.id, mapped, fileName, (p) => {
        console.log('[Import] Progress:', p.phase, p.current, '/', p.total)
      })

      setImportResult(result)
      setStep('done')

      if (result.success) {
        toast.success(`${formatNumber(result.transactionsCreated)} transações importadas!`)
        onImported()
      } else {
        toast.error(`Erro: ${result.errors[0] || 'Falha desconhecida'}`)
      }
    } catch (err) {
      console.error('[Import] Unhandled error:', err)
      const msg = err instanceof Error ? err.message : 'Erro inesperado'
      setImportResult({ success: false, productsCreated: 0, transactionsCreated: 0, errors: [msg] })
      setStep('done')
      toast.error(`Erro inesperado: ${msg}`)
    }
  }, [user, mapped, fileName, onImported])

  // -- Preview stats ----------------------------------------------------------

  const stats = mapped.length > 0
    ? {
        total: mapped.length,
        approved: mapped.filter(t => t.status === 'approved').length,
        pending: mapped.filter(t => t.status === 'pending').length,
        refunded: mapped.filter(t => t.status === 'refunded' || t.status === 'disputed').length,
        cancelled: mapped.filter(t => t.status === 'cancelled').length,
        products: new Set(mapped.map(t => t.product_name)).size,
      }
    : null

  // -- Render -----------------------------------------------------------------

  return (
    <Modal open={open} onClose={handleClose} title="Importar CSV da Hotmart" size="lg">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* STEP: Upload */}
      {step === 'upload' && (
        <div
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
              : 'border-gray-300 dark:border-slate-600'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="mb-4 h-10 w-10 text-gray-400" />
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Arraste o arquivo CSV da Hotmart aqui
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            ou clique para selecionar (.csv, .xlsx)
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => fileRef.current?.click()}
          >
            Selecionar arquivo
          </Button>
        </div>
      )}

      {/* STEP: Preview */}
      {step === 'preview' && stats && (
        <div className="space-y-5">
          {/* File info */}
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-slate-800 px-4 py-3">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{fileName}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {formatNumber(stats.total)} linhas encontradas
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-center">
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatNumber(stats.approved)}</p>
              <p className="text-xs text-green-600 dark:text-green-500">Aprovadas</p>
            </div>
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 p-3 text-center">
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{formatNumber(stats.pending)}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">Pendentes</p>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-3 text-center">
              <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{formatNumber(stats.refunded)}</p>
              <p className="text-xs text-orange-600 dark:text-orange-500">Reembolsadas</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-center">
              <p className="text-lg font-bold text-red-700 dark:text-red-400">{formatNumber(stats.cancelled)}</p>
              <p className="text-xs text-red-600 dark:text-red-500">Canceladas</p>
            </div>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{stats.products}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">Produtos</p>
            </div>
          </div>

          {/* Sample rows */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-gray-500 dark:text-slate-400">
              Primeiras transações
            </p>
            <div className="max-h-48 overflow-auto rounded-lg border border-gray-200 dark:border-slate-600">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Produto</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-slate-400">Comprador</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-slate-400">Valor</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {mapped.slice(0, 8).map((t, i) => (
                    <tr key={i}>
                      <td className="max-w-[180px] truncate px-3 py-2 text-gray-700 dark:text-slate-300">
                        {t.product_name}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-gray-600 dark:text-slate-400">
                        {t.buyer_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900 dark:text-white">
                        R$ {t.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant={
                            t.status === 'approved' ? 'success' :
                            t.status === 'cancelled' ? 'danger' :
                            t.status === 'refunded' || t.status === 'disputed' ? 'danger' : 'warning'
                          }
                        >
                          {t.status === 'approved' ? 'Aprovada' :
                           t.status === 'cancelled' ? 'Cancelada' :
                           t.status === 'refunded' ? 'Reembolsada' :
                           t.status === 'disputed' ? 'Disputada' :
                           t.status === 'pending' ? 'Pendente' : t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Parse errors */}
          {parseResult && parseResult.errors.length > 0 && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 p-3">
              <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                {parseResult.errors.length} aviso(s) durante o parsing
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={reset} className="flex-1">
              Trocar arquivo
            </Button>
            <Button onClick={handleImport} className="flex-1">
              <Upload className="h-4 w-4" />
              Importar {formatNumber(stats.total)} transações
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Importing */}
      {step === 'importing' && (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
            Importando transações...
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
            Isso pode levar alguns segundos
          </p>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && importResult && (
        <div className="space-y-5">
          <div className="flex flex-col items-center py-6">
            {importResult.success ? (
              <CheckCircle2 className="mb-3 h-12 w-12 text-green-500" />
            ) : (
              <AlertCircle className="mb-3 h-12 w-12 text-red-500" />
            )}
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {importResult.success ? 'Importação concluída!' : 'Erro na importação'}
            </p>
          </div>

          {importResult.success && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-center">
                <p className="text-xl font-bold text-green-700 dark:text-green-400">
                  {formatNumber(importResult.transactionsCreated)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-500">Transações importadas</p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3 text-center">
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {formatNumber(importResult.productsCreated)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-500">Produtos novos</p>
              </div>
            </div>
          )}

          {importResult.errors.length > 0 && (
            <div className="max-h-32 overflow-auto rounded-lg bg-red-50 dark:bg-red-950/20 p-3">
              <p className="mb-1 text-xs font-medium text-red-700 dark:text-red-400">Erros:</p>
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-500">{err}</p>
              ))}
            </div>
          )}

          <Button onClick={handleClose} className="w-full">
            Fechar
          </Button>
        </div>
      )}
    </Modal>
  )
}
