import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Upload,
  Cpu,
  Target,
  Bell,
  Rocket,
  ArrowLeft,
  ArrowRight,
  Check,
  FileSpreadsheet,
  Plug,
  Mail,
  Send,
  ShoppingCart,
  Trophy,
  AlertTriangle,
  TrendingDown,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { parseFile, type ParseResult } from '@/services/csv-parser'
import { mapToTransactions } from '@/services/csv-parser'
import { getDemoData } from '@/services/demo-data'
import { useAuth } from '@/contexts/AuthContext'
import { completeOnboarding, updateOnboardingStep, saveGoals, importTransactionsToSupabase } from '@/services/import-service'
import toast from 'react-hot-toast'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepDef {
  id: number
  label: string
  icon: typeof Sparkles
}

const STEPS: StepDef[] = [
  { id: 1, label: 'Boas-vindas', icon: Sparkles },
  { id: 2, label: 'Conectar Dados', icon: Upload },
  { id: 3, label: 'Processando', icon: Cpu },
  { id: 4, label: 'Definir Metas', icon: Target },
  { id: 5, label: 'Alertas', icon: Bell },
  { id: 6, label: 'Pronto!', icon: Rocket },
]

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="w-full">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id
          const Icon = step.icon

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                    isCompleted &&
                      'border-blue-600 bg-blue-600 text-white',
                    isCurrent &&
                      'border-blue-600 bg-blue-50 text-blue-600 ring-4 ring-blue-100',
                    !isCompleted &&
                      !isCurrent &&
                      'border-gray-200 bg-white text-gray-400',
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium transition-colors',
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-gray-700' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="mx-2 mb-6 h-0.5 flex-1">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200',
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1: Boas-vindas
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  const data = getDemoData()
  const productCount = data.products.length
  const transactionCount = data.transactions.length

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
        <BarChart3 className="h-10 w-10 text-white" />
      </div>

      <h2 className="mt-6 text-3xl font-bold text-gray-900">
        Bem-vindo ao Hotmart Analytics
      </h2>
      <p className="mt-3 max-w-md text-gray-500">
        Sua plataforma completa de analise de vendas. Vamos configurar tudo em
        poucos minutos para voce ter insights poderosos.
      </p>

      {/* Preview cards */}
      <div className="mt-8 grid w-full max-w-sm grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{productCount}</p>
            <p className="text-xs text-gray-500">Produtos Demo</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {transactionCount.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-gray-500">Transacoes Demo</p>
          </CardContent>
        </Card>
      </div>

      <Button size="lg" className="mt-8" onClick={onNext}>
        Comecar
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2: Conectar Dados
// ---------------------------------------------------------------------------

function StepConnectData({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const { user } = useAuth()
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name)
    const result = await parseFile(file)
    setParseResult(result)

    if (user?.id && result.data.length > 0) {
      const mapped = mapToTransactions(result)
      const importResult = await importTransactionsToSupabase(user.id, mapped, file.name)
      if (importResult.success) {
        toast.success(`${importResult.transactionsCreated} transacoes importadas!`)
      }
    }
  }, [user])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Conectar seus dados</h2>
        <p className="mt-2 text-sm text-gray-500">
          Escolha como deseja importar seus dados de vendas
        </p>
      </div>

      {/* Option 1: API (disabled) */}
      <Card className="border-dashed opacity-60">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100">
            <Plug className="h-6 w-6 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-700">Conectar Hotmart API</p>
              <Badge variant="info">Em breve</Badge>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Sincronize automaticamente com sua conta Hotmart
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Option 2: CSV Import (active) */}
      <Card
        className={cn(
          'border-2 transition-all duration-200 cursor-pointer',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : parseResult
              ? 'border-green-300 bg-green-50/50'
              : 'border-dashed border-gray-300 hover:border-blue-300 hover:bg-blue-50/30',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="flex flex-col items-center p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />

          {parseResult ? (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
                <FileSpreadsheet className="h-7 w-7 text-green-600" />
              </div>
              <p className="mt-3 font-semibold text-green-700">{fileName}</p>
              <p className="mt-1 text-sm text-green-600">
                {parseResult.rowCount.toLocaleString('pt-BR')} registros encontrados
                {parseResult.headers.length > 0 &&
                  ` | ${parseResult.headers.length} colunas`}
              </p>
              {parseResult.errors.length > 0 && (
                <p className="mt-2 text-xs text-amber-600">
                  {parseResult.errors.length} aviso(s) durante a leitura
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
                <Upload className="h-7 w-7 text-blue-600" />
              </div>
              <p className="mt-3 font-semibold text-gray-700">
                Importar CSV / Excel
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Arraste seu arquivo aqui ou clique para selecionar
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-400">
                .csv .xlsx .xls
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={false}>
          {parseResult ? 'Continuar' : 'Usar Dados Demo'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3: Processando
// ---------------------------------------------------------------------------

function StepProcessing({ onNext }: { onNext: () => void }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        // Ease-out acceleration
        const increment = Math.max(1, Math.floor((100 - prev) / 8))
        return Math.min(100, prev + increment)
      })
    }, 80)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (progress >= 100) {
      const timeout = setTimeout(onNext, 800)
      return () => clearTimeout(timeout)
    }
  }, [progress, onNext])

  const stages = [
    { label: 'Validando dados...', threshold: 20 },
    { label: 'Processando transacoes...', threshold: 45 },
    { label: 'Calculando metricas...', threshold: 70 },
    { label: 'Gerando insights...', threshold: 90 },
    { label: 'Concluido!', threshold: 100 },
  ]

  const currentStage =
    stages.find((s) => progress <= s.threshold) ?? stages[stages.length - 1]

  return (
    <div className="flex flex-col items-center text-center">
      {/* Animated icon */}
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600">
          <Cpu className="h-10 w-10 text-white animate-pulse" />
        </div>
        {/* Spinning ring */}
        <div className="absolute -inset-3">
          <svg className="h-full w-full animate-spin" style={{ animationDuration: '3s' }}>
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="20 80"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <h2 className="mt-8 text-2xl font-bold text-gray-900">
        Processando seus dados
      </h2>
      <p className="mt-2 text-sm text-gray-500">{currentStage.label}</p>

      {/* Progress bar */}
      <div className="mt-6 w-full max-w-sm">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-gray-400">{progress}%</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4: Definir Metas
// ---------------------------------------------------------------------------

function StepGoals({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const { user } = useAuth()
  const [revenueGoal, setRevenueGoal] = useState('')
  const [salesGoal, setSalesGoal] = useState('')
  const [refundLimit, setRefundLimit] = useState('')

  const handleContinue = useCallback(() => {
    if (user?.id) {
      saveGoals(user.id, {
        revenue: revenueGoal ? Number(revenueGoal) : undefined,
        sales: salesGoal ? Number(salesGoal) : undefined,
        refundRate: refundLimit ? Number(refundLimit) : undefined,
      })
    }
    onNext()
  }, [user, revenueGoal, salesGoal, refundLimit, onNext])

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Target className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Definir suas metas</h2>
        <p className="mt-2 text-sm text-gray-500">
          Configure metas para acompanhar sua performance
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Meta de receita mensal (R$)"
          type="number"
          placeholder="Ex: 50000"
          value={revenueGoal}
          onChange={(e) => setRevenueGoal(e.target.value)}
        />
        <Input
          label="Meta de vendas diarias"
          type="number"
          placeholder="Ex: 30"
          value={salesGoal}
          onChange={(e) => setSalesGoal(e.target.value)}
        />
        <Input
          label="Limite de reembolso (%)"
          type="number"
          placeholder="Ex: 5"
          value={refundLimit}
          onChange={(e) => setRefundLimit(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onNext}>
            Pular
          </Button>
          <Button onClick={handleContinue}>
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5: Configurar Alertas
// ---------------------------------------------------------------------------

interface AlertOption {
  id: string
  label: string
  description: string
  icon: typeof Bell
  defaultChecked: boolean
}

const ALERT_OPTIONS: AlertOption[] = [
  {
    id: 'new_sale',
    label: 'Nova venda',
    description: 'Notificacao a cada nova venda aprovada',
    icon: ShoppingCart,
    defaultChecked: true,
  },
  {
    id: 'goal_reached',
    label: 'Meta batida',
    description: 'Quando uma meta diaria ou mensal for atingida',
    icon: Trophy,
    defaultChecked: true,
  },
  {
    id: 'refund_spike',
    label: 'Pico de reembolso',
    description: 'Quando a taxa de reembolso ultrapassar o limite',
    icon: AlertTriangle,
    defaultChecked: true,
  },
  {
    id: 'conversion_drop',
    label: 'Queda de conversao',
    description: 'Quando a taxa de conversao cair significativamente',
    icon: TrendingDown,
    defaultChecked: false,
  },
]

function StepAlerts({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const [checkedAlerts, setCheckedAlerts] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        ALERT_OPTIONS.map((opt) => [opt.id, opt.defaultChecked]),
      ),
  )
  const [channel, setChannel] = useState<'email' | 'telegram'>('email')

  const toggleAlert = (id: string) => {
    setCheckedAlerts((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100">
          <Bell className="h-7 w-7 text-purple-600" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Configurar alertas
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Escolha quais notificacoes voce deseja receber
        </p>
      </div>

      {/* Alert checkboxes */}
      <div className="space-y-2">
        {ALERT_OPTIONS.map((option) => {
          const Icon = option.icon
          const isChecked = checkedAlerts[option.id] ?? false

          return (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition-all duration-150',
                isChecked
                  ? 'border-blue-200 bg-blue-50/60'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleAlert(option.id)}
                className="sr-only"
              />
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                  isChecked ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isChecked ? 'text-gray-900' : 'text-gray-600',
                  )}
                >
                  {option.label}
                </p>
                <p className="text-xs text-gray-400">{option.description}</p>
              </div>
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                  isChecked
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-gray-300 bg-white',
                )}
              >
                {isChecked && <Check className="h-3 w-3 text-white" />}
              </div>
            </label>
          )
        })}
      </div>

      {/* Channel selection */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
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
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onNext}>
            Pular
          </Button>
          <Button onClick={onNext}>
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 6: Pronto!
// ---------------------------------------------------------------------------

function StepComplete({ onFinish }: { onFinish: () => void }) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => setShowConfetti(false), 4000)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Confetti-like celebration */}
      {showConfetti && (
        <div className="pointer-events-none absolute -top-10 left-0 right-0 overflow-hidden h-60">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 60}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: [
                    '#3b82f6',
                    '#22c55e',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#ec4899',
                    '#06b6d4',
                  ][i % 7],
                  opacity: 0.7 + Math.random() * 0.3,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/25">
        <Check className="h-12 w-12 text-white" strokeWidth={3} />
      </div>

      <h2 className="mt-6 text-3xl font-bold text-gray-900">Tudo pronto!</h2>
      <p className="mt-3 max-w-sm text-gray-500">
        Seu ambiente esta configurado. Agora voce pode explorar seus dados e
        acompanhar suas vendas em tempo real.
      </p>

      {/* Quick stats */}
      <div className="mt-8 grid w-full max-w-xs grid-cols-3 gap-3">
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">6</p>
          <p className="text-[10px] text-gray-500">Produtos</p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-center">
          <p className="text-lg font-bold text-green-600">90</p>
          <p className="text-[10px] text-gray-500">Dias</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3 text-center">
          <p className="text-lg font-bold text-purple-600">4</p>
          <p className="text-[10px] text-gray-500">Alertas</p>
        </div>
      </div>

      <Button size="lg" className="mt-8" onClick={onFinish}>
        <Rocket className="h-5 w-5" />
        Ir para o Dashboard
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Wizard
// ---------------------------------------------------------------------------

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const navigate = useNavigate()
  const { user } = useAuth()

  const goNext = useCallback(() => {
    setCurrentStep((s) => {
      const nextStep = Math.min(s + 1, 6)
      if (user?.id) {
        updateOnboardingStep(user.id, nextStep)
      }
      return nextStep
    })
  }, [user])

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }, [])

  const handleFinish = useCallback(async () => {
    // In demo mode, persist onboarding completion in localStorage
    try {
      localStorage.setItem('hotmart_analytics_onboarding_completed', 'true')
    } catch {
      // Storage might be unavailable
    }
    if (user?.id) {
      await completeOnboarding(user.id)
    }
    navigate('/dashboard')
  }, [navigate, user])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-900">
              Hotmart Analytics
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-6 py-8">
        {/* Progress bar */}
        <div className="w-full max-w-2xl">
          <ProgressBar currentStep={currentStep} />
        </div>

        {/* Step content */}
        <div className="mt-10 flex w-full max-w-2xl flex-1 items-start justify-center">
          {currentStep === 1 && <StepWelcome onNext={goNext} />}
          {currentStep === 2 && (
            <StepConnectData onNext={goNext} onBack={goBack} />
          )}
          {currentStep === 3 && <StepProcessing onNext={goNext} />}
          {currentStep === 4 && <StepGoals onNext={goNext} onBack={goBack} />}
          {currentStep === 5 && (
            <StepAlerts onNext={goNext} onBack={goBack} />
          )}
          {currentStep === 6 && <StepComplete onFinish={handleFinish} />}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/60 py-4 text-center">
        <p className="text-xs text-gray-400">
          Hotmart Analytics &middot; Passo {currentStep} de {STEPS.length}
        </p>
      </footer>
    </div>
  )
}
