import { useNavigate } from 'react-router-dom';
import {
  X,
  Wallet,
  Zap,
  Calculator,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Banknote,
  Pencil,
} from 'lucide-react';
import { useKasUIStore } from '../store/useKasUIStore';

const GUIDE_STEPS = [
  {
    step: '01. Pagi Hari (Buka Kedai)',
    title: 'Masukkan Modal Uang Kembalian di Laci',
    description:
      'Sebelum mulai jualan, buka menu Buka Kas lalu pilih atau ketik jumlah uang kembalian yang disiapkan di laci (misal Rp 200.000).',
    tips: 'Bisa langsung pilih tombol nominal cepat (Rp 150.000 – Rp 500.000) dengan 1 sentuhan.',
    route: '/buka-kas',
    buttonText: 'Buka Halaman Buka Kas',
    icon: Wallet,
    accent: 'noodle',
  },
  {
    step: '02. Jam Sibuk (Kasir Cepat)',
    title: 'Catat Pemasukan & Belanja Bahan dalam Hitungan Detik',
    description:
      'Gunakan tab Pemasukan (warna Kuning Mie) saat pembeli membayar, atau tab Pengeluaran (warna Merah Sambal) saat membeli bahan baku seperti sawi, ayam, gas, dan es batu.',
    tips: 'Klik tombol "1-Tap Simpan" pada menu Rp 15.000 / Rp 20.000 / Rp 50.000 untuk langsung menyimpan tanpa mengetik!',
    route: '/',
    buttonText: 'Ke Kasir Cepat',
    icon: Zap,
    accent: 'noodle',
  },
  {
    step: '03. Sore / Malam (Tutup Kedai)',
    title: 'Cocokkan Uang Fisik Laci & Kirim Rekap ke WhatsApp',
    description:
      'Aplikasi otomatis menghitung Estimasi Uang di Laci (Kas Awal + Pemasukan − Pengeluaran). Masukkan jumlah uang tunai fisik yang ada di laci saat kedai tutup.',
    tips: 'Gunakan fitur "Kalkulator Hitung Pecahan Lembaran Uang" untuk menghitung lembaran 100rb hingga 1rb secara otomatis, lalu klik "Salin Rekap WA".',
    route: '/tutup-kedai',
    buttonText: 'Ke Halaman Tutup Kedai',
    icon: Calculator,
    accent: 'noodle',
  },
  {
    step: '04. Evaluasi Bulanan (Dashboard Analitik)',
    title: 'Pantau Laba Bersih & Unduh Laporan Excel (CSV)',
    description:
      'Lihat ringkasan Total Pendapatan, Total Pengeluaran, dan Laba Bersih beserta grafik tren 7 atau 30 hari terakhir.',
    tips: 'Gunakan tombol "Unduh CSV" untuk menyimpan pembukuan ke HP atau komputer (Excel / Google Sheets).',
    route: '/dashboard',
    buttonText: 'Lihat Dashboard Analitik',
    icon: BarChart3,
    accent: 'noodle',
  },
];

export function SupabaseSetupModal() {
  const navigate = useNavigate();
  const isOpen = useKasUIStore((s) => s.isSqlModalOpen);
  const setOpen = useKasUIStore((s) => s.setSqlModalOpen);

  if (!isOpen) return null;

  const handleGoTo = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-guide-modal-title"
    >
      <div className="bg-[#ffffff] w-full max-w-2xl rounded-t-3xl sm:rounded-2xl border border-stone-200 shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-4 bg-[#fafaf9]">
          <div>
            <span className="text-xs font-semibold text-[#dd9e3e] tracking-wide">
              Panduan Singkat Kasir & Pemilik
            </span>
            <h2
              id="app-guide-modal-title"
              className="text-lg sm:text-xl font-bold text-[#1c1917]"
            >
              Cara Penggunaan Buku Kas Mie Ayam Mba Anna
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Tutup panduan penggunaan"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-200/70 hover:text-[#1c1917] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Aplikasi ini dirancang agar pencatatan kas harian kedai berjalan cepat cukup dengan{' '}
            <strong className="text-[#1c1917]">1–2 sentuhan jari</strong>. Berikut urutan penggunaannya setiap hari:
          </p>

          {/* 4 Langkah Utama */}
          <div className="space-y-3">
            {GUIDE_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="p-4 rounded-2xl bg-[#fafaf9] border border-stone-200/90 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#fef7ec] border border-[#dd9e3e]/30 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-[#dd9e3e]" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#dd9e3e] block">
                          {item.step}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[#1c1917]">
                          {item.title}
                        </h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGoTo(item.route)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-[#dd9e3e] text-xs font-semibold text-[#1c1917] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                    >
                      <span>Buka</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#dd9e3e]" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex items-start gap-2 pt-1 text-xs text-stone-700">
                    <CheckCircle2 className="w-4 h-4 text-[#dd9e3e] shrink-0 mt-0.5" />
                    <span>
                      <strong>Tips Cepat:</strong> {item.tips}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fitur Tambahan Kasir */}
          <div className="p-4 rounded-2xl bg-[#fef7ec] border border-[#dd9e3e]/40 space-y-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#1c1917]">
              Fitur Bantu Lainnya Saat Melayani Pembeli:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-700">
              <div className="flex items-start gap-2">
                <Banknote className="w-4 h-4 text-[#dd9e3e] shrink-0 mt-0.5" />
                <span>
                  <strong>Hitung Kembalian Pembeli:</strong> Muncul otomatis saat Anda mengisi nominal pemasukan untuk menghitung kembalian uang Rp 20.000, Rp 50.000, atau Rp 100.000.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Pencil className="w-4 h-4 text-[#dd9e3e] shrink-0 mt-0.5" />
                <span>
                  <strong>Koreksi / Edit Transaksi:</strong> Salah ketik nominal? Klik ikon pensil di daftar Transaksi Hari Ini untuk langsung memperbaiki tanpa menghapus.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#fafaf9] border-t border-stone-200 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-[#dd9e3e] hover:bg-[#c88a2e] text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Mengerti, Mulai Gunakan Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
}
