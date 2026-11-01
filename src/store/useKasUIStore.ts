import { create } from 'zustand';
import { TransactionType } from '../types/kas';

interface KasUIState {
  activeCashierTab: TransactionType;
  setActiveCashierTab: (tab: TransactionType) => void;
  chartDays: 7 | 30;
  setChartDays: (days: 7 | 30) => void;
  historyFilterType: 'ALL' | TransactionType;
  setHistoryFilterType: (filter: 'ALL' | TransactionType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSqlModalOpen: boolean;
  setSqlModalOpen: (open: boolean) => void;
}

export const useKasUIStore = create<KasUIState>((set) => ({
  activeCashierTab: 'INCOME',
  setActiveCashierTab: (tab) => set({ activeCashierTab: tab }),
  chartDays: 7,
  setChartDays: (days) => set({ chartDays: days }),
  historyFilterType: 'ALL',
  setHistoryFilterType: (filter) => set({ historyFilterType: filter }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  isSqlModalOpen: false,
  setSqlModalOpen: (open) => set({ isSqlModalOpen: open }),
}));
