import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, LogIn, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';

export function LoginPage() {
  const { authenticated, login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (authenticated) return <Navigate to="/" replace />;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (!identifier.trim() || !password) {
      setError('Informe o identificador e a senha da demonstração.');
      return;
    }

    setLoading(true);
    // Simulação de latência de validação (não há back-end).
    window.setTimeout(() => {
      const success = login(identifier, password);
      setLoading(false);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setError('Identificador ou senha inválidos. Use as credenciais demonstrativas.');
      }
    }, 650);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface shadow-md md:grid-cols-2">
        {/* Painel institucional */}
        <div className="relative hidden flex-col justify-between bg-sand p-8 md:flex">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-terracotta/25 bg-terracotta-soft px-3 py-1 text-[11px] font-semibold tracking-wide text-terracotta-strong uppercase">
              <Sparkles aria-hidden className="h-3 w-3" />
              Protótipo demonstrativo
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
              Plataforma de gestão
              <br />
              Macramê do Leh
              <br />
              e Brilho de Orixá
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Produtos, estoque, pedidos, canais de venda e financeiro de duas marcas independentes —
              cada uma com catálogo e estoque próprios — em um único ambiente simulado, com dados
              fictícios, para apresentação de como uma solução personalizada poderia funcionar.
            </p>
          </div>
          <ul className="space-y-2 text-xs text-ink-soft">
            <li>• Duas marcas: Macramê do Leh e Brilho de Orixá (simuladas)</li>
            <li>• Cada marca vende nas 4 plataformas: Nuvemshop, Mercado Livre, Shopee e TikTok Shop</li>
            <li>• Publicação e sincronização apenas no protótipo</li>
            <li>• Nenhuma integração real com marketplaces</li>
          </ul>
        </div>

        {/* Formulário */}
        <div className="p-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-terracotta text-white">
              <Sparkles aria-hidden className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Macramê do Leh</p>
              <p className="text-[11px] text-ink-muted">Acesso da demonstração</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="identifier" className="text-xs font-medium text-ink-soft">
                Identificador
              </label>
              <div className="relative">
                <UserRound aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  id="identifier"
                  name="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Macrame do Leh"
                  aria-invalid={Boolean(error)}
                  className="h-10 w-full rounded-md border border-border-strong bg-surface pr-3 pl-9 text-sm text-ink transition-colors focus:border-terracotta focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium text-ink-soft">
                Senha
              </label>
              <div className="relative">
                <LockKeyhole aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="•••"
                  aria-invalid={Boolean(error)}
                  className="h-10 w-full rounded-md border border-border-strong bg-surface pr-10 pl-9 text-sm text-ink transition-colors focus:border-terracotta focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1.5 text-ink-muted transition-colors hover:bg-cream hover:text-ink"
                >
                  {showPassword ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-md border border-critical/30 bg-critical-soft px-3 py-2 text-xs font-medium text-critical">
                {error}
              </p>
            ) : null}

            <Button type="submit" loading={loading} className="w-full" aria-label="Entrar na demonstração">
              {!loading ? <LogIn aria-hidden className="h-4 w-4" /> : null}
              {loading ? 'Validando…' : 'Entrar na demonstração'}
            </Button>
          </form>

          <div className="mt-6 rounded-md border border-border bg-cream/60 px-3.5 py-3">
            <p className="text-[11px] font-semibold tracking-wide text-ink-muted uppercase">Credenciais demonstrativas</p>
            <p className="mt-1.5 font-mono text-xs text-ink">Login: Macrame do Leh · Senha: 123</p>
            <p className={cn('mt-2 text-[10px] leading-relaxed text-ink-muted')}>
              Este acesso é apenas uma barreira visual para a apresentação e não constitui um
              mecanismo de segurança adequado para dados reais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
