import { useState } from 'react'
import {
  Bell,
  Mail,
  MessageCircle,
  Phone,
  Zap,
  Target,
  AlertTriangle,
  TrendingDown,
  UserMinus,
  Megaphone,
  Star,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Frequency = 'real-time' | 'daily' | 'weekly'
type Severity = 'info' | 'success' | 'warning' | 'danger'
type Channel = 'email' | 'telegram' | 'whatsapp'

interface AlertConfig {
  id: string
  name: string
  description: string
  frequency: Frequency
  severity: Severity
  enabled: boolean
  threshold: number
  thresholdLabel: string
  channels: Channel[]
  icon: React.ReactNode
}

interface AlertHistoryItem {
  id: string
  alertName: string
  message: string
  timestamp: string
  type: Severity
  status: 'sent' | 'failed' | 'pending'
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const initialAlerts: AlertConfig[] = [
  {
    id: 'venda-realizada',
    name: 'Venda realizada',
    description: 'Notificação imediata quando uma nova venda é confirmada.',
    frequency: 'real-time',
    severity: 'success',
    enabled: true,
    threshold: 1,
    thresholdLabel: 'vendas',
    channels: ['email', 'telegram'],
    icon: <Zap size={20} />,
  },
  {
    id: 'meta-batida',
    name: 'Meta batida',
    description: 'Alerta quando a meta de vendas diária/mensal é atingida.',
    frequency: 'real-time',
    severity: 'success',
    enabled: true,
    threshold: 100,
    thresholdLabel: '% da meta',
    channels: ['email', 'telegram', 'whatsapp'],
    icon: <Target size={20} />,
  },
  {
    id: 'pico-reembolso',
    name: 'Pico de reembolso',
    description: 'Alerta quando a taxa de reembolso ultrapassa o limite definido.',
    frequency: 'daily',
    severity: 'danger',
    enabled: true,
    threshold: 5,
    thresholdLabel: '% de reembolso',
    channels: ['email'],
    icon: <AlertTriangle size={20} />,
  },
  {
    id: 'queda-conversao',
    name: 'Queda de conversão',
    description: 'Detecta quedas significativas na taxa de conversão.',
    frequency: 'daily',
    severity: 'warning',
    enabled: false,
    threshold: 20,
    thresholdLabel: '% de queda',
    channels: ['email'],
    icon: <TrendingDown size={20} />,
  },
  {
    id: 'churn-elevado',
    name: 'Churn elevado',
    description: 'Alerta semanal quando o churn excede o limite configurado.',
    frequency: 'weekly',
    severity: 'danger',
    enabled: false,
    threshold: 10,
    thresholdLabel: '% de churn',
    channels: ['email'],
    icon: <UserMinus size={20} />,
  },
  {
    id: 'campanha-ineficiente',
    name: 'Campanha ineficiente',
    description: 'Identifica campanhas com ROI abaixo do esperado.',
    frequency: 'daily',
    severity: 'warning',
    enabled: false,
    threshold: 50,
    thresholdLabel: '% ROI mínimo',
    channels: ['email', 'telegram'],
    icon: <Megaphone size={20} />,
  },
  {
    id: 'afiliado-destaque',
    name: 'Afiliado em destaque',
    description: 'Notifica quando um afiliado atinge performance excepcional.',
    frequency: 'weekly',
    severity: 'info',
    enabled: true,
    threshold: 10,
    thresholdLabel: 'vendas na semana',
    channels: ['email'],
    icon: <Star size={20} />,
  },
  {
    id: 'previsao-receita',
    name: 'Previsão de receita',
    description: 'Resumo semanal com projeção de receita e tendências.',
    frequency: 'weekly',
    severity: 'info',
    enabled: true,
    threshold: 80,
    thresholdLabel: '% confiança mínima',
    channels: ['email'],
    icon: <DollarSign size={20} />,
  },
]

const simulatedHistory: AlertHistoryItem[] = [
  {
    id: '1',
    alertName: 'Venda realizada',
    message: 'Nova venda confirmada: Curso Avançado de Marketing Digital - R$ 497,00',
    timestamp: '2026-04-14T10:32:00',
    type: 'success',
    status: 'sent',
  },
  {
    id: '2',
    alertName: 'Meta batida',
    message: 'Meta diária atingida! 120% da meta de vendas alcançada.',
    timestamp: '2026-04-14T09:15:00',
    type: 'success',
    status: 'sent',
  },
  {
    id: '3',
    alertName: 'Pico de reembolso',
    message: 'Taxa de reembolso atingiu 7.2% nas últimas 24h (limite: 5%).',
    timestamp: '2026-04-13T18:00:00',
    type: 'danger',
    status: 'sent',
  },
  {
    id: '4',
    alertName: 'Afiliado em destaque',
    message: 'Afiliado "João Silva" realizou 15 vendas esta semana.',
    timestamp: '2026-04-13T08:00:00',
    type: 'info',
    status: 'sent',
  },
  {
    id: '5',
    alertName: 'Previsão de receita',
    message: 'Projeção semanal: R$ 45.200 com 92% de confiança.',
    timestamp: '2026-04-12T07:00:00',
    type: 'info',
    status: 'sent',
  },
  {
    id: '6',
    alertName: 'Queda de conversão',
    message: 'Tentativa de envio falhou. Canal Telegram indisponível.',
    timestamp: '2026-04-11T14:30:00',
    type: 'warning',
    status: 'failed',
  },
  {
    id: '7',
    alertName: 'Campanha ineficiente',
    message: 'Campanha "Black Friday Antecipada" com ROI de 32% (abaixo de 50%).',
    timestamp: '2026-04-11T08:00:00',
    type: 'warning',
    status: 'pending',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const frequencyLabels: Record<Frequency, string> = {
  'real-time': 'Real-time',
  daily: 'Diário',
  weekly: 'Semanal',
}

const frequencyVariants: Record<Frequency, 'info' | 'warning' | 'default'> = {
  'real-time': 'info',
  daily: 'warning',
  weekly: 'default',
}

const severityColors: Record<Severity, string> = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
}

const channelIcons: Record<Channel, { icon: React.ReactNode; label: string }> = {
  email: { icon: <Mail size={14} />, label: 'Email' },
  telegram: { icon: <MessageCircle size={14} />, label: 'Telegram' },
  whatsapp: { icon: <Phone size={14} />, label: 'WhatsApp' },
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  sent: {
    icon: <CheckCircle2 size={14} />,
    label: 'Enviado',
    className: 'text-green-600 dark:text-green-400',
  },
  failed: {
    icon: <XCircle size={14} />,
    label: 'Falhou',
    className: 'text-red-600 dark:text-red-400',
  },
  pending: {
    icon: <Clock size={14} />,
    label: 'Pendente',
    className: 'text-yellow-600 dark:text-yellow-400',
  },
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Sub-components
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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600',
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

function ChannelSelector({
  selected,
  onChange,
}: {
  selected: Channel[]
  onChange: (channels: Channel[]) => void
}) {
  const toggle = (channel: Channel) => {
    if (selected.includes(channel)) {
      onChange(selected.filter((c) => c !== channel))
    } else {
      onChange([...selected, channel])
    }
  }

  return (
    <div className="flex gap-1.5">
      {(Object.keys(channelIcons) as Channel[]).map((channel) => {
        const isActive = selected.includes(channel)
        const { icon, label } = channelIcons[channel]
        return (
          <Button
            key={channel}
            type="button"
            variant={isActive ? 'primary' : 'outline'}
            size="sm"
            onClick={() => toggle(channel)}
            className={cn(
              'gap-1 text-xs',
              !isActive && 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
            )}
            aria-label={label}
            aria-pressed={isActive}
          >
            {icon}
            {label}
          </Button>
        )
      })}
    </div>
  )
}

function AlertCard({
  alert,
  onUpdate,
}: {
  alert: AlertConfig
  onUpdate: (updated: AlertConfig) => void
}) {
  return (
    <Card
      className={cn(
        'transition-opacity duration-200 dark:border-gray-700 dark:bg-gray-800',
        !alert.enabled && 'opacity-60',
      )}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                alert.severity === 'success' && 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                alert.severity === 'danger' && 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                alert.severity === 'warning' && 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
                alert.severity === 'info' && 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
              )}
            >
              {alert.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {alert.name}
                </h3>
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    severityColors[alert.severity],
                  )}
                  aria-label={`Severidade: ${alert.severity}`}
                />
                <Badge variant={frequencyVariants[alert.frequency]}>
                  {frequencyLabels[alert.frequency]}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {alert.description}
              </p>
            </div>
          </div>

          {/* Right: toggle */}
          <div className="shrink-0 self-start">
            <ToggleSwitch
              enabled={alert.enabled}
              onToggle={() => onUpdate({ ...alert, enabled: !alert.enabled })}
            />
          </div>
        </div>

        {/* Config row */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6">
          {/* Threshold */}
          <div className="flex items-center gap-2">
            <label
              htmlFor={`threshold-${alert.id}`}
              className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
              Limite:
            </label>
            <input
              id={`threshold-${alert.id}`}
              type="number"
              min={0}
              value={alert.threshold}
              onChange={(e) =>
                onUpdate({ ...alert, threshold: Number(e.target.value) })
              }
              className={cn(
                'w-20 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900',
                'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500',
                'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100',
              )}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {alert.thresholdLabel}
            </span>
          </div>

          {/* Channels */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              Canais:
            </span>
            <ChannelSelector
              selected={alert.channels}
              onChange={(channels) => onUpdate({ ...alert, channels })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AlertasPage() {
  const [alerts, setAlerts] = useState<AlertConfig[]>(initialAlerts)

  const handleUpdateAlert = (updated: AlertConfig) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    )
  }

  const enabledCount = alerts.filter((a) => a.enabled).length

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Alertas Configurados
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {enabledCount} de {alerts.length} alertas ativos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Configure notificações para monitorar sua operação
          </span>
        </div>
      </div>

      {/* Alert cards */}
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onUpdate={handleUpdateAlert}
          />
        ))}
      </div>

      {/* Simulated alert history */}
      <div>
        <Card className="dark:border-gray-700 dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="dark:text-gray-100">
              Histórico de alertas simulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data/Hora
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Alerta
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Mensagem
                    </th>
                    <th className="pb-3 pr-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="pb-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {simulatedHistory.map((item) => {
                    const status = statusConfig[item.status]
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="whitespace-nowrap py-3 pr-4 text-xs text-gray-500 dark:text-gray-400">
                          {formatTimestamp(item.timestamp)}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                          {item.alertName}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                          {item.message}
                        </td>
                        <td className="whitespace-nowrap py-3 pr-4">
                          <Badge
                            variant={
                              item.type === 'success'
                                ? 'success'
                                : item.type === 'danger'
                                  ? 'danger'
                                  : item.type === 'warning'
                                    ? 'warning'
                                    : 'info'
                            }
                          >
                            {item.type === 'success' && 'Sucesso'}
                            {item.type === 'danger' && 'Crítico'}
                            {item.type === 'warning' && 'Aviso'}
                            {item.type === 'info' && 'Info'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 text-xs font-medium',
                              status.className,
                            )}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
