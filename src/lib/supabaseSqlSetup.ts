export const SUPABASE_SQL_SCHEMA = `-- ============================================================================
-- BUKU KAS PINTAR MIE AYAM MBA ANNA - SUPABASE POSTGRESQL SCHEMA & RLS SETUP
-- Jalankan script ini di SQL Editor Supabase (https://supabase.com/dashboard)
-- ============================================================================

-- Aktifkan ekstensi UUID jika belum aktif
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABEL CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE'))
);

-- 2. TABEL TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  description TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL DAILY_SESSIONS (Sesi Kasir Harian)
CREATE TABLE IF NOT EXISTS public.daily_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  expected_closing_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  actual_closing_balance NUMERIC(12, 2),
  difference NUMERIC(12, 2),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED'))
);

-- INDEX UNTUK PERFORMA QUERY HARIAN & DASHBOARD
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions (type);
CREATE INDEX IF NOT EXISTS idx_daily_sessions_date_status ON public.daily_sessions (date DESC, status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) DASAR SUPABASE
-- ============================================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sessions ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses untuk MVP Kasir Internal (Anon / Authenticated Key)
CREATE POLICY "Allow full access to categories"
  ON public.categories FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to transactions"
  ON public.transactions FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to daily_sessions"
  ON public.daily_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- SEED DATA AWAL KATEGORI MIE AYAM MBA ANNA
-- ============================================================================
INSERT INTO public.categories (id, name, type) VALUES
  ('11111111-1111-4111-8111-111111111101', 'Penjualan Mie Ayam & Menu', 'INCOME'),
  ('11111111-1111-4111-8111-111111111102', 'Minuman & Camilan', 'INCOME'),
  ('11111111-1111-4111-8111-111111111103', 'Pesanan Partai / Catering', 'INCOME'),
  ('22222222-2222-4222-8222-222222222201', 'Bahan Baku', 'EXPENSE'),
  ('22222222-2222-4222-8222-222222222202', 'Operasional', 'EXPENSE'),
  ('22222222-2222-4222-8222-222222222203', 'Lain-lain', 'EXPENSE')
ON CONFLICT (id) DO NOTHING;
`;

export const VITE_INIT_SNIPPET = `# 1. Inisiasi Project React + Vite (TypeScript)
npm create vite@latest buku-kas-mie-ayam -- --template react-ts
cd buku-kas-mie-ayam

# 2. Install Dependencies Utama
npm install @supabase/supabase-js @tanstack/react-query react-router-dom zustand recharts lucide-react sonner clsx tailwind-merge

# 3. Setup Environment Variables (.env)
VITE_SUPABASE_URL="https://project-id-anda.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`;

export const SUPABASE_CLIENT_SNIPPET = `// src/lib/supabaseClient.js (atau .ts)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);`;

export const TAILWIND_CONFIG_SNIPPET = `// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        noodle: {
          DEFAULT: '#dd9e3e', // Primary (Cash In / Tab Aktif / Tombol Utama)
          hover: '#c88a2e',
          light: '#fef7ec',
        },
        sambal: {
          DEFAULT: '#e11d48', // Danger / Expense (Cash Out / Peringatan)
          hover: '#be123c',
          light: '#fff1f2',
        },
        canvas: '#fafaf9',    // Background Utama (Warm Off-White)
        surface: '#ffffff',   // Card / Form Input (Pure White)
        stone: {
          deep: '#1c1917',    // Text Utama (Deep Stone)
        },
      },
    },
  },
  plugins: [],
};`;
