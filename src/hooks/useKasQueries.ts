import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  closeDailySession,
  createCategory,
  createTransaction,
  deleteTransaction,
  fetchCategories,
  fetchDailySessions,
  fetchTodaySession,
  fetchTodayTransactions,
  fetchTransactions,
  openDailySession,
  resetDemoData,
  updateTransaction,
} from '../services/kasService';
import {
  CloseSessionInput,
  CreateCategoryInput,
  CreateTransactionInput,
  OpenSessionInput,
  UpdateTransactionInput,
} from '../types/kas';
import { formatIDR } from '../utils/finance';

export const KAS_QUERY_KEYS = {
  categories: ['categories'] as const,
  transactions: ['transactions'] as const,
  todayTransactions: ['transactions', 'today'] as const,
  sessions: ['daily_sessions'] as const,
  todaySession: ['daily_sessions', 'today'] as const,
};

export function useCategoriesQuery() {
  return useQuery({
    queryKey: KAS_QUERY_KEYS.categories,
    queryFn: fetchCategories,
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.categories });
      toast.success(`Kategori "${created.name}" berhasil ditambahkan`);
    },
    onError: (err: Error) => {
      toast.error('Gagal menambah kategori', {
        description: err.message,
      });
    },
  });
}

export function useTransactionsQuery() {
  return useQuery({
    queryKey: KAS_QUERY_KEYS.transactions,
    queryFn: fetchTransactions,
  });
}

export function useTodayTransactionsQuery() {
  return useQuery({
    queryKey: KAS_QUERY_KEYS.todayTransactions,
    queryFn: fetchTodayTransactions,
  });
}

export function useTodaySessionQuery() {
  return useQuery({
    queryKey: KAS_QUERY_KEYS.todaySession,
    queryFn: fetchTodaySession,
  });
}

export function useDailySessionsQuery() {
  return useQuery({
    queryKey: KAS_QUERY_KEYS.sessions,
    queryFn: fetchDailySessions,
  });
}

export function useCreateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.transactions });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todayTransactions });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todaySession });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.sessions });

      if (created.type === 'INCOME') {
        toast.success(`Pemasukan ${formatIDR(created.amount)} tercatat`, {
          description: created.description || created.category_name || 'Kas Masuk',
        });
      } else {
        toast.success(`Pengeluaran ${formatIDR(created.amount)} tercatat`, {
          description: created.description || created.category_name || 'Kas Keluar',
        });
      }
    },
    onError: (err: Error) => {
      toast.error('Gagal menyimpan transaksi', {
        description: err.message,
      });
    },
  });
}

export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => updateTransaction(input),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.transactions });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todayTransactions });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todaySession });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.sessions });
      toast.success(`Transaksi diperbarui (${formatIDR(updated.amount)})`);
    },
    onError: (err: Error) => {
      toast.error('Gagal memperbarui transaksi', {
        description: err.message,
      });
    },
  });
}

export function useDeleteTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.transactions });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todayTransactions });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todaySession });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.sessions });
      toast.success('Transaksi berhasil dihapus');
    },
    onError: (err: Error) => {
      toast.error('Gagal menghapus transaksi', {
        description: err.message,
      });
    },
  });
}

export function useOpenSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OpenSessionInput) => openDailySession(input),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todaySession });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.sessions });
      toast.success('Kedai Dibuka! Kas Awal Aktif', {
        description: `Modal kembalian laci: ${formatIDR(session.opening_balance)}`,
      });
    },
    onError: (err: Error) => {
      toast.error('Gagal membuka sesi kas', {
        description: err.message,
      });
    },
  });
}

export function useCloseSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CloseSessionInput) => closeDailySession(input),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.todaySession });
      queryClient.invalidateQueries({ queryKey: KAS_QUERY_KEYS.sessions });
      toast.success('Tutup Buku Hari Ini Selesai!', {
        description: `Uang fisik laci tercatat ${formatIDR(session.actual_closing_balance || 0)}`,
      });
    },
    onError: (err: Error) => {
      toast.error('Gagal menutup buku harian', {
        description: err.message,
      });
    },
  });
}

export function useResetDemoDataMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => resetDemoData(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success('Data demo berhasil direset ke kondisi awal');
    },
  });
}
