import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Search,
  Trash2,
  Download,
  PieChart,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteTransactionMutation,
  useTransactionsQuery,
} from '../hooks/useKasQueries';
import { useKasUIStore } from '../store/useKasUIStore';
import { AnalyticsPeriod } from '../types/kas';
import {
  buildChartSeries,
  calculateCategoryBreakdown,
  filterTransactionsByPeriod,
  formatIDR,
  formatShortDateLabel,
  summarizeTransactions,
  toDateKey,
  transactionsToCSV,
} from '../utils/finance';

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'THIS_MONTH', label: 'Bulan Ini' },
  { value: '7_DAYS', label: '7 Hari' },
  { value: '30_DAYS', label: '30 Hari' },
  { value: 'ALL', label: 'Semua' },
];

export function DashboardPage() {
  const { data: transactions = [], isLoading } = useTransactionsQuery();
  const deleteTxMutation = useDeleteTransactionMutation();

  const chartDays = useKasUIStore((s) => s.chartDays);
  const setChartDays = useKasUIStore((s) => s.setChartDays);
  const historyFilterType = useKasUIStore((s) => s.historyFilterType);
  const setHistoryFilterType = useKasUIStore((s) => s.setHistoryFilterType);
  const searchQuery = useKasUIStore((s) => s.searchQuery);
  const setSearchQuery = useKasUIStore((s) => s.setSearchQuery);

  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('30_DAYS');

  const periodTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, selectedPeriod, new Date()),
    [transactions, selectedPeriod]
  );

  const periodSummary = useMemo(
    () => summarizeTransactions(periodTransactions),
    [periodTransactions]
  );

  // Rincian per Kategori
  const incomeBreakdown = useMemo(
    () => calculateCategoryBreakdown(periodTransactions, 'INCOME'),
    [periodTransactions]
  );
  const expenseBreakdown = useMemo(
    () => calculateCategoryBreakdown(periodTransactions, 'EXPENSE'),
    [periodTransactions]
  );

  // Data Grafik Recharts (7 atau 30 hari terakhir)
  const chartData = useMemo(
    () => buildChartSeries(transactions, chartDays, new Date()),
    [transactions, chartDays]
  );

  // Filter Riwayat Transaksi Terbaru
  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter((tx) => {
      if (historyFilterType !== 'ALL' && tx.type !== historyFilterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (tx.description || '').toLowerCase().includes(q);
        const catMatch = (tx.category_name || '').toLowerCase().includes(q);
        return descMatch || catMatch;
      }
      return true;
    });
  }, [periodTransactions, historyFilterType, searchQuery]);

  const handleDownloadCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('Tidak ada data transaksi untuk diunduh');
      return;
    }
    const csv = transactionsToCSV(filteredTransactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `laporan-kas-mie-ayam-mba-anna-${toDateKey(new Date())}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Laporan CSV berhasil diunduh');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 md:pb-12 space-y-5 sm:space-y-6">
      {/* Header + Filter Periode & Export CSV */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917]">
            Dashboard Analitik Keuangan
          </h1>
          <p className="text-sm sm:text-base text-stone-600 mt-0.5">
            Pantau pendapatan mie ayam, pengeluaran belanja harian, dan laba bersih kedai.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div
            role="group"
            aria-label="Filter Periode Metrik"
            className="grid grid-cols-4 sm:flex items-center gap-1 p-1 bg-[#ffffff] border border-stone-200 rounded-xl"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedPeriod(opt.value)}
                className={`min-h-[38px] px-2 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap text-center cursor-pointer ${
                  selectedPeriod === opt.value
                    ? 'bg-[#1c1917] text-white'
                    : 'text-stone-600 hover:text-[#1c1917]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleDownloadCSV}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-[#ffffff] border border-stone-200 hover:border-[#dd9e3e] text-xs sm:text-sm font-semibold text-[#1c1917] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#dd9e3e]" />
            <span>Unduh CSV</span>
          </button>
        </div>
      </div>

      {/* 3 Kartu Metrik Utama: Total Pendapatan, Total Pengeluaran, Laba Bersih Bulan Ini */}
      <section
        aria-label="Kartu Metrik Bulanan"
        className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5"
      >
        {/* Total Pendapatan */}
        <div className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-stone-600">
              Total Pendapatan
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#fef7ec] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[#dd9e3e]" />
            </div>
          </div>
          <p
            data-testid="metric-total-income"
            className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#dd9e3e] mt-1.5 sm:mt-2"
          >
            {formatIDR(periodSummary.totalIncome)}
          </p>
          <p className="text-xs text-stone-500 mt-1 tabular-nums">
            Dari {periodSummary.incomeCount} transaksi pemasukan tercatat
          </p>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-stone-600">
              Total Pengeluaran
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#fff1f2] flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-[#e11d48]" />
            </div>
          </div>
          <p
            data-testid="metric-total-expense"
            className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-[#e11d48] mt-1.5 sm:mt-2"
          >
            {formatIDR(periodSummary.totalExpense)}
          </p>
          <p className="text-xs text-stone-500 mt-1 tabular-nums">
            Dari {periodSummary.expenseCount} catatan belanja bahan & operasional
          </p>
        </div>

        {/* Laba Bersih Bulan Ini */}
        <div className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-stone-600">
              Laba Bersih Bulan Ini
            </span>
            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-[#1c1917]" />
            </div>
          </div>
          <p
            data-testid="metric-net-profit"
            className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums mt-1.5 sm:mt-2 ${
              periodSummary.netProfit >= 0 ? 'text-[#1c1917]' : 'text-[#e11d48]'
            }`}
          >
            {formatIDR(periodSummary.netProfit)}
          </p>
          <p className="text-xs text-stone-500 mt-1">
            Selisih bersih pemasukan dikurangi pengeluaran
          </p>
        </div>
      </section>

      {/* Grafik Interaktif Recharts */}
      <section
        aria-label="Grafik Tren Pendapatan dan Pengeluaran"
        className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1c1917] leading-snug">
            Tren Pendapatan vs Pengeluaran ({chartDays} Hari Terakhir)
          </h2>

          {/* Segmented Control: 7 Hari vs 30 Hari */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1 p-1 bg-[#fafaf9] border border-stone-200 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setChartDays(7)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap text-center cursor-pointer ${
                chartDays === 7
                  ? 'bg-[#dd9e3e] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-[#1c1917]'
              }`}
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => setChartDays(30)}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap text-center cursor-pointer ${
                chartDays === 30
                  ? 'bg-[#dd9e3e] text-white shadow-2xs'
                  : 'text-stone-600 hover:text-[#1c1917]'
              }`}
            >
              30 Hari Terakhir
            </button>
          </div>
        </div>

        {/* Custom Clean Legend */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1.5 text-[11px] sm:text-xs font-semibold text-stone-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[#dd9e3e] shrink-0" />
            <span>Pemasukan (Cash In)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-xs bg-[#e11d48] shrink-0" />
            <span>Pengeluaran (Cash Out)</span>
          </div>
        </div>

        <div className="h-60 sm:h-76 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#57534e', fontSize: 11 }}
                axisLine={{ stroke: '#e7e5e4' }}
                tickLine={false}
                tickMargin={6}
                minTickGap={10}
              />
              <YAxis
                tickFormatter={(val: number) =>
                  val >= 1000 ? `${Math.round(val / 1000)}rb` : String(val)
                }
                tick={{ fill: '#57534e', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  formatIDR(Number(value) || 0),
                  name === 'income' ? 'Pemasukan' : 'Pengeluaran',
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e7e5e4',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="income"
                name="income"
                fill="#dd9e3e"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="expense"
                name="expense"
                fill="#e11d48"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Rincian Proporsi per Kategori (Pemasukan & Pengeluaran) */}
      <section
        aria-label="Rincian per Kategori"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
      >
        {/* Kategori Pemasukan */}
        <div className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PieChart className="w-4 h-4 text-[#dd9e3e] shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-[#1c1917] truncate">
                Sumber Pemasukan per Kategori
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-[#dd9e3e] tabular-nums whitespace-nowrap shrink-0">
              {formatIDR(periodSummary.totalIncome)}
            </span>
          </div>

          {incomeBreakdown.length === 0 ? (
            <p className="text-xs text-stone-500 py-3">Belum ada data pemasukan pada periode ini.</p>
          ) : (
            <div className="space-y-3">
              {incomeBreakdown.map((item) => (
                <div key={item.category_id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <span className="font-medium text-[#1c1917] truncate">
                      {item.category_name}{' '}
                      <span className="text-stone-400 text-xs">({item.count}x)</span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#1c1917] whitespace-nowrap shrink-0">
                      {formatIDR(item.total)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-[#dd9e3e] rounded-full transition-all"
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kategori Pengeluaran */}
        <div className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <PieChart className="w-4 h-4 text-[#e11d48] shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-[#1c1917] truncate">
                Alokasi Pengeluaran per Kategori
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-[#e11d48] tabular-nums whitespace-nowrap shrink-0">
              {formatIDR(periodSummary.totalExpense)}
            </span>
          </div>

          {expenseBreakdown.length === 0 ? (
            <p className="text-xs text-stone-500 py-3">Belum ada data pengeluaran pada periode ini.</p>
          ) : (
            <div className="space-y-3">
              {expenseBreakdown.map((item) => (
                <div key={item.category_id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <span className="font-medium text-[#1c1917] truncate">
                      {item.category_name}{' '}
                      <span className="text-stone-400 text-xs">({item.count}x)</span>
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[#1c1917] whitespace-nowrap shrink-0">
                      {formatIDR(item.total)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full bg-[#e11d48] rounded-full transition-all"
                      style={{ width: `${Math.max(4, item.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tabel Riwayat Transaksi Terbaru */}
      <section
        aria-label="Tabel Riwayat Transaksi"
        className="bg-[#ffffff] rounded-2xl border border-stone-200/80 shadow-xs p-4 sm:p-6 space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#1c1917]">
              Riwayat Transaksi Terbaru
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Menampilkan {filteredTransactions.length} dari {periodTransactions.length} transaksi pada periode terpilih
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                aria-label="Cari catatan atau kategori transaksi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu, bahan baku..."
                className="w-full sm:w-60 min-h-[42px] pl-9 pr-3.5 py-2 text-sm bg-[#fafaf9] border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#dd9e3e]"
              />
            </div>

            {/* Filter Jenis Transaksi */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1 p-1 bg-[#fafaf9] border border-stone-200 rounded-xl">
              {(['ALL', 'INCOME', 'EXPENSE'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setHistoryFilterType(type)}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap text-center cursor-pointer ${
                    historyFilterType === type
                      ? 'bg-[#1c1917] text-white'
                      : 'text-stone-600 hover:text-[#1c1917]'
                  }`}
                >
                  {type === 'ALL'
                    ? 'Semua'
                    : type === 'INCOME'
                    ? 'Pemasukan'
                    : 'Pengeluaran'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table / Responsive List */}
        {isLoading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-[#1c1917]">
              Tidak ada transaksi yang cocok dengan pencarian
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Coba ubah kata kunci atau pilih filter "Semua".
            </p>
          </div>
        ) : (
          <>
            {/* Mobile List View (< md) */}
            <div className="md:hidden divide-y divide-stone-100">
              {filteredTransactions.slice(0, 30).map((tx) => {
                const isInc = tx.type === 'INCOME';
                const dateLabel = formatShortDateLabel(toDateKey(tx.date));
                const timeLabel = new Date(tx.date).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={tx.id}
                    className="py-3.5 first:pt-0 last:pb-0 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#1c1917] leading-snug break-words min-w-0 flex-1">
                        {tx.description || tx.category_name || '-'}
                      </p>
                      <span
                        className={`font-mono text-sm font-bold tabular-nums whitespace-nowrap shrink-0 ${
                          isInc ? 'text-[#dd9e3e]' : 'text-[#e11d48]'
                        }`}
                      >
                        {isInc ? '+' : '-'}
                        {formatIDR(tx.amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500 min-w-0">
                        <span className="truncate">{tx.category_name}</span>
                        <span>·</span>
                        <span className="tabular-nums shrink-0">
                          {dateLabel}, {timeLabel}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteTxMutation.mutate(tx.id)}
                        aria-label={`Hapus ${tx.description || tx.amount}`}
                        className="min-h-[34px] min-w-[34px] -my-1 inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-[#e11d48] hover:bg-[#fff1f2] transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-xs font-semibold text-stone-500">
                    <th className="py-3 pr-4">Tanggal & Waktu</th>
                    <th className="py-3 px-4">Keterangan / Catatan</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 pl-4 text-right">Nominal</th>
                    <th className="py-3 pl-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filteredTransactions.slice(0, 30).map((tx) => {
                    const isInc = tx.type === 'INCOME';
                    const dateLabel = formatShortDateLabel(toDateKey(tx.date));
                    const timeLabel = new Date(tx.date).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-[#fafaf9] transition-colors"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap text-xs text-stone-600 tabular-nums">
                          <span className="font-semibold text-[#1c1917]">{dateLabel}</span>
                          <span className="mx-1 text-stone-300">·</span>
                          <span>{timeLabel}</span>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#1c1917]">
                          {tx.description || tx.category_name || '-'}
                        </td>
                        <td className="py-3 px-4 text-xs text-stone-600 whitespace-nowrap">
                          {tx.category_name}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                          <span className={isInc ? 'text-[#dd9e3e]' : 'text-[#e11d48]'}>
                            {isInc ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td
                          className={`py-3 pl-4 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                            isInc ? 'text-[#dd9e3e]' : 'text-[#e11d48]'
                          }`}
                        >
                          {isInc ? '+' : '-'}
                          {formatIDR(tx.amount)}
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <button
                            type="button"
                            onClick={() => deleteTxMutation.mutate(tx.id)}
                            aria-label={`Hapus ${tx.description || tx.amount}`}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg text-stone-400 hover:text-[#e11d48] hover:bg-[#fff1f2] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
