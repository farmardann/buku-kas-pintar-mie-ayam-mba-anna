import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Category,
  CloseSessionInput,
  CreateCategoryInput,
  CreateTransactionInput,
  DailySession,
  OpenSessionInput,
  Transaction,
  UpdateTransactionInput,
} from '../types/kas';
import {
  calculateExpectedClosingBalance,
  summarizeTransactions,
  toDateKey,
} from '../utils/finance';

const STORAGE_KEYS = {
  CATEGORIES: 'mba_anna_categories_v1',
  TRANSACTIONS: 'mba_anna_transactions_v1',
  SESSIONS: 'mba_anna_daily_sessions_v1',
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    name: 'Penjualan Mie Ayam & Menu',
    type: 'INCOME',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    name: 'Minuman & Camilan',
    type: 'INCOME',
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    name: 'Pesanan Partai / Catering',
    type: 'INCOME',
  },
  {
    id: '22222222-2222-4222-8222-222222222201',
    name: 'Bahan Baku',
    type: 'EXPENSE',
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    name: 'Operasional',
    type: 'EXPENSE',
  },
  {
    id: '22222222-2222-4222-8222-222222222203',
    name: 'Lain-lain',
    type: 'EXPENSE',
  },
];

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function seedInitialDataIfEmpty(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  }

  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    const now = new Date();
    const todayIso = (hour: number, minute: number, daysAgo = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(hour, minute, 0, 0);
      return d.toISOString();
    };

    const seededTransactions: Transaction[] = [
      {
        id: 'tx-today-1',
        amount: 40000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        category_name: 'Penjualan Mie Ayam & Menu',
        description: '2 Porsi Mie Ayam Bakso + Es Teh',
        date: todayIso(9, 15, 0),
        created_at: todayIso(9, 15, 0),
      },
      {
        id: 'tx-today-2',
        amount: 65000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        category_name: 'Penjualan Mie Ayam & Menu',
        description: '3 Porsi Mie Ayam Komplit Ceker',
        date: todayIso(10, 5, 0),
        created_at: todayIso(10, 5, 0),
      },
      {
        id: 'tx-today-3',
        amount: 45000,
        type: 'EXPENSE',
        category_id: '22222222-2222-4222-8222-222222222201',
        category_name: 'Bahan Baku',
        description: 'Beli Sawi Hijau, Daun Bawang & Tauge Segar',
        date: todayIso(10, 30, 0),
        created_at: todayIso(10, 30, 0),
      },
      {
        id: 'tx-today-4',
        amount: 100000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        category_name: 'Penjualan Mie Ayam & Menu',
        description: '5 Porsi Mie Ayam Yamin Manis (Rombongan Kantor)',
        date: todayIso(11, 45, 0),
        created_at: todayIso(11, 45, 0),
      },
      {
        id: 'tx-today-5',
        amount: 20000,
        type: 'EXPENSE',
        category_id: '22222222-2222-4222-8222-222222222202',
        category_name: 'Operasional',
        description: 'Es Batu Kristal 2 Bal',
        date: todayIso(12, 10, 0),
        created_at: todayIso(12, 10, 0),
      },
      {
        id: 'tx-today-6',
        amount: 50000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111102',
        category_name: 'Minuman & Camilan',
        description: 'Es Jeruk Peras & Pangsit Goreng 5 Porsi',
        date: todayIso(12, 40, 0),
        created_at: todayIso(12, 40, 0),
      },
    ];

    const historicalPattern = [
      { daysAgo: 1, inc: 680000, exp: 240000, descInc: 'Penjualan Harian Kedai (38 Porsi)', descExp: 'Ayam Fillet 5kg & Mie Basah' },
      { daysAgo: 2, inc: 745000, exp: 265000, descInc: 'Penjualan Harian Kedai (42 Porsi)', descExp: 'Belanja Daging Ayam, Bakso & Gas LPG' },
      { daysAgo: 3, inc: 590000, exp: 195000, descInc: 'Penjualan Harian Kedai (33 Porsi)', descExp: 'Mie Telur Segar & Bumbu Dapur' },
      { daysAgo: 4, inc: 820000, exp: 290000, descInc: 'Penjualan Akhir Pekan (46 Porsi)', descExp: 'Stok Ayam 6kg, Ceker & Kemasan' },
      { daysAgo: 5, inc: 790000, exp: 250000, descInc: 'Penjualan Harian & Pesanan Bungkus', descExp: 'Bahan Baku Mie & Minyak Goreng' },
      { daysAgo: 6, inc: 640000, exp: 210000, descInc: 'Penjualan Harian Kedai (36 Porsi)', descExp: 'Belanja Sayur, Kecap & Saus Sambal' },
      { daysAgo: 7, inc: 710000, exp: 230000, descInc: 'Penjualan Harian Kedai (40 Porsi)', descExp: 'Ayam Fillet & Kulit Pangsit' },
      { daysAgo: 8, inc: 660000, exp: 225000, descInc: 'Penjualan Harian Kedai', descExp: 'Bahan Baku Harian' },
      { daysAgo: 9, inc: 730000, exp: 260000, descInc: 'Penjualan Harian Kedai', descExp: 'Ayam, Bakso & Gas 3kg' },
      { daysAgo: 10, inc: 850000, exp: 310000, descInc: 'Penjualan Jumat Berkah & Kedai', descExp: 'Stok Bahan Baku Lengkap' },
      { daysAgo: 11, inc: 615000, exp: 190000, descInc: 'Penjualan Harian Kedai', descExp: 'Sayuran, Mie & Es Batu' },
      { daysAgo: 12, inc: 695000, exp: 235000, descInc: 'Penjualan Harian Kedai', descExp: 'Daging Ayam & Bumbu Halus' },
    ];

    for (const item of historicalPattern) {
      seededTransactions.push(
        {
          id: `tx-hist-inc-${item.daysAgo}`,
          amount: item.inc,
          type: 'INCOME',
          category_id: '11111111-1111-4111-8111-111111111101',
          category_name: 'Penjualan Mie Ayam & Menu',
          description: item.descInc,
          date: todayIso(15, 0, item.daysAgo),
          created_at: todayIso(15, 0, item.daysAgo),
        },
        {
          id: `tx-hist-exp-${item.daysAgo}`,
          amount: item.exp,
          type: 'EXPENSE',
          category_id: '22222222-2222-4222-8222-222222222201',
          category_name: 'Bahan Baku',
          description: item.descExp,
          date: todayIso(8, 30, item.daysAgo),
          created_at: todayIso(8, 30, item.daysAgo),
        }
      );
    }

    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(seededTransactions));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
    const todayKey = toDateKey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    const seededSessions: DailySession[] = [
      {
        id: 'session-today-open',
        date: todayKey,
        opening_balance: 200000,
        expected_closing_balance: 390000,
        actual_closing_balance: null,
        difference: null,
        status: 'OPEN',
      },
      {
        id: 'session-yesterday-closed',
        date: yesterdayKey,
        opening_balance: 200000,
        expected_closing_balance: 640000,
        actual_closing_balance: 640000,
        difference: 0,
        status: 'CLOSED',
      },
    ];
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(seededSessions));
  }
}

