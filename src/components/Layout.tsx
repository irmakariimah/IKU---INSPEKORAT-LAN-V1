import React, { useState } from 'react';
import {
  LayoutDashboard,
  FilePlus2,
  Layers,
  ShieldAlert,
  Building2,
  Target,
  FileSpreadsheet,
  CheckCircle2,
  History,
  Settings,
  Menu,
  X,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { DAFTAR_TAHUN_DEFAULT, DAFTAR_TRIWULAN, TriwulanType } from '../data/officialTargets.ts';

export type NavSection =
  | 'DASHBOARD'
  | 'INPUT_DATA'
  | 'DATA_TLP'
  | 'DATA_IKU'
  | 'DATA_TATA_KELOLA'
  | 'TARGET'
  | 'LAPORAN'
  | 'VALIDASI'
  | 'RIWAYAT'
  | 'PENGATURAN';

interface LayoutProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  tahunAktif: number;
  triwulanAktif: TriwulanType;
  onChangeTahun: (tahun: number) => void;
  onChangeTriwulan: (tw: TriwulanType) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'INPUT_DATA', label: 'Input Data', icon: FilePlus2 },
  { id: 'DATA_TLP', label: 'Data TLP', icon: Layers },
  { id: 'DATA_IKU', label: 'Data IKU', icon: ShieldAlert },
  { id: 'DATA_TATA_KELOLA', label: 'Data Tata Kelola', icon: Building2 },
  { id: 'TARGET', label: 'Target', icon: Target },
  { id: 'LAPORAN', label: 'Laporan', icon: FileSpreadsheet },
  { id: 'VALIDASI', label: 'Validasi Perhitungan', icon: CheckCircle2 },
  { id: 'RIWAYAT', label: 'Riwayat', icon: History },
  { id: 'PENGATURAN', label: 'Pengaturan', icon: Settings },
];

export const Layout: React.FC<LayoutProps> = ({
  activeSection,
  onSelectSection,
  tahunAktif,
  triwulanAktif,
  onChangeTahun,
  onChangeTriwulan,
  children,
}) => {
  const { firebaseUser, appUser, activeRole, signInWithGoogle, signOut, setRoleMode } =
    useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Sidebar Kiri */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 bg-white z-30">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => onSelectSection('DASHBOARD')}
            className="text-left focus:outline-none"
          >
            <div className="text-sm font-bold tracking-tight text-slate-900">
              IKU Pengawasan Intern LAN
            </div>
            <div className="text-xs text-slate-500">Inspektorat LAN RI</div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menu Utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <div>
            <div className="text-xs font-medium text-slate-600 mb-1.5">
              Mode Akses Pengguna:
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-200/80 p-1">
              <button
                type="button"
                onClick={() => setRoleMode('OPERATOR')}
                className={`rounded py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeRole === 'OPERATOR'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Operator
              </button>
              <button
                type="button"
                onClick={() => setRoleMode('PIMPINAN')}
                className={`rounded py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  activeRole === 'PIMPINAN'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pimpinan
              </button>
            </div>
          </div>
          <div className="text-[11px] text-slate-500">
            Perjanjian Kinerja Inspektur LAN Tahun {tahunAktif}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100"
              aria-label="Buka navigasi"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <span className="text-sm font-bold tracking-tight text-slate-900 whitespace-nowrap">
              IKU Pengawasan Intern LAN
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span>Tahun Aktif:</span>
              <select
                aria-label="Pilih Tahun Aktif"
                value={tahunAktif}
                onChange={(e) => onChangeTahun(Number(e.target.value))}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-900"
              >
                {DAFTAR_TAHUN_DEFAULT.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
            <span aria-hidden="true">·</span>
            <div className="flex items-center gap-1.5">
              <span>Triwulan:</span>
              <select
                aria-label="Pilih Triwulan Aktif"
                value={triwulanAktif}
                onChange={(e) => onChangeTriwulan(e.target.value as TriwulanType)}
                className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-900"
              >
                {DAFTAR_TRIWULAN.map((tw) => (
                  <option key={tw} value={tw}>
                    {tw}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600">
              <UserCheck className="h-3.5 w-3.5 text-slate-500" />
              <span className="font-medium text-slate-900 truncate max-w-[160px]">
                {firebaseUser
                  ? appUser?.nama || firebaseUser.displayName || firebaseUser.email
                  : 'Tamu Eksekutif'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-700">
                {activeRole === 'OPERATOR' ? 'Operator/Admin' : 'Pimpinan'}
              </span>
            </div>

            {firebaseUser ? (
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Masuk Google</span>
              </button>
            )}
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Inspektorat Lembaga Administrasi Negara (LAN) · Sistem Pengelolaan IKU Pengawasan Intern
          </div>
          <div>Dasar Perhitungan: Perjanjian Kinerja Inspektur LAN Tahun 2026</div>
        </footer>
      </div>
    </div>
  );
};
