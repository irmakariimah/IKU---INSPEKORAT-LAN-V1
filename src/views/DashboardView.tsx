import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatDecimal,
  formatStatusLabel,
  formatTargetDecimal,
} from '../engine/calculationEngine.ts';
import {
  DAFTAR_TAHUN_DEFAULT,
  DAFTAR_TRIWULAN,
  KomponenType,
  TriwulanType,
} from '../data/officialTargets.ts';
import { Eye, Lock, Info } from 'lucide-react';

interface DashboardViewProps {
  tahun: number;
  triwulan: TriwulanType;
  indikatorFilter: 'SEMUA' | 'IK_PENGAWASAN' | 'IK_TATA_KELOLA';
  includeSampleData: boolean;
  overviewData: any;
  periodData: any;
  onChangeTahun: (t: number) => void;
  onChangeTriwulan: (tw: TriwulanType) => void;
  onChangeIndikatorFilter: (ind: 'SEMUA' | 'IK_PENGAWASAN' | 'IK_TATA_KELOLA') => void;
  onChangeIncludeSample: (inc: boolean) => void;
  onSelectKomponenDetail: (kode: KomponenType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tahun,
  triwulan,
  indikatorFilter,
  includeSampleData,
  overviewData,
  periodData,
  onChangeTahun,
  onChangeTriwulan,
  onChangeIndikatorFilter,
  onChangeIncludeSample,
  onSelectKomponenDetail,
}) => {
  if (!periodData || !overviewData) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white p-6" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white p-6" />
          <div className="h-48 animate-pulse rounded-lg border border-slate-200 bg-white p-6" />
        </div>
      </div>
    );
  }

  const ik1 = periodData.ikPengawasan;
  const ik2 = periodData.ikTataKelola;

  // Data Grafik 1: Perkembangan IK Pengawasan Intern per Triwulan (Target vs Realisasi)
  const chart1Data = (overviewData.quarters || []).map((q: any) => ({
    triwulan: q.triwulan,
    Target: Number(q.ikPengawasan.targetTriwulan.toFixed(2)),
    Realisasi:
      q.ikPengawasan.realisasi !== null
        ? Number(q.ikPengawasan.realisasi.toFixed(2))
        : null,
  }));

  // Data Grafik 2: Perkembangan IK Tata Kelola Internal per Triwulan (Target vs Realisasi)
  const chart2Data = (overviewData.quarters || []).map((q: any) => ({
    triwulan: q.triwulan,
    Target: Number(q.ikTataKelola.targetTriwulan.toFixed(2)),
    Realisasi:
      q.ikTataKelola.realisasi !== null
        ? Number(q.ikTataKelola.realisasi.toFixed(2))
        : null,
  }));

  // Data Grafik 3 & 4: Komponen pada Triwulan Terpilih
  const activeKomponenList =
    indikatorFilter === 'IK_PENGAWASAN'
      ? ik1.komponen
      : indikatorFilter === 'IK_TATA_KELOLA'
      ? ik2.komponen
      : [...ik1.komponen, ...ik2.komponen];

  const chart3And4Data = activeKomponenList.map((c: any) => ({
    komponen: c.kode,
    namaLengkap: c.nama,
    Target: Number(c.target.toFixed(2)),
    Realisasi: c.realisasi !== null ? Number(c.realisasi.toFixed(2)) : 0,
    realisasiRaw: c.realisasi,
  }));

  const hasAnySampleInPeriod = activeKomponenList.some((c: any) => c.isSampleData);

  return (
    <div className="space-y-6">
      {/* Filter Bar Dashboard */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Dashboard Eksekutif Capaian Perjanjian Kinerja Inspektur LAN
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Tahun Anggaran {tahun}</span>
            <span aria-hidden="true">·</span>
            <span>Periode Aktif: {triwulan}</span>
            <span aria-hidden="true">·</span>
            <span>
              Status Periode: {formatStatusLabel(periodData.period?.statusPeriode || 'DRAFT')}
            </span>
            {periodData.period?.isLocked && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-800">
                  <Lock className="h-3 w-3" /> Terkunci (FINAL)
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tahun */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="dash-tahun" className="text-xs font-medium text-slate-600">
              Tahun:
            </label>
            <select
              id="dash-tahun"
              value={tahun}
              onChange={(e) => onChangeTahun(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
            >
              {DAFTAR_TAHUN_DEFAULT.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Triwulan */}
          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-1">
            {DAFTAR_TRIWULAN.map((tw) => (
              <button
                key={tw}
                onClick={() => onChangeTriwulan(tw)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  triwulan === tw
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tw}
              </button>
            ))}
          </div>

          {/* Filter Indikator */}
          <select
            aria-label="Filter Indikator"
            value={indikatorFilter}
            onChange={(e) => onChangeIndikatorFilter(e.target.value as any)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            <option value="SEMUA">Semua Indikator Utama (2 IKU)</option>
            <option value="IK_PENGAWASAN">1. IK - Indeks Pengawasan Intern LAN</option>
            <option value="IK_TATA_KELOLA">2. IK - Indeks Tata Kelola Internal</option>
          </select>

          {/* Toggle Sample Data vs Realisasi Resmi */}
          <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={includeSampleData}
              onChange={(e) => onChangeIncludeSample(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span className="whitespace-nowrap">Sertakan Data Uji Simulasi</span>
          </label>
        </div>
      </div>

      {/* Pemberitahuan Pemisahan Target Resmi vs Data Uji Simulasi */}
      {includeSampleData && hasAnySampleInPeriod && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50/70 px-4 py-3 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <span className="font-semibold">
                Pembedaan Tegas: TARGET RESMI 2026 vs DATA SIMULASI UJI.
              </span>{' '}
              Nilai Target pada seluruh tabel dan grafik merupakan{' '}
              <strong>TARGET RESMI Perjanjian Kinerja Inspektur LAN Tahun 2026</strong>. Sebagian
              angka realisasi pada periode ini menggunakan{' '}
              <strong>Data Simulasi Uji</strong> untuk memverifikasi akurasi mesin perhitungan.
              Matikan opsi <em>&ldquo;Sertakan Data Uji Simulasi&rdquo;</em> di atas untuk melihat
              hanya realisasi resmi yang diinput operator.
            </div>
          </div>
        </div>
      )}

      {/* Dua Kartu Besar Indikator Kinerja Utama */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {(indikatorFilter === 'SEMUA' || indikatorFilter === 'IK_PENGAWASAN') && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Indikator Kinerja Utama 1</span>
                  <span aria-hidden="true">·</span>
                  <span>Target Tahunan 2026: 76,50</span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {formatStatusLabel(ik1.statusData)}</span>
                </div>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Indeks Pengawasan Intern LAN ({tahun} {triwulan})
                </h2>
              </div>
              <span className="font-mono text-xs font-medium text-slate-500">
                {ik1.jumlahKomponenTersedia} / 8 Komponen Terisi
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5">
              <div>
                <div className="text-xs text-slate-500">Realisasi ({triwulan})</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                  {formatDecimal(ik1.realisasi)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {ik1.realisasi === null
                    ? 'Data realisasi belum tersedia'
                    : 'Indeks Kumulatif (/8 komponen)'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Target Resmi ({triwulan})</div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-700">
                  {formatTargetDecimal(ik1.targetTriwulan)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Target PK Tahun {tahun}: {formatDecimal(ik1.targetTahunan)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Perbandingan dgn Target</div>
                <div
                  className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                    ik1.selisih === null
                      ? 'text-slate-400'
                      : ik1.selisih >= 0
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {ik1.selisih !== null
                    ? `${ik1.selisih >= 0 ? '+' : ''}${formatDecimal(ik1.selisih)}`
                    : 'Belum tersedia'}
                </div>
                <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-500">
                  {ik1.capaianPersen !== null
                    ? `Capaian: ${formatDecimal(ik1.capaianPersen)}% dari target TW`
                    : 'Menunggu input realisasi'}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 font-mono text-xs text-slate-600">
              Rumus: IK = [(TLP×100) + EvAKIP + PPG + (LHKAN×100) + (WBS×100) + ZI + (APIP×100) +
              (KPI×100)] / 8
            </div>
          </div>
        )}

        {(indikatorFilter === 'SEMUA' || indikatorFilter === 'IK_TATA_KELOLA') && (
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Indikator Kinerja Utama 2</span>
                  <span aria-hidden="true">·</span>
                  <span>Target Tahunan 2026: 87,80</span>
                  <span aria-hidden="true">·</span>
                  <span>Status: {formatStatusLabel(ik2.statusData)}</span>
                </div>
                <h2 className="mt-1 text-base font-semibold text-slate-900">
                  Indeks Tata Kelola Internal Inspektorat ({tahun} {triwulan})
                </h2>
              </div>
              <span className="font-mono text-xs font-medium text-slate-500">
                {ik2.jumlahKomponenTersedia} / 4 Komponen Terisi
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5">
              <div>
                <div className="text-xs text-slate-500">Realisasi ({triwulan})</div>
                <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900">
                  {formatDecimal(ik2.realisasi)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {ik2.realisasi === null
                    ? 'Data realisasi belum tersedia'
                    : 'Indeks Kumulatif (/4 komponen)'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Target Resmi ({triwulan})</div>
                <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-700">
                  {formatTargetDecimal(ik2.targetTriwulan)}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Target PK Tahun {tahun}: {formatDecimal(ik2.targetTahunan)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">Perbandingan dgn Target</div>
                <div
                  className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                    ik2.selisih === null
                      ? 'text-slate-400'
                      : ik2.selisih >= 0
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {ik2.selisih !== null
                    ? `${ik2.selisih >= 0 ? '+' : ''}${formatDecimal(ik2.selisih)}`
                    : 'Belum tersedia'}
                </div>
                <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-500">
                  {ik2.capaianPersen !== null
                    ? `Capaian: ${formatDecimal(ik2.capaianPersen)}% dari target TW`
                    : 'Menunggu input realisasi'}
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3 font-mono text-xs text-slate-600">
              Rumus: IK Tata Kelola = (NES + NCKI + NSAP + SKM) / 4
            </div>
          </div>
        )}
      </div>

      {/* 4 Grafik Visualisasi Kinerja */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Grafik 1: Perkembangan IK Pengawasan Intern per Triwulan */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <div className="text-xs text-slate-500">Grafik 1 · Tren Triwulanan {tahun}</div>
            <h3 className="text-sm font-semibold text-slate-900">
              Perkembangan IK Pengawasan Intern LAN per Triwulan (Target vs Realisasi)
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart1Data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="triwulan" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: any) =>
                    value !== null && value !== undefined ? formatDecimal(Number(value)) : 'Belum tersedia'
                  }
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Target"
                  name="Target Resmi PK"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Realisasi"
                  name="Realisasi IK"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 2: Perkembangan IK Tata Kelola Internal per Triwulan */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <div className="text-xs text-slate-500">Grafik 2 · Tren Triwulanan {tahun}</div>
            <h3 className="text-sm font-semibold text-slate-900">
              Perkembangan IK Tata Kelola Internal per Triwulan (Target vs Realisasi)
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart2Data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="triwulan" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: any) =>
                    value !== null && value !== undefined ? formatDecimal(Number(value)) : 'Belum tersedia'
                  }
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Target"
                  name="Target Resmi PK"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Realisasi"
                  name="Realisasi IK Tata Kelola"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 3: Realisasi Setiap Komponen IK */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <div className="text-xs text-slate-500">
              Grafik 3 · Capaian Subindikator ({tahun} {triwulan})
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Realisasi Setiap Komponen IK ({triwulan})
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart3And4Data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="komponen" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 110]} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  formatter={(_val: any, _name: any, props: any) => {
                    const raw = props?.payload?.realisasiRaw;
                    return raw === null || raw === undefined
                      ? 'Belum tersedia (Kosong)'
                      : formatDecimal(Number(raw));
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="Realisasi"
                  name="Realisasi Komponen"
                  fill="#0f172a"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 4: Target vs Realisasi Setiap Komponen */}
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4">
            <div className="text-xs text-slate-500">
              Grafik 4 · Komparasi Target vs Realisasi ({tahun} {triwulan})
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Target Resmi vs Realisasi Setiap Komponen ({triwulan})
            </h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart3And4Data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="komponen" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis domain={[0, 110]} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  formatter={(value: any, name: any, props: any) => {
                    if (name === 'Realisasi') {
                      const raw = props?.payload?.realisasiRaw;
                      return raw === null || raw === undefined
                        ? 'Belum tersedia'
                        : formatDecimal(Number(raw));
                    }
                    return formatTargetDecimal(Number(value));
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="Target"
                  name="Target Resmi"
                  fill="#94a3b8"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="Realisasi"
                  name="Realisasi"
                  fill="#16a34a"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabel Dashboard IK Pengawasan Intern LAN */}
      {(indikatorFilter === 'SEMUA' || indikatorFilter === 'IK_PENGAWASAN') && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Tabel Komponen IK — Indeks Pengawasan Intern LAN ({tahun} {triwulan})
              </h3>
              <p className="text-xs text-slate-500">
                Klik pada baris komponen mana pun untuk menelusuri rincian sumber data dan formula
                perhitungan. Target 0 ditampilkan sebagai 0, sedangkan realisasi yang belum ada
                ditampilkan sebagai &ldquo;Belum tersedia&rdquo;.
              </p>
            </div>
            <div className="font-mono text-xs font-medium text-slate-700">
              Target IK {triwulan}: {formatTargetDecimal(ik1.targetTriwulan)} · Realisasi:{' '}
              {formatDecimal(ik1.realisasi)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-6 py-3">Komponen</th>
                  <th className="px-6 py-3">Uraian Subindikator</th>
                  <th className="px-6 py-3 text-right">Target ({triwulan})</th>
                  <th className="px-6 py-3 text-right">Realisasi ({triwulan})</th>
                  <th className="px-6 py-3 text-right">Selisih</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Telusuri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ik1.komponen.map((row: any) => (
                  <tr
                    key={row.kode}
                    onClick={() => onSelectKomponenDetail(row.kode)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                      {row.kode}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      <div>{row.nama}</div>
                      <div className="mt-0.5 font-mono text-xs text-slate-500">
                        {row.rumusRingkas}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium tabular-nums text-slate-900">
                      {formatTargetDecimal(row.target)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono font-semibold tabular-nums ${
                        row.realisasi === null ? 'text-slate-400 italic font-sans' : 'text-slate-900'
                      }`}
                    >
                      {formatDecimal(row.realisasi)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono tabular-nums ${
                        row.selisih === null
                          ? 'text-slate-400'
                          : row.selisih >= 0
                          ? 'text-emerald-700 font-medium'
                          : 'text-amber-700 font-medium'
                      }`}
                    >
                      {row.selisih !== null
                        ? `${row.selisih >= 0 ? '+' : ''}${formatDecimal(row.selisih)}`
                        : '-'}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-700">
                      <span>{formatStatusLabel(row.statusData)}</span>
                      {row.isSampleData && row.realisasi !== null && (
                        <span className="text-amber-700"> · Simulasi Uji</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectKomponenDetail(row.kode);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-900">
                  <td className="px-6 py-3 font-mono">IK Pengawasan</td>
                  <td className="px-6 py-3 text-xs text-slate-600">
                    Indeks Pengawasan Intern LAN (Rata-rata 8 Komponen)
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {formatTargetDecimal(ik1.targetTriwulan)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {formatDecimal(ik1.realisasi)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {ik1.selisih !== null
                      ? `${ik1.selisih >= 0 ? '+' : ''}${formatDecimal(ik1.selisih)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-xs font-normal text-slate-600" colSpan={2}>
                    Status Indikator: {formatStatusLabel(ik1.statusData)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Tabel Dashboard IK Tata Kelola Internal Inspektorat */}
      {(indikatorFilter === 'SEMUA' || indikatorFilter === 'IK_TATA_KELOLA') && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Tabel Komponen IK — Indeks Tata Kelola Internal Inspektorat ({tahun} {triwulan})
              </h3>
              <p className="text-xs text-slate-500">
                Klik pada baris komponen untuk melihat rincian evaluasi dan formula perhitungan.
              </p>
            </div>
            <div className="font-mono text-xs font-medium text-slate-700">
              Target IK {triwulan}: {formatTargetDecimal(ik2.targetTriwulan)} · Realisasi:{' '}
              {formatDecimal(ik2.realisasi)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-6 py-3">Komponen</th>
                  <th className="px-6 py-3">Uraian Subindikator</th>
                  <th className="px-6 py-3 text-right">Target ({triwulan})</th>
                  <th className="px-6 py-3 text-right">Realisasi ({triwulan})</th>
                  <th className="px-6 py-3 text-right">Selisih</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Telusuri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ik2.komponen.map((row: any) => (
                  <tr
                    key={row.kode}
                    onClick={() => onSelectKomponenDetail(row.kode)}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                      {row.kode}
                    </td>
                    <td className="px-6 py-3 text-slate-700">
                      <div>{row.nama}</div>
                      <div className="mt-0.5 font-mono text-xs text-slate-500">
                        {row.rumusRingkas}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium tabular-nums text-slate-900">
                      {formatTargetDecimal(row.target)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono font-semibold tabular-nums ${
                        row.realisasi === null ? 'text-slate-400 italic font-sans' : 'text-slate-900'
                      }`}
                    >
                      {formatDecimal(row.realisasi)}
                    </td>
                    <td
                      className={`px-6 py-3 text-right font-mono tabular-nums ${
                        row.selisih === null
                          ? 'text-slate-400'
                          : row.selisih >= 0
                          ? 'text-emerald-700 font-medium'
                          : 'text-amber-700 font-medium'
                      }`}
                    >
                      {row.selisih !== null
                        ? `${row.selisih >= 0 ? '+' : ''}${formatDecimal(row.selisih)}`
                        : '-'}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-700">
                      <span>{formatStatusLabel(row.statusData)}</span>
                      {row.isSampleData && row.realisasi !== null && (
                        <span className="text-amber-700"> · Simulasi Uji</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectKomponenDetail(row.kode);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Detail</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-900">
                  <td className="px-6 py-3 font-mono">IK Tata Kelola</td>
                  <td className="px-6 py-3 text-xs text-slate-600">
                    Indeks Tata Kelola Internal Inspektorat (Rata-rata 4 Komponen)
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {formatTargetDecimal(ik2.targetTriwulan)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {formatDecimal(ik2.realisasi)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {ik2.selisih !== null
                      ? `${ik2.selisih >= 0 ? '+' : ''}${formatDecimal(ik2.selisih)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-3 text-xs font-normal text-slate-600" colSpan={2}>
                    Status Indikator: {formatStatusLabel(ik2.statusData)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
