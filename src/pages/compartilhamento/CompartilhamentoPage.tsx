import { useState, useMemo } from 'react'
import {
  Share2,
  Link2,
  Copy,
  Check,
  Plus,
  Eye,
  Lock,
  Unlock,
  Calendar,
  Users,
  UserPlus,
  Activity,
  Shield,
  BarChart3,
  FileText,
  Clock,
  X,
  Filter,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable, type Column } from '@/components/data/DataTable'
import { Select } from '@/components/ui/Select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShareStatus = 'active' | 'expired'

interface SharedDashboard {
  id: string
  name: string
  link: string
  passwordProtected: boolean
  expirationDate: string
  viewCount: number
  status: ShareStatus
  createdAt: string
}

type TeamRole = 'Admin' | 'Financeiro' | 'Marketing' | 'Viewer'
type MemberStatus = 'active' | 'pending'

interface TeamMember {
  id: string
  name: string
  email: string
  role: TeamRole
  invitedDate: string
  status: MemberStatus
  initials: string
}

interface ActivityEntry {
  id: string
  user: string
  initials: string
  action: string
  timestamp: string
  type: 'access' | 'export' | 'create' | 'edit' | 'delete' | 'invite' | 'share'
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const sharedDashboards: SharedDashboard[] = [
  {
    id: '1',
    name: 'Dashboard Principal',
    link: 'https://analytics.hotmart.app/share/d8f2a1c3-e4b5-4a9d-b7c6-1f0e2d3a4b5c',
    passwordProtected: true,
    expirationDate: '2026-05-14',
    viewCount: 42,
    status: 'active',
    createdAt: '2026-03-14',
  },
  {
    id: '2',
    name: 'Metricas de Afiliado - Joao',
    link: 'https://analytics.hotmart.app/share/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    passwordProtected: false,
    expirationDate: '2026-06-01',
    viewCount: 15,
    status: 'active',
    createdAt: '2026-04-01',
  },
  {
    id: '3',
    name: 'Relatorio Mensal Mar/26',
    link: 'https://analytics.hotmart.app/share/f1e2d3c4-b5a6-9870-8765-4321fedcba98',
    passwordProtected: true,
    expirationDate: '2026-04-07',
    viewCount: 28,
    status: 'expired',
    createdAt: '2026-03-01',
  },
]

const teamMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Luiz Rogerio',
    email: 'luiz@hotmart-analytics.com',
    role: 'Admin',
    invitedDate: '2026-01-10',
    status: 'active',
    initials: 'LR',
  },
  {
    id: '2',
    name: 'Ana Financeiro',
    email: 'ana@hotmart-analytics.com',
    role: 'Financeiro',
    invitedDate: '2026-02-15',
    status: 'active',
    initials: 'AF',
  },
  {
    id: '3',
    name: 'Carlos Marketing',
    email: 'carlos@hotmart-analytics.com',
    role: 'Marketing',
    invitedDate: '2026-03-01',
    status: 'active',
    initials: 'CM',
  },
  {
    id: '4',
    name: 'Fernanda',
    email: 'fernanda@example.com',
    role: 'Viewer',
    invitedDate: '2026-04-10',
    status: 'pending',
    initials: 'FE',
  },
]

