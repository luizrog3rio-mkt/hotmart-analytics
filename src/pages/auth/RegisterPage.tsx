import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  User,
  Mail,
  Lock,
  Sparkles,
  UserPlus,
  ArrowLeft,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // -- Validation -----------------------------------------------------------

  function validate(): string | null {
    if (!fullName.trim()) return 'Informe seu nome completo.'
    if (!email.trim()) return 'Informe seu e-mail.'
    if (password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    if (password !== confirmPassword) return 'As senhas n\u00e3o coincidem.'
    return null
  }

  // -- Submit ---------------------------------------------------------------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const validationError = validate()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, fullName)
      toast.success('Conta criada com sucesso!')
      navigate('/onboarding', { replace: true })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao criar conta.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
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
            Comece a analisar suas vendas agora
          </h1>
          <p className="mt-4 text-lg text-blue-100">
            Crie sua conta gratuita e tenha acesso instant&acirc;neo ao
            dashboard mais completo para produtores Hotmart.
          </p>

          {/* Feature highlights */}
          <ul className="mt-8 space-y-3 text-sm text-blue-100">
            {[
              'Configura\u00e7\u00e3o r\u00e1pida em menos de 2 minutos',
              'Plano gratuito com recursos essenciais',
              'Seus dados sempre seguros e privados',
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

          <h2 className="text-2xl font-bold text-gray-900">Criar sua conta</h2>
          <p className="mt-1 text-sm text-gray-500">
            Preencha os dados abaixo para come&ccedil;ar.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Nome completo"
              type="text"
              name="fullName"
              placeholder="Seu nome completo"
              icon={User}
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

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
              placeholder="M\u00ednimo 6 caracteres"
              icon={Lock}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Confirmar senha"
              type="password"
              name="confirmPassword"
              placeholder="Repita a senha"
              icon={Lock}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
            >
              <UserPlus className="h-4 w-4" />
              Criar conta
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400">
                J&aacute; tem uma conta?
              </span>
            </div>
          </div>

          {/* Back to login */}
          <Link
            to="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  )
}
