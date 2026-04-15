import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, LogIn, Mail, Lock, Sparkles, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, profile } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error('Preencha e-mail e senha.')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Login realizado com sucesso!')
      if (profile?.onboarding_completed === false) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao autenticar.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branded panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <BarChart3 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">Hotmart Analytics</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Transforme dados de vendas em insights acionáveis
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            Monitore suas vendas, entenda seus clientes e tome decisões baseadas em dados reais da Hotmart.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-blue-100">
            {[
              'Dashboard completo com métricas-chave',
              'Análise de vendas em tempo real',
              'Relatórios exportáveis em CSV e Excel',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-blue-300" />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-blue-300">
          &copy; {new Date().getFullYear()} Hotmart Analytics
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Hotmart Analytics</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Entrar na sua conta</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Insira suas credenciais para continuar.</p>

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

            <Input
              label="Senha"
              type="password"
              name="password"
              placeholder="Digite sua senha"
              icon={Lock}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 dark:bg-[#0f172a] px-4 text-gray-400 dark:text-slate-500">
                Ainda não tem conta?
              </span>
            </div>
          </div>

          {/* Register link */}
          <Link
            to="/register"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Criar conta grátis
          </Link>
        </div>
      </div>
    </div>
  )
}