const activityLog: ActivityEntry[] = [
  {
    id: '1',
    user: 'Luiz',
    initials: 'LR',
    action: 'Acessou Dashboard Principal',
    timestamp: '2026-04-14T09:45:00',
    type: 'access',
  },
  {
    id: '2',
    user: 'Ana',
    initials: 'AF',
    action: 'Exportou Relatorio Mensal Mar/26 em PDF',
    timestamp: '2026-04-14T08:30:00',
    type: 'export',
  },
  {
    id: '3',
    user: 'Carlos',
    initials: 'CM',
    action: 'Criou campanha "Remarketing Abril"',
    timestamp: '2026-04-13T16:20:00',
    type: 'create',
  },
  {
    id: '4',
    user: 'Luiz',
    initials: 'LR',
    action: 'Compartilhou Dashboard Principal com link protegido',
    timestamp: '2026-04-13T14:10:00',
    type: 'share',
  },
  {
    id: '5',
    user: 'Ana',
    initials: 'AF',
    action: 'Editou metas financeiras do mes de abril',
    timestamp: '2026-04-12T11:00:00',
    type: 'edit',
  },
  {
    id: '6',
    user: 'Luiz',
    initials: 'LR',
    action: 'Convidou Fernanda como Viewer',
    timestamp: '2026-04-10T10:15:00',
    type: 'invite',
  },
  {
    id: '7',
    user: 'Carlos',
    initials: 'CM',
    action: 'Acessou painel de Metricas de Afiliados',
    timestamp: '2026-04-10T09:00:00',
    type: 'access',
  },
  {
    id: '8',
    user: 'Ana',
    initials: 'AF',
    action: 'Removeu relatorio expirado "Fev/26"',
    timestamp: '2026-04-09T15:40:00',
    type: 'delete',
  },
  {
    id: '9',
    user: 'Luiz',
    initials: 'LR',
    action: 'Atualizou configuracoes de alerta de vendas',
    timestamp: '2026-04-08T17:30:00',
    type: 'edit',
  },
  {
    id: '10',
    user: 'Carlos',
    initials: 'CM',
    action: 'Exportou dados de campanhas em CSV',
    timestamp: '2026-04-07T13:20:00',
    type: 'export',
  },
]

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const tabs = [
  { id: 'dashboards', label: 'Dashboards Compartilhados' },
  { id: 'equipe', label: 'Equipe' },
  { id: 'atividades', label: 'Atividades' },
]

const dashboardTypeOptions = [
  { value: 'principal', label: 'Dashboard Principal' },
  { value: 'afiliados', label: 'Metricas de Afiliados' },
  { value: 'financeiro', label: 'Relatorio Financeiro' },
  { value: 'vendas', label: 'Relatorio de Vendas' },
  { value: 'marketing', label: 'Painel de Marketing' },
]

const expirationOptions = [
  { value: '7', label: '7 dias' },
  { value: '14', label: '14 dias' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
]

const roleOptions = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Financeiro', label: 'Financeiro' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Viewer', label: 'Viewer' },
]

const roleColors: Record<TeamRole, { bg: string; text: string }> = {
  Admin: { bg: 'bg-purple-50', text: 'text-purple-700' },
  Financeiro: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  Marketing: { bg: 'bg-orange-50', text: 'text-orange-700' },
  Viewer: { bg: 'bg-gray-100', text: 'text-gray-600' },
}

const roleDescriptions: { role: TeamRole; description: string; icon: React.ReactNode }[] = [
  {
    role: 'Admin',
    description: 'Acesso total. Pode gerenciar equipe, configuracoes, compartilhamentos e todos os dados.',
    icon: <Shield size={18} className="text-purple-600" />,
  },
  {
    role: 'Financeiro',
    description: 'Acesso a dashboards financeiros, fluxo de caixa, unit economics e exportacao de relatorios.',
    icon: <BarChart3 size={18} className="text-emerald-600" />,
  },
  {
    role: 'Marketing',
    description: 'Acesso a metricas de campanhas, afiliados, funis e dados de aquisicao de clientes.',
    icon: <Activity size={18} className="text-orange-600" />,
  },
  {
    role: 'Viewer',
    description: 'Acesso somente leitura aos dashboards compartilhados. Nao pode exportar ou editar.',
    icon: <Eye size={18} className="text-gray-500" />,
  },
]

const activityTypeColors: Record<ActivityEntry['type'], string> = {
  access: 'bg-blue-500',
  export: 'bg-green-500',
  create: 'bg-purple-500',
  edit: 'bg-yellow-500',
  delete: 'bg-red-500',
  invite: 'bg-indigo-500',
  share: 'bg-cyan-500',
}

