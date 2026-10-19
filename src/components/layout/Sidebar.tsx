import { NavLink } from 'react-router-dom';
import {
  Activity,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  Store,
  BarChart3,
  ShoppingCart,
  Wallet,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/produtos', label: 'Produtos', icon: Package },
  { to: '/estoque', label: 'Estoque', icon: Boxes },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { to: '/canais', label: 'Canais de venda', icon: Store },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/atividade', label: 'Atividade do sistema', icon: Activity },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Overlay (mobile) */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-ink/35 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden
        />
      ) : null}

      <aside
        aria-label="Navegação principal"
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-surface transition-[width,transform] duration-200',
          'lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-60',
          'w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Marca */}
        <div className={cn('flex h-14 items-center gap-2.5 border-b border-border px-4', collapsed && 'lg:justify-center lg:px-0')}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-terracotta text-white">
            <Sparkles aria-hidden className="h-4 w-4" />
          </span>
          <span className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <span className="block truncate text-sm font-semibold text-ink">Macramê do Leh</span>
            <span className="block truncate text-[10px] tracking-wide text-ink-muted uppercase">
              + Brilho de Orixá · Demo
            </span>
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Fechar menu"
            className="ml-auto rounded p-1 text-ink-muted hover:bg-cream hover:text-ink lg:hidden"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2.5 py-3">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-terracotta-soft text-terracotta-strong'
                        : 'text-ink-soft hover:bg-cream hover:text-ink',
                      collapsed && 'lg:justify-center lg:px-0',
                    )
                  }
                >
                  <item.icon aria-hidden className="h-4.5 w-4.5 shrink-0" />
                  <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={cn('border-t border-border px-4 py-3', collapsed && 'lg:hidden')}>
          <p className="text-[10px] leading-relaxed text-ink-muted">
            Protótipo demonstrativo. Dados fictícios. Nenhuma integração real está ativa.
          </p>
        </div>
      </aside>
    </>
  );
}
