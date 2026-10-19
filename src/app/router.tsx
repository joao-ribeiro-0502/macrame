import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/store/AuthContext';
import { LoginPage } from '@/features/auth/LoginPage';

// Code-splitting: cada módulo é carregado sob demanda (menor bundle inicial).
const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const ProductsPage = lazy(() =>
  import('@/features/products/ProductsPage').then((module) => ({ default: module.ProductsPage })),
);
const InventoryPage = lazy(() =>
  import('@/features/inventory/InventoryPage').then((module) => ({ default: module.InventoryPage })),
);
const OrdersPage = lazy(() =>
  import('@/features/orders/OrdersPage').then((module) => ({ default: module.OrdersPage })),
);
const ChannelsPage = lazy(() =>
  import('@/features/channels/ChannelsPage').then((module) => ({ default: module.ChannelsPage })),
);
const FinancePage = lazy(() =>
  import('@/features/finance/FinancePage').then((module) => ({ default: module.FinancePage })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/ReportsPage').then((module) => ({ default: module.ReportsPage })),
);
const ActivityPage = lazy(() =>
  import('@/features/activity/ActivityPage').then((module) => ({ default: module.ActivityPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);

function PageFallback() {
  return (
    <div className="flex min-h-60 items-center justify-center">
      <Loader2 aria-hidden className="h-6 w-6 animate-spin text-terracotta" />
      <span className="sr-only">Carregando módulo…</span>
    </div>
  );
}

/** Guard de navegação: sem sessão demonstrativa, redireciona para o login. */
function RequireAuth({ children }: { children?: ReactNode }) {
  const { authenticated } = useAuth();
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children ?? <AppLayout />}</>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/produtos" element={<ProductsPage />} />
          <Route path="/estoque" element={<InventoryPage />} />
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/canais" element={<ChannelsPage />} />
          <Route path="/financeiro" element={<FinancePage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/atividade" element={<ActivityPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
