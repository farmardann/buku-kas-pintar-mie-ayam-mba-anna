import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Trash2,
  Zap,
  RotateCcw,
  Wallet,
  Calculator,
  Pencil,
  Check,
  X,
  Banknote,
  Lock,
} from 'lucide-react';
import {
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useOpenSessionMutation,
  useResetDemoDataMutation,
  useTodaySessionQuery,
  useTodayTransactionsQuery,
  useUpdateTransactionMutation,
} from '../hooks/useKasQueries';
import { useKasUIStore } from '../store/useKasUIStore';
import { Transaction } from '../types/kas';
import {
  calculateCustomerChange,
  calculateExpectedClosingBalance,
  formatIDR,
  parseNominalInput,
  summarizeTransactions,
} from '../utils/finance';

const QUICK_NOMINALS = [
  { amount: 15000, label: 'Rp 15.000', desc: 'Mie Ayam Biasa' },
  { amount: 20000, label: 'Rp 20.000', desc: 'Mie Ayam Bakso / Ceker' },
  { amount: 50000, label: 'Rp 50.000', desc: 'Paket 2 Porsi + Minum' },
];

const QUICK_INCREMENTS = [15000, 20000, 50000, 100000];
const EXPENSE_QUICK_NOMINALS = [15000, 25000, 50000, 100000];
const CUSTOMER_CASH_BILLS = [20000, 50000, 100000];

