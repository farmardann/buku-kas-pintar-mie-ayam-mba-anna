import { NavLink } from 'react-router-dom';
import {
  Wallet,
  Zap,
  Calculator,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { useKasUIStore } from '../store/useKasUIStore';

const NAV_ITEMS = [
  {
    to: '/buka-kas',
    label: 'Buka Kas',
    shortLabel: 'Buka Kas',
    icon: Wallet,
  },
  {
    to: '/',
    label: 'Kasir Cepat',
    shortLabel: 'Kasir',
    icon: Zap,
    end: true,
  },
  {
    to: '/tutup-kedai',
    label: 'Tutup Kedai',
    shortLabel: 'Tutup Buku',
    icon: Calculator,
  },
  {
    to: '/dashboard',
    label: 'Dashboard Analitik',
    shortLabel: 'Analitik',
    icon: BarChart3,
  },
];

export function Navbar() {
  const setGuideModalOpen = useKasUIStore((s) => s.setSqlModalOpen);

  return (
    <>
      {/* Top Bar Contract (3 Zones separated by gap-8) */}
      <header className="sticky top-0 z-30 bg-[#ffffff]/95 backdrop-blur-md border-b border-stone-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <NavLink
            to="/"
            className="text-base sm:text-lg font-bold tracking-tight text-[#1c1917] whitespace-nowrap shrink-0"
          >
            Mie Ayam Mba Anna
          </NavLink>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav
            aria-label="Navigasi Utama"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                    isActive
                      ? 'border-[#dd9e3e] text-[#1c1917] font-semibold'
                      : 'border-transparent hover:text-[#1c1917]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: 1 primary action (Pop-up Informasi Penggunaan App) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setGuideModalOpen(true)}
              className="min-h-[40px] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1c1917] bg-[#fef7ec] border border-[#dd9e3e]/40 rounded-xl hover:bg-[#dd9e3e] hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>Cara Pakai Aplikasi</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (Thumb-Zone Friendly) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#ffffff]/95 backdrop-blur-md border-t border-stone-200/90"
      >
        <div className="grid grid-cols-4 items-center h-16 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors ${
                    isActive
                      ? 'text-[#dd9e3e] font-semibold'
                      : 'text-stone-500 hover:text-[#1c1917]'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[11px] tracking-tight mt-1 whitespace-nowrap">
                  {item.shortLabel}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}
