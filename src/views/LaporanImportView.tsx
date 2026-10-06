import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DAFTAR_TAHUN_DEFAULT,
  DAFTAR_TRIWULAN,
  TriwulanType,
} from '../data/officialTargets.ts';
import {
  formatDecimal,
  formatStatusLabel,
  formatTargetDecimal,
} from '../engine/calculationEngine.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  FileSpreadsheet,
  FileDown,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';

interface LaporanImportViewProps {
  tahun: number;
  triwulan: TriwulanType;
  periodData: any;
  onChangeTahun: (t: number) => void;
  onChangeTriwulan: (tw: TriwulanType) => void;
  onRefresh: () => void;
}

export const LaporanImportView: React.FC<LaporanImportViewProps> = ({
  tahun,
  triwulan,
  periodData,
  onChangeTahun,
  onChangeTriwulan,
  onRefresh,
}) => {
  const { activeRole, firebaseUser, signInWithGoogle, apiFetch } = useAuth();
  const [indikatorFilter, setIndikatorFilter] = useState<
    'SEMUA' | 'IK_PENGAWASAN' | 'IK_TATA_KELOLA'
  >('SEMUA');

  // State Import Excel
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetRows, setSheetRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  // Mapping Kolom
  const [mapTahun, setMapTahun] = useState<string>('Tahun');
  const [mapTriwulan, setMapTriwulan] = useState<string>('Triwulan');
  const [mapKategori, setMapKategori] = useState<string>('Kategori');

  const [validationReport, setValidationReport] = useState<{
    validRecords: any[];
    duplicates: string[];
    errors: string[];
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    importedCount: number;
    totalSubmitted: number;
    errors: string[];
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const ik1 = periodData?.ikPengawasan;
  const ik2 = periodData?.ikTataKelola;

  const getReportRows = () => {
    const rows: Array<{
      indikator: string;
      kode: string;
      uraian: string;
      target: string;
      realisasi: string;
      selisih: string;
      capaian: string;
      status: string;
      sumber: string;
    }> = [];

    if ((indikatorFilter === 'SEMUA' || indikatorFilter === 'IK_PENGAWASAN') && ik1) {
      for (const c of ik1.komponen) {
        rows.push({
          indikator: 'IK Pengawasan Intern LAN',
          kode: c.kode,
          uraian: c.nama,
          target: formatTargetDecimal(c.target),
          realisasi: formatDecimal(c.realisasi),
          selisih:
            c.selisih !== null ? `${c.selisih >= 0 ? '+' : ''}${formatDecimal(c.selisih)}` : '-',
          capaian: c.capaianPersen !== null ? `${formatDecimal(c.capaianPersen)}%` : '-',
          status: formatStatusLabel(c.statusData),
          sumber: c.rumusRingkas,
        });
      }
      rows.push({
        indikator: 'IK Pengawasan Intern LAN',
        kode: 'TOTAL IK-1',
        uraian: 'Indeks Pengawasan Intern LAN (Rata-rata 8 Komponen)',
        target: formatTargetDecimal(ik1.targetTriwulan),
        realisasi: formatDecimal(ik1.realisasi),
        selisih:
          ik1.selisih !== null
            ? `${ik1.selisih >= 0 ? '+' : ''}${formatDecimal(ik1.selisih)}`
            : '-',
        capaian: ik1.capaianPersen !== null ? `${formatDecimal(ik1.capaianPersen)}%` : '-',
        status: formatStatusLabel(ik1.statusData),
        sumber: 'Perjanjian Kinerja Inspektur LAN Tahun 2026',
      });
    }

    if ((indikatorFilter === 'SEMUA' || indikatorFilter === 'IK_TATA_KELOLA') && ik2) {
      for (const c of ik2.komponen) {
        rows.push({
          indikator: 'IK Tata Kelola Internal',
          kode: c.kode,
          uraian: c.nama,
          target: formatTargetDecimal(c.target),
          realisasi: formatDecimal(c.realisasi),
          selisih:
            c.selisih !== null ? `${c.selisih >= 0 ? '+' : ''}${formatDecimal(c.selisih)}` : '-',
          capaian: c.capaianPersen !== null ? `${formatDecimal(c.capaianPersen)}%` : '-',
          status: formatStatusLabel(c.statusData),
          sumber: c.rumusRingkas,
        });
      }
      rows.push({
        indikator: 'IK Tata Kelola Internal',
        kode: 'TOTAL IK-2',
        uraian: 'Indeks Tata Kelola Internal Inspektorat (Rata-rata 4 Komponen)',
        target: formatTargetDecimal(ik2.targetTriwulan),
        realisasi: formatDecimal(ik2.realisasi),
        selisih:
          ik2.selisih !== null
            ? `${ik2.selisih >= 0 ? '+' : ''}${formatDecimal(ik2.selisih)}`
            : '-',
        capaian: ik2.capaianPersen !== null ? `${formatDecimal(ik2.capaianPersen)}%` : '-',
        status: formatStatusLabel(ik2.statusData),
        sumber: 'Perjanjian Kinerja Inspektur LAN Tahun 2026',
      });
    }

    return rows;
  };

  // Export Laporan ke Excel (.xlsx)
  const handleExportExcel = () => {
    const rows = getReportRows();
    const worksheetData = rows.map((r) => ({
      Tahun: tahun,
      Triwulan: triwulan,
      Indikator: r.indikator,
      'Kode Komponen': r.kode,
      'Uraian Komponen': r.uraian,
      'Target Resmi': r.target,
      Realisasi: r.realisasi,
      Selisih: r.selisih,
      'Capaian (%)': r.capaian,
      'Status Data': r.status,
      'Sumber / Formula': r.sumber,
    }));

    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Laporan_${tahun}_${triwulan.replace(' ', '')}`);
    XLSX.writeFile(wb, `Laporan_IKU_Inspektorat_LAN_${tahun}_${triwulan.replace(' ', '_')}.xlsx`);
  };

  // Export Laporan ke PDF (.pdf)
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const rows = getReportRows();

    doc.setFontSize(14);
    doc.text('LAPORAN CAPAIAN INDIKATOR KINERJA UTAMA (IKU) INSPEKTORAT LAN', 14, 15);
    doc.setFontSize(10);
    doc.text(
      `Periode: Tahun ${tahun} - ${triwulan} | Dasar: Perjanjian Kinerja Inspektur LAN Tahun 2026`,
      14,
      22
    );

    autoTable(doc, {
      startY: 28,
      head: [
        [
          'Indikator',
          'Komponen',
          'Uraian',
          'Target',
          'Realisasi',
          'Selisih',
          'Capaian',
          'Status',
        ],
      ],
      body: rows.map((r) => [
        r.indikator,
        r.kode,
        r.uraian,
        r.target,
        r.realisasi,
        r.selisih,
        r.capaian,
        r.status,
      ]),
      styles: { fontSize: 8.5 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`Laporan_IKU_Inspektorat_LAN_${tahun}_${triwulan.replace(' ', '_')}.pdf`);
  };

  // Unduh Template Workbook IKU_Pengawasan_Intern_2026.xlsx
  const handleDownloadTemplateExcel = () => {
    const wb = XLSX.utils.book_new();

    const sheetDataGabungan = [
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'BPK',
        totalRekomendasi: 42,
        sesuaiRekomendasi: 38,
        tidakDapatDitindaklanjutiSah: 2,
        sumberDokumen: 'LHP BPK RI Semester II 2026',
        keterangan: 'Import data BPK TW IV',
      },
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'EVAKIP',
        nilaiEvakip: 73.5,
        sumberDokumen: 'LHE AKIP LAN 2026',
        keterangan: 'Evaluasi AKIP Final',
      },
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'PPG',
        totalPelaporanGratifikasi: 10,
        pelaporanDiproses: 10,
        nilaiPpgKpk: 85.0,
        sumberDokumen: 'Evaluasi PPG KPK 2026',
      },
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'ZI',
        nilaiEvaluasiZi: 82.4,
        sumberEvaluasi: 'LHE TPI ZI 2026',
      },
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'APIP',
        nilaiKapabilitasApip: 40.2,
        tahunPeriodePenilaian: '2026',
        sumberDokumen: 'Surat Deputi BPKP',
      },
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'NES',
        nilaiNes: 83.0,
        sumberDokumen: 'LHE SAKIP Inspektorat 2026',
      },
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'NSAP',
        nilaiNsap: 88.0,
        sumberDokumen: 'LHP Kearsipan Internal 2026',
      },
      {
        Tahun: 2026,
        Triwulan: 'TW IV',
        Kategori: 'SKM',
        nilaiSkm: 85.0,
        jumlahResponden: 145,
        periodeSurvei: 'TW IV 2026',
        sumberData: 'Survei Kepuasan Layanan 2026',
      },
    ];

    const ws1 = XLSX.utils.json_to_sheet(sheetDataGabungan);
    XLSX.utils.book_append_sheet(wb, ws1, 'Data_IKU_2026');
    XLSX.writeFile(wb, 'IKU_Pengawasan_Intern_2026.xlsx');
  };

  // Upload & Baca Workbook Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setValidationReport(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      if (wb.SheetNames.length > 0) {
        selectSheetFromWorkbook(wb, wb.SheetNames[0]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const selectSheetFromWorkbook = (wb: XLSX.WorkBook, name: string) => {
    setSelectedSheet(name);
    const ws = wb.Sheets[name];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
    setSheetRows(json);
    if (json.length > 0) {
      const cols = Object.keys(json[0]);
      setColumns(cols);
      if (cols.includes('Tahun')) setMapTahun('Tahun');
      if (cols.includes('Triwulan')) setMapTriwulan('Triwulan');
      if (cols.includes('Kategori')) setMapKategori('Kategori');
    } else {
      setColumns([]);
    }
  };

  // Validasi & Deteksi Duplikasi sebelum Import
  const handleValidateImport = () => {
    const validRecords: any[] = [];
    const duplicates: string[] = [];
    const errors: string[] = [];
    const seenKeys = new Set<string>();

    sheetRows.forEach((row, idx) => {
      const rowNum = idx + 2;
      const thn = Number(row[mapTahun] || tahun);
      const tw = String(row[mapTriwulan] || triwulan).trim();
      const kat = String(row[mapKategori] || '').trim().toUpperCase();

      if (!thn || thn < 2020 || thn > 2035) {
        errors.push(`Baris ${rowNum}: Tahun "${row[mapTahun]}" tidak valid.`);
        return;
      }
      if (!['TW I', 'TW II', 'TW III', 'TW IV'].includes(tw)) {
        errors.push(`Baris ${rowNum}: Triwulan "${tw}" harus bernilai TW I, TW II, TW III, atau TW IV.`);
        return;
      }
      if (!kat) {
        errors.push(`Baris ${rowNum}: Kolom Kategori komponen kosong.`);
        return;
      }

      const uniqueKey = `${thn}-${tw}-${kat}-${row.unitSatker || row.unitKerja || row.programUnit || ''}`;
      if (seenKeys.has(uniqueKey)) {
        duplicates.push(
          `Baris ${rowNum}: Terdeteksi duplikasi periode & kategori (${thn} ${tw} - ${kat}).`
        );
      }
      seenKeys.add(uniqueKey);

      validRecords.push({
        tahun: thn,
        triwulan: tw,
        kategori: kat,
        data: row,
      });
    });

    setValidationReport({ validRecords, duplicates, errors });
  };

  // Eksekusi Import ke Database
  const handleExecuteImport = async () => {
    if (!validationReport || validationReport.validRecords.length === 0) return;
    if (!firebaseUser) {
      signInWithGoogle();
      return;
    }

    setImporting(true);
    try {
      const res = await apiFetch('/api/import-excel', {
        method: 'POST',
        body: JSON.stringify({ records: validationReport.validRecords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengimpor data Excel');
      setImportResult(data);
      onRefresh();
    } catch (err: any) {
      setImportResult({
        importedCount: 0,
        totalSubmitted: validationReport.validRecords.length,
        errors: [err.message || 'Gagal melakukan import Excel'],
      });
    } finally {
      setImporting(false);
    }
  };

  const reportRows = getReportRows();

  return (
    <div className="space-y-6">
      {/* Bagian AE: Laporan & Export */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs text-slate-500">
              Pelaporan Kinerja Resmi · Inspektorat Lembaga Administrasi Negara
            </div>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">
              Laporan Capaian IKU Pengawasan Intern & Tata Kelola Internal ({tahun} {triwulan})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter Tahun Laporan"
              value={tahun}
              onChange={(e) => onChangeTahun(Number(e.target.value))}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
            >
              {DAFTAR_TAHUN_DEFAULT.map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Triwulan Laporan"
              value={triwulan}
              onChange={(e) => onChangeTriwulan(e.target.value as TriwulanType)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
            >
              {DAFTAR_TRIWULAN.map((tw) => (
                <option key={tw} value={tw}>
                  {tw}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Indikator Laporan"
              value={indikatorFilter}
              onChange={(e) => setIndikatorFilter(e.target.value as any)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="SEMUA">Semua Indikator</option>
              <option value="IK_PENGAWASAN">IK Pengawasan Intern LAN</option>
              <option value="IK_TATA_KELOLA">IK Tata Kelola Internal</option>
            </select>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Tabel Laporan */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                <th className="p-3">Indikator</th>
                <th className="p-3">Komponen</th>
                <th className="p-3">Uraian Subindikator</th>
                <th className="p-3 text-right">Target</th>
                <th className="p-3 text-right">Realisasi</th>
                <th className="p-3 text-right">Selisih</th>
                <th className="p-3 text-right">Capaian</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sumber / Formula Perhitungan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {reportRows.map((r, i) => {
                const isTotal = r.kode.startsWith('TOTAL');
                return (
                  <tr
                    key={`${r.kode}-${i}`}
                    className={isTotal ? 'bg-slate-50 font-semibold text-slate-900' : ''}
                  >
                    <td className="p-3 text-slate-600">{r.indikator}</td>
                    <td className="p-3 font-mono font-semibold text-slate-900">{r.kode}</td>
                    <td className="p-3 text-slate-800">{r.uraian}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{r.target}</td>
                    <td className="p-3 text-right font-mono tabular-nums font-semibold">
                      {r.realisasi}
                    </td>
                    <td className="p-3 text-right font-mono tabular-nums">{r.selisih}</td>
                    <td className="p-3 text-right font-mono tabular-nums">{r.capaian}</td>
                    <td className="p-3">{r.status}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{r.sumber}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bagian AA: Import Excel (IKU_Pengawasan_Intern_2026.xlsx) */}
      {activeRole === 'OPERATOR' && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Import Workbook Excel (IKU_Pengawasan_Intern_2026.xlsx)
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Excel digunakan murni sebagai sumber data input. Seluruh formula tetap dihitung
                secara ketat oleh Calculation Engine sesuai Perjanjian Kinerja 2026.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplateExcel}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh Template IKU_Pengawasan_Intern_2026.xlsx</span>
            </button>
          </div>

          {/* 1. Upload & Pilih Sheet */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                1. Pilih File Workbook Excel (.xlsx / .xls)
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800"
              />
              {fileName && (
                <div className="mt-1 text-xs text-slate-500">File terpilih: {fileName}</div>
              )}
            </div>

            {sheetNames.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  2. Pilih Sheet Workbook
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) =>
                    workbook && selectSheetFromWorkbook(workbook, e.target.value)
                  }
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                >
                  {sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {columns.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  3. Mapping Kolom Utama
                </label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  <select
                    value={mapTahun}
                    onChange={(e) => setMapTahun(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    title="Kolom Tahun"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        Thn: {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={mapTriwulan}
                    onChange={(e) => setMapTriwulan(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    title="Kolom Triwulan"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        TW: {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={mapKategori}
                    onChange={(e) => setMapKategori(e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    title="Kolom Kategori"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        Kat: {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Preview Tabel Sheet */}
          {sheetRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Preview Data Sheet &ldquo;{selectedSheet}&rdquo; ({sheetRows.length} baris)
                </span>
                <button
                  type="button"
                  onClick={handleValidateImport}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Validasi & Deteksi Duplikasi</span>
                </button>
              </div>

              <div className="max-h-56 overflow-auto rounded border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      {columns.slice(0, 8).map((col) => (
                        <th key={col} className="p-2 font-semibold text-slate-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sheetRows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        {columns.slice(0, 8).map((col) => (
                          <td key={col} className="p-2 font-mono text-slate-700">
                            {String(r[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hasil Validasi & Deteksi Duplikasi */}
          {validationReport && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900">
                  Hasil Validasi: {validationReport.validRecords.length} Baris Siap Diimpor ·{' '}
                  {validationReport.duplicates.length} Peringatan Duplikasi ·{' '}
                  {validationReport.errors.length} Error
                </div>
                {validationReport.validRecords.length > 0 && (
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleExecuteImport}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>
                      {importing ? 'Mengimpor...' : 'Jalankan Import ke Database'}
                    </span>
                  </button>
                )}
              </div>

              {validationReport.duplicates.length > 0 && (
                <div className="space-y-1 text-amber-800">
                  <div className="font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Deteksi Duplikasi:
                  </div>
                  <ul className="list-disc pl-5">
                    {validationReport.duplicates.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationReport.errors.length > 0 && (
                <div className="space-y-1 text-red-700">
                  <div className="font-semibold">Laporan Error Validasi:</div>
                  <ul className="list-disc pl-5">
                    {validationReport.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Laporan Hasil Import */}
          {importResult && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950">
              <div className="font-semibold">
                Import Selesai: {importResult.importedCount} dari {importResult.totalSubmitted} baris
                berhasil disimpan dan dihitung ulang oleh Calculation Engine.
              </div>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-red-800">
                  {importResult.errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
