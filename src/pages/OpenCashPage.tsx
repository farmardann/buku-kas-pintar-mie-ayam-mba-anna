import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowRight,
  CheckCircle2,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  useDailySessionsQuery,
  useOpenSessionMutation,
  useResetDemoDataMutation,
  useTodaySessionQuery,
} from '../hooks/useKasQueries';
import { formatIDR, formatShortDateLabel, parseNominalInput } from '../utils/finance';

const QUICK_OPENING_AMOUNTS = [150000, 200000, 250000, 300000, 500000];

export function OpenCashPage() {
  const navigate = useNavigate();
  const { data: todaySession, isLoading } = useTodaySessionQuery();
  const { data: allSessions = [] } = useDailySessionsQuery();
  const openSessionMutation = useOpenSessionMutation();
  const resetDemoMutation = useResetDemoDataMutation();

  const [rawAmount, setRawAmount] = useState<string>('200.000');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (todaySession) {
      setRawAmount(formatIDR(todaySession.opening_balance, false));
    }
  }, [todaySession]);

  const numericAmount = parseNominalInput(rawAmount);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const val = parseNominalInput(e.target.value);
    setRawAmount(
      e.target.value.trim() === '0' ? '0' : val > 0 ? formatIDR(val, false) : ''
    );
  };

  const handlePresetClick = (amount: number) => {
    setFormError(null);
    setRawAmount(formatIDR(amount, false));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawAmount.trim() === '' || numericAmount < 0) {
      setFormError('Masukkan nominal saldo kas awal yang valid.');
      return;
    }

    openSessionMutation.mutate(
      { opening_balance: numericAmount },
      {
        onSuccess: () => {
          navigate('/');
        },
      }
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Buka Kas */}
        <div className="lg:col-span-7 bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917]">
                Buka Kas Kedai Hari Ini
              </h1>
              <p className="text-sm sm:text-base text-stone-600 mt-1">
                Catat modal uang kembalian di laci sebelum mulai melayani pembeli Mie Ayam Mba Anna.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#fef7ec] border border-[#dd9e3e]/30 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-[#dd9e3e]" />
            </div>
          </div>

          {todaySession && (
            <div className="mb-6 p-4 rounded-xl bg-[#fef7ec] border border-[#dd9e3e]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#dd9e3e] shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-[#1c1917]">
                    Sesi Hari Ini ({formatShortDateLabel(todaySession.date)}) · Status:{' '}
                    <span>{todaySession.status === 'OPEN' ? 'BUKA (OPEN)' : 'TUTUP (CLOSED)'}</span>
                  </p>
                  <p className="text-stone-600 text-xs mt-0.5 tabular-nums">
                    Kas Awal tercatat: <strong>{formatIDR(todaySession.opening_balance)}</strong> · Estimasi Laci:{' '}
                    <strong>{formatIDR(todaySession.expected_closing_balance)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1c1917] text-white text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Ke Kasir</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div>
              <label
                htmlFor="opening-balance-input"
                className="block text-sm font-semibold text-[#1c1917] mb-2"
              >
                Masukkan Saldo Kas Awal / Uang Kembalian
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-stone-400 select-none">
                  Rp
                </span>
                <input
                  id="opening-balance-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={rawAmount}
                  onChange={handleInputChange}
                  placeholder="200.000"
                  className="w-full min-h-[56px] pl-12 pr-4 py-3 text-2xl font-bold font-mono tabular-nums text-[#1c1917] bg-[#fafaf9] border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dd9e3e] focus:border-[#dd9e3e] transition-all"
                />
              </div>
              {formError && (
                <p role="alert" className="text-xs font-medium text-[#e11d48] mt-2">
                  {formError}
                </p>
              )}
            </div>

            {/* Quick Tap Nominal Presets */}
            <div>
              <span className="block text-xs font-medium text-stone-500 mb-2">
                Pilih Cepat Modal Kembalian (1-Tap):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {QUICK_OPENING_AMOUNTS.map((amt) => {
                  const isSelected = numericAmount === amt && rawAmount !== '0';
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handlePresetClick(amt)}
                      className={`min-h-[48px] px-3 py-2.5 rounded-xl font-mono text-sm font-semibold tabular-nums border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#fef7ec] border-[#dd9e3e] text-[#1c1917] ring-1 ring-[#dd9e3e]'
                          : 'bg-[#fafaf9] border-stone-200 text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      {formatIDR(amt)}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setRawAmount('0');
                  }}
                  className={`min-h-[48px] px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    rawAmount === '0'
                      ? 'bg-[#fef7ec] border-[#dd9e3e] text-[#1c1917]'
                      : 'bg-[#fafaf9] border-stone-200 text-stone-600 hover:border-stone-300'
                  }`}
                >
                  Tanpa Modal (Rp 0)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={openSessionMutation.isPending || isLoading}
              className="w-full min-h-[54px] px-6 py-3.5 rounded-xl bg-[#dd9e3e] hover:bg-[#c88a2e] active:scale-[0.99] text-white font-bold text-base shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>
                {todaySession
                  ? 'Perbarui Saldo Kas Awal & Buka Kedai'
                  : 'Buka Kas & Mulai Jualan Sekarang'}
              </span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Right Column: Riwayat Sesi Kas Harian */}
        <div className="lg:col-span-5 bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#dd9e3e]" />
              <h2 className="text-base font-bold text-[#1c1917]">
                Riwayat Sesi Kasir Harian
              </h2>
            </div>
            <span className="text-xs text-stone-500 tabular-nums">
              {allSessions.length} sesi
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {allSessions.map((session) => (
              <div key={session.id} className="py-3.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#1c1917]">
                      {formatShortDateLabel(session.date)}
                      <span className="mx-1.5 text-stone-300">·</span>
                      <span
                        className={
                          session.status === 'OPEN'
                            ? 'text-[#dd9e3e] font-semibold'
                            : 'text-stone-500 font-medium'
                        }
                      >
                        Status {session.status}
                      </span>
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5 tabular-nums">
                      Kas Awal: {formatIDR(session.opening_balance)} · Estimasi:{' '}
                      {formatIDR(session.expected_closing_balance)}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    {session.status === 'CLOSED' && session.actual_closing_balance !== null ? (
                      <div>
                        <p className="text-xs font-semibold text-[#1c1917] font-mono">
                          Fisik: {formatIDR(session.actual_closing_balance)}
                        </p>
                        <p
                          className={`text-xs font-medium ${
                            (session.difference || 0) < 0
                              ? 'text-[#e11d48]'
                              : 'text-emerald-700'
                          }`}
                        >
                          {session.difference === 0
                            ? 'Selisih Rp 0 (Klop)'
                            : `Selisih ${formatIDR(session.difference || 0)}`}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-[#dd9e3e]">
                        Sedang Berjalan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Ingin mengulang simulasi data dari awal?</span>
            <button
              type="button"
              onClick={() => resetDemoMutation.mutate()}
              className="font-semibold text-stone-700 hover:text-[#e11d48] flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Data Demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
