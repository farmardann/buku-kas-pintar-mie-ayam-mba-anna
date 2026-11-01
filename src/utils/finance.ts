import {
  AnalyticsPeriod,
  CategoryBreakdownItem,
  DailyChartPoint,
  Transaction,
  TransactionType,
} from '../types/kas';

/**
 * Format angka ke mata uang Rupiah (contoh: Rp 15.000)
 */
export function formatIDR(amount: number, withPrefix = true): string {
  const isNegative = amount < 0;
  const absVal = Math.round(Math.abs(amount));
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (!withPrefix) {
    return isNegative ? `-${formatted}` : formatted;
  }
  return isNegative ? `-Rp ${formatted}` : `Rp ${formatted}`;
}

/**
 * Bersihkan input string menjadi angka murni (contoh: "20.000" -> 20000)
 */
export function parseNominalInput(raw: string): number {
  const digitsOnly = raw.replace(/[^\d]/g, '');
  if (!digitsOnly) return 0;
  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Hitung estimasi uang di laci: Kas Awal + Total Pemasukan - Total Pengeluaran
 */
export function calculateExpectedClosingBalance(
  openingBalance: number,
  totalIncome: number,
  totalExpense: number
): number {
  return openingBalance + totalIncome - totalExpense;
}

/**
 * Hitung uang kembalian pelanggan di kasir
 */
export function calculateCustomerChange(
  billAmount: number,
  paidAmount: number
): { change: number; isSufficient: boolean } {
  const change = paidAmount - billAmount;
  return {
    change,
    isSufficient: billAmount > 0 && paidAmount >= billAmount,
  };
}

export type DifferenceStatus = 'MATCH' | 'SURPLUS' | 'DEFICIT';

export interface CashDifferenceResult {
  difference: number;
  status: DifferenceStatus;
  label: string;
}

/**
 * Hitung selisih kas fisik terhadap estimasi sistem:
 * Selisih = Actual Closing Balance - Expected Closing Balance
 */
export function calculateCashDifference(
  expectedClosingBalance: number,
  actualClosingBalance: number
): CashDifferenceResult {
  const difference = actualClosingBalance - expectedClosingBalance;
  if (difference === 0) {
    return {
      difference: 0,
      status: 'MATCH',
      label: 'Klop / Sesuai Estimasi',
    };
  }
  if (difference > 0) {
    return {
      difference,
      status: 'SURPLUS',
      label: `Lebih ${formatIDR(difference)}`,
    };
  }
  return {
    difference,
    status: 'DEFICIT',
    label: `Kurang ${formatIDR(Math.abs(difference))}`,
  };
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeCount: number;
  expenseCount: number;
}

/**
 * Rekap total pemasukan, pengeluaran, dan laba bersih dari daftar transaksi
 */
export function summarizeTransactions(transactions: Transaction[]): TransactionSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const tx of transactions) {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'INCOME') {
      totalIncome += amt;
      incomeCount += 1;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += amt;
      expenseCount += 1;
    }
  }

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    incomeCount,
    expenseCount,
  };
}

/**
 * Ambil tanggal lokal YYYY-MM-DD dari ISO string atau Date
 */
export function toDateKey(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const SHORT_MONTHS_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatShortDateLabel(dateKey: string): string {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const monthIdx = Number.parseInt(parts[1], 10) - 1;
  const day = parts[2];
  return `${day} ${SHORT_MONTHS_ID[monthIdx] || parts[1]}`;
}

/**
 * Filter daftar transaksi berdasarkan periode waktu analitik
 */
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: AnalyticsPeriod,
  referenceDate: Date = new Date()
): Transaction[] {
  if (period === 'ALL') return transactions;

  if (period === 'THIS_MONTH') {
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === refYear && d.getMonth() === refMonth;
    });
  }

  const days = period === '7_DAYS' ? 7 : 30;
  const cutoff = new Date(referenceDate);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - (days - 1));

  return transactions.filter((tx) => new Date(tx.date).getTime() >= cutoff.getTime());
}

