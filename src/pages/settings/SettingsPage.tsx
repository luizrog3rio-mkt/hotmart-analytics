import { useState, useEffect, useMemo } from 'react'
import {
  User,
  Plug,
  Bell,
  Check,
  X,
  Upload,
  Crown,
  Zap,
  ShoppingCart,
  Trophy,
  AlertTriangle,
  TrendingDown,
  Mail,
  Send,
  FileSpreadsheet,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile } from '@/services/import-service'
import { Tabs } from '@/components/ui/Tabs'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const SETTINGS_TABS = [
  { id: 'profile', label: 'Perfil' },
  { id: 'integrations', label: 'Integracoes' },
  { id: 'alerts', label: 'Alertas' },
  { id: 'plan', label: 'Plano' },
]

// ---------------------------------------------------------------------------
// Profile Tab
// ---------------------------------------------------------------------------

function ProfileTab() {
  const { user, profile, isDemoMode } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')

  useEffect(() => {
    setFullName(profile?.full_name || '')
  }, [profile?.full_name])

  async function handleSaveProfile() {
    if (!user?.id) return
    const success = await updateProfile(user.id, { full_name: fullName })
    if (success) toast.success('Perfil atualizado!')
    else toast.error('Erro ao salvar perfil')
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-lg shadow-blue-500/20">
          {profile?.full_name
            ? profile.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()
            : 'U'}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">
            {profile?.full_name ?? 'Usuario'}
          </p>
          <p className="text-sm text-gray-500">{profile?.email ?? '-'}</p>
          <Badge variant="info" className="mt-1">
            {profile?.plan === 'pro' ? 'Pro' : 'Free'}
          </Badge>
        </div>
      </div>

      {/* Form fields (read-only in demo) */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 pb-2">
            <User className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Informacoes pessoais
            </h3>
            {isDemoMode && (
              <Badge variant="default" className="ml-auto">
                Modo demo
              </Badge>
            )}
          </div>

          <Input
            label="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            readOnly={isDemoMode}
          />
          <Input
            label="Email"
            type="email"
            value={profile?.email ?? ''}
            disabled
          />

          <div className="pt-2">
            <Button
              variant="secondary"
              onClick={handleSaveProfile}
              disabled={isDemoMode}
            >
              Salvar alteracoes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Integrations Tab
// ---------------------------------------------------------------------------

function IntegrationsTab() {
  return (
    <div className="space-y-6">
      {/* Hotmart API */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50">
              <Plug className="h-6 w-6 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">Hotmart API</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 ring-1 ring-red-100">
                  <X className="h-3 w-3" />
                  Desconectado
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Conecte sua conta Hotmart para sincronizar vendas automaticamente
              </p>
              <Button variant="outline" size="sm" className="mt-3" disabled>
                <Plug className="h-4 w-4" />
                Conectar API
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Import History */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 pb-4">
            <FileSpreadsheet className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Historico de importacoes
            </h3>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-400">
              Nenhuma importacao realizada ainda
            </p>
            <p className="mt-1 text-xs text-gray-300">
              Importe dados pelo onboarding ou pela pagina de transacoes
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alerts Tab
// ---------------------------------------------------------------------------

interface AlertConfig {
  id: string
  label: string
  description: string
  icon: typeof Bell
  enabled: boolean
}

function AlertsTab() {
  const [alerts, setAlerts] = useState<AlertConfig[]>([
    {
      id: 'new_sale',
      label: 'Nova venda',
      description: 'Notificacao a cada nova venda aprovada',
      icon: ShoppingCart,
      enabled: true,
    },
    {
      id: 'goal_reached',
      label: 'Meta batida',
      description: 'Quando uma meta for atingida',
      icon: Trophy,
      enabled: true,
    },
    {
      id: 'refund_spike',
      label: 'Pico de reembolso',
      description: 'Quando a taxa de reembolso ultrapassar o limite',
      icon: AlertTriangle,
      enabled: true,
    },
    {
      id: 'conversion_drop',
      label: 'Queda de conversao',
      description: 'Quando a taxa de conversao cair significativamente',
      icon: TrendingDown,
      enabled: false,
    },
  ])

  const [channel, setChannel] = useState<'email' | 'telegram'>('email')

  const toggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    )
  }

  return (
    <div className="space-y-6">
      {/* Alert toggles */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <Bell className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">
              Tipos de alerta
            </h3>
          </div>

          {alerts.map((alert) => {
            const Icon = alert.icon
            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center gap-4 rounded-xl border p-4 transition-all duration-150',
                  alert.enabled
                    ? 'border-blue-100 bg-blue-50/40'
                    : 'border-gray-100 bg-white',
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                    alert.enabled
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-400',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {alert.label}
                  </p>
                  <p className="text-xs text-gray-400">{alert.description}</p>
                </div>
                {/* Toggle switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={alert.enabled}
                  onClick={() => toggleAlert(alert.id)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                    alert.enabled ? 'bg-blue-600' : 'bg-gray-200',
                  )}
                >
                  <span
                    className={cn(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200',
                      alert.enabled ? 'translate-x-5' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Channel */}
      <Card>
        <CardContent className="p-6">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            Canal de notificacao
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setChannel('email')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                channel === 'email'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => setChannel('telegram')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all',
                channel === 'telegram'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300',
              )}
            >
              <Send className="h-4 w-4" />
              Telegram
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Plan Tab
// ---------------------------------------------------------------------------

function PlanTab() {
  const { profile } = useAuth()
  const currentPlan = profile?.plan ?? 'free'

  const plans = useMemo(
    () => [
      {
        id: 'free',
        name: 'Free',
        price: 'R$ 0',
        period: '/mes',
        features: [
          'Dados demo',
          'Dashboard basico',
          'Historico de 30 dias',
          'Exportar CSV',
        ],
        limitations: [
          'Sem integracao API',
          'Sem alertas em tempo real',
          'Sem forecast',
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 'R$ 97',
        period: '/mes',
        features: [
          'Integracao Hotmart API',
          'Dashboard completo',
          'Historico ilimitado',
          'Alertas em tempo real',
          'Forecast de receita',
          'Analise de coorte',
          'Segmentacao RFM',
          'Suporte prioritario',
        ],
        limitations: [],
        highlight: true,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Seu plano atual</h3>
        <p className="text-sm text-gray-500">
          Gerencie sua assinatura e recursos disponiveis
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative overflow-hidden transition-all duration-200',
                plan.highlight &&
                  'ring-2 ring-blue-500 shadow-lg shadow-blue-500/10',
                isCurrent && 'border-green-200',
              )}
            >
              {plan.highlight && (
                <div className="absolute -right-8 top-4 rotate-45 bg-blue-600 px-10 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Popular
                </div>
              )}

              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-gray-900">
                    {plan.name}
                  </h4>
                  {isCurrent && (
                    <Badge variant="success">Atual</Badge>
                  )}
                </div>

                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="mt-5 space-y-2">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <Check className="h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li
                      key={limitation}
                      className="flex items-center gap-2 text-sm text-gray-400"
                    >
                      <X className="h-4 w-4 shrink-0 text-gray-300" />
                      {limitation}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-6">
                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Plano atual
                    </Button>
                  ) : plan.highlight ? (
                    <Button className="w-full">
                      <Crown className="h-4 w-4" />
                      Fazer upgrade
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      Downgrade
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Feature comparison note */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Precisa de mais recursos?
            </p>
            <p className="text-xs text-gray-500">
              O plano Pro inclui todas as ferramentas de analise avancada,
              integracao direta com a Hotmart e alertas personalizados.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Settings Page
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="space-y-6">
      <Tabs
        tabs={SETTINGS_TABS}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div className="max-w-2xl">
        {activeTab === 'profile' && <ProfileTab />}
        {activeTab === 'integrations' && <IntegrationsTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'plan' && <PlanTab />}
      </div>
    </div>
  )
}