const activityTypeIcons: Record<ActivityEntry['type'], React.ReactNode> = {
  access: <Eye size={14} className="text-white" />,
  export: <FileText size={14} className="text-white" />,
  create: <Plus size={14} className="text-white" />,
  edit: <Activity size={14} className="text-white" />,
  delete: <X size={14} className="text-white" />,
  invite: <UserPlus size={14} className="text-white" />,
  share: <Share2 size={14} className="text-white" />,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateLink(url: string, maxLen = 45): string {
  if (url.length <= maxLen) return url
  return url.slice(0, maxLen) + '...'
}

function getRelativeTime(iso: string): string {
  const now = new Date('2026-04-14T12:00:00')
  const date = new Date(iso)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 60) return `ha ${diffMin} min`
  if (diffHours < 24) return `ha ${diffHours}h`
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `ha ${diffDays} dias`
  return formatDate(iso)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: noop in demo
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center h-8 w-8 rounded-md transition-colors duration-150',
        'hover:bg-gray-100 active:bg-gray-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        copied && 'text-green-600',
      )}
      aria-label={copied ? 'Link copiado' : 'Copiar link'}
    >
      {copied ? <Check size={16} /> : <Copy size={16} className="text-gray-400" />}
    </button>
  )
}

function UserAvatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-semibold text-white',
        size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm',
      )}
    >
      {initials}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboards Compartilhados Tab
// ---------------------------------------------------------------------------