export function CashierPage() {
  const activeTab = useKasUIStore((s) => s.activeCashierTab);
  const setActiveTab = useKasUIStore((s) => s.setActiveCashierTab);

  const { data: categories = [] } = useCategoriesQuery();
  const { data: todayTransactions = [], isLoading: isTxLoading } =
    useTodayTransactionsQuery();
  const { data: todaySession } = useTodaySessionQuery();

  const createTxMutation = useCreateTransactionMutation();
  const updateTxMutation = useUpdateTransactionMutation();
  const deleteTxMutation = useDeleteTransactionMutation();
  const createCatMutation = useCreateCategoryMutation();
  const openSessionMutation = useOpenSessionMutation();
  const resetDemoMutation = useResetDemoDataMutation();

  // State Input Form Utama
  const [rawAmount, setRawAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // State Kalkulator Uang Kembalian Pembeli
  const [customerPaid, setCustomerPaid] = useState<number | null>(null);

  // State Tambah Kategori Cepat
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // State Edit Transaksi Inline
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editAmountRaw, setEditAmountRaw] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');
  const [editCategoryId, setEditCategoryId] = useState<string>('');

  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const defaultIncomeCatId =
    incomeCategories[0]?.id || '11111111-1111-4111-8111-111111111101';
  const defaultExpenseCatId =
    expenseCategories[0]?.id || '22222222-2222-4222-8222-222222222201';

  const activeCategoryId =
    selectedCategoryId &&
    categories.some((c) => c.id === selectedCategoryId && c.type === activeTab)
      ? selectedCategoryId
      : activeTab === 'INCOME'
      ? defaultIncomeCatId
      : defaultExpenseCatId;

  const numericAmount = parseNominalInput(rawAmount);

  const todaySummary = summarizeTransactions(todayTransactions);
  const openingBalance = todaySession?.opening_balance ?? 200000;
  const expectedDrawerCash = calculateExpectedClosingBalance(
    openingBalance,
    todaySummary.totalIncome,
    todaySummary.totalExpense
  );

  const isSessionClosed = todaySession?.status === 'CLOSED';

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormError(null);
    const val = parseNominalInput(e.target.value);
    setRawAmount(val > 0 ? formatIDR(val, false) : '');
  };

  const handleSetNominal = (amount: number, defaultDesc?: string) => {
    setFormError(null);
    setRawAmount(formatIDR(amount, false));
    if (defaultDesc && !description) {
      setDescription(defaultDesc);
    }
  };

  const handleAddNominal = (increment: number) => {
    setFormError(null);
    const next = numericAmount + increment;
    setRawAmount(formatIDR(next, false));
  };

  /**
   * 1-Tap Instant Cash In untuk jam sibuk kasir
   */
  const handleInstantCashIn = (amount: number, labelDesc: string) => {
    setFormError(null);
    createTxMutation.mutate({
      amount,
      type: 'INCOME',
      category_id: defaultIncomeCatId,
      description: labelDesc,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) {
      setFormError('Masukkan atau pilih nominal transaksi terlebih dahulu.');
      return;
    }

    createTxMutation.mutate(
      {
        amount: numericAmount,
        type: activeTab,
        category_id: activeCategoryId,
        description: description.trim() || null,
      },
      {
        onSuccess: () => {
          setRawAmount('');
          setDescription('');
          setCustomerPaid(null);
          setFormError(null);
        },
      }
    );
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    createCatMutation.mutate(
      { name: newCategoryName.trim(), type: activeTab },
      {
        onSuccess: (created) => {
          setSelectedCategoryId(created.id);
          setNewCategoryName('');
          setIsAddingCategory(false);
        },
      }
    );
  };

  const startEditingTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setEditAmountRaw(formatIDR(tx.amount, false));
    setEditDesc(tx.description || '');
    setEditCategoryId(tx.category_id);
  };

  const saveEditedTx = (tx: Transaction) => {
    const newAmt = parseNominalInput(editAmountRaw);
    if (newAmt <= 0) return;
    updateTxMutation.mutate(
      {
        id: tx.id,
        amount: newAmt,
        type: tx.type,
        category_id: editCategoryId || tx.category_id,
        description: editDesc.trim() || null,
      },
      {
        onSuccess: () => {
          setEditingTxId(null);
        },
      }
    );
  };

  const isIncome = activeTab === 'INCOME';
  const changeResult =
    customerPaid !== null && numericAmount > 0
      ? calculateCustomerChange(numericAmount, customerPaid)
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-7 pb-24 md:pb-12 space-y-6">
      {/* Peringatan jika Sesi Hari Ini sudah Tutup Buku (CLOSED) */}
      {isSessionClosed && (
        <div
          role="status"
          className="p-4 rounded-2xl bg-[#fef7ec] border border-[#dd9e3e]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#dd9e3e] shrink-0" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold text-[#1c1917]">
                Sesi Kas Hari Ini Sudah Ditutup (CLOSED)
              </p>
              <p className="text-stone-600">
                Transaksi baru tetap dapat dicatat atau Anda dapat membuka kembali sesi laci hari ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openSessionMutation.mutate({ opening_balance: openingBalance })}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#1c1917] text-white text-xs font-semibold hover:bg-stone-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Buka Kembali Sesi (OPEN)
          </button>
        </div>
      )}

      {/* Top Bar Summary Strip: Status Kas Harian */}
      <section
        aria-label="Ringkasan Laci Kas Hari Ini"
        className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-5"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-500">Kas Awal Laci</span>
              <Link
                to="/buka-kas"
                className="text-xs font-semibold text-[#dd9e3e] hover:underline"
              >
                Ubah
              </Link>
            </div>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#1c1917] mt-0.5">
              {formatIDR(openingBalance)}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-stone-500">
              Pemasukan Hari Ini ({todaySummary.incomeCount}x)
            </span>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#dd9e3e] mt-0.5">
              +{formatIDR(todaySummary.totalIncome)}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-stone-500">
              Pengeluaran Hari Ini ({todaySummary.expenseCount}x)
            </span>
            <p className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#e11d48] mt-0.5">
              -{formatIDR(todaySummary.totalExpense)}
            </p>
          </div>

          <div className="col-span-2 lg:col-span-1 bg-[#fafaf9] rounded-xl p-3 border border-stone-200/70 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-stone-600 block">
                Estimasi Uang di Laci
              </span>
              <p
                data-testid="drawer-estimated-cash"
                className="text-base sm:text-lg font-bold font-mono tabular-nums text-[#dd9e3e] whitespace-nowrap"
              >
                {formatIDR(expectedDrawerCash)}
              </p>
            </div>
            <Link
              to="/tutup-kedai"
              aria-label="Ke halaman tutup kedai"
              className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-[#1c1917] text-white text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              <span>Rekap</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Split Grid: Kasir Cepat (Left) + Riwayat Hari Ini (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Panel Input Kasir Cepat */}
        <div className="lg:col-span-7 bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-6 space-y-5">
          {/* 2 Tombol Tab Besar: Pemasukan (Cash In) & Pengeluaran (Cash Out) */}
          <div
            role="tablist"
            aria-label="Pilih Jenis Transaksi"
            className="grid grid-cols-2 gap-2.5 sm:gap-3"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isIncome}
              onClick={() => {
                setActiveTab('INCOME');
                setFormError(null);
              }}
              className={`min-h-[58px] px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-base flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 border-2 transition-all text-center cursor-pointer ${
                isIncome
                  ? 'border-[#dd9e3e] bg-[#fef7ec] text-[#dd9e3e] shadow-xs'
                  : 'border-stone-200 bg-[#fafaf9] text-stone-500 hover:text-[#1c1917]'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5 leading-tight">
                <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Pemasukan</span>
              </span>
              <span className="text-[11px] sm:text-sm font-semibold opacity-85 leading-tight">
                (Cash In)
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={!isIncome}
              onClick={() => {
                setActiveTab('EXPENSE');
                setFormError(null);
              }}
              className={`min-h-[58px] px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-base flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 border-2 transition-all text-center cursor-pointer ${
                !isIncome
                  ? 'border-[#e11d48] bg-[#fff1f2] text-[#e11d48] shadow-xs'
                  : 'border-stone-200 bg-[#fafaf9] text-stone-500 hover:text-[#1c1917]'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5 leading-tight">
                <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Pengeluaran</span>
              </span>
              <span className="text-[11px] sm:text-sm font-semibold opacity-85 leading-tight">
                (Cash Out)
              </span>
            </button>
          </div>

          {/* 1-Tap Jam Sibuk Section (Khusus Tab Pemasukan) */}
          {isIncome && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-[#fafaf9] border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-[#dd9e3e] shrink-0" />
                  <h2 className="text-xs sm:text-sm font-bold text-[#1c1917]">
                    Tombol Cepat Nominal
                  </h2>
                </div>
                <span className="text-[11px] text-stone-500 whitespace-nowrap shrink-0">
                  Mode Jam Sibuk
                </span>
              </div>

              {/* 3 Main Quick Nominal Buttons (Rp 15.000, Rp 20.000, Rp 50.000) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {QUICK_NOMINALS.map((preset) => {
                  const isSelected = numericAmount === preset.amount;
                  return (
                    <div
                      key={preset.amount}
                      className={`rounded-xl border p-3 transition-all flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-[#fef7ec] border-[#dd9e3e] ring-1 ring-[#dd9e3e]'
                          : 'bg-[#ffffff] border-stone-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSetNominal(preset.amount, preset.desc)}
                        className="text-left w-full cursor-pointer group"
                      >
                        <span className="block font-mono text-base sm:text-lg font-bold tabular-nums text-[#1c1917] group-hover:text-[#dd9e3e] transition-colors">
                          {preset.label}
                        </span>
                        <span className="block text-xs text-stone-500 mt-0.5 truncate">
                          {preset.desc}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={createTxMutation.isPending}
                        aria-label={`1-Tap Masuk ${preset.label}`}
                        onClick={() =>
                          handleInstantCashIn(
                            preset.amount,
                            `${preset.desc} (${preset.label})`
                          )
                        }
                        className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-[#dd9e3e] hover:bg-[#c88a2e] active:scale-[0.98] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        <span>1-Tap Simpan</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Input Transaksi */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="cashier-amount-input"
                  className="text-sm font-semibold text-[#1c1917]"
                >
                  {isIncome ? 'Nominal Pemasukan (Rupiah)' : 'Nominal Pengeluaran (Rupiah)'}
                </label>
                {rawAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawAmount('');
                      setCustomerPaid(null);
                      setFormError(null);
                    }}
                    className="text-xs font-medium text-stone-500 hover:text-[#1c1917] flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Nominal</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <span
                  className={`absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold select-none ${
                    isIncome ? 'text-[#dd9e3e]' : 'text-[#e11d48]'
                  }`}
                >
                  Rp
                </span>
                <input
                  id="cashier-amount-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={rawAmount}
                  onChange={handleAmountChange}
                  placeholder={isIncome ? '20.000' : '45.000'}
                  className={`w-full min-h-[58px] pl-12 pr-4 py-3 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#1c1917] bg-[#fafaf9] border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    isIncome
                      ? 'border-stone-300 focus:ring-[#dd9e3e] focus:border-[#dd9e3e]'
                      : 'border-stone-300 focus:ring-[#e11d48] focus:border-[#e11d48]'
                  }`}
                />
              </div>

              {/* Tombol Tambah Cepat Nominal (+15rb, +20rb, +50rb, +100rb) */}
              <div className="grid grid-cols-4 gap-2 mt-2.5">
                {(isIncome ? QUICK_INCREMENTS : EXPENSE_QUICK_NOMINALS).map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => handleAddNominal(inc)}
                    className={`min-h-[44px] px-2 py-2 rounded-xl font-mono text-xs sm:text-sm font-semibold tabular-nums border transition-colors cursor-pointer ${
                      isIncome
                        ? 'bg-[#fafaf9] border-stone-200 text-[#1c1917] hover:border-[#dd9e3e] hover:bg-[#fef7ec]'
                        : 'bg-[#fafaf9] border-stone-200 text-[#1c1917] hover:border-[#e11d48] hover:bg-[#fff1f2]'
                    }`}
                  >
                    +{formatIDR(inc, false)}
                  </button>
                ))}
              </div>

              {/* Alat Bantu Hitung Kembalian Pembeli (Muncul otomatis saat nominal pemasukan diisi) */}
              {isIncome && numericAmount > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-[#fafaf9] border border-stone-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-[#dd9e3e]" />
                      <span>Hitung Cepat Kembalian Pembeli:</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCustomerPaid(numericAmount)}
                        className={`min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          customerPaid === numericAmount
                            ? 'bg-[#1c1917] text-white border-[#1c1917]'
                            : 'bg-white text-stone-600 border-stone-200 hover:text-[#1c1917]'
                        }`}
                      >
                        Uang Pas
                      </button>
                      {CUSTOMER_CASH_BILLS.filter((b) => b >= numericAmount).map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => setCustomerPaid(bill)}
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg font-mono text-xs font-semibold tabular-nums border transition-colors cursor-pointer ${
                            customerPaid === bill
                              ? 'bg-[#dd9e3e] text-white border-[#dd9e3e]'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-[#dd9e3e]'
                          }`}
                        >
                          {formatIDR(bill)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {changeResult && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-stone-200/60 text-xs">
                      <span className="text-stone-600">
                        Diterima: <strong className="font-mono">{formatIDR(customerPaid!)}</strong>
                      </span>
                      <span className="font-mono font-bold text-sm text-[#dd9e3e]">
                        Kembalian: {formatIDR(changeResult.change)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <p role="alert" className="text-xs font-semibold text-[#e11d48] mt-2">
                  {formError}
                </p>
              )}
            </div>

            {/* Pilihan Kategori & Catatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="cashier-category-select"
                    className="block text-sm font-semibold text-[#1c1917]"
                  >
                    Kategori {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory((v) => !v)}
                    className="text-xs font-semibold text-[#dd9e3e] hover:underline cursor-pointer"
                  >
                    {isAddingCategory ? 'Batal' : '+ Kategori Baru'}
                  </button>
                </div>

                {isAddingCategory ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      aria-label="Nama kategori baru"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nama kategori..."
                      className="flex-1 min-h-[48px] px-3 py-2 text-sm bg-[#fafaf9] border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dd9e3e]"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      className="min-h-[48px] px-3.5 py-2 rounded-xl bg-[#1c1917] text-white text-xs font-semibold hover:bg-stone-800 cursor-pointer"
                    >
                      Simpan
                    </button>
                  </div>
                ) : (
                  <select
                    id="cashier-category-select"
                    value={activeCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full min-h-[48px] px-3.5 py-2.5 text-sm sm:text-base font-medium text-[#1c1917] bg-[#fafaf9] border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dd9e3e]"
                  >
                    {(isIncome ? incomeCategories : expenseCategories).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label
                  htmlFor="cashier-note-input"
                  className="block text-sm font-semibold text-[#1c1917] mb-1.5"
                >
                  Catatan (Opsional)
                </label>
                <input
                  id="cashier-note-input"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    isIncome
                      ? 'Contoh: 2 Porsi Mie Ayam Bakso'
                      : 'Contoh: Beli sawi, es batu, gas 3kg'
                  }
                  className="w-full min-h-[48px] px-3.5 py-2.5 text-sm sm:text-base text-[#1c1917] bg-[#fafaf9] border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dd9e3e]"
                />
              </div>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              disabled={createTxMutation.isPending}
              className={`w-full min-h-[54px] px-6 py-3.5 rounded-xl text-white font-bold text-base shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60 ${
                isIncome
                  ? 'bg-[#dd9e3e] hover:bg-[#c88a2e]'
                  : 'bg-[#e11d48] hover:bg-[#be123c]'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>
                {isIncome
                  ? `Simpan Pemasukan ${numericAmount > 0 ? formatIDR(numericAmount) : ''}`
                  : `Simpan Pengeluaran ${numericAmount > 0 ? formatIDR(numericAmount) : ''}`}
              </span>
            </button>
          </form>
        </div>

        {/* Right Column: Daftar Transaksi Hari Ini */}
        <div className="lg:col-span-5 bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#1c1917]">
                Transaksi Hari Ini
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {todayTransactions.length} catatan tersimpan hari ini
              </p>
            </div>
            <Link
              to="/tutup-kedai"
              className="text-xs font-semibold text-[#dd9e3e] hover:underline"
            >
              Tutup Buku →
            </Link>
          </div>

          {isTxLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-14 rounded-xl bg-stone-100 animate-pulse"
                />
              ))}
            </div>
          ) : todayTransactions.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <Wallet className="w-8 h-8 text-stone-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#1c1917]">
                  Belum ada transaksi hari ini
                </p>
                <p className="text-xs text-stone-500 max-w-xs mx-auto">
                  Gunakan tombol cepat di samping untuk mencatat penjualan mie ayam, atau muat contoh data transaksi.
                </p>
              </div>
              <button
                type="button"
                disabled={resetDemoMutation.isPending}
                onClick={() => resetDemoMutation.mutate()}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-[#fef7ec] border border-[#dd9e3e]/40 text-xs font-semibold text-[#1c1917] hover:bg-[#dd9e3e] hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Isi Data Contoh Mie Ayam</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1">
              {todayTransactions.map((tx) => {
                const isTxIncome = tx.type === 'INCOME';
                const timeStr = new Date(tx.date).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const isEditing = editingTxId === tx.id;

                if (isEditing) {
                  return (
                    <div
                      key={tx.id}
                      className="py-3 space-y-2.5 bg-[#fafaf9] p-3 rounded-xl my-1 border border-stone-200"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label="Edit nominal transaksi"
                          value={editAmountRaw}
                          onChange={(e) => {
                            const val = parseNominalInput(e.target.value);
                            setEditAmountRaw(val > 0 ? formatIDR(val, false) : '');
                          }}
                          className="w-full min-h-[40px] px-3 py-1.5 text-sm font-mono font-bold bg-white border border-stone-300 rounded-lg"
                        />
                        <select
                          aria-label="Edit kategori transaksi"
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="w-full min-h-[40px] px-2.5 py-1.5 text-xs font-medium bg-white border border-stone-300 rounded-lg"
                        >
                          {categories
                            .filter((c) => c.type === tx.type)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          aria-label="Edit keterangan transaksi"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Catatan transaksi..."
                          className="flex-1 min-w-0 min-h-[40px] px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => saveEditedTx(tx)}
                          aria-label="Simpan perubahan transaksi"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-[#dd9e3e] text-white shrink-0 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTxId(null)}
                          aria-label="Batal edit transaksi"
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg bg-stone-200 text-stone-700 shrink-0 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={tx.id}
                    className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
                  >
                    {/* Baris Atas: Judul Keterangan & Nominal */}
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#1c1917] leading-snug break-words min-w-0 flex-1">
                        {tx.description || tx.category_name || 'Transaksi Kas'}
                      </p>
                      <span
                        className={`font-mono text-sm font-bold tabular-nums whitespace-nowrap shrink-0 ${
                          isTxIncome ? 'text-[#dd9e3e]' : 'text-[#e11d48]'
                        }`}
                      >
                        {isTxIncome ? '+' : '-'}
                        {formatIDR(tx.amount)}
                      </span>
                    </div>

                    {/* Baris Bawah: Kategori + Jam di kiri, Tombol Edit & Hapus di kanan */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500 min-w-0">
                        <span className="truncate">{tx.category_name}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums shrink-0">{timeStr}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 -my-1">
                        <button
                          type="button"
                          onClick={() => startEditingTx(tx)}
                          aria-label={`Edit transaksi ${tx.description || tx.amount}`}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-stone-400 hover:text-[#1c1917] hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTxMutation.mutate(tx.id)}
                          aria-label={`Hapus transaksi ${tx.description || tx.amount}`}
                          className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-stone-400 hover:text-[#e11d48] hover:bg-[#fff1f2] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
