import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useDemo } from '@/store/DemoContext';
import { useToast } from '@/store/ToastContext';

const COLLAPSE_KEY = 'macrame-demo:sidebar-collapsed';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const { state, recoveredMessage, clearRecovered } = useDemo();
  const { push } = useToast();

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* preferência visual; falha é irrelevante */
    }
  }, [collapsed]);

  // Preferência real de densidade visual das tabelas.
  useEffect(() => {
    document.body.classList.toggle('compact-tables', state.settings.compactTables);
    return () => document.body.classList.remove('compact-tables');
  }, [state.settings.compactTables]);

  useEffect(() => {
    if (recoveredMessage) {
      push({ tone: 'warning', title: 'Dados da demonstração recriados', description: recoveredMessage });
      clearRecovered();
    }
  }, [recoveredMessage, clearRecovered, push]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
        <Header
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <footer className="border-t border-border px-4 py-3 sm:px-6">
          <p className="mx-auto max-w-[1500px] text-center text-[11px] text-ink-muted">
            Protótipo demonstrativo. Dados fictícios. Nenhuma integração real está ativa. — Desenvolvido
            pela Trinary Solutions para apresentação comercial.
          </p>
        </footer>
      </div>
    </div>
  );
}