function DashboardsTab() {
  const [showForm, setShowForm] = useState(false)
  const [dashboards] = useState(sharedDashboards)
  const [formDashboardType, setFormDashboardType] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formExpiration, setFormExpiration] = useState('30')

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            {dashboards.filter((d) => d.status === 'active').length} links ativos de{' '}
            {dashboards.length} compartilhamentos
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={16} />
          Criar Link
        </Button>
      </div>

      {/* Create link form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Novo Link de Compartilhamento</h4>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Fechar formulario"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label="Tipo de Dashboard"
                options={dashboardTypeOptions}
                value={formDashboardType}
                onChange={(e) => setFormDashboardType(e.target.value)}
                placeholder="Selecione..."
              />
              <Input
                label="Senha (opcional)"
                type="password"
                placeholder="Deixe vazio para sem senha"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                icon={Lock}
              />
              <Select
                label="Expiracao"
                options={expirationOptions}
                value={formExpiration}
                onChange={(e) => setFormExpiration(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm">
                <Link2 size={16} />
                Gerar Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shared dashboard cards */}
      <div className="grid gap-4">
        {dashboards.map((dashboard) => (
          <Card
            key={dashboard.id}
            className={cn(
              'transition-opacity duration-200',
              dashboard.status === 'expired' && 'opacity-60',
            )}
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      dashboard.status === 'active'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    <Share2 size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {dashboard.name}
                      </h3>
                      <Badge
                        variant={dashboard.status === 'active' ? 'success' : 'danger'}
                      >
                        {dashboard.status === 'active' ? 'Ativo' : 'Expirado'}
                      </Badge>
                      {dashboard.passwordProtected ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Lock size={12} />
                          Protegido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Unlock size={12} />
                          Publico
                        </span>
                      )}
                    </div>

                    {/* Link row */}
                    <div className="mt-2 flex items-center gap-2">
                      <code className="block truncate rounded-md bg-gray-50 px-2.5 py-1 text-xs text-gray-600 font-mono max-w-md border border-gray-200">
                        {truncateLink(dashboard.link)}
                      </code>
                      <CopyButton text={dashboard.link} />
                    </div>

                    {/* Meta row */}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Eye size={13} />
                        {dashboard.viewCount} visualizacoes
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={13} />
                        Expira em {formatDate(dashboard.expirationDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} />
                        Criado em {formatDate(dashboard.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: view count prominent */}
                <div className="flex shrink-0 flex-col items-center rounded-lg bg-gray-50 px-4 py-2.5 border border-gray-100">
                  <span className="text-2xl font-bold text-gray-900">{dashboard.viewCount}</span>
                  <span className="text-xs text-gray-500">views</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Equipe Tab
// ---------------------------------------------------------------------------

function EquipeTab() {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')

  const teamColumns: Column<TeamMember>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Membro',
        render: (row) => (
          <div className="flex items-center gap-3">
            <UserAvatar initials={row.initials} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{row.name}</p>
              <p className="text-xs text-gray-500 truncate">{row.email}</p>
            </div>
          </div>
        ),
        sortable: true,
        sortValue: (row) => row.name,
      },
      {
        key: 'role',
        header: 'Cargo',
        render: (row) => {
          const colors = roleColors[row.role]
          return (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                colors.bg,
                colors.text,
              )}
            >
              {row.role}
            </span>
          )
        },
        sortable: true,
        sortValue: (row) => row.role,
      },
      {
        key: 'invitedDate',
        header: 'Convidado em',
        render: (row) => (
          <span className="text-sm text-gray-600">{formatDate(row.invitedDate)}</span>
        ),
        sortable: true,
        sortValue: (row) => row.invitedDate,
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={row.status === 'active' ? 'success' : 'warning'}>
            {row.status === 'active' ? 'Ativo' : 'Pendente'}
          </Badge>
        ),
        sortable: true,
        sortValue: (row) => row.status,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {teamMembers.length} membros ({teamMembers.filter((m) => m.status === 'active').length}{' '}
          ativos, {teamMembers.filter((m) => m.status === 'pending').length} pendentes)
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowInviteForm(!showInviteForm)}
        >
          <UserPlus size={16} />
          Convidar Membro
        </Button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900">Convidar Novo Membro</h4>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Fechar formulario"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email"
                type="email"
                placeholder="email@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Select
                label="Cargo"
                options={roleOptions}
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                placeholder="Selecione um cargo..."
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowInviteForm(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm">
                <UserPlus size={16} />
                Enviar Convite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team members table */}
      <DataTable<TeamMember>
        columns={teamColumns}
        data={teamMembers}
        pageSize={10}
        rowKey={(row) => row.id}
        searchable
        searchPlaceholder="Buscar membro..."
      />

      {/* Role descriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info size={18} className="text-blue-500" />
            Descricao dos Cargos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {roleDescriptions.map((item) => {
              const colors = roleColors[item.role]
              return (
                <div
                  key={item.role}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-4"
                >
                  <div
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      colors.bg,
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold', colors.text)}>
                      {item.role}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Atividades Tab
// ---------------------------------------------------------------------------

function AtividadesTab() {
  const [filterUser, setFilterUser] = useState('all')

  const userOptions = [
    { value: 'all', label: 'Todos os usuarios' },
    ...Array.from(new Set(activityLog.map((a) => a.user))).map((user) => ({
      value: user,
      label: user,
    })),
  ]

  const filteredActivities = useMemo(() => {
    if (filterUser === 'all') return activityLog
    return activityLog.filter((a) => a.user === filterUser)
  }, [filterUser])

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          {filteredActivities.length} atividades nos ultimos 7 dias
        </p>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <div className="w-52">
            <Select
              options={userOptions}
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Activity timeline */}
      <Card>
        <CardContent className="p-5">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-200" aria-hidden="true" />

            <div className="space-y-0">
              {filteredActivities.map((activity, idx) => (
                <div
                  key={activity.id}
                  className={cn(
                    'relative flex gap-4 pb-6',
                    idx === filteredActivities.length - 1 && 'pb-0',
                  )}
                >
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                      activityTypeColors[activity.type],
                    )}
                  >
                    {activityTypeIcons[activity.type]}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {activity.user}
                        </span>
                        <span className="text-sm text-gray-600">
                          {activity.action}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 shrink-0">
                        <Clock size={12} />
                        <span title={formatDateTime(activity.timestamp)}>
                          {getRelativeTime(activity.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {formatDateTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {filteredActivities.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                <Activity size={32} />
                <p className="text-sm font-medium">Nenhuma atividade encontrada</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CompartilhamentoPage() {
  const [activeTab, setActiveTab] = useState('dashboards')

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Compartilhamento & Colaboracao
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Gerencie links compartilhados, equipe e atividades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users size={20} className="text-gray-400" />
          <span className="text-sm text-gray-600">
            {teamMembers.length} membros na equipe
          </span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'dashboards' && <DashboardsTab />}
        {activeTab === 'equipe' && <EquipeTab />}
        {activeTab === 'atividades' && <AtividadesTab />}
      </div>
    </div>
  )
}
