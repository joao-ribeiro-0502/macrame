import { HashRouter } from 'react-router-dom';
import { AppRoutes } from '@/app/router';
import { AuthProvider } from '@/store/AuthContext';
import { DemoProvider } from '@/store/DemoContext';
import { ToastProvider } from '@/store/ToastContext';

/**
 * Bootstrap da aplicação demonstrativa.
 * HashRouter garante que o build estático funcione em qualquer hospedagem
 * (inclusive sem configuração de rewrites no servidor).
 */
export function App() {
  return (
    <DemoProvider>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </DemoProvider>
  );
}
