import React from 'react';
import { X, Calculator, FileText, ArrowRight } from 'lucide-react';
import {
  formatDecimal,
  formatNumberId,
  formatStatusLabel,
  formatTargetDecimal,
} from '../engine/calculationEngine.ts';
import { KOMPONEN_META, KomponenType } from '../data/officialTargets.ts';

interface DetailCalculationModalProps {
  komponenKode: KomponenType | null;
  periodData: any;
  onClose: () => void;
  onNavigateToInput?: (komponenKode: KomponenType) => void;
  canEdit?: boolean;
}

export const DetailCalculationModal: React.FC<DetailCalculationModalProps> = ({
  komponenKode,
  periodData,
  onClose,
  onNavigateToInput,
  canEdit = false,
}) => {
  if (!komponenKode || !periodData) return null;

  const meta = KOMPONEN_META[komponenKode];
  const allKomponen = [
    ...(periodData.ikPengawasan?.komponen || []),
    ...(periodData.ikTataKelola?.komponen || []),
  ];
  const compRow = allKomponen.find((c: any) => c.kode === komponenKode);
  const details = periodData.details || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Rincian Keterlacakan Perhitungan</span>
              <span aria-hidden="true">·</span>
              <span>
                Periode {periodData.tahun} {periodData.triwulan}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Status: {formatStatusLabel(compRow?.statusData || 'BELUM_DIINPUT')}
              </span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {meta.kode} — {meta.nama}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup rincian perhitungan"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Ringkasan Target vs Realisasi */}
          <div className="grid grid-cols-1 gap-4 border-b border-slate-200 pb-6 sm:grid-cols-4">
            <div>
              <div className="text-xs text-slate-500">Target Resmi ({periodData.triwulan})</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {formatTargetDecimal(compRow?.target)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Realisasi ({periodData.triwulan})</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
                {formatDecimal(compRow?.realisasi)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Selisih terhadap Target</div>
              <div
                className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
                  compRow?.selisih === null || compRow?.selisih === undefined
                    ? 'text-slate-400'
                    : compRow.selisih >= 0
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {compRow?.selisih !== null && compRow?.selisih !== undefined
                  ? `${compRow.selisih >= 0 ? '+' : ''}${formatDecimal(compRow.selisih)}`
                  : 'Belum tersedia'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Sifat Data</div>
              <div className="mt-1 text-sm font-medium text-slate-800">
                {compRow?.realisasi === null
                  ? 'Belum Diinput (Kosong)'
                  : compRow?.isSampleData
                  ? 'Data Uji Simulasi (Bukan Realisasi Resmi)'
                  : 'Realisasi Terinput'}
              </div>
            </div>
          </div>

          {/* Dasar Rumus Peraturan */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calculator className="h-4 w-4 text-slate-600" />
              <span>Formula Resmi Perjanjian Kinerja 2026</span>
            </div>
            <div className="mt-1.5 font-mono text-sm text-slate-900">{meta.rumusRingkas}</div>
            <p className="mt-1 text-xs text-slate-600">{meta.deskripsi}</p>
          </div>

          {/* Keterlacakan Spesifik per Komponen */}
          {komponenKode === 'TLP' && details.tlp && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Rincian 4 Sumber Rekomendasi Pengawasan (TLP = 4 Sumber)
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* 1. BPK */}
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold text-slate-900">
                      1. Pemeriksaan BPK (TLP BPK)
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {formatDecimal(details.tlp.summary.bpk.persentase)}%
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <dt>Total Rekomendasi BPK (AUrb):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.bpk.aurb)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Telah Sesuai Rekomendasi:</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.bpk.sesuai)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Tidak Dapat Ditindaklanjuti (Alasan Sah):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.bpk.tddSah)}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-medium text-slate-900">
                      <dt>Jumlah Tindak Lanjut Sah (AUtlb):</dt>
                      <dd className="font-mono tabular-nums">
                        {formatNumberId(details.tlp.summary.bpk.autlb)} /{' '}
                        {formatNumberId(details.tlp.summary.bpk.aurb)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 2. Audit Internal */}
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold text-slate-900">
                      2. Audit Internal (2 Tahun Terakhir)
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {formatDecimal(details.tlp.summary.auditInternal.persentase)}%
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <dt>Total Rekomendasi 2 Thn Terakhir (AUri):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.auditInternal.auri)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Telah Sesuai Rekomendasi (AUtli):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.auditInternal.autli)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Tahun LHA Tercatat:</dt>
                      <dd className="font-mono text-slate-900">
                        {details.tlp.summary.auditInternal.rentangTahunLha.join(', ') || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-medium text-slate-900">
                      <dt>Rasio AUtli / AUri × 100:</dt>
                      <dd className="font-mono tabular-nums">
                        {formatNumberId(details.tlp.summary.auditInternal.autli)} /{' '}
                        {formatNumberId(details.tlp.summary.auditInternal.auri)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 3. Audit Kinerja */}
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold text-slate-900">
                      3. Audit Kinerja Program (2 Tahun Terakhir)
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {formatDecimal(details.tlp.summary.auditKinerja.persentase)}%
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <dt>Total Rekomendasi 2 Thn Terakhir (AUrk):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.auditKinerja.aurk)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Telah Sesuai Rekomendasi (AUtlk):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.auditKinerja.autlk)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Tahun LHA Tercatat:</dt>
                      <dd className="font-mono text-slate-900">
                        {details.tlp.summary.auditKinerja.rentangTahunLha.join(', ') || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-medium text-slate-900">
                      <dt>Rasio AUtlk / AUrk × 100:</dt>
                      <dd className="font-mono tabular-nums">
                        {formatNumberId(details.tlp.summary.auditKinerja.autlk)} /{' '}
                        {formatNumberId(details.tlp.summary.auditKinerja.aurk)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* 4. SPI */}
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-sm font-semibold text-slate-900">
                      4. Survei Penilaian Integritas / SPI (Tahun Terakhir)
                    </span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                      {formatDecimal(details.tlp.summary.spi.persentase)}%
                    </span>
                  </div>
                  <dl className="mt-3 space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <dt>Total Rekomendasi SPI (AUrs):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.spi.aurs)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Sesuai & Telah Divalidasi KPK (AUtls):</dt>
                      <dd className="font-mono font-medium tabular-nums text-slate-900">
                        {formatNumberId(details.tlp.summary.spi.autls)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Tahun SPI Terakhir:</dt>
                      <dd className="font-mono text-slate-900">
                        {details.tlp.summary.spi.tahunSpi || '-'}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-1.5 font-medium text-slate-900">
                      <dt>Rasio AUtls / AUrs × 100:</dt>
                      <dd className="font-mono tabular-nums">
                        {formatNumberId(details.tlp.summary.spi.autls)} /{' '}
                        {formatNumberId(details.tlp.summary.spi.aurs)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Substitusi Akhir TLP */}
              <div className="rounded-md border border-slate-300 bg-slate-900 p-4 text-white">
                <div className="text-xs text-slate-300">
                  Perhitungan Akhir TLP = (BPK + Audit Internal + Audit Kinerja + SPI) / 4
                </div>
                <div className="mt-1 font-mono text-sm tabular-nums">
                  TLP = {details.tlp.summary.rumusTeks} ={' '}
                  <span className="font-semibold text-emerald-400">
                    {formatDecimal(details.tlp.summary.nilaiTlp)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {komponenKode === 'EvAKIP' && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-slate-200 p-4">
                <div className="text-xs text-slate-500">Detail Evaluasi Internal AKIP</div>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <span className="text-xs text-slate-500">Nilai Rata-rata EvAKIP:</span>
                    <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                      {formatDecimal(details.evakip?.nilaiEvakip ?? null)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Sumber Dokumen:</span>
                    <div className="font-medium text-slate-900">
                      {details.evakip?.sumberDokumen || 'Belum ada dokumen'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Keterangan:</span>
                    <div className="text-slate-700">
                      {details.evakip?.keterangan ||
                        'Evaluasi AKIP dilaksanakan sesuai jadwal triwulan terkait (nilai kosong tidak dianggap 0).'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {komponenKode === 'PPG' && details.ppg && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-xs text-slate-500">
                      Total Pelaporan Gratifikasi (PGr):
                    </span>
                    <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                      {formatNumberId(details.ppg.calc.pgr)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">
                      Pelaporan Telah Diproses (PGtl):
                    </span>
                    <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                      {formatNumberId(details.ppg.calc.pgtl)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">
                      Nilai Evaluasi PPG KPK Terbaru (PPGKPK):
                    </span>
                    <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                      {formatDecimal(details.ppg.calc.ppgKpk)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-3 font-mono text-xs text-slate-800">
                  PPG = {details.ppg.calc.rumusTeks} ={' '}
                  <strong>{formatDecimal(details.ppg.calc.nilaiPpg)}</strong>
                </div>
              </div>
            </div>
          )}

          {komponenKode === 'LHKAN' && details.lhkan && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Rekapitulasi Wajib Lapor vs Sudah Lapor LHKAN
                  </span>
                  <span className="font-mono text-xs text-slate-900">
                    {details.lhkan.calc.rumusTeks}
                  </span>
                </div>
                {details.lhkan.rows.length > 0 ? (
                  <table className="mt-3 w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2">Unit Kerja</th>
                        <th className="py-2">Jenis Laporan</th>
                        <th className="py-2 text-right">Wajib Lapor (WLasn)</th>
                        <th className="py-2 text-right">Sudah Lapor (WLpasn)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.lhkan.rows.map((r: any) => (
                        <tr key={r.id}>
                          <td className="py-2 font-medium text-slate-900">{r.unitKerja}</td>
                          <td className="py-2 text-slate-600">{r.jenisLaporan}</td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            {formatNumberId(r.jumlahWajibLapor)}
                          </td>
                          <td className="py-2 text-right font-mono tabular-nums">
                            {formatNumberId(r.jumlahSudahLapor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Belum ada data LHKAN pada periode ini.</p>
                )}
              </div>
            </div>
          )}

          {komponenKode === 'WBS' && details.wbs && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Daftar Pelaporan Pelanggaran (Whistleblowing System)
                  </span>
                  <span className="font-mono text-xs text-slate-900">
                    {details.wbs.calc.rumusTeks}
                  </span>
                </div>
                {details.wbs.rows.length > 0 ? (
                  <table className="mt-3 w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="py-2">Nomor Laporan</th>
                        <th className="py-2">Tanggal</th>
                        <th className="py-2">Jenis Pelaporan</th>
                        <th className="py-2">Status Verifikasi</th>
                        <th className="py-2">Status Tindak Lanjut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.wbs.rows.map((r: any) => (
                        <tr key={r.id}>
                          <td className="py-2 font-mono font-medium text-slate-900">
                            {r.nomorLaporan}
                          </td>
                          <td className="py-2 font-mono text-slate-600">{r.tanggal}</td>
                          <td className="py-2 text-slate-700">{r.jenisPelaporan}</td>
                          <td className="py-2 text-slate-700">{r.statusVerifikasi}</td>
                          <td className="py-2 font-medium text-slate-900">
                            {r.statusTindakLanjut}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">
                    Belum ada laporan WBS yang tercatat pada periode ini.
                  </p>
                )}
              </div>
            </div>
          )}

          {komponenKode === 'ZI' && (
            <div className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-slate-500">Nilai Evaluasi ZI Terbaru:</span>
                  <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                    {formatDecimal(details.zi?.nilaiEvaluasiZi ?? null)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Sumber Evaluasi TPI:</span>
                  <div className="font-medium text-slate-900">
                    {details.zi?.sumberEvaluasi || 'Belum tersedia'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Keterangan:</span>
                  <div className="text-slate-700">{details.zi?.keterangan || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {komponenKode === 'APIP' && (
            <div className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-slate-500">Nilai Kapabilitas APIP:</span>
                  <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                    {formatDecimal(details.apip?.nilaiKapabilitasApip ?? null)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Periode Penilaian BPKP:</span>
                  <div className="font-medium text-slate-900">
                    {details.apip?.tahunPeriodePenilaian || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Sumber Dokumen:</span>
                  <div className="text-slate-700">{details.apip?.sumberDokumen || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {komponenKode === 'KPI' && details.kpi && (
            <div className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Daftar Kebijakan Pengawasan Internal (2025 s.d. 2029)
                </span>
                <span className="font-mono text-xs text-slate-900">
                  {details.kpi.calc.rumusTeks}
                </span>
              </div>
              {details.kpi.rows.length > 0 ? (
                <table className="mt-3 w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2">Rumusan Kebijakan Pengawasan</th>
                      <th className="py-2">Status</th>
                      <th className="py-2 text-right">Tahun Target</th>
                      <th className="py-2 text-right">Kontribusi Kr</th>
                      <th className="py-2 text-right">Total Rencana (Kt)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {details.kpi.rows.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-2 font-medium text-slate-900">{r.daftarKebijakan}</td>
                        <td className="py-2 text-slate-700">{r.statusKebijakan}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{r.tahunTarget}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{r.krJumlah}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{r.ktTotal2029}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Belum ada daftar kebijakan pengawasan pada periode ini.
                </p>
              )}
            </div>
          )}

          {komponenKode === 'NES' && (
            <div className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-slate-500">Nilai Evaluasi SAKIP (NES):</span>
                  <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                    {formatDecimal(details.nes?.nilaiNes ?? null)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Sumber Dokumen:</span>
                  <div className="font-medium text-slate-900">
                    {details.nes?.sumberDokumen || 'Belum tersedia'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Keterangan:</span>
                  <div className="text-slate-700">{details.nes?.keterangan || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {komponenKode === 'NCKI' && details.ncki && (
            <div className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-500">Komponen 1: Capaian Anggaran</div>
                  <div className="mt-1 font-mono text-sm tabular-nums text-slate-900">
                    Realisasi: Rp {formatNumberId(details.ncki.row?.realisasiAnggaran)} / Rencana: Rp{' '}
                    {formatNumberId(details.ncki.row?.rencanaPenarikanAnggaran)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-600">
                    Rasio Penyerapan = {formatDecimal(details.ncki.calc.rasioAnggaran)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Komponen 2: Capaian Output</div>
                  <div className="mt-1 font-mono text-sm tabular-nums text-slate-900">
                    Realisasi: {formatNumberId(details.ncki.row?.realisasiCapaianOutput)} / Rencana:{' '}
                    {formatNumberId(details.ncki.row?.rencanaCapaianOutput)}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-600">
                    Rasio Output = {formatDecimal(details.ncki.calc.rasioOutput)}%
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-200 pt-3 font-mono text-xs text-slate-900">
                NCKI = {details.ncki.calc.rumusTeks}
              </div>
            </div>
          )}

          {komponenKode === 'NSAP' && (
            <div className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <span className="text-xs text-slate-500">
                    Nilai Pengawasan Kearsipan Internal (NSAP):
                  </span>
                  <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                    {formatDecimal(details.nsap?.nilaiNsap ?? null)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Sumber Dokumen:</span>
                  <div className="font-medium text-slate-900">
                    {details.nsap?.sumberDokumen || 'Belum tersedia'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Keterangan:</span>
                  <div className="text-slate-700">{details.nsap?.keterangan || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {komponenKode === 'SKM' && (
            <div className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div>
                  <span className="text-xs text-slate-500">Nilai Indeks SKM:</span>
                  <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                    {formatDecimal(details.skm?.nilaiSkm ?? null)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Jumlah Responden:</span>
                  <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                    {formatNumberId(details.skm?.jumlahResponden ?? 0)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Periode Survei:</span>
                  <div className="font-medium text-slate-900">
                    {details.skm?.periodeSurvei || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Sumber Data:</span>
                  <div className="text-slate-700">{details.skm?.sumberData || '-'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FileText className="h-3.5 w-3.5" />
            <span>
              Semua perhitungan disimpan dalam presisi penuh dan dibulatkan 2 desimal pada tampilan.
            </span>
          </div>
          <div className="flex items-center gap-3">
            {canEdit && onNavigateToInput && (
              <button
                onClick={() => {
                  onNavigateToInput(komponenKode);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <span>Kelola / Input Data {komponenKode}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
