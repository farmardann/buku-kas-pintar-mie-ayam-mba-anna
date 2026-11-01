import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  RotateCcw,
  Copy,
  Banknote,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useCloseSessionMutation,
  useOpenSessionMutation,
  useTodaySessionQuery,
  useTodayTransactionsQuery,
} from '../hooks/useKasQueries';
import {
  calculateCashDifference,
  calculateExpectedClosingBalance,
  formatIDR,
  formatShortDateLabel,
  formatWhatsAppClosingReport,
  parseNominalInput,
  summarizeTransactions,
  toDateKey,
} from '../utils/finance';

const DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000];

export function CloseStorePage() {
  const { data: todayTransactions = [] } = useTodayTransactionsQuery();
  const { data: todaySession, isLoading } = useTodaySessionQuery();
  const closeSessionMutation = useCloseSessionMutation();
  const openSessionMutation = useOpenSessionMutation();

  const summary = summarizeTransactions(todayTransactions);
  const openingBalance = todaySession?.opening_balance ?? 200000;
  const expectedClosing = calculateExpectedClosingBalance(
    openingBalance,
    summary.totalIncome,
    summary.totalExpense
  );

  const [rawActualCash, setRawActualCash] = useState<string>('');
  const [hasUserEditedActual, setHasUserEditedActual] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Kalkulator Pecahan Uang Lembaran
  const [showDenomCalc, setShowDenomCalc] = useState<boolean>(false);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    if (
      todaySession?.actual_closing_balance !== null &&
      todaySession?.actual_closing_balance !== undefined
    ) {
      setRawActualCash(formatIDR(todaySession.actual_closing_balance, false));
    } else if (!hasUserEditedActual && expectedClosing > 0) {
      setRawActualCash(formatIDR(expectedClosing, false));
    }
  }, [todaySession?.actual_closing_balance, expectedClosing, hasUserEditedActual]);

  const actualNumeric = parseNominalInput(rawActualCash);
  const hasEnteredActual = rawActualCash.trim() !== '';
  const diffResult = calculateCashDifference(expectedClosing, actualNumeric);

  const handleActualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    setHasUserEditedActual(true);
    const val = parseNominalInput(e.target.value);
    setRawActualCash(
      e.target.value.trim() === '0' ? '0' : val > 0 ? formatIDR(val, false) : ''
    );
  };

  const handleMatchExpected = () => {
    setFormError(null);
    setHasUserEditedActual(true);
    setRawActualCash(formatIDR(expectedClosing, false));
  };

  const handleDenomCountChange = (denom: number, countStr: string) => {
    const count = Math.max(0, Number.parseInt(countStr.replace(/[^\d]/g, '') || '0', 10));
    const nextCounts = { ...denomCounts, [denom]: count };
    setDenomCounts(nextCounts);

    const totalFromDenoms = DENOMINATIONS.reduce(
      (sum, d) => sum + d * (nextCounts[d] || 0),
      0
    );
    setHasUserEditedActual(true);
    setFormError(null);
    setRawActualCash(totalFromDenoms > 0 ? formatIDR(totalFromDenoms, false) : '0');
  };

  const handleCopyWhatsAppReport = async () => {
    const dateLabel = formatShortDateLabel(
      todaySession?.date || toDateKey(new Date())
    );
    const text = formatWhatsAppClosingReport({
      dateLabel,
      openingBalance,
      totalIncome: summary.totalIncome,
      incomeCount: summary.incomeCount,
      totalExpense: summary.totalExpense,
      expenseCount: summary.expenseCount,
      expectedClosing,
      actualClosing: actualNumeric,
      notes,
    });

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Laporan Rekap berhasil disalin!', {
        description: 'Siap ditempel (paste) ke WhatsApp Mba Anna.',
      });
    } catch {
      toast.error('Gagal menyalin laporan');
    }
  };

  const handleCloseBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEnteredActual) {
      setFormError('Masukkan total uang fisik di laci saat ini terlebih dahulu.');
      return;
    }

    const sessionId = todaySession?.id || 'session-today-open';
    closeSessionMutation.mutate({
      sessionId,
      expected_closing_balance: expectedClosing,
      actual_closing_balance: actualNumeric,
      notes: notes.trim() || undefined,
    });
  };

  const handleReopenSession = () => {
    openSessionMutation.mutate({
      opening_balance: openingBalance,
    });
  };

  const isClosed = todaySession?.status === 'CLOSED';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917]">
            Tutup Kedai & Rekap Harian
          </h1>
          <p className="text-sm sm:text-base text-stone-600 mt-0.5">
            Cocokkan uang tunai fisik di laci dengan perhitungan otomatis transaksi hari ini.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {todaySession && (
            <div className="px-3.5 py-2 rounded-xl bg-[#ffffff] border border-stone-200/80 text-xs sm:text-sm font-medium text-stone-600 shrink-0">
              Tanggal:{' '}
              <strong className="text-[#1c1917]">
                {formatShortDateLabel(todaySession.date)}
              </strong>
              <span className="mx-2 text-stone-300">·</span>
              Status:{' '}
              <strong className={isClosed ? 'text-stone-700' : 'text-[#dd9e3e]'}>
                {isClosed ? 'TUTUP BUKU (CLOSED)' : 'AKTIF (OPEN)'}
              </strong>
            </div>
          )}

          <button
            type="button"
            onClick={handleCopyWhatsAppReport}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#ffffff] border border-stone-200 hover:border-[#dd9e3e] text-xs sm:text-sm font-semibold text-[#1c1917] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4 text-[#dd9e3e]" />
            <span>Salin Rekap WA</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Ringkasan Perhitungan Kas & Estimasi Laci */}
        <div className="lg:col-span-6 bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-5 sm:p-7 space-y-6">
          <h2 className="text-lg font-bold text-[#1c1917]">
            Rincian Perhitungan Kas Hari Ini
          </h2>

          {/* Breakdown Rows */}
          <div className="space-y-3.5 text-sm sm:text-base">
            <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
              <span className="text-stone-600">1. Saldo Kas Awal (Modal Kembalian)</span>
              <span className="font-mono font-semibold tabular-nums text-[#1c1917]">
                {formatIDR(openingBalance)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
              <div className="flex items-center gap-1.5 text-stone-600">
                <ArrowUpRight className="w-4 h-4 text-[#dd9e3e]" />
                <span>2. Total Pemasukan ({summary.incomeCount} transaksi)</span>
              </div>
              <span className="font-mono font-bold tabular-nums text-[#dd9e3e]">
                +{formatIDR(summary.totalIncome)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2.5 border-b border-stone-100">
              <div className="flex items-center gap-1.5 text-stone-600">
                <ArrowDownRight className="w-4 h-4 text-[#e11d48]" />
                <span>3. Total Pengeluaran ({summary.expenseCount} transaksi)</span>
              </div>
              <span className="font-mono font-bold tabular-nums text-[#e11d48]">
                -{formatIDR(summary.totalExpense)}
              </span>
            </div>
          </div>

          {/* Highlight Box: Estimasi Uang di Laci (#dd9e3e) */}
          <div className="p-5 rounded-2xl bg-[#fef7ec] border border-[#dd9e3e]/40 space-y-1.5">
            <span className="text-xs sm:text-sm font-semibold text-stone-700 block">
              Estimasi Uang di Laci (Kas Awal + Pemasukan − Pengeluaran)
            </span>
            <p
              data-testid="expected-closing-balance"
              className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-[#dd9e3e]"
            >
              {formatIDR(expectedClosing)}
            </p>
            <p className="text-xs text-stone-600 pt-1">
              Laba Bersih Operasional Hari Ini:{' '}
              <strong className="font-mono tabular-nums text-[#1c1917]">
                {formatIDR(summary.netProfit)}
              </strong>
            </p>
          </div>

          {/* Quick Link to Add Missed Transactions */}
          <div className="flex items-center justify-between pt-2 text-xs sm:text-sm text-stone-500">
            <span>Ada bon belanja atau penjualan yang belum dicatat?</span>
            <Link
              to="/"
              className="font-semibold text-[#dd9e3e] hover:underline shrink-0"
            >
              + Tambah di Kasir
            </Link>
          </div>
        </div>

        {/* Right Column: Form Input Uang Fisik & Tutup Buku */}
        <div className="lg:col-span-6 bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-5 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1c1917]">
                Verifikasi Uang Fisik di Laci
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Hitung seluruh lembaran dan koin yang ada di laci saat ini.
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#fafaf9] border border-stone-200 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5 text-[#dd9e3e]" />
            </div>
          </div>

          {/* Alat Bantu Hitung Pecahan Uang Lembaran */}
          <div className="rounded-xl border border-stone-200 bg-[#fafaf9] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDenomCalc((v) => !v)}
              className="w-full min-h-[44px] px-4 py-2.5 flex items-center justify-between text-xs sm:text-sm font-semibold text-[#1c1917] hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-[#dd9e3e]" />
                <span>Kalkulator Hitung Pecahan Lembaran Uang</span>
              </span>
              {showDenomCalc ? (
                <ChevronUp className="w-4 h-4 text-stone-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-500" />
              )}
            </button>

            {showDenomCalc && (
              <div className="p-4 pt-2 border-t border-stone-200/80 space-y-2.5">
                <p className="text-xs text-stone-500">
                  Masukkan jumlah lembar per pecahan untuk menjumlahkan uang fisik secara otomatis:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {DENOMINATIONS.map((denom) => (
                    <div
                      key={denom}
                      className="bg-white p-2 rounded-lg border border-stone-200 flex items-center justify-between gap-2"
                    >
                      <span className="font-mono text-xs font-semibold text-stone-700 whitespace-nowrap">
                        {denom >= 1000 ? `${denom / 1000}rb` : denom}
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Jumlah lembar Rp ${denom}`}
                        value={denomCounts[denom] ? String(denomCounts[denom]) : ''}
                        onChange={(e) => handleDenomCountChange(denom, e.target.value)}
                        placeholder="0 lbr"
                        className="w-16 min-h-[34px] px-2 py-1 text-right font-mono text-xs font-bold bg-[#fafaf9] border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#dd9e3e]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleCloseBook} className="space-y-5" noValidate>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="actual-cash-input"
                  className="text-sm font-semibold text-[#1c1917]"
                >
                  Total Uang Fisik Saat Ini
                </label>
                <button
                  type="button"
                  onClick={handleMatchExpected}
                  className="text-xs font-semibold text-[#dd9e3e] hover:underline cursor-pointer"
                >
                  Isi Sesuai Estimasi ({formatIDR(expectedClosing)})
                </button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-stone-400 select-none">
                  Rp
                </span>
                <input
                  id="actual-cash-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={rawActualCash}
                  onChange={handleActualChange}
                  placeholder={formatIDR(expectedClosing, false)}
                  className="w-full min-h-[58px] pl-12 pr-4 py-3 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#1c1917] bg-[#fafaf9] border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dd9e3e] focus:border-[#dd9e3e] transition-all"
                />
              </div>

              {formError && (
                <p role="alert" className="text-xs font-semibold text-[#e11d48] mt-2">
                  {formError}
                </p>
              )}
            </div>

            {/* Automatic Difference Calculation Card */}
            {hasEnteredActual && (
              <div
                data-testid="difference-status-box"
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  diffResult.status === 'DEFICIT'
                    ? 'bg-[#fff1f2] border-[#e11d48]/40 text-[#1c1917]'
                    : diffResult.status === 'MATCH'
                    ? 'bg-[#fef7ec] border-[#dd9e3e]/40 text-[#1c1917]'
                    : 'bg-stone-50 border-stone-200 text-[#1c1917]'
                }`}
              >
                {diffResult.status === 'DEFICIT' ? (
                  <AlertTriangle className="w-5 h-5 text-[#e11d48] shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#dd9e3e] shrink-0 mt-0.5" />
                )}

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-stone-600">
                      Selisih Kas Otomatis:
                    </span>
                    <span
                      className={`font-mono text-base font-bold tabular-nums ${
                        diffResult.status === 'DEFICIT'
                          ? 'text-[#e11d48]'
                          : 'text-[#1c1917]'
                      }`}
                    >
                      {diffResult.difference === 0
                        ? 'Rp 0 (Pas / Klop)'
                        : diffResult.difference > 0
                        ? `+${formatIDR(diffResult.difference)} (Lebih)`
                        : `${formatIDR(diffResult.difference)} (Kurang)`}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1">
                    {diffResult.status === 'MATCH' &&
                      'Jumlah uang fisik di laci sama persis dengan catatan transaksi hari ini.'}
                    {diffResult.status === 'SURPLUS' &&
                      'Uang fisik di laci lebih banyak dari estimasi. Pastikan tidak ada uang pribadi yang tercampur.'}
                    {diffResult.status === 'DEFICIT' &&
                      'Perhatian: Uang fisik di laci kurang dari estimasi. Periksa kembali apakah ada pengeluaran yang belum dicatat.'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="closing-notes-input"
                className="block text-sm font-semibold text-[#1c1917] mb-1.5"
              >
                Catatan Tutup Buku (Opsional)
              </label>
              <input
                id="closing-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Disetor ke Mba Anna Rp 300.000, sisa di laci Rp 90.000"
                className="w-full min-h-[48px] px-3.5 py-2.5 text-sm sm:text-base text-[#1c1917] bg-[#fafaf9] border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dd9e3e]"
              />
            </div>

            {/* Primary CTA Button (#dd9e3e) */}
            <button
              type="submit"
              disabled={closeSessionMutation.isPending || isLoading}
              className="w-full min-h-[54px] px-6 py-3.5 rounded-xl bg-[#dd9e3e] hover:bg-[#c88a2e] active:scale-[0.99] text-white font-bold text-base shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Lock className="w-5 h-5" />
              <span>
                {isClosed ? 'Perbarui Rekap Tutup Buku Hari Ini' : 'Tutup Buku Hari Ini'}
              </span>
            </button>

            {isClosed && (
              <div className="pt-2 flex items-center justify-between text-xs text-stone-600">
                <span>Sesi kas hari ini sudah berstatus CLOSED.</span>
                <button
                  type="button"
                  onClick={handleReopenSession}
                  className="font-semibold text-[#1c1917] hover:text-[#dd9e3e] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Buka Kembali Sesi (OPEN)</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