function getLocalCategories(): Category[] {
  seedInitialDataIfEmpty();
  const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
  return raw ? JSON.parse(raw) : DEFAULT_CATEGORIES;
}

function getLocalTransactions(): Transaction[] {
  seedInitialDataIfEmpty();
  const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  const list: Transaction[] = raw ? JSON.parse(raw) : [];
  const categories = getLocalCategories();
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  return list
    .map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
      category_name: tx.category_name || catMap.get(tx.category_id) || 'Umum',
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function getLocalSessions(): DailySession[] {
  seedInitialDataIfEmpty();
  const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  const list: DailySession[] = raw ? JSON.parse(raw) : [];
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Ambil seluruh kategori dari Supabase (otomatis seed kategori standar jika tabel masih kosong)
 */
export async function fetchCategories(): Promise<Category[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const { data: seeded, error: seedError } = await supabase
          .from('categories')
          .upsert(DEFAULT_CATEGORIES, { onConflict: 'id' })
          .select('*');
        if (!seedError && seeded && seeded.length > 0) {
          return seeded as Category[];
        }
        return DEFAULT_CATEGORIES;
      }

      return data as Category[];
    } catch {
      return getLocalCategories();
    }
  }
  return getLocalCategories();
}

/**
 * Tambah kategori baru ke tabel `categories`
 */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Nama kategori tidak boleh kosong.');
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: trimmedName, type: input.type }])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data as Category;
  }

  const current = getLocalCategories();
  const newCat: Category = {
    id: generateUUID(),
    name: trimmedName,
    type: input.type,
  };
  const updated = [...current, newCat];
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  return newCat;
}

