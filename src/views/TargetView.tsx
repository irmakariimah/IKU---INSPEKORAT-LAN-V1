import React, { useState } from 'react';
import {
  DAFTAR_TAHUN_DEFAULT,
  DAFTAR_TRIWULAN,
  KOMPONEN_META,
  KomponenPengawasanType,
  KomponenTataKelolaType,
  TARGET_KOMPONEN_PENGAWASAN_2026,
  TARGET_KOMPONEN_TATA_KELOLA_2026,
  TARGET_TAHUNAN_2026,
  TARGET_TRIWULAN_IK_PENGAWASAN_2026,
  TARGET_TRIWULAN_IK_TATA_KELOLA_2026,
  TriwulanType,
} from '../data/officialTargets.ts';
import { formatDecimal, formatTargetDecimal } from '../engine/calculationEngine.ts';
import { Lock, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface TargetViewProps {
  onRefreshData: () => void;
}

export const TargetView: React.FC<TargetViewProps> = ({ onRefreshData }) => {
  const { activeRole, firebaseUser, signInWithGoogle, apiFetch } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [customTriwulan, setCustomTriwulan] = useState<TriwulanType>('TW I');
  const [customIndikator, setCustomIndikator] = useState<'IK_PENGAWASAN' | 'IK_TATA_KELOLA'>(
    'IK_PENGAWASAN'
  );
  const [customKomponen, setCustomKomponen] = useState<string>('INDUK');
  const [customValue, setCustomValue] = useState<string>('78.00');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const pengawasanKeys: KomponenPengawasanType[] = [
    'TLP',
    'EvAKIP',
    'PPG',
    'LHKAN',
    'WBS',
    'ZI',
    'APIP',
    'KPI',
  ];
  const tataKelolaKeys: KomponenTataKelolaType[] = ['NES', 'NCKI', 'NSAP', 'SKM'];

  const handleSaveCustomTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!firebaseUser) {
      setMessage({
        type: 'error',
        text: 'Silakan masuk dengan Google terlebih dahulu untuk menyimpan target tahun berikutnya.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/targets', {
        method: 'POST',
        body: JSON.stringify({
          tahun: selectedYear,
          triwulan: customTriwulan,
          indikatorKode: customIndikator,
          komponenKode: customKomponen,
          targetNilai: Number(customValue),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan target');
      }
      setMessage({
        type: 'success',
        text: `Target Tahun ${selectedYear} ${customTriwulan} berhasil disimpan.`,
      });
      onRefreshData();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Gagal menyimpan target',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Perjanjian Kinerja Inspektur LAN</span>
            <span aria-hidden="true">·</span>
            <span>Target Induk & Target Subindikator</span>
          </div>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">
            Manajemen Target Kinerja Resmi Tahun 2026 & Multi-Tahun (2025–2029)
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Pilih Tahun Target:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900"
          >
            {DAFTAR_TAHUN_DEFAULT.map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr} {yr === 2026 ? '(Target Resmi PK 2026)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ringkasan Target Tahunan 2026 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Target Indikator Utama 1 (Tahun 2026)</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Target Resmi PK 2026
            </span>
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            IK - Indeks Pengawasan Intern LAN
          </h2>
          <div className="mt-3 font-mono text-3xl font-bold tabular-nums text-slate-900">
            {formatDecimal(TARGET_TAHUNAN_2026.IK_PENGAWASAN)}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Target Triwulanan: TW I = 32,28 · TW II = 57,09 · TW III = 67,81 · TW IV = 76,50
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Target Indikator Utama 2 (Tahun 2026)</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Target Resmi PK 2026
            </span>
          </div>
          <h2 className="mt-1 text-base font-semibold text-slate-900">
            IK - Indeks Tata Kelola Internal Inspektorat
          </h2>
          <div className="mt-3 font-mono text-3xl font-bold tabular-nums text-slate-900">
            {formatDecimal(TARGET_TAHUNAN_2026.IK_TATA_KELOLA)}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Target Triwulanan: TW I = 24,75 · TW II = 24,75 · TW III = 45,25 · TW IV = 87,80
          </p>
        </div>
      </div>

      {/* Tabel P: Target Triwulan Resmi IK Pengawasan Intern LAN 2026 */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tabel Target Triwulan Resmi 2026 — IK Pengawasan Intern LAN
            </h3>
            <p className="text-xs text-slate-500">
              Disimpan sebagai TARGET RESMI sesuai dokumen Perjanjian Kinerja Inspektur LAN Tahun
              2026.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
            <Lock className="h-3.5 w-3.5" /> Terkunci Sesuai Peraturan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-6 py-3">Komponen</th>
                <th className="px-6 py-3">Nama Subindikator</th>
                <th className="px-6 py-3 text-right">TW I</th>
                <th className="px-6 py-3 text-right">TW II</th>
                <th className="px-6 py-3 text-right">TW III</th>
                <th className="px-6 py-3 text-right">TW IV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {pengawasanKeys.map((kode) => (
                <tr key={kode} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-900">{kode}</td>
                  <td className="px-6 py-3 text-slate-700">{KOMPONEN_META[kode].nama}</td>
                  {DAFTAR_TRIWULAN.map((tw) => (
                    <td
                      key={tw}
                      className="px-6 py-3 text-right font-mono tabular-nums text-slate-900"
                    >
                      {formatTargetDecimal(TARGET_KOMPONEN_PENGAWASAN_2026[kode][tw])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-900">
                <td className="px-6 py-3 font-mono">Target IK</td>
                <td className="px-6 py-3">Target Indeks Pengawasan Intern LAN</td>
                {DAFTAR_TRIWULAN.map((tw) => (
                  <td key={tw} className="px-6 py-3 text-right font-mono tabular-nums">
                    {formatDecimal(TARGET_TRIWULAN_IK_PENGAWASAN_2026[tw])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tabel Q: Target Triwulan Resmi IK Tata Kelola Internal 2026 */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Tabel Target Triwulan Resmi 2026 — IK Tata Kelola Internal Inspektorat
            </h3>
            <p className="text-xs text-slate-500">
              Disimpan sebagai TARGET RESMI untuk Indikator Kedua (Tata Kelola Internal).
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
            <Lock className="h-3.5 w-3.5" /> Terkunci Sesuai Peraturan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="px-6 py-3">Komponen</th>
                <th className="px-6 py-3">Nama Subindikator</th>
                <th className="px-6 py-3 text-right">TW I</th>
                <th className="px-6 py-3 text-right">TW II</th>
                <th className="px-6 py-3 text-right">TW III</th>
                <th className="px-6 py-3 text-right">TW IV</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tataKelolaKeys.map((kode) => (
                <tr key={kode} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-900">{kode}</td>
                  <td className="px-6 py-3 text-slate-700">{KOMPONEN_META[kode].nama}</td>
                  {DAFTAR_TRIWULAN.map((tw) => (
                    <td
                      key={tw}
                      className="px-6 py-3 text-right font-mono tabular-nums text-slate-900"
                    >
                      {formatTargetDecimal(TARGET_KOMPONEN_TATA_KELOLA_2026[kode][tw])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-900">
                <td className="px-6 py-3 font-mono">Target IK</td>
                <td className="px-6 py-3">Target Indeks Tata Kelola Internal Inspektorat</td>
                {DAFTAR_TRIWULAN.map((tw) => (
                  <td key={tw} className="px-6 py-3 text-right font-mono tabular-nums">
                    {formatDecimal(TARGET_TRIWULAN_IK_TATA_KELOLA_2026[tw])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Form Konfigurasi Target Tahun Berikutnya (2027, 2028, 2029) */}
      {activeRole === 'OPERATOR' && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900">
            Konfigurasi Target Periode Tahun Berikutnya (2027 / 2028 / 2029)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Target Resmi Tahun 2026 dikunci agar tidak dapat diubah. Untuk tahun 2027, 2028, dan
            2029, Operator dapat menambahkan atau memperbarui target induk maupun target komponen.
          </p>

          {message && (
            <div
              className={`mt-4 rounded-md border p-3 text-xs ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {message.text}
            </div>
          )}

          <form
            onSubmit={handleSaveCustomTarget}
            className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5"
          >
            <div>
              <label className="block text-xs font-medium text-slate-700">Tahun Target</label>
              <select
                value={selectedYear === 2026 ? 2027 : selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              >
                <option value={2027}>2027</option>
                <option value={2028}>2028</option>
                <option value={2029}>2029</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Triwulan</label>
              <select
                value={customTriwulan}
                onChange={(e) => setCustomTriwulan(e.target.value as TriwulanType)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              >
                {DAFTAR_TRIWULAN.map((tw) => (
                  <option key={tw} value={tw}>
                    {tw}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Indikator</label>
              <select
                value={customIndikator}
                onChange={(e) => setCustomIndikator(e.target.value as any)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="IK_PENGAWASAN">IK Pengawasan Intern LAN</option>
                <option value="IK_TATA_KELOLA">IK Tata Kelola Internal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Target Induk / Komponen
              </label>
              <select
                value={customKomponen}
                onChange={(e) => setCustomKomponen(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
              >
                <option value="INDUK">Target Induk IKU</option>
                {(customIndikator === 'IK_PENGAWASAN' ? pengawasanKeys : tataKelolaKeys).map(
                  (k) => (
                    <option key={k} value={k}>
                      Komponen {k}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Nilai Target</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
                {firebaseUser ? (
                  <button
                    type="submit"
                    disabled={saving || selectedYear === 2026}
                    onClick={() => {
                      if (selectedYear === 2026) setSelectedYear(2027);
                    }}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Simpan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                  >
                    Login Google
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
