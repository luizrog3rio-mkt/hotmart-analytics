import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  LogIn,
  Mail,
  Lock,
  Sparkles,
  Wand2,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, signInWithMagicLink, isDemoMode, profile } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkMode, setMagicLinkMode] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  // -- Helpers ----------------------------------------------------------------

  function redirectAfterLogin(onboardingDone?: boolean) {
    if (onboardingDone === false) {
      navigate('/onboarding', { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }

  // -- Handlers ---------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)

    try {
      if (magicLinkMode) {
        await signInWithMagicLink(email)
        setMagicLinkSent(true)
        toast.success('Link de acesso enviado! Verifique seu e-mail.')
      } else {
        if (!password) {
          toast.error('Digite sua senha.')
          setLoading(false)
          return
        }

        await signIn(email, password)
        toast.success('Login realizado com sucesso!')
        redirectAfterLogin(profile?.onboarding_completed)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao autenticar.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function handleDemoLogin() {
    toast.success('Bem-vindo ao modo demo!')
    navigate('/dashboard', { replace: true })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen">
      {/* ---- Left branded panel ------------------------------------------ */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 text-white lg:flex">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-white/[0.03]" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <BarChart3 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Hotmart Analytics
          </span>
        </div>

        {/* Tagline */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Transforme dados de vendas em insights acion&aacute;veis
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            Monitore suas vendas, entenda seus clientes e tome decis&otilde;es
            baseadas em dados reais da Hotmart.
          </p>

          {/* Feature highlights */}
          <ul className="mt-8 space-y-3 text-sm text-blue-100">
            {[
              'Dashboard completo com m\u00e9tricas-chave',
              'An\u00e1lise de vendas em tempo real',
              'Relat\u00f3rios exportaveis em CSV e Excel',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-blue-300" />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <p className="relative z-10 text-xs text-blue-300">
          &copy; {new Date().getFullYear()} Hotmart Analytics. Todos os direitos
          reservados.
        </p>
      </div>

      {/* ---- Right form panel -------------------------------------------- */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">
              Hotmart Analytics
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {magicLinkMode ? 'Acesso por link m\u00e1gico' : 'Entrar na sua conta'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {magicLinkMode
              ? 'Enviaremos um link de acesso para o seu e-mail.'
              : 'Insira suas credenciais para continuar.'}
          </p>

          {/* Magic-link confirmation screen */}
          {magicLinkSent ? (
            <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6 text-center">
              <Mail className="mx-auto h-10 w-10 text-blue-600" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Verifique seu e-mail
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Enviamos um link de acesso para{' '}
                <span className="font-medium text-gray-900">{email}</span>.
                Clique no link para entrar.
              </p>
              <Button
                variant="ghost"
                className="mt-6"
                onClick={() => {
                  setMagicLinkSent(false)
                  setMagicLinkMode(false)
                }}
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <>
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <Input
                  label="E-mail"
                  type="email"
                  name="email"
                  placeholder="seu@email.com"
                  icon={Mail}
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {!magicLinkMode && (
                  <div>
                    <Input
                      label="Senha"
                      type="password"
                      name="password"
                      placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                      icon={Lock}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="mt-1.5 text-right">
                      <Link
                        to="/forgot-password"
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Esqueci minha senha
                      </Link>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={loading}
                >
                  {magicLinkMode ? (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Enviar link m&aacute;gico
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Entrar
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle magic link */}
              <button
                type="button"
                onClick={() => setMagicLinkMode((v) => !v)}
                className={cn(
                  'mt-4 flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                  'border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {magicLinkMode ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Entrar com senha
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Entrar com link m&aacute;gico
                  </>
                )}
              </button>

              {/* Demo mode button */}
              {isDemoMode && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 w-full border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  size="lg"
                  onClick={handleDemoLogin}
                >
                  <Sparkles className="h-4 w-4" />
                  Entrar em modo demo
                </Button>
              )}

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-400">
                    Ainda n&atilde;o tem conta?
                  </span>
                </div>
              </div>

              {/* Register link */}
              <Link
                to="/register"
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                  'border-gray-200 text-gray-700 hover:bg-gray-50',
                )}
              >
                Criar conta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