/**
 * Hitung rincian transaksi per kategori beserta persentasenya
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  type: TransactionType
): CategoryBreakdownItem[] {
  const filtered = transactions.filter((tx) => tx.type === type);
  const totalAmount = filtered.reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
  if (totalAmount === 0) return [];

  const map = new Map<string, { name: string; total: number; count: number }>();
  for (const tx of filtered) {
    const key = tx.category_id || 'default';
    const existing = map.get(key) || {
      name: tx.category_name || 'Umum',
      total: 0,
      count: 0,
    };
    existing.total += Number(tx.amount) || 0;
    existing.count += 1;
    map.set(key, existing);
  }

  return Array.from(map.entries())
    .map(([category_id, item]) => ({
      category_id,
      category_name: item.name,
      type,
      total: item.total,
      count: item.count,
      percentage: Math.round((item.total / totalAmount) * 100),
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Bangun deret data grafik harian untuk 7 atau 30 hari terakhir
 */
export function buildChartSeries(
  transactions: Transaction[],
  days: 7 | 30,
  referenceDate: Date = new Date()
): DailyChartPoint[] {
  const bucketMap = new Map<string, { income: number; expense: number }>();
  const orderedKeys: string[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    orderedKeys.push(key);
    bucketMap.set(key, { income: 0, expense: 0 });
  }

  for (const tx of transactions) {
    const key = toDateKey(tx.date);
    const bucket = bucketMap.get(key);
    if (bucket) {
      if (tx.type === 'INCOME') {
        bucket.income += Number(tx.amount) || 0;
      } else {
        bucket.expense += Number(tx.amount) || 0;
      }
    }
  }

  return orderedKeys.map((dateKey) => {
    const bucket = bucketMap.get(dateKey) || { income: 0, expense: 0 };
    return {
      dateKey,
      label: formatShortDateLabel(dateKey),
      income: bucket.income,
      expense: bucket.expense,
      net: bucket.income - bucket.expense,
    };
  });
}

/**
 * Format teks ringkasan Tutup Buku Harian untuk dikirim ke WhatsApp pemilik
 */
export function formatWhatsAppClosingReport(params: {
  dateLabel: string;
  openingBalance: number;
  totalIncome: number;
  incomeCount: number;
  totalExpense: number;
  expenseCount: number;
  expectedClosing: number;
  actualClosing: number;
  notes?: string;
}): string {
  const diff = calculateCashDifference(params.expectedClosing, params.actualClosing);
  const netProfit = params.totalIncome - params.totalExpense;
  const lines = [
    `*LAPORAN TUTUP BUKU - MIE AYAM MBA ANNA*`,
    `Tanggal: ${params.dateLabel}`,
    `--------------------------------`,
    `• Kas Awal Laci: ${formatIDR(params.openingBalance)}`,
    `• Total Pemasukan (${params.incomeCount}x): +${formatIDR(params.totalIncome)}`,
    `• Total Pengeluaran (${params.expenseCount}x): -${formatIDR(params.totalExpense)}`,
    `• Laba Bersih Hari Ini: *${formatIDR(netProfit)}*`,
    `--------------------------------`,
    `• Estimasi Sistem: ${formatIDR(params.expectedClosing)}`,
    `• Uang Fisik Laci: *${formatIDR(params.actualClosing)}*`,
    `• Status Selisih: *${diff.label}*`,
  ];
  if (params.notes?.trim()) {
    lines.push(`• Catatan: ${params.notes.trim()}`);
  }
  return lines.join('\n');
}

/**
 * Konversi daftar transaksi menjadi string CSV untuk diunduh
 */
export function transactionsToCSV(transactions: Transaction[]): string {
  const headers = ['ID', 'Tanggal', 'Waktu', 'Jenis', 'Kategori', 'Nominal', 'Keterangan'];
  const rows = transactions.map((tx) => {
    const dateKey = toDateKey(tx.date);
    const timeStr = new Date(tx.date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const safeDesc = `"${(tx.description || '').replace(/"/g, '""')}"`;
    const safeCat = `"${(tx.category_name || 'Umum').replace(/"/g, '""')}"`;
    return [
      tx.id,
      dateKey,
      timeStr,
      tx.type,
      safeCat,
      tx.amount,
      safeDesc,
    ].join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}
