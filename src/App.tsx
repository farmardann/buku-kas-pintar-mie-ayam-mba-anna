import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Navbar } from './components/Navbar';
import { SupabaseSetupModal } from './components/SupabaseSetupModal';
import { OpenCashPage } from './pages/OpenCashPage';
import { CashierPage } from './pages/CashierPage';
import { CloseStorePage } from './pages/CloseStorePage';
import { DashboardPage } from './pages/DashboardPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#fafaf9] text-[#1c1917]">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<CashierPage />} />
              <Route path="/buka-kas" element={<OpenCashPage />} />
              <Route path="/tutup-kedai" element={<CloseStorePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <SupabaseSetupModal />
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              className: 'font-sans',
            }}
          />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
