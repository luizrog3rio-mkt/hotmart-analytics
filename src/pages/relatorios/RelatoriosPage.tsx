import { useState, useMemo } from 'react'
import {
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Calendar,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, type Column } from '@/components/data/DataTable'
import {
  getReportConfigs,
  getReportHistory,
  type ReportConfig,
  type ReportHistory,
} from '@/services/marketing-analytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const frequencyLabel: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensal',
  on_demand: 'Sob demanda',
}

const frequencyBadgeVariant: Record<string, BadgeVariant> = {
  daily: 'info',
  weekly: 'default',
  monthly: 'success',
  on_demand: 'warning',
}

const channelConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'text-blue-600 bg-blue-50' },
  telegram: { icon: MessageCircle, label: 'Telegram', color: 'text-sky-600 bg-sky-50' },
  whatsapp: { icon: Phone, label: 'WhatsApp', color: 'text-green-600 bg-green-50' },
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '--'
  const date = new Date(iso)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '--'
  const date = new Date(iso)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        enabled ? 'bg-blue-600' : 'bg-gray-300',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
          enabled ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Report Config Card
// ---------------------------------------------------------------------------

function ReportConfigCard({
  config,
  onToggle,
  onGenerate,
}: {
  config: ReportConfig
  onToggle: () => void
  onGenerate: () => void
}) {
  const channel = channelConfig[config.channel]
  const ChannelIcon = channel?.icon ?? Mail

  return (
    <Card
      className={cn(
        'transition-all duration-200 hover:shadow-md',
        !config.enabled && 'opacity-60',
      )}
    >
      <CardContent className="p-5">
        {/* Top row: name + toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">
                  {config.name}
                </h3>
                <Badge variant={frequencyBadgeVariant[config.frequency]}>
                  {frequencyLabel[config.frequency]}
                </Badge>
              </div>

              {/* Content tags */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {config.content.map(item => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <ToggleSwitch enabled={config.enabled} onToggle={onToggle} />
        </div>

        {/* Bottom row: channel, recipients, dates, action */}
        <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            {/* Channel */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md',
                  channel?.color ?? 'text-gray-500 bg-gray-50',
                )}
              >
                <ChannelIcon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium text-gray-600">
                {channel?.label ?? config.channel}
              </span>
            </div>

            {/* Recipients */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <span className="truncate max-w-[200px]">
                {config.recipients.join(', ')}
              </span>
            </div>

            {/* Last sent */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              <span>Ultimo: {formatDateShort(config.lastSent)}</span>
            </div>

            {/* Next send */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Proximo: {formatDateShort(config.nextSend)}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onGenerate}
            className="shrink-0 gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Gerar Agora
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// History Table columns
// ---------------------------------------------------------------------------

function buildHistoryColumns(): Column<ReportHistory>[] {
  return [
    {
      key: 'reportName',
      header: 'Relatorio',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-gray-900">{row.reportName}</span>
      ),
    },
    {
      key: 'sentAt',
      header: 'Enviado em',
      sortable: true,
      sortValue: (row) => new Date(row.sentAt).getTime(),
      render: (row) => (
        <span className="text-gray-600 text-xs">{formatDateTime(row.sentAt)}</span>
      ),
    },
    {
      key: 'channel',
      header: 'Canal',
      sortable: true,
      render: (row) => {
        const ch = channelConfig[row.channel.toLowerCase()]
        const Icon = ch?.icon ?? Mail
        return (
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md',
                ch?.color ?? 'text-gray-500 bg-gray-50',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm">{row.channel}</span>
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === 'sent' ? 'success' : 'danger'}>
          <span className="flex items-center gap-1">
            {row.status === 'sent' ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            {row.status === 'sent' ? 'Enviado' : 'Falhou'}
          </span>
        </Badge>
      ),
    },
    {
      key: 'highlights',
      header: 'Destaques',
      sortable: false,
      render: (row) => (
        <ul className="space-y-0.5">
          {row.highlights.map((h, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
              {h}
            </li>
          ))}
        </ul>
      ),
    },
  ]
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'configs', label: 'Configuracoes' },
  { id: 'history', label: 'Historico' },
]

export function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState('configs')
  const [configs, setConfigs] = useState<ReportConfig[]>(() => getReportConfigs())

  const history = useMemo(() => getReportHistory(), [])

  const historyColumns = useMemo(() => buildHistoryColumns(), [])

  const handleToggle = (id: string) => {
    setConfigs(prev =>
      prev.map(c => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    )
  }

  const handleGenerate = (_id: string) => {
    // Placeholder for report generation action
  }

  const enabledCount = configs.filter(c => c.enabled).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Relatorios Agendados
          </h2>
          <p className="text-sm text-gray-500">
            {enabledCount} de {configs.length} relatorios ativos
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Send className="h-4 w-4 text-gray-400" />
          Envio automatico por email, Telegram ou WhatsApp
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'configs' && (
        <div
          role="tabpanel"
          id="tabpanel-configs"
          aria-labelledby="tab-configs"
          className="space-y-4"
        >
          {configs.map(config => (
            <ReportConfigCard
              key={config.id}
              config={config}
              onToggle={() => handleToggle(config.id)}
              onGenerate={() => handleGenerate(config.id)}
            />
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div
          role="tabpanel"
          id="tabpanel-history"
          aria-labelledby="tab-history"
        >
          <DataTable<ReportHistory>
            columns={historyColumns}
            data={history}
            rowKey={(row) => row.id}
            searchable
            searchPlaceholder="Buscar relatorios..."
            pageSize={10}
            emptyMessage="Nenhum relatorio enviado ainda."
          />
        </div>
      )}
    </div>
  )
}
