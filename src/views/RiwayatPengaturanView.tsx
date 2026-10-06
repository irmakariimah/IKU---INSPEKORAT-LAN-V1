import React, { useEffect, useState } from 'react';
import {
  DAFTAR_TAHUN_DEFAULT,
  DAFTAR_TRIWULAN,
  TriwulanType,
} from '../data/officialTargets.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { History, Shield, UserCheck, RefreshCw, LogIn, LogOut } from 'lucide-react';

interface RiwayatPengaturanViewProps {
  mode: 'RIWAYAT' | 'PENGATURAN';
  tahun: number;
  triwulan: TriwulanType;
  includeSampleData: boolean;
  onChangeIncludeSample: (val: boolean) => void;
}

export const RiwayatPengaturanView: React.FC<RiwayatPengaturanViewProps> = ({
  mode,
  tahun,
  triwulan,
  includeSampleData,
  onChangeIncludeSample,
}) => {
  const {
    firebaseUser,
    appUser,
    activeRole,
    authError,
    signInWithGoogle,
    signOut,
    setRoleMode,
  } = useAuth();

  const [logs, setLogs] = useState<any[]>([]);
  const [filterTahun, setFilterTahun] = useState<string>('SEMUA');
  const [filterTriwulan, setFilterTriwulan] = useState<string>('SEMUA');
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      if (filterTahun !== 'SEMUA') params.set('tahun', filterTahun);
      if (filterTriwulan !== 'SEMUA') params.set('triwulan', filterTriwulan);
      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error('Error loading logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (mode === 'RIWAYAT') {
      fetchLogs();
    }
  }, [mode, filterTahun, filterTriwulan]);

  if (mode === 'RIWAYAT') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <History className="h-3.5 w-3.5" />
              <span>Audit Trail & Keterlacakan Perubahan Data</span>
            </div>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">
              Riwayat Perubahan Data IKU Pengawasan Intern & Tata Kelola
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Seluruh perubahan nilai setiap periode dicatat secara historis tanpa menghapus data
              periode sebelumnya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter Tahun Riwayat"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="SEMUA">Semua Tahun</option>
              {DAFTAR_TAHUN_DEFAULT.map((yr) => (
                <option key={yr} value={String(yr)}>
                  Tahun {yr}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Triwulan Riwayat"
              value={filterTriwulan}
              onChange={(e) => setFilterTriwulan(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="SEMUA">Semua Triwulan</option>
              {DAFTAR_TRIWULAN.map((tw) => (
                <option key={tw} value={tw}>
                  {tw}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchLogs}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Tahun</th>
                  <th className="px-4 py-3">Triwulan</th>
                  <th className="px-4 py-3">Indikator</th>
                  <th className="px-4 py-3">Komponen</th>
                  <th className="px-4 py-3">Nilai Sebelum</th>
                  <th className="px-4 py-3">Nilai Sesudah</th>
                  <th className="px-4 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      Memuat riwayat perubahan data...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                      Belum ada catatan perubahan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono whitespace-nowrap">{log.tanggal}</td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap text-slate-500">
                        {log.waktu}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{log.userNama}</div>
                        <div className="text-[11px] text-slate-500">{log.userEmail}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">{log.tahun}</td>
                      <td className="px-4 py-3 font-mono">{log.triwulan}</td>
                      <td className="px-4 py-3 text-slate-700">{log.indikator}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        {log.komponen}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">{log.nilaiSebelum}</td>
                      <td className="px-4 py-3 font-mono font-medium text-emerald-800">
                        {log.nilaiSesudah}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.keterangan}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Mode PENGATURAN
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="text-xs text-slate-500">Konfigurasi Sistem & Hak Akses</div>
        <h1 className="mt-0.5 text-lg font-semibold text-slate-900">
          Pengaturan Aplikasi, Autentikasi & Manajemen Peran (RBAC)
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Kartu Autentikasi & Profil */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Autentikasi Pengguna (Google Sign-In / Firebase Auth)
            </h2>
          </div>

          {authError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {authError}
            </div>
          )}

          {firebaseUser ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-3">
                <div>
                  <span className="text-slate-500">Nama Pengguna:</span>
                  <div className="font-semibold text-slate-900">
                    {appUser?.nama || firebaseUser.displayName}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Email Resmi:</span>
                  <div className="font-mono text-slate-900">{firebaseUser.email}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar dari Akun</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Masuk menggunakan akun Google untuk menyimpan input data realisasi, mengelola
                target tahun berikutnya, dan mencatat riwayat audit atas nama akun Anda.
              </p>
              <button
                type="button"
                onClick={signInWithGoogle}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Masuk dengan Google</span>
              </button>
            </div>
          )}
        </div>

        {/* Kartu Peran (Operator vs Pimpinan) */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Pengaturan Peran (Operator/Admin vs Pimpinan)
            </h2>
          </div>

          <p className="text-xs text-slate-600">
            Pilih peran aktif untuk menguji hak akses pada antarmuka maupun validasi server:
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRoleMode('OPERATOR')}
              className={`rounded-md border p-4 text-left transition-colors ${
                activeRole === 'OPERATOR'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold">Role: Operator / Admin</div>
              <p className="mt-1 text-[11px] opacity-80">
                Dapat menginput & mengedit data, import Excel, melihat dashboard & detail,
                mengelola target tahun berikutnya, serta memfinalisasi periode.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRoleMode('PIMPINAN')}
              className={`rounded-md border p-4 text-left transition-colors ${
                activeRole === 'PIMPINAN'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="text-xs font-bold">Role: Pimpinan (Read-Only)</div>
              <p className="mt-1 text-[11px] opacity-80">
                Dapat memantau dashboard eksekutif, melihat grafik, menelusuri detail perhitungan,
                dan mengunduh laporan tanpa dapat mengubah data.
              </p>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={includeSampleData}
                onChange={(e) => onChangeIncludeSample(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-slate-900"
              />
              <span>
                Tampilkan Data Uji Simulasi (Non-aktifkan untuk hanya menampilkan Realisasi Resmi)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Catatan Konfigurasi & Parameter Dokumen (TODO / Konfigurasi Terbuka) */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-3 text-xs text-slate-700">
        <h3 className="text-sm font-semibold text-slate-900">
          Parameter Konfigurasi & Catatan Teknis Perjanjian Kinerja
        </h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Periode Aktif Saat Ini:</strong> Tahun {tahun} — {triwulan}. Seluruh data
            disimpan terpisah per Tahun dan Triwulan pada database PostgreSQL (Cloud SQL).
          </li>
          <li>
            <strong>Skala Nilai Kapabilitas APIP & Komponen Rasio:</strong> Sesuai tabel Target
            Triwulan Resmi PK 2026, nilai komponen disimpan dan ditampilkan dalam skala indeks
            0–100 (contoh: APIP = 40,20; TLP = 68,50; LHKAN = 99,50) sehingga konsisten dengan
            pembagi 8 pada rumus IK Pengawasan Intern.
          </li>
          <li>
            <strong>TODO Konfigurasi Tambahan (Dapat Diedit):</strong> Target resmi untuk tahun
            2027, 2028, dan 2029 dapat dikonfigurasi langsung melalui menu <em>Target</em> setelah
            dokumen Perjanjian Kinerja tahun bersangkutan ditetapkan.
          </li>
        </ul>
      </div>
    </div>
  );
};
