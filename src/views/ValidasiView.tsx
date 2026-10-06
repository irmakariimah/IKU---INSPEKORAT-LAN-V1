import React, { useState } from 'react';
import {
  calculateIkPengawasanIntern,
  calculateIkTataKelolaInternal,
  formatDecimal,
  formatTargetDecimal,
  runOfficialFormulaTests,
} from '../engine/calculationEngine.ts';
import { CheckCircle2, Calculator, RotateCcw } from 'lucide-react';

interface ValidasiViewProps {
  periodData: any;
}

export const ValidasiView: React.FC<ValidasiViewProps> = ({ periodData }) => {
  // Simulator interaktif yang diinisialisasi dengan contoh spesifikasi Bagian AI:
  // TLP = 78,50 | EvAKIP = 72,00 | PPG = 60,00 | LHKAN = 100,00 | WBS = 100,00 | ZI = 80,00 | APIP = 40,20 | KPI = 20,00
  const [simValues, setSimValues] = useState({
    TLP: '78.50',
    EvAKIP: '72.00',
    PPG: '60.00',
    LHKAN: '100.00',
    WBS: '100.00',
    ZI: '80.00',
    APIP: '40.20',
    KPI: '20.00',
  });

  const [simTarget, setSimTarget] = useState('76.50');

  const parseOrNull = (val: string) => {
    if (val.trim() === '') return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  };

  const simCalc = calculateIkPengawasanIntern({
    TLP: parseOrNull(simValues.TLP),
    EvAKIP: parseOrNull(simValues.EvAKIP),
    PPG: parseOrNull(simValues.PPG),
    LHKAN: parseOrNull(simValues.LHKAN),
    WBS: parseOrNull(simValues.WBS),
    ZI: parseOrNull(simValues.ZI),
    APIP: parseOrNull(simValues.APIP),
    KPI: parseOrNull(simValues.KPI),
  });

  const targetNum = Number(simTarget) || 76.5;
  const selisihSim = simCalc.nilaiIk !== null ? simCalc.nilaiIk - targetNum : null;

  const officialTests = runOfficialFormulaTests();

  const loadFromActivePeriod = () => {
    if (!periodData?.ikPengawasan?.komponen) return;
    const map: any = {};
    for (const c of periodData.ikPengawasan.komponen) {
      map[c.kode] = c.realisasi !== null ? String(Number(c.realisasi.toFixed(4))) : '';
    }
    setSimValues(map);
    setSimTarget(String(periodData.ikPengawasan.targetTriwulan || 76.5));
  };

  const resetToSpecExample = () => {
    setSimValues({
      TLP: '78.50',
      EvAKIP: '72.00',
      PPG: '60.00',
      LHKAN: '100.00',
      WBS: '100.00',
      ZI: '80.00',
      APIP: '40.20',
      KPI: '20.00',
    });
    setSimTarget('76.50');
  };

  return (
    <div className="space-y-6">
      {/* Header Validasi Perhitungan */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-xs text-slate-500">
              Audit Formula & Keterlacakan Matematika · Calculation Engine
            </div>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">
              Validasi Perhitungan & Pengujian Formula Otomatis
            </h1>
            <p className="mt-1 text-xs text-slate-600">
              Menampilkan proses substitusi rumus, input setiap komponen, hasil akhir presisi, dan
              selisih terhadap target sesuai Perjanjian Kinerja Inspektur LAN Tahun 2026.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadFromActivePeriod}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              Muat Data Periode Aktif ({periodData?.tahun} {periodData?.triwulan})
            </button>
            <button
              type="button"
              onClick={resetToSpecExample}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Contoh Dokumen Spesifikasi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bagian 1: Validasi Data Periode Aktif */}
      {periodData && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs text-slate-500">
                Audit Periode Aktif ({periodData.tahun} {periodData.triwulan})
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                1. IK - Indeks Pengawasan Intern LAN
              </h2>
            </div>

            <div className="rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-800">
              <div>
                <strong>Formula Dasar:</strong>
              </div>
              <div className="mt-1">
                IK = [(TLP × 100) + EvAKIP + PPG + (LHKAN × 100) + (WBS × 100) + ZI + (APIP × 100)
                + (KPI × 100)] / 8
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {periodData.ikPengawasan.komponen.map((c: any) => (
                <div
                  key={c.kode}
                  className="flex items-center justify-between border-b border-slate-100 py-1.5"
                >
                  <span className="font-medium text-slate-700">
                    {c.kode} ({c.nama})
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {formatDecimal(c.realisasi)}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-md bg-slate-900 p-4 font-mono text-xs text-white space-y-1.5">
              <div className="text-slate-300">Proses Substitusi Periode Aktif:</div>
              <div>{periodData.ikPengawasan.rumusSubstitusi}</div>
              <div className="pt-2 border-t border-slate-700 flex flex-wrap justify-between gap-2">
                <span>
                  Target ({periodData.triwulan}):{' '}
                  {formatTargetDecimal(periodData.ikPengawasan.targetTriwulan)}
                </span>
                <span>
                  Hasil Akhir IK: <strong>{formatDecimal(periodData.ikPengawasan.realisasi)}</strong>
                </span>
                <span className="text-emerald-400">
                  Selisih:{' '}
                  {periodData.ikPengawasan.selisih !== null
                    ? `${periodData.ikPengawasan.selisih >= 0 ? '+' : ''}${formatDecimal(
                        periodData.ikPengawasan.selisih
                      )}`
                    : 'Belum tersedia'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs text-slate-500">
                Audit Periode Aktif ({periodData.tahun} {periodData.triwulan})
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                2. IK - Indeks Tata Kelola Internal Inspektorat
              </h2>
            </div>

            <div className="rounded-md bg-slate-50 p-3 font-mono text-xs text-slate-800">
              <div>
                <strong>Formula Dasar:</strong>
              </div>
              <div className="mt-1">IK = (NES + NCKI + NSAP + SKM) / 4</div>
            </div>

            <div className="space-y-1.5 text-xs">
              {periodData.ikTataKelola.komponen.map((c: any) => (
                <div
                  key={c.kode}
                  className="flex items-center justify-between border-b border-slate-100 py-1.5"
                >
                  <span className="font-medium text-slate-700">
                    {c.kode} ({c.nama})
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                    {formatDecimal(c.realisasi)}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-md bg-slate-900 p-4 font-mono text-xs text-white space-y-1.5">
              <div className="text-slate-300">Proses Substitusi Periode Aktif:</div>
              <div>{periodData.ikTataKelola.rumusSubstitusi}</div>
              <div className="pt-2 border-t border-slate-700 flex flex-wrap justify-between gap-2">
                <span>
                  Target ({periodData.triwulan}):{' '}
                  {formatTargetDecimal(periodData.ikTataKelola.targetTriwulan)}
                </span>
                <span>
                  Hasil Akhir IK: <strong>{formatDecimal(periodData.ikTataKelola.realisasi)}</strong>
                </span>
                <span className="text-emerald-400">
                  Selisih:{' '}
                  {periodData.ikTataKelola.selisih !== null
                    ? `${periodData.ikTataKelola.selisih >= 0 ? '+' : ''}${formatDecimal(
                        periodData.ikTataKelola.selisih
                      )}`
                    : 'Belum tersedia'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bagian 2: Simulator Validasi Perhitungan Interaktif (Sesuai Contoh Bagian AI) */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Calculator className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900">
            Simulator Uji Validasi Perhitungan IK Pengawasan Intern
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-9">
          {(Object.keys(simValues) as Array<keyof typeof simValues>).map((k) => (
            <div key={k}>
              <label className="block font-mono text-xs font-semibold text-slate-700">{k}</label>
              <input
                type="number"
                step="0.01"
                placeholder="Kosong"
                value={simValues[k]}
                onChange={(e) => setSimValues({ ...simValues, [k]: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
              />
            </div>
          ))}
          <div>
            <label className="block font-mono text-xs font-semibold text-slate-700">Target</label>
            <input
              type="number"
              step="0.01"
              value={simTarget}
              onChange={(e) => setSimTarget(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 font-mono text-xs"
            />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4 font-mono text-xs space-y-2">
          <div>
            <strong>Formula:</strong> IK = [(TLP × 100) + EvAKIP + PPG + (LHKAN × 100) + (WBS × 100)
            + ZI + (APIP × 100) + (KPI × 100)] / 8
          </div>
          <div>
            <strong>Substitusi Nilai:</strong> {simCalc.rumusSubstitusi}
          </div>
          <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-200 sm:grid-cols-4">
            <div>
              <span className="text-slate-500">Nilai Presisi Penuh:</span>{' '}
              <strong className="text-slate-900">
                {simCalc.nilaiIk !== null ? simCalc.nilaiIk.toFixed(6) : 'Belum tersedia'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Hasil Akhir (2 Desimal):</span>{' '}
              <strong className="text-slate-900 text-sm">{formatDecimal(simCalc.nilaiIk)}</strong>
            </div>
            <div>
              <span className="text-slate-500">Target Pembanding:</span>{' '}
              <strong className="text-slate-900">{formatDecimal(targetNum)}</strong>
            </div>
            <div>
              <span className="text-slate-500">Selisih Target & Realisasi:</span>{' '}
              <strong
                className={
                  selisihSim !== null && selisihSim >= 0 ? 'text-emerald-700' : 'text-amber-700'
                }
              >
                {selisihSim !== null
                  ? `${selisihSim >= 0 ? '+' : ''}${formatDecimal(selisihSim)}`
                  : 'Belum tersedia'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 3: Daftar Pengujian Formula Otomatis (10 Unit Tests) */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Hasil Pengujian Otomatis Calculation Engine (Unit Testing Formula)
            </h3>
            <p className="text-xs text-slate-500">
              Memverifikasi seluruh target triwulanan 2026 dan aturan khusus terhadap mesin
              perhitungan.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>
              {officialTests.filter((t) => t.passed).length} / {officialTests.length} Uji Lulus
            </span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-6 py-3">Kode Uji</th>
                <th className="px-6 py-3">Kasus Uji</th>
                <th className="px-6 py-3">Substitusi Formula</th>
                <th className="px-6 py-3 text-right">Ekspektasi</th>
                <th className="px-6 py-3 text-right">Hasil Engine</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {officialTests.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono font-semibold text-slate-900">{t.id}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{t.namaUji}</div>
                    <div className="text-slate-500">{t.keterangan}</div>
                  </td>
                  <td className="px-6 py-3 font-mono text-[11px] text-slate-600">{t.rumus}</td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums text-slate-900">
                    {t.expectedFormatted}
                  </td>
                  <td className="px-6 py-3 text-right font-mono font-semibold tabular-nums text-slate-900">
                    {t.actualFormatted}
                  </td>
                  <td className="px-6 py-3 font-semibold text-emerald-700">
                    {t.passed ? 'LULUS' : 'GAGAL'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