/**
 * Ambil seluruh transaksi dari Supabase (tanpa bergantung pada foreign key join PostgREST agar tahan terhadap skema manual)
 */
export async function fetchTransactions(): Promise<Transaction[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const [txRes, categories] = await Promise.all([
        supabase.from('transactions').select('*').order('date', { ascending: false }),
        fetchCategories(),
      ]);

      if (txRes.error) throw txRes.error;

      const catMap = new Map(categories.map((c) => [c.id, c.name]));

      return (txRes.data || []).map((row: any) => ({
        id: row.id,
        amount: Number(row.amount),
        type: row.type,
        category_id: row.category_id,
        category_name:
          catMap.get(row.category_id) ||
          (row.type === 'INCOME' ? 'Penjualan Mie Ayam & Menu' : 'Bahan Baku'),
        description: row.description,
        date: row.date || row.created_at || new Date().toISOString(),
        created_at: row.created_at || row.date || new Date().toISOString(),
      }));
    } catch {
      return getLocalTransactions();
    }
  }
  return getLocalTransactions();
}

/**
 * Ambil transaksi khusus hari ini
 */
export async function fetchTodayTransactions(): Promise<Transaction[]> {
  const all = await fetchTransactions();
  const todayKey = toDateKey(new Date());
  return all.filter((tx) => toDateKey(tx.date) === todayKey);
}

/**
 * Tambah transaksi baru (Cash In / Cash Out) ke tabel `transactions`
 */
export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const nowIso = input.date || new Date().toISOString();
  const categories = await fetchCategories();
  const category = categories.find((c) => c.id === input.category_id);
  const resolvedCategoryName =
    category?.name || (input.type === 'INCOME' ? 'Penjualan Mie Ayam & Menu' : 'Bahan Baku');

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          amount: input.amount,
          type: input.type,
          category_id: input.category_id,
          description: input.description || null,
          date: nowIso,
        },
      ])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      amount: Number(data.amount),
      type: data.type,
      category_id: data.category_id,
      category_name: resolvedCategoryName,
      description: data.description,
      date: data.date || nowIso,
      created_at: data.created_at || nowIso,
    };
  }

  const newTx: Transaction = {
    id: generateUUID(),
    amount: Number(input.amount),
    type: input.type,
    category_id: input.category_id,
    category_name: resolvedCategoryName,
    description: input.description?.trim() ? input.description.trim() : null,
    date: nowIso,
    created_at: nowIso,
  };

  const current = getLocalTransactions();
  const updated = [newTx, ...current];
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));

  syncTodaySessionExpectedBalance();

  return newTx;
}

/**
 * Perbarui transaksi (Edit Nominal / Kategori / Catatan)
 */
export async function updateTransaction(input: UpdateTransactionInput): Promise<Transaction> {
  const categories = await fetchCategories();
  const category = categories.find((c) => c.id === input.category_id);

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions')
      .update({
        amount: input.amount,
        type: input.type,
        category_id: input.category_id,
        description: input.description?.trim() || null,
      })
      .eq('id', input.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      amount: Number(data.amount),
      type: data.type,
      category_id: data.category_id,
      category_name: category?.name || 'Umum',
      description: data.description,
      date: data.date,
      created_at: data.created_at,
    };
  }

  const current = getLocalTransactions();
  const idx = current.findIndex((tx) => tx.id === input.id);
  if (idx === -1) {
    throw new Error('Transaksi tidak ditemukan.');
  }

  const updatedTx: Transaction = {
    ...current[idx],
    amount: Number(input.amount),
    type: input.type,
    category_id: input.category_id,
    category_name: category?.name || current[idx].category_name,
    description: input.description?.trim() ? input.description.trim() : null,
  };

  current[idx] = updatedTx;
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(current));
  syncTodaySessionExpectedBalance();
  return updatedTx;
}

/**
 * Hapus transaksi berdasarkan ID
 */
export async function deleteTransaction(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const current = getLocalTransactions().filter((tx) => tx.id !== id);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(current));
  syncTodaySessionExpectedBalance();
}

function syncTodaySessionExpectedBalance(): void {
  const todayKey = toDateKey(new Date());
  const sessions = getLocalSessions();
  const todayTransactions = getLocalTransactions().filter(
    (tx) => toDateKey(tx.date) === todayKey
  );
  const summary = summarizeTransactions(todayTransactions);

  const updated = sessions.map((s) => {
    if (s.date === todayKey) {
      const expected = calculateExpectedClosingBalance(
        s.opening_balance,
        summary.totalIncome,
        summary.totalExpense
      );
      return {
        ...s,
        expected_closing_balance: expected,
        difference:
          s.actual_closing_balance !== null
            ? s.actual_closing_balance - expected
            : null,
      };
    }
    return s;
  });

  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
}

