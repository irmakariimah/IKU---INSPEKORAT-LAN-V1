import React, { useEffect, useState } from 'react';
import {
  DAFTAR_TAHUN_DEFAULT,
  DAFTAR_TRIWULAN,
  KOMPONEN_META,
  KomponenType,
  TriwulanType,
} from '../data/officialTargets.ts';
import {
  calculateNcki,
  calculatePpg,
  calculateTlpBpk,
  formatDecimal,
  formatNumberId,
  formatStatusLabel,
  formatTargetDecimal,
} from '../engine/calculationEngine.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Lock, Unlock, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { NavSection } from '../components/Layout.tsx';

interface InputDataViewProps {
  mode: NavSection;
  tahun: number;
  triwulan: TriwulanType;
  selectedKomponenInitial?: KomponenType | null;
  periodData: any;
  onChangeTahun: (t: number) => void;
  onChangeTriwulan: (tw: TriwulanType) => void;
  onRefresh: () => void;
}

export const InputDataView: React.FC<InputDataViewProps> = ({
  mode,
  tahun,
  triwulan,
  selectedKomponenInitial,
  periodData,
  onChangeTahun,
  onChangeTriwulan,
  onRefresh,
}) => {
  const { activeRole, firebaseUser, signInWithGoogle, apiFetch } = useAuth();
  const [indikatorChoice, setIndikatorChoice] = useState<'IK_PENGAWASAN' | 'IK_TATA_KELOLA'>(
    mode === 'DATA_TATA_KELOLA' ? 'IK_TATA_KELOLA' : 'IK_PENGAWASAN'
  );
  const [activeTab, setActiveTab] = useState<KomponenType>(
    mode === 'DATA_TLP'
      ? 'TLP'
      : mode === 'DATA_IKU'
      ? 'EvAKIP'
      : mode === 'DATA_TATA_KELOLA'
      ? 'NES'
      : selectedKomponenInitial || 'TLP'
  );
  const [tlpSourceTab, setTlpSourceTab] = useState<'BPK' | 'AUDIT_INTERNAL' | 'AUDIT_KINERJA' | 'SPI'>('BPK');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // State form BPK
  const [bpkTotal, setBpkTotal] = useState('42');
  const [bpkSesuai, setBpkSesuai] = useState('36');
  const [bpkTddSah, setBpkTddSah] = useState('2');
  const [bpkSumber, setBpkSumber] = useState('LHP BPK RI');
  const [bpkKet, setBpkKet] = useState('');

  // State form Audit Internal (2 thn terakhir)
  const [aiTahunLha, setAiTahunLha] = useState(String(tahun - 1));
  const [aiUnit, setAiUnit] = useState('');
  const [aiTotal, setAiTotal] = useState('');
  const [aiSesuai, setAiSesuai] = useState('');
  const [aiBelumSesuai, setAiBelumSesuai] = useState('0');
  const [aiBelumTl, setAiBelumTl] = useState('0');

  // State form Audit Kinerja (2 thn terakhir)
  const [akTahunLha, setAkTahunLha] = useState(String(tahun - 1));
  const [akProgram, setAkProgram] = useState('');
  const [akTotal, setAkTotal] = useState('');
  const [akSesuai, setAkSesuai] = useState('');
  const [akBelumSesuai, setAkBelumSesuai] = useState('0');
  const [akBelumTl, setAkBelumTl] = useState('0');

  // State form SPI (thn terakhir)
  const [spiTahun, setSpiTahun] = useState(String(tahun - 1));
  const [spiTotal, setSpiTotal] = useState('12');
  const [spiSesuai, setSpiSesuai] = useState('10');
  const [spiValidKpk, setSpiValidKpk] = useState('9');
  const [spiStatus, setSpiStatus] = useState('Sesuai & Tervalidasi KPK');

  // State EvAKIP (mendukung kosong/null)
  const [evakipKosong, setEvakipKosong] = useState(false);
  const [evakipNilai, setEvakipNilai] = useState('72.00');
  const [evakipSumber, setEvakipSumber] = useState('LHE Evaluasi Internal AKIP LAN');
  const [evakipKet, setEvakipKet] = useState('');

  // State PPG
  const [ppgTotal, setPpgTotal] = useState('8');
  const [ppgDiproses, setPpgDiproses] = useState('8');
  const [ppgKpk, setPpgKpk] = useState('80');
  const [ppgSumber, setPpgSumber] = useState('Laporan UPG & Evaluasi KPK');

  // State LHKAN
  const [lhkanUnit, setLhkanUnit] = useState('');
  const [lhkanJenis, setLhkanJenis] = useState('LHKPN');
  const [lhkanWajib, setLhkanWajib] = useState('');
  const [lhkanSudah, setLhkanSudah] = useState('');

  // State WBS
  const [wbsNomor, setWbsNomor] = useState('');
  const [wbsTanggal, setWbsTanggal] = useState('2026-06-15');
  const [wbsJenis, setWbsJenis] = useState('Disiplin & Etika');
  const [wbsVerifikasi, setWbsVerifikasi] = useState('Terverifikasi');
  const [wbsTlStatus, setWbsTlStatus] = useState('Ditindaklanjuti');
  const [wbsDitindaklanjuti, setWbsDitindaklanjuti] = useState(true);

  // State ZI
  const [ziKosong, setZiKosong] = useState(false);
  const [ziNilai, setZiNilai] = useState('81.50');
  const [ziSumber, setZiSumber] = useState('LHE Tim Penilai Internal (TPI) ZI');
  const [ziKet, setZiKet] = useState('');

  // State APIP
  const [apipNilai, setApipNilai] = useState('40.20');
  const [apipPeriode, setApipPeriode] = useState('Penilaian BPKP 2025 (Berlaku 2026)');
  const [apipSumber, setApipSumber] = useState('Surat Deputi BPKP');
  const [apipKet, setApipKet] = useState('');

  // State KPI
  const [kpiNama, setKpiNama] = useState('');
  const [kpiStatus, setKpiStatus] = useState('Ditetapkan');
  const [kpiTahunTarget, setKpiTahunTarget] = useState('2026');
  const [kpiKr, setKpiKr] = useState('1');
  const [kpiKt, setKpiKt] = useState('5');

  // State NES
  const [nesKosong, setNesKosong] = useState(false);
  const [nesNilai, setNesNilai] = useState('82.50');
  const [nesSumber, setNesSumber] = useState('LHE SAKIP Unit Inspektorat');

  // State NCKI
  const [nckiRencanaAngg, setNckiRencanaAngg] = useState('6200000000');
  const [nckiRealAngg, setNckiRealAngg] = useState('6165000000');
  const [nckiRencanaOut, setNckiRencanaOut] = useState('85');
  const [nckiRealOut, setNckiRealOut] = useState('85');
  const [nckiSumber, setNckiSumber] = useState('Laporan SMART / OM-SPAN');

  // State NSAP
  const [nsapKosong, setNsapKosong] = useState(false);
  const [nsapNilai, setNsapNilai] = useState('87.50');
  const [nsapSumber, setNsapSumber] = useState('LHP Pengawasan Kearsipan Internal');
  const [nsapKet, setNsapKet] = useState('');

  // State SKM
  const [skmKosong, setSkmKosong] = useState(false);
  const [skmNilai, setSkmNilai] = useState('84.20');
  const [skmResponden, setSkmResponden] = useState('120');
  const [skmPeriode, setSkmPeriode] = useState(`${triwulan} ${tahun}`);
  const [skmSumber, setSkmSumber] = useState('Laporan Survei Kepuasan Layanan Inspektorat');

  // State Finalisasi / Unlock
  const [alasanFinal, setAlasanFinal] = useState('');

  useEffect(() => {
    if (mode === 'DATA_TLP') {
      setIndikatorChoice('IK_PENGAWASAN');
      setActiveTab('TLP');
    } else if (mode === 'DATA_IKU') {
      setIndikatorChoice('IK_PENGAWASAN');
      if (['NES', 'NCKI', 'NSAP', 'SKM', 'TLP'].includes(activeTab)) {
        setActiveTab('EvAKIP');
      }
    } else if (mode === 'DATA_TATA_KELOLA') {
      setIndikatorChoice('IK_TATA_KELOLA');
      if (!['NES', 'NCKI', 'NSAP', 'SKM'].includes(activeTab)) {
        setActiveTab('NES');
      }
    }
  }, [mode]);

  useEffect(() => {
    if (selectedKomponenInitial) {
      setActiveTab(selectedKomponenInitial);
      if (['NES', 'NCKI', 'NSAP', 'SKM'].includes(selectedKomponenInitial)) {
        setIndikatorChoice('IK_TATA_KELOLA');
      } else {
        setIndikatorChoice('IK_PENGAWASAN');
      }
    }
  }, [selectedKomponenInitial]);

  // Sinkronkan form nilai tunggal saat periodData berubah
  useEffect(() => {
    if (!periodData?.details) return;
    const d = periodData.details;
    if (d.tlp?.bpk) {
      setBpkTotal(String(d.tlp.bpk.totalRekomendasi));
      setBpkSesuai(String(d.tlp.bpk.sesuaiRekomendasi));
      setBpkTddSah(String(d.tlp.bpk.tidakDapatDitindaklanjutiSah));
      setBpkSumber(d.tlp.bpk.sumberDokumen || 'LHP BPK RI');
      setBpkKet(d.tlp.bpk.keterangan || '');
    }
    if (d.tlp?.spi?.[0]) {
      const s = d.tlp.spi[0];
      setSpiTahun(String(s.tahunSpi));
      setSpiTotal(String(s.totalRekomendasi));
      setSpiSesuai(String(s.sesuaiRekomendasi));
      setSpiValidKpk(String(s.telahDivalidasiKpk));
      setSpiStatus(s.statusTindakLanjut || 'Sesuai & Tervalidasi KPK');
    }
    if (d.evakip && d.evakip.nilaiEvakip !== null) {
      setEvakipKosong(false);
      setEvakipNilai(String(d.evakip.nilaiEvakip));
      setEvakipSumber(d.evakip.sumberDokumen || '');
      setEvakipKet(d.evakip.keterangan || '');
    } else {
      setEvakipKosong(true);
    }
    if (d.ppg?.row) {
      setPpgTotal(String(d.ppg.row.totalPelaporanGratifikasi));
      setPpgDiproses(String(d.ppg.row.pelaporanDiproses));
      setPpgKpk(String(d.ppg.row.nilaiPpgKpk));
      setPpgSumber(d.ppg.row.sumberDokumen || '');
    }
    if (d.zi && d.zi.nilaiEvaluasiZi !== null) {
      setZiKosong(false);
      setZiNilai(String(d.zi.nilaiEvaluasiZi));
      setZiSumber(d.zi.sumberEvaluasi || '');
      setZiKet(d.zi.keterangan || '');
    } else {
      setZiKosong(true);
    }
    if (d.apip && d.apip.nilaiKapabilitasApip !== null) {
      setApipNilai(String(d.apip.nilaiKapabilitasApip));
      setApipPeriode(d.apip.tahunPeriodePenilaian || '');
      setApipSumber(d.apip.sumberDokumen || '');
      setApipKet(d.apip.keterangan || '');
    }
    if (d.nes && d.nes.nilaiNes !== null) {
      setNesKosong(false);
      setNesNilai(String(d.nes.nilaiNes));
      setNesSumber(d.nes.sumberDokumen || '');
    } else {
      setNesKosong(true);
    }
    if (d.ncki?.row) {
      setNckiRencanaAngg(String(d.ncki.row.rencanaPenarikanAnggaran));
      setNckiRealAngg(String(d.ncki.row.realisasiAnggaran));
      setNckiRencanaOut(String(d.ncki.row.rencanaCapaianOutput));
      setNckiRealOut(String(d.ncki.row.realisasiCapaianOutput));
      setNckiSumber(d.ncki.row.sumberDokumen || '');
    }
    if (d.nsap && d.nsap.nilaiNsap !== null) {
      setNsapKosong(false);
      setNsapNilai(String(d.nsap.nilaiNsap));
      setNsapSumber(d.nsap.sumberDokumen || '');
      setNsapKet(d.nsap.keterangan || '');
    } else {
      setNsapKosong(true);
    }
    if (d.skm && d.skm.nilaiSkm !== null) {
      setSkmKosong(false);
      setSkmNilai(String(d.skm.nilaiSkm));
      setSkmResponden(String(d.skm.jumlahResponden));
      setSkmPeriode(d.skm.periodeSurvei || '');
      setSkmSumber(d.skm.sumberData || '');
    } else {
      setSkmKosong(true);
    }
  }, [periodData]);

  const isReadOnly = activeRole === 'PIMPINAN' || Boolean(periodData?.period?.isLocked);

  const postAction = async (endpoint: string, body: Record<string, any>, successMsg: string) => {
    setFeedback(null);
    if (!firebaseUser) {
      setFeedback({
        type: 'error',
        text: 'Silakan klik tombol "Masuk Google" di pojok kanan atas untuk menyimpan perubahan data ke database.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ tahun, triwulan, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan data');
      setFeedback({ type: 'success', text: successMsg });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Terjadi kesalahan saat menyimpan.' });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAction = async (endpoint: string, successMsg: string) => {
    setFeedback(null);
    if (!firebaseUser) {
      setFeedback({
        type: 'error',
        text: 'Silakan masuk dengan Google terlebih dahulu untuk menghapus baris data.',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(endpoint, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus data');
      setFeedback({ type: 'success', text: successMsg });
      onRefresh();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menghapus data' });
    } finally {
      setSubmitting(false);
    }
  };

  const availableTabs: KomponenType[] =
    mode === 'DATA_TLP'
      ? ['TLP']
      : mode === 'DATA_IKU'
      ? ['EvAKIP', 'PPG', 'LHKAN', 'WBS', 'ZI', 'APIP', 'KPI']
      : mode === 'DATA_TATA_KELOLA'
      ? ['NES', 'NCKI', 'NSAP', 'SKM']
      : indikatorChoice === 'IK_PENGAWASAN'
      ? ['TLP', 'EvAKIP', 'PPG', 'LHKAN', 'WBS', 'ZI', 'APIP', 'KPI']
      : ['NES', 'NCKI', 'NSAP', 'SKM'];

  const bpkLive = calculateTlpBpk({
    totalRekomendasi: Number(bpkTotal),
    sesuaiRekomendasi: Number(bpkSesuai),
    tidakDapatDitindaklanjutiSah: Number(bpkTddSah),
  });

  const ppgLive = calculatePpg({
    totalPelaporanGratifikasi: Number(ppgTotal),
    pelaporanDiproses: Number(ppgDiproses),
    nilaiPpgKpk: Number(ppgKpk),
  });

  const nckiLive = calculateNcki({
    rencanaPenarikanAnggaran: Number(nckiRencanaAngg),
    realisasiAnggaran: Number(nckiRealAngg),
    rencanaCapaianOutput: Number(nckiRencanaOut),
    realisasiCapaianOutput: Number(nckiRealOut),
  });

  return (
    <div className="space-y-6">
      {/* Header & Pemilih Periode / Indikator */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="text-xs text-slate-500">
              {mode === 'DATA_TLP'
                ? 'Menu Data Detail · 4 Sumber Tindak Lanjut Rekomendasi (TLP)'
                : mode === 'DATA_IKU'
                ? 'Menu Data Detail · Komponen Indeks Pengawasan Intern LAN'
                : mode === 'DATA_TATA_KELOLA'
                ? 'Menu Data Detail · Komponen Indeks Tata Kelola Internal'
                : 'Halaman Input Data IKU Terpadu'}
            </div>
            <h1 className="mt-0.5 text-lg font-semibold text-slate-900">
              Pengelolaan & Input Data Realisasi ({tahun} {triwulan})
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="mr-1.5 text-xs font-medium text-slate-600">Tahun:</label>
              <select
                value={tahun}
                onChange={(e) => onChangeTahun(Number(e.target.value))}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
              >
                {DAFTAR_TAHUN_DEFAULT.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mr-1.5 text-xs font-medium text-slate-600">Triwulan:</label>
              <select
                value={triwulan}
                onChange={(e) => onChangeTriwulan(e.target.value as TriwulanType)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
              >
                {DAFTAR_TRIWULAN.map((tw) => (
                  <option key={tw} value={tw}>
                    {tw}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'INPUT_DATA' && (
              <div>
                <label className="mr-1.5 text-xs font-medium text-slate-600">Indikator:</label>
                <select
                  value={indikatorChoice}
                  onChange={(e) => {
                    const val = e.target.value as 'IK_PENGAWASAN' | 'IK_TATA_KELOLA';
                    setIndikatorChoice(val);
                    setActiveTab(val === 'IK_PENGAWASAN' ? 'TLP' : 'NES');
                  }}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900"
                >
                  <option value="IK_PENGAWASAN">IK Pengawasan Intern LAN (8 Komponen)</option>
                  <option value="IK_TATA_KELOLA">IK Tata Kelola Internal (4 Komponen)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Status Periode (DRAFT vs FINAL) */}
        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Status Periode {tahun} {triwulan}:</span>
            <span className="font-semibold text-slate-900">
              {formatStatusLabel(periodData?.period?.statusPeriode || 'DRAFT')}
            </span>
            {periodData?.period?.isLocked && (
              <span className="inline-flex items-center gap-1 text-amber-800">
                <Lock className="h-3.5 w-3.5" /> Data FINAL (Dikunci dari perubahan langsung)
              </span>
            )}
          </div>

          {activeRole === 'OPERATOR' && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Catatan verifikasi / alasan otorisasi..."
                value={alasanFinal}
                onChange={(e) => setAlasanFinal(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs"
              />
              {!periodData?.period?.isLocked ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    postAction(
                      '/api/period/status',
                      { action: 'FINALIZE', alasan: alasanFinal },
                      `Periode ${tahun} ${triwulan} berhasil difinalisasi menjadi FINAL.`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Finalisasi Periode (FINAL)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() =>
                    postAction(
                      '/api/period/status',
                      { action: 'UNLOCK_SPECIAL', alasan: alasanFinal },
                      `Kunci periode ${tahun} ${triwulan} dibuka kembali menjadi DRAFT.`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Buka Kunci Khusus</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Peringatan jika belum login atau role Pimpinan */}
      {!firebaseUser && activeRole === 'OPERATOR' && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-300 bg-white px-4 py-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-slate-700 shrink-0" />
            <span>
              Untuk menyimpan perubahan data dan mencatat ke tabel <strong>Riwayat Audit</strong>{' '}
              atas nama akun Anda, silakan masuk menggunakan akun Google.
            </span>
          </div>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
          >
            Masuk dengan Google
          </button>
        </div>
      )}

      {activeRole === 'PIMPINAN' && (
        <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-700">
          Anda sedang berada dalam mode <strong>Pimpinan (Read-Only)</strong>. Anda dapat melihat
          seluruh rincian data dan formula di bawah ini, namun tombol simpan/hapus dinonaktifkan.
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Tab Komponen Relevan */}
      {availableTabs.length > 1 && (
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5">
          {availableTabs.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTab(k)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === k
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {k} — {KOMPONEN_META[k].nama.slice(0, 32)}
              {KOMPONEN_META[k].nama.length > 32 ? '...' : ''}
            </button>
          ))}
        </div>
      )}

      {/* Konten Form per Komponen */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="border-b border-slate-200 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {activeTab} — {KOMPONEN_META[activeTab].nama}
              </h2>
              <p className="mt-0.5 font-mono text-xs text-slate-600">
                Rumus: {KOMPONEN_META[activeTab].rumusRingkas}
              </p>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-slate-500">Target Resmi {triwulan}: </span>
              <span className="font-semibold text-slate-900">
                {formatTargetDecimal(
                  [
                    ...(periodData?.ikPengawasan?.komponen || []),
                    ...(periodData?.ikTataKelola?.komponen || []),
                  ].find((c: any) => c.kode === activeTab)?.target
                )}
              </span>
              <span className="mx-2 text-slate-300">|</span>
              <span className="text-slate-500">Realisasi Saat Ini: </span>
              <span className="font-semibold text-emerald-700">
                {formatDecimal(
                  [
                    ...(periodData?.ikPengawasan?.komponen || []),
                    ...(periodData?.ikTataKelola?.komponen || []),
                  ].find((c: any) => c.kode === activeTab)?.realisasi
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 1. KOMPONEN TLP (4 SUMBER) */}
        {activeTab === 'TLP' && (
          <div className="mt-5 space-y-6">
            {/* Ringkasan 4 Sumber */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => setTlpSourceTab('BPK')}
                className={`rounded-md border p-3 text-left transition-colors ${
                  tlpSourceTab === 'BPK'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs opacity-80">1. Sumber BPK</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {formatDecimal(periodData?.details?.tlp?.summary?.bpk?.persentase)}%
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTlpSourceTab('AUDIT_INTERNAL')}
                className={`rounded-md border p-3 text-left transition-colors ${
                  tlpSourceTab === 'AUDIT_INTERNAL'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs opacity-80">2. Audit Internal (2 Thn)</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {formatDecimal(periodData?.details?.tlp?.summary?.auditInternal?.persentase)}%
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTlpSourceTab('AUDIT_KINERJA')}
                className={`rounded-md border p-3 text-left transition-colors ${
                  tlpSourceTab === 'AUDIT_KINERJA'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs opacity-80">3. Audit Kinerja (2 Thn)</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {formatDecimal(periodData?.details?.tlp?.summary?.auditKinerja?.persentase)}%
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTlpSourceTab('SPI')}
                className={`rounded-md border p-3 text-left transition-colors ${
                  tlpSourceTab === 'SPI'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs opacity-80">4. SPI KPK (Thn Terakhir)</div>
                <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
                  {formatDecimal(periodData?.details?.tlp?.summary?.spi?.persentase)}%
                </div>
              </button>

              <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="text-xs font-medium text-emerald-900">Rata-rata TLP (/4)</div>
                <div className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-900">
                  {formatDecimal(periodData?.details?.tlp?.summary?.nilaiTlp)}%
                </div>
              </div>
            </div>

            {/* Sub-tab 1: BPK */}
            {tlpSourceTab === 'BPK' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  postAction(
                    '/api/data/bpk',
                    {
                      totalRekomendasi: Number(bpkTotal),
                      sesuaiRekomendasi: Number(bpkSesuai),
                      tidakDapatDitindaklanjutiSah: Number(bpkTddSah),
                      sumberDokumen: bpkSumber,
                      keterangan: bpkKet,
                    },
                    'Data Rekomendasi BPK berhasil disimpan dan TLP dihitung ulang.'
                  );
                }}
                className="space-y-4 rounded-md border border-slate-200 p-5"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Sumber 1: Rekomendasi Hasil Pemeriksaan BPK (TLP BPK = AUtlb / AUrb × 100)
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Total Rekomendasi BPK (AUrb)
                    </label>
                    <input
                      type="number"
                      value={bpkTotal}
                      onChange={(e) => setBpkTotal(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Telah Sesuai Rekomendasi
                    </label>
                    <input
                      type="number"
                      value={bpkSesuai}
                      onChange={(e) => setBpkSesuai(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Tidak Dapat Ditindaklanjuti dgn Alasan Sah
                    </label>
                    <input
                      type="number"
                      value={bpkTddSah}
                      onChange={(e) => setBpkTddSah(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Sumber Dokumen
                    </label>
                    <input
                      type="text"
                      value={bpkSumber}
                      onChange={(e) => setBpkSumber(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Keterangan</label>
                    <input
                      type="text"
                      value={bpkKet}
                      onChange={(e) => setBpkKet(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="font-mono text-xs text-slate-700">
                    Hitung Otomatis: AUtlb = {bpkLive.autlb} · AUrb = {bpkLive.aurb} → TLP BPK ={' '}
                    <strong>{formatDecimal(bpkLive.persentase)}%</strong>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Simpan Data BPK</span>
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Sub-tab 2: Audit Internal (2 Tahun Terakhir) */}
            {tlpSourceTab === 'AUDIT_INTERNAL' && (
              <div className="space-y-4 rounded-md border border-slate-200 p-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Sumber 2: Audit Internal (Periode 2 Tahun Terakhir — AUtli / AUri × 100)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pastikan data mencakup LHA 2 tahun terakhir (misal untuk periode {tahun}: LHA{' '}
                    {tahun - 2} dan {tahun - 1}).
                  </p>
                </div>

                {/* Tabel Baris LHA Audit Internal */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="p-2.5">Tahun LHA</th>
                        <th className="p-2.5">Unit / Satker</th>
                        <th className="p-2.5 text-right">Total Rekomendasi</th>
                        <th className="p-2.5 text-right">Sesuai</th>
                        <th className="p-2.5 text-right">Belum Sesuai</th>
                        <th className="p-2.5 text-right">Belum TL</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(periodData?.details?.tlp?.auditInternal || []).map((r: any) => (
                        <tr key={r.id}>
                          <td className="p-2.5 font-mono font-semibold">{r.tahunLha}</td>
                          <td className="p-2.5 font-medium text-slate-900">{r.unitSatker}</td>
                          <td className="p-2.5 text-right font-mono tabular-nums">
                            {r.totalRekomendasi}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                            {r.sesuaiRekomendasi}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums">
                            {r.belumSesuai}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums">
                            {r.belumDitindaklanjuti}
                          </td>
                          <td className="p-2.5 text-right">
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteAction(
                                    `/api/data/audit-internal/${r.id}`,
                                    'Baris Audit Internal berhasil dihapus.'
                                  )
                                }
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3.5 w-3.5 inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isReadOnly && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      postAction(
                        '/api/data/audit-internal',
                        {
                          tahunLha: Number(aiTahunLha),
                          unitSatker: aiUnit,
                          totalRekomendasi: Number(aiTotal),
                          sesuaiRekomendasi: Number(aiSesuai),
                          belumSesuai: Number(aiBelumSesuai),
                          belumDitindaklanjuti: Number(aiBelumTl),
                        },
                        'Baris Audit Internal (2 tahun terakhir) berhasil ditambahkan.'
                      );
                      setAiUnit('');
                      setAiTotal('');
                      setAiSesuai('');
                    }}
                    className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-6"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Tahun LHA</label>
                      <input
                        type="number"
                        value={aiTahunLha}
                        onChange={(e) => setAiTahunLha(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Unit / Satker
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Puslatbang PKASN"
                        value={aiUnit}
                        onChange={(e) => setAiUnit(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Total Rekomendasi
                      </label>
                      <input
                        type="number"
                        value={aiTotal}
                        onChange={(e) => setAiTotal(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Sesuai Rekomendasi
                      </label>
                      <input
                        type="number"
                        value={aiSesuai}
                        onChange={(e) => setAiSesuai(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Tambah LHA</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Sub-tab 3: Audit Kinerja Program (2 Tahun Terakhir) */}
            {tlpSourceTab === 'AUDIT_KINERJA' && (
              <div className="space-y-4 rounded-md border border-slate-200 p-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Sumber 3: Audit Kinerja Program (Periode 2 Tahun Terakhir — AUtlk / AUrk × 100)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menggunakan data hasil audit kinerja program 2 tahun terakhir.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="p-2.5">Tahun LHA</th>
                        <th className="p-2.5">Program / Unit</th>
                        <th className="p-2.5 text-right">Total Rekomendasi</th>
                        <th className="p-2.5 text-right">Sesuai</th>
                        <th className="p-2.5 text-right">Belum Sesuai</th>
                        <th className="p-2.5 text-right">Belum TL</th>
                        <th className="p-2.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(periodData?.details?.tlp?.auditKinerja || []).map((r: any) => (
                        <tr key={r.id}>
                          <td className="p-2.5 font-mono font-semibold">{r.tahunLha}</td>
                          <td className="p-2.5 font-medium text-slate-900">{r.programUnit}</td>
                          <td className="p-2.5 text-right font-mono tabular-nums">
                            {r.totalRekomendasi}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                            {r.sesuaiRekomendasi}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums">
                            {r.belumSesuai}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums">
                            {r.belumDitindaklanjuti}
                          </td>
                          <td className="p-2.5 text-right">
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteAction(
                                    `/api/data/audit-kinerja/${r.id}`,
                                    'Baris Audit Kinerja berhasil dihapus.'
                                  )
                                }
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3.5 w-3.5 inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isReadOnly && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      postAction(
                        '/api/data/audit-kinerja',
                        {
                          tahunLha: Number(akTahunLha),
                          programUnit: akProgram,
                          totalRekomendasi: Number(akTotal),
                          sesuaiRekomendasi: Number(akSesuai),
                          belumSesuai: Number(akBelumSesuai),
                          belumDitindaklanjuti: Number(akBelumTl),
                        },
                        'Baris Audit Kinerja berhasil ditambahkan.'
                      );
                      setAkProgram('');
                      setAkTotal('');
                      setAkSesuai('');
                    }}
                    className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-6"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Tahun LHA</label>
                      <input
                        type="number"
                        value={akTahunLha}
                        onChange={(e) => setAkTahunLha(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700">
                        Program / Unit
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Program Pelatihan Kepemimpinan"
                        value={akProgram}
                        onChange={(e) => setAkProgram(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Total Rekomendasi
                      </label>
                      <input
                        type="number"
                        value={akTotal}
                        onChange={(e) => setAkTotal(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Sesuai Rekomendasi
                      </label>
                      <input
                        type="number"
                        value={akSesuai}
                        onChange={(e) => setAkSesuai(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Tambah Program</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Sub-tab 4: SPI (Tahun Terakhir) */}
            {tlpSourceTab === 'SPI' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  postAction(
                    '/api/data/spi',
                    {
                      tahunSpi: Number(spiTahun),
                      totalRekomendasi: Number(spiTotal),
                      sesuaiRekomendasi: Number(spiSesuai),
                      telahDivalidasiKpk: Number(spiValidKpk),
                      statusTindakLanjut: spiStatus,
                    },
                    'Data Rekomendasi SPI KPK berhasil disimpan.'
                  );
                }}
                className="space-y-4 rounded-md border border-slate-200 p-5"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  Sumber 4: Survei Penilaian Integritas / SPI Tahun Terakhir (TLP SPI = AUtls / AUrs
                  × 100)
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Tahun SPI</label>
                    <input
                      type="number"
                      value={spiTahun}
                      onChange={(e) => setSpiTahun(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Total Rekomendasi (AUrs)
                    </label>
                    <input
                      type="number"
                      value={spiTotal}
                      onChange={(e) => setSpiTotal(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Sesuai Rekomendasi Inspektorat
                    </label>
                    <input
                      type="number"
                      value={spiSesuai}
                      onChange={(e) => setSpiSesuai(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Sesuai & Divalidasi KPK (AUtls)
                    </label>
                    <input
                      type="number"
                      value={spiValidKpk}
                      onChange={(e) => setSpiValidKpk(e.target.value)}
                      disabled={isReadOnly}
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="font-mono text-xs text-slate-700">
                    Hitung Otomatis: {spiValidKpk} / {spiTotal} × 100 ={' '}
                    <strong>
                      {Number(spiTotal) > 0
                        ? formatDecimal((Number(spiValidKpk) / Number(spiTotal)) * 100)
                        : '0,00'}
                      %
                    </strong>
                  </div>
                  {!isReadOnly && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Simpan Data SPI</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}

        {/* 2. KOMPONEN EvAKIP */}
        {activeTab === 'EvAKIP' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/evakip',
                {
                  nilaiEvakip: evakipKosong ? null : Number(evakipNilai),
                  sumberDokumen: evakipSumber,
                  keterangan: evakipKet,
                },
                'Data Evaluasi Internal AKIP (EvAKIP) berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={evakipKosong}
                onChange={(e) => setEvakipKosong(e.target.checked)}
                disabled={isReadOnly}
              />
              <span>
                Evaluasi belum dilaksanakan pada triwulan ini (Biarkan nilai kosong / &ldquo;Belum
                tersedia&rdquo;, jangan diubah menjadi 0)
              </span>
            </label>

            {!evakipKosong && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nilai EvAKIP</label>
                  <input
                    type="number"
                    step="0.01"
                    value={evakipNilai}
                    onChange={(e) => setEvakipNilai(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Sumber / Dokumen
                  </label>
                  <input
                    type="text"
                    value={evakipSumber}
                    onChange={(e) => setEvakipSumber(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Keterangan</label>
                  <input
                    type="text"
                    value={evakipKet}
                    onChange={(e) => setEvakipKet(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan EvAKIP</span>
              </button>
            )}
          </form>
        )}

        {/* 3. KOMPONEN PPG */}
        {activeTab === 'PPG' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/ppg',
                {
                  totalPelaporanGratifikasi: Number(ppgTotal),
                  pelaporanDiproses: Number(ppgDiproses),
                  nilaiPpgKpk: Number(ppgKpk),
                  sumberDokumen: ppgSumber,
                },
                'Data Indeks Program Pengendalian Gratifikasi (PPG) berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Total Pelaporan Gratifikasi (PGr)
                </label>
                <input
                  type="number"
                  value={ppgTotal}
                  onChange={(e) => setPpgTotal(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Pelaporan Telah Diproses (PGtl)
                </label>
                <input
                  type="number"
                  value={ppgDiproses}
                  onChange={(e) => setPpgDiproses(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Nilai PPG KPK Terbaru (PPGKPK)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ppgKpk}
                  onChange={(e) => setPpgKpk(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Sumber Dokumen</label>
                <input
                  type="text"
                  value={ppgSumber}
                  onChange={(e) => setPpgSumber(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="font-mono text-xs text-slate-700">
                Hitung Otomatis: {ppgLive.rumusTeks} ={' '}
                <strong>{formatDecimal(ppgLive.nilaiPpg)}</strong>
              </div>
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Simpan PPG</span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* 4. KOMPONEN LHKAN */}
        {activeTab === 'LHKAN' && (
          <div className="mt-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-2.5">Unit Kerja</th>
                    <th className="p-2.5">Jenis Laporan</th>
                    <th className="p-2.5 text-right">Jumlah Wajib Lapor (WLasn)</th>
                    <th className="p-2.5 text-right">Jumlah Sudah Lapor (WLpasn)</th>
                    <th className="p-2.5 text-right">Kepatuhan</th>
                    <th className="p-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(periodData?.details?.lhkan?.rows || []).map((r: any) => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-medium text-slate-900">{r.unitKerja}</td>
                      <td className="p-2.5">{r.jenisLaporan}</td>
                      <td className="p-2.5 text-right font-mono tabular-nums">
                        {r.jumlahWajibLapor}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums">
                        {r.jumlahSudahLapor}
                      </td>
                      <td className="p-2.5 text-right font-mono tabular-nums font-semibold">
                        {r.jumlahWajibLapor > 0
                          ? formatDecimal((r.jumlahSudahLapor / r.jumlahWajibLapor) * 100)
                          : '0,00'}
                        %
                      </td>
                      <td className="p-2.5 text-right">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteAction(`/api/data/lhkan/${r.id}`, 'Data LHKAN dihapus.')
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isReadOnly && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  postAction(
                    '/api/data/lhkan',
                    {
                      unitKerja: lhkanUnit,
                      jenisLaporan: lhkanJenis,
                      jumlahWajibLapor: Number(lhkanWajib),
                      jumlahSudahLapor: Number(lhkanSudah),
                    },
                    'Data kepatuhan LHKAN berhasil ditambahkan.'
                  );
                  setLhkanUnit('');
                  setLhkanWajib('');
                  setLhkanSudah('');
                }}
                className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-5"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700">Unit Kerja</label>
                  <input
                    type="text"
                    placeholder="Contoh: Sekretariat Utama"
                    value={lhkanUnit}
                    onChange={(e) => setLhkanUnit(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Jenis Laporan</label>
                  <select
                    value={lhkanJenis}
                    onChange={(e) => setLhkanJenis(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                  >
                    <option value="LHKPN">LHKPN</option>
                    <option value="LHKASN / SPT Tahunan">LHKASN / SPT Tahunan</option>
                    <option value="Gabungan LHKAN">Gabungan LHKAN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Jumlah Wajib Lapor
                  </label>
                  <input
                    type="number"
                    value={lhkanWajib}
                    onChange={(e) => setLhkanWajib(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Jumlah Sudah Lapor
                  </label>
                  <input
                    type="number"
                    value={lhkanSudah}
                    onChange={(e) => setLhkanSudah(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                    required
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah LHKAN</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 5. KOMPONEN WBS */}
        {activeTab === 'WBS' && (
          <div className="mt-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-2.5">Nomor Laporan</th>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">Jenis Pelaporan</th>
                    <th className="p-2.5">Status Verifikasi</th>
                    <th className="p-2.5">Status Tindak Lanjut</th>
                    <th className="p-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(periodData?.details?.wbs?.rows || []).map((r: any) => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-mono font-medium text-slate-900">
                        {r.nomorLaporan}
                      </td>
                      <td className="p-2.5 font-mono">{r.tanggal}</td>
                      <td className="p-2.5">{r.jenisPelaporan}</td>
                      <td className="p-2.5">{r.statusVerifikasi}</td>
                      <td className="p-2.5 font-medium">{r.statusTindakLanjut}</td>
                      <td className="p-2.5 text-right">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteAction(`/api/data/wbs/${r.id}`, 'Laporan WBS dihapus.')
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isReadOnly && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  postAction(
                    '/api/data/wbs',
                    {
                      nomorLaporan: wbsNomor,
                      tanggal: wbsTanggal,
                      jenisPelaporan: wbsJenis,
                      statusVerifikasi: wbsVerifikasi,
                      statusTindakLanjut: wbsTlStatus,
                      isDitindaklanjuti: wbsDitindaklanjuti,
                    },
                    'Laporan WBS berhasil ditambahkan.'
                  );
                  setWbsNomor('');
                }}
                className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-6"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nomor Laporan</label>
                  <input
                    type="text"
                    placeholder="WBS/LAN/2026/..."
                    value={wbsNomor}
                    onChange={(e) => setWbsNomor(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Tanggal</label>
                  <input
                    type="date"
                    value={wbsTanggal}
                    onChange={(e) => setWbsTanggal(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Jenis Pelaporan
                  </label>
                  <input
                    type="text"
                    value={wbsJenis}
                    onChange={(e) => setWbsJenis(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Status Verifikasi
                  </label>
                  <select
                    value={wbsVerifikasi}
                    onChange={(e) => setWbsVerifikasi(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                  >
                    <option value="Terverifikasi">Terverifikasi</option>
                    <option value="Proses Verifikasi">Proses Verifikasi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Status Tindak Lanjut
                  </label>
                  <select
                    value={wbsTlStatus}
                    onChange={(e) => {
                      setWbsTlStatus(e.target.value);
                      setWbsDitindaklanjuti(e.target.value !== 'Belum Ditindaklanjuti');
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                  >
                    <option value="Ditindaklanjuti">Ditindaklanjuti (Dihitung WBSvr)</option>
                    <option value="Selesai">Selesai (Dihitung WBSvr)</option>
                    <option value="Belum Ditindaklanjuti">Belum Ditindaklanjuti</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah WBS</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 6. KOMPONEN ZI */}
        {activeTab === 'ZI' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/zi',
                {
                  nilaiEvaluasiZi: ziKosong ? null : Number(ziNilai),
                  sumberEvaluasi: ziSumber,
                  keterangan: ziKet,
                },
                'Data Evaluasi Pembangunan Zona Integritas (ZI) berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={ziKosong}
                onChange={(e) => setZiKosong(e.target.checked)}
                disabled={isReadOnly}
              />
              <span>Evaluasi ZI belum tersedia pada triwulan ini (Kosong / Belum tersedia)</span>
            </label>
            {!ziKosong && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Nilai Evaluasi ZI (TPI)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ziNilai}
                    onChange={(e) => setZiNilai(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Sumber Evaluasi
                  </label>
                  <input
                    type="text"
                    value={ziSumber}
                    onChange={(e) => setZiSumber(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Keterangan</label>
                  <input
                    type="text"
                    value={ziKet}
                    onChange={(e) => setZiKet(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan ZI</span>
              </button>
            )}
          </form>
        )}

        {/* 7. KOMPONEN APIP */}
        {activeTab === 'APIP' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/apip',
                {
                  nilaiKapabilitasApip: Number(apipNilai),
                  tahunPeriodePenilaian: apipPeriode,
                  sumberDokumen: apipSumber,
                  keterangan: apipKet,
                },
                'Nilai Kapabilitas APIP berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Nilai Kapabilitas APIP
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={apipNilai}
                  onChange={(e) => setApipNilai(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Tahun / Periode Penilaian BPKP
                </label>
                <input
                  type="text"
                  value={apipPeriode}
                  onChange={(e) => setApipPeriode(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Sumber Dokumen</label>
                <input
                  type="text"
                  value={apipSumber}
                  onChange={(e) => setApipSumber(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Keterangan</label>
                <input
                  type="text"
                  value={apipKet}
                  onChange={(e) => setApipKet(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan APIP</span>
              </button>
            )}
          </form>
        )}

        {/* 8. KOMPONEN KPI (Daftar Kebijakan 2025-2029) */}
        {activeTab === 'KPI' && (
          <div className="mt-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="p-2.5">Daftar Rumusan Kebijakan Pengawasan Internal</th>
                    <th className="p-2.5">Status Kebijakan</th>
                    <th className="p-2.5 text-right">Tahun Target</th>
                    <th className="p-2.5 text-right">Kr (Siap/Ditetapkan)</th>
                    <th className="p-2.5 text-right">Kt (Total s.d. 2029)</th>
                    <th className="p-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(periodData?.details?.kpi?.rows || []).map((r: any) => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-medium text-slate-900">{r.daftarKebijakan}</td>
                      <td className="p-2.5">{r.statusKebijakan}</td>
                      <td className="p-2.5 text-right font-mono">{r.tahunTarget}</td>
                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-700">
                        {r.krJumlah}
                      </td>
                      <td className="p-2.5 text-right font-mono">{r.ktTotal2029}</td>
                      <td className="p-2.5 text-right">
                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              deleteAction(`/api/data/kpi/${r.id}`, 'Kebijakan KPI dihapus.')
                            }
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3.5 w-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!isReadOnly && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  postAction(
                    '/api/data/kpi',
                    {
                      daftarKebijakan: kpiNama,
                      statusKebijakan: kpiStatus,
                      tahunTarget: Number(kpiTahunTarget),
                      krJumlah: Number(kpiKr),
                      ktTotal2029: Number(kpiKt),
                    },
                    'Kebijakan pengawasan internal berhasil ditambahkan ke tabel KPI.'
                  );
                  setKpiNama('');
                }}
                className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-6"
              >
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Nama / Rumusan Kebijakan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Pedoman Pengawasan Intern..."
                    value={kpiNama}
                    onChange={(e) => setKpiNama(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Status</label>
                  <select
                    value={kpiStatus}
                    onChange={(e) => {
                      setKpiStatus(e.target.value);
                      setKpiKr(
                        e.target.value === 'Ditetapkan' || e.target.value === 'Siap Dibahas'
                          ? '1'
                          : '0'
                      );
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs"
                  >
                    <option value="Ditetapkan">Ditetapkan (Kr=1)</option>
                    <option value="Siap Dibahas">Siap Dibahas (Kr=1)</option>
                    <option value="Penyusunan">Penyusunan (Kr=0)</option>
                    <option value="Direncanakan">Direncanakan (Kr=0)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Tahun Target</label>
                  <input
                    type="number"
                    min={2025}
                    max={2029}
                    value={kpiTahunTarget}
                    onChange={(e) => setKpiTahunTarget(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Kr / Kt (s.d. 2029)
                  </label>
                  <div className="mt-1 flex gap-1">
                    <input
                      type="number"
                      value={kpiKr}
                      onChange={(e) => setKpiKr(e.target.value)}
                      className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                      title="Nilai Kr"
                    />
                    <input
                      type="number"
                      value={kpiKt}
                      onChange={(e) => setKpiKt(e.target.value)}
                      className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs"
                      title="Total Kt s.d. 2029"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tambah KPI</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 9. KOMPONEN NES (Tata Kelola Internal) */}
        {activeTab === 'NES' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/nes',
                {
                  nilaiNes: nesKosong ? null : Number(nesNilai),
                  sumberDokumen: nesSumber,
                },
                'Nilai Evaluasi SAKIP (NES) berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={nesKosong}
                onChange={(e) => setNesKosong(e.target.checked)}
                disabled={isReadOnly}
              />
              <span>Evaluasi SAKIP belum tersedia pada triwulan ini (Kosong / Belum tersedia)</span>
            </label>
            {!nesKosong && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nilai NES</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nesNilai}
                    onChange={(e) => setNesNilai(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Sumber Dokumen</label>
                  <input
                    type="text"
                    value={nesSumber}
                    onChange={(e) => setNesSumber(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan NES</span>
              </button>
            )}
          </form>
        )}

        {/* 10. KOMPONEN NCKI (Tata Kelola Internal) */}
        {activeTab === 'NCKI' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/ncki',
                {
                  rencanaPenarikanAnggaran: Number(nckiRencanaAngg),
                  realisasiAnggaran: Number(nckiRealAngg),
                  rencanaCapaianOutput: Number(nckiRencanaOut),
                  realisasiCapaianOutput: Number(nckiRealOut),
                  sumberDokumen: nckiSumber,
                },
                'Nilai Capaian Keluaran Inspektorat (NCKI) berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Rencana Penarikan Anggaran (Rp)
                </label>
                <input
                  type="number"
                  value={nckiRencanaAngg}
                  onChange={(e) => setNckiRencanaAngg(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Realisasi Anggaran (Rp)
                </label>
                <input
                  type="number"
                  value={nckiRealAngg}
                  onChange={(e) => setNckiRealAngg(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Rencana Capaian Output
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nckiRencanaOut}
                  onChange={(e) => setNckiRencanaOut(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Realisasi Capaian Output
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nckiRealOut}
                  onChange={(e) => setNckiRealOut(e.target.value)}
                  disabled={isReadOnly}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                  required
                />
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
              <div>Rincian Formula NCKI:</div>
              <div className="mt-1">{nckiLive.rumusTeks}</div>
            </div>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan NCKI</span>
              </button>
            )}
          </form>
        )}

        {/* 11. KOMPONEN NSAP (Tata Kelola Internal) */}
        {activeTab === 'NSAP' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/nsap',
                {
                  nilaiNsap: nsapKosong ? null : Number(nsapNilai),
                  sumberDokumen: nsapSumber,
                  keterangan: nsapKet,
                },
                'Nilai Pengawasan Kearsipan Internal (NSAP) berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={nsapKosong}
                onChange={(e) => setNsapKosong(e.target.checked)}
                disabled={isReadOnly}
              />
              <span>
                Pengawasan kearsipan belum dilakukan pada triwulan ini (Kosong / Belum tersedia)
              </span>
            </label>
            {!nsapKosong && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nilai NSAP</label>
                  <input
                    type="number"
                    step="0.01"
                    value={nsapNilai}
                    onChange={(e) => setNsapNilai(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Sumber Dokumen</label>
                  <input
                    type="text"
                    value={nsapSumber}
                    onChange={(e) => setNsapSumber(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Keterangan</label>
                  <input
                    type="text"
                    value={nsapKet}
                    onChange={(e) => setNsapKet(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan NSAP</span>
              </button>
            )}
          </form>
        )}

        {/* 12. KOMPONEN SKM (Tata Kelola Internal) */}
        {activeTab === 'SKM' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              postAction(
                '/api/data/skm',
                {
                  nilaiSkm: skmKosong ? null : Number(skmNilai),
                  jumlahResponden: Number(skmResponden),
                  periodeSurvei: skmPeriode,
                  sumberData: skmSumber,
                },
                'Indeks Kepuasan Pengguna Layanan (SKM) berhasil disimpan.'
              );
            }}
            className="mt-5 space-y-4"
          >
            <label className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <input
                type="checkbox"
                checked={skmKosong}
                onChange={(e) => setSkmKosong(e.target.checked)}
                disabled={isReadOnly}
              />
              <span>Survei SKM belum dilakukan pada triwulan ini (Kosong / Belum tersedia)</span>
            </label>
            {!skmKosong && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Nilai SKM</label>
                  <input
                    type="number"
                    step="0.01"
                    value={skmNilai}
                    onChange={(e) => setSkmNilai(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Jumlah Responden
                  </label>
                  <input
                    type="number"
                    value={skmResponden}
                    onChange={(e) => setSkmResponden(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Periode Survei</label>
                  <input
                    type="text"
                    value={skmPeriode}
                    onChange={(e) => setSkmPeriode(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Sumber Data</label>
                  <input
                    type="text"
                    value={skmSumber}
                    onChange={(e) => setSkmSumber(e.target.value)}
                    disabled={isReadOnly}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Simpan SKM</span>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
