import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useDemo } from '@/store/DemoContext';
import { useAuth } from '@/store/AuthContext';
import { formatBRL, formatRelative } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/Modal';
import { initials } from '@/lib/formatters';

interface HeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobileMenu: () => void;
}

export function Header({ collapsed, onToggleCollapse, onOpenMobileMenu }: HeaderProps) {
  const { state, dispatch } = useDemo();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  /* Fecha dropdowns ao clicar fora */
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setSearchOpen(false);
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) setNotificationsOpen(false);
      if (userRef.current && !userRef.current.contains(event.target as Node)) setUserOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return { products: [], orders: [] };
    const products = state.products
      .filter((product) => product.name.toLowerCase().includes(term) || product.sku.toLowerCase().includes(term))
      .slice(0, 4);
    const orders = state.orders
      .filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term),
      )
      .slice(0, 4);
    return { products, orders };
  }, [query, state.products, state.orders]);

  const recentEvents = useMemo(() => state.activity.slice(0, 6), [state.activity]);
  const recentCount = useMemo(() => {
    const dayAgo = Date.now() - 24 * 3600_000;
    return state.activity.filter((event) => new Date(event.timestamp).getTime() >= dayAgo).length;
  }, [state.activity]);

  function handleSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      const term = query.trim();
      if (term.length >= 2) {
        navigate(`/produtos?q=${encodeURIComponent(term)}`);
        setSearchOpen(false);
        setQuery('');
      }
    }
    if (event.key === 'Escape') setSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-surface/95 px-3 backdrop-blur-sm sm:px-5">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        aria-label="Abrir menu de navegação"
        className="rounded-md p-2 text-ink-soft hover:bg-cream hover:text-ink lg:hidden"
      >
        <Menu aria-hidden className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        className="hidden rounded-md p-2 text-ink-soft transition-colors hover:bg-cream hover:text-ink lg:block"
      >
        {collapsed ? <PanelLeftOpen aria-hidden className="h-4.5 w-4.5" /> : <PanelLeftClose aria-hidden className="h-4.5 w-4.5" />}
      </button>

      <div className="hidden min-w-0 flex-col sm:flex">
        <span className="truncate text-sm font-semibold text-ink">
          Macramê do Leh <span className="font-normal text-ink-muted">·</span> Brilho de Orixá
        </span>
        <span className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-terracotta uppercase">
          <ShieldCheck aria-hidden className="h-3 w-3" />
          Ambiente demonstrativo
        </span>
      </div>

      {/* Busca global */}
      <div ref={searchRef} className="relative ml-auto w-full max-w-xs">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={handleSearchKey}
          placeholder="Buscar produtos, pedidos…"
          aria-label="Busca global"
          className="h-9.5 w-full rounded-md border border-border-strong bg-cream/50 pr-3 pl-9 text-sm text-ink placeholder:text-ink-muted/80 transition-colors focus:border-terracotta focus:bg-surface focus:outline-none"
        />
        {searchOpen && query.trim().length >= 2 ? (
          <div className="absolute top-11 right-0 left-0 z-30 overflow-hidden rounded-lg border border-border bg-surface shadow-md">
            {results.products.length === 0 && results.orders.length === 0 ? (
              <p className="px-4 py-3 text-xs text-ink-muted">Nenhum resultado para “{query.trim()}”.</p>
            ) : (
              <>
                {results.products.length > 0 ? (
                  <div className="border-b border-border">
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
                      Produtos
                    </p>
                    {results.products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          navigate(`/produtos?q=${encodeURIComponent(product.sku)}`);
                          setSearchOpen(false);
                          setQuery('');
                        }}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-cream"
                      >
                        <span className="truncate text-ink">{product.name}</span>
                        <span className="shrink-0 text-xs text-ink-muted">{product.sku}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {results.orders.length > 0 ? (
                  <div>
                    <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold tracking-wide text-ink-muted uppercase">
                      Pedidos
                    </p>
                    {results.orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          navigate(`/pedidos?q=${encodeURIComponent(order.orderNumber.replace('#', ''))}`);
                          setSearchOpen(false);
                          setQuery('');
                        }}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-cream"
                      >
                        <span className="truncate text-ink">
                          {order.orderNumber} · {order.customerName}
                        </span>
                        <span className="shrink-0 text-xs text-ink-muted">{formatBRL(order.total)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Notificações */}
      <div ref={bellRef} className="relative">
        <button
          type="button"
          onClick={() => setNotificationsOpen((open) => !open)}
          aria-label={`Notificações${recentCount > 0 ? ` (${recentCount} nas últimas 24h)` : ''}`}
          aria-expanded={notificationsOpen}
          className="relative rounded-md p-2 text-ink-soft transition-colors hover:bg-cream hover:text-ink"
        >
          <Bell aria-hidden className="h-4.5 w-4.5" />
          {recentCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-terracotta px-0.5 text-[9px] font-bold text-white">
              {recentCount > 9 ? '9+' : recentCount}
            </span>
          ) : null}
        </button>
        {notificationsOpen ? (
          <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-surface shadow-md">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <p className="text-xs font-semibold text-ink">Atividade recente</p>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  navigate('/atividade');
                }}
                className="text-[11px] font-medium text-terracotta hover:underline"
              >
                Ver tudo
              </button>
            </div>
            {recentEvents.length === 0 ? (
              <p className="px-4 py-3 text-xs text-ink-muted">Nenhum evento recente.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {recentEvents.map((event) => (
                  <li key={event.id} className="px-4 py-2.5">
                    <p className="text-xs leading-snug text-ink">{event.message}</p>
                    <p className="mt-0.5 text-[10px] text-ink-muted">{formatRelative(event.timestamp)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {/* Restaurar demonstração */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setResetOpen(true)}
        title="Restaura os dados fictícios ao estado inicial"
        className="hidden md:inline-flex"
      >
        <RotateCcw aria-hidden className="h-3.5 w-3.5" />
        Restaurar demonstração
      </Button>

      {/* Menu do usuário */}
      <div ref={userRef} className="relative">
        <button
          type="button"
          onClick={() => setUserOpen((open) => !open)}
          aria-expanded={userOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-strong bg-sand text-xs font-semibold text-ink transition-colors hover:bg-sand-strong"
        >
          <span aria-hidden>{initials('Macrame do Leh')}</span>
          <span className="sr-only">Menu do usuário</span>
        </button>
        {userOpen ? (
          <div className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-lg border border-border bg-surface shadow-md">
            <div className="border-b border-border px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <UserRound aria-hidden className="h-3.5 w-3.5" />
                Macramê do Leh · Brilho de Orixá
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">Sessão demonstrativa local</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                setResetOpen(true);
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-soft hover:bg-cream hover:text-ink md:hidden"
            >
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              Restaurar demonstração
            </button>
            <button
              type="button"
              onClick={() => {
                setUserOpen(false);
                logout();
                navigate('/login');
              }}
              className="flex w-full items-center gap-2.5 border-t border-border px-4 py-2.5 text-left text-sm text-critical hover:bg-critical-soft"
            >
              <LogOut aria-hidden className="h-3.5 w-3.5" />
              Sair da demonstração
            </button>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          dispatch({ type: 'RESET' });
          setResetOpen(false);
        }}
        title="Restaurar demonstração"
        confirmLabel="Restaurar dados"
        tone="danger"
        message={
          <span>
            Todos os dados fictícios (produtos, pedidos, estoque, canais, financeiro, atividades e
            configurações) voltarão ao estado inicial.{' '}
            <strong className="text-ink">A sessão de acesso não será alterada.</strong>
          </span>
        }
      />
    </header>
  );
}