/**
 * Ambil sesi kasir hari ini (atau daftar seluruh sesi)
 */
export async function fetchDailySessions(): Promise<DailySession[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('daily_sessions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        date: row.date,
        opening_balance: Number(row.opening_balance),
        expected_closing_balance: Number(row.expected_closing_balance),
        actual_closing_balance:
          row.actual_closing_balance !== null ? Number(row.actual_closing_balance) : null,
        difference: row.difference !== null ? Number(row.difference) : null,
        status: row.status,
      }));
    } catch {
      syncTodaySessionExpectedBalance();
      return getLocalSessions();
    }
  }

  syncTodaySessionExpectedBalance();
  return getLocalSessions();
}

export async function fetchTodaySession(): Promise<DailySession | null> {
  const todayKey = toDateKey(new Date());
  const sessions = await fetchDailySessions();
  return sessions.find((s) => s.date === todayKey) || null;
}

/**
 * Buka Kas (Insert/Update ke `daily_sessions` dengan status 'OPEN')
 */
export async function openDailySession(input: OpenSessionInput): Promise<DailySession> {
  const todayKey = input.date || toDateKey(new Date());
  const todayTxs = await fetchTodayTransactions();
  const summary = summarizeTransactions(todayTxs);
  const expected = calculateExpectedClosingBalance(
    input.opening_balance,
    summary.totalIncome,
    summary.totalExpense
  );

  if (isSupabaseConfigured && supabase) {
    // Cek apakah sesi tanggal hari ini sudah ada di Supabase
    const { data: existingRows } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('date', todayKey)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const existingId = existingRows[0].id;
      const { data, error } = await supabase
        .from('daily_sessions')
        .update({
          opening_balance: input.opening_balance,
          expected_closing_balance: expected,
          status: 'OPEN',
        })
        .eq('id', existingId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        date: data.date,
        opening_balance: Number(data.opening_balance),
        expected_closing_balance: Number(data.expected_closing_balance),
        actual_closing_balance:
          data.actual_closing_balance !== null ? Number(data.actual_closing_balance) : null,
        difference: data.difference !== null ? Number(data.difference) : null,
        status: data.status,
      };
    }

    const { data, error } = await supabase
      .from('daily_sessions')
      .insert([
        {
          date: todayKey,
          opening_balance: input.opening_balance,
          expected_closing_balance: expected,
          actual_closing_balance: null,
          difference: null,
          status: 'OPEN',
        },
      ])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      date: data.date,
      opening_balance: Number(data.opening_balance),
      expected_closing_balance: Number(data.expected_closing_balance),
      actual_closing_balance: null,
      difference: null,
      status: data.status,
    };
  }

  const sessions = getLocalSessions();
  const existingIdx = sessions.findIndex((s) => s.date === todayKey);

  const newSession: DailySession = {
    id: existingIdx >= 0 ? sessions[existingIdx].id : generateUUID(),
    date: todayKey,
    opening_balance: Number(input.opening_balance),
    expected_closing_balance: expected,
    actual_closing_balance: null,
    difference: null,
    status: 'OPEN',
  };

  if (existingIdx >= 0) {
    sessions[existingIdx] = newSession;
  } else {
    sessions.unshift(newSession);
  }

  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  return newSession;
}

/**
 * Tutup Buku Hari Ini (Update `daily_sessions` menjadi 'CLOSED')
 */
export async function closeDailySession(input: CloseSessionInput): Promise<DailySession> {
  const difference = input.actual_closing_balance - input.expected_closing_balance;
  const todayKey = toDateKey(new Date());

  if (isSupabaseConfigured && supabase) {
    // Pastikan sesi hari ini ada; jika belum ada di Supabase, buat lalu tutup
    const { data: existingRows } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('date', todayKey)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      const targetId = existingRows[0].id;
      const { data, error } = await supabase
        .from('daily_sessions')
        .update({
          expected_closing_balance: input.expected_closing_balance,
          actual_closing_balance: input.actual_closing_balance,
          difference,
          status: 'CLOSED',
        })
        .eq('id', targetId)
        .select('*')
        .single();
      if (error) throw new Error(error.message);
      return {
        id: data.id,
        date: data.date,
        opening_balance: Number(data.opening_balance),
        expected_closing_balance: Number(data.expected_closing_balance),
        actual_closing_balance: Number(data.actual_closing_balance),
        difference: Number(data.difference),
        status: data.status,
      };
    }

    const { data, error } = await supabase
      .from('daily_sessions')
      .insert([
        {
          date: todayKey,
          opening_balance: 200000,
          expected_closing_balance: input.expected_closing_balance,
          actual_closing_balance: input.actual_closing_balance,
          difference,
          status: 'CLOSED',
        },
      ])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return {
      id: data.id,
      date: data.date,
      opening_balance: Number(data.opening_balance),
      expected_closing_balance: Number(data.expected_closing_balance),
      actual_closing_balance: Number(data.actual_closing_balance),
      difference: Number(data.difference),
      status: data.status,
    };
  }

  const sessions = getLocalSessions();
  const idx = sessions.findIndex((s) => s.id === input.sessionId || s.date === todayKey);
  if (idx === -1) {
    throw new Error('Sesi kas harian tidak ditemukan.');
  }

  const updatedSession: DailySession = {
    ...sessions[idx],
    expected_closing_balance: input.expected_closing_balance,
    actual_closing_balance: input.actual_closing_balance,
    difference,
    status: 'CLOSED',
    closed_at: new Date().toISOString(),
    notes: input.notes || null,
  };

  sessions[idx] = updatedSession;
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  return updatedSession;
}

/**
 * Isi data contoh transaksi & sesi harian (baik ke Live Supabase maupun penyimpanan lokal)
 */
export async function resetDemoData(): Promise<void> {
  const now = new Date();
  const todayIso = (hour: number, minute: number, daysAgo = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const todayKey = toDateKey(now);

  if (isSupabaseConfigured && supabase) {
    // 1. Pastikan kategori standar tersedia
    await supabase
      .from('categories')
      .upsert(DEFAULT_CATEGORIES, { onConflict: 'id' });

    // 2. Masukkan contoh transaksi hari ini & 7 hari terakhir ke Supabase
    const sampleRows = [
      {
        amount: 40000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: '2 Porsi Mie Ayam Bakso + Es Teh',
        date: todayIso(9, 15, 0),
      },
      {
        amount: 65000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: '3 Porsi Mie Ayam Komplit Ceker',
        date: todayIso(10, 5, 0),
      },
      {
        amount: 45000,
        type: 'EXPENSE',
        category_id: '22222222-2222-4222-8222-222222222201',
        description: 'Beli Sawi Hijau, Daun Bawang & Tauge Segar',
        date: todayIso(10, 30, 0),
      },
      {
        amount: 100000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: '5 Porsi Mie Ayam Yamin Manis',
        date: todayIso(11, 45, 0),
      },
      {
        amount: 20000,
        type: 'EXPENSE',
        category_id: '22222222-2222-4222-8222-222222222202',
        description: 'Es Batu Kristal 2 Bal',
        date: todayIso(12, 10, 0),
      },
      {
        amount: 680000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: 'Penjualan Harian Kedai (38 Porsi)',
        date: todayIso(15, 0, 1),
      },
      {
        amount: 240000,
        type: 'EXPENSE',
        category_id: '22222222-2222-4222-8222-222222222201',
        description: 'Ayam Fillet 5kg & Mie Basah',
        date: todayIso(8, 30, 1),
      },
      {
        amount: 745000,
        type: 'INCOME',
        category_id: '11111111-1111-4111-8111-111111111101',
        description: 'Penjualan Harian Kedai (42 Porsi)',
        date: todayIso(15, 0, 2),
      },
      {
        amount: 265000,
        type: 'EXPENSE',
        category_id: '22222222-2222-4222-8222-222222222201',
        description: 'Belanja Daging Ayam, Bakso & Gas LPG',
        date: todayIso(8, 30, 2),
      },
    ];

    const { error: txErr } = await supabase.from('transactions').insert(sampleRows);
    if (txErr) throw new Error(txErr.message);

    // 3. Pastikan sesi hari ini aktif di Supabase
    const { data: existingSession } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('date', todayKey)
      .limit(1);

    if (!existingSession || existingSession.length === 0) {
      await supabase.from('daily_sessions').insert([
        {
          date: todayKey,
          opening_balance: 200000,
          expected_closing_balance: 340000,
          status: 'OPEN',
        },
      ]);
    }
    return;
  }

  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  seedInitialDataIfEmpty();
}
