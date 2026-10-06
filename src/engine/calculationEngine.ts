import {
  KomponenPengawasanType,
  KomponenTataKelolaType,
  StatusDataType,
  TriwulanType,
  TARGET_KOMPONEN_PENGAWASAN_2026,
  TARGET_KOMPONEN_TATA_KELOLA_2026,
  TARGET_TRIWULAN_IK_PENGAWASAN_2026,
  TARGET_TRIWULAN_IK_TATA_KELOLA_2026,
} from '../data/officialTargets.ts';

/**
 * CALCULATION ENGINE — IKU PENGAWASAN INTERN LAN & TATA KELOLA INTERNAL INSPEKTORAT
 *
 * Seluruh aturan perhitungan merujuk pada Perjanjian Kinerja Inspektur LAN Tahun 2026.
 * ATURAN PENTING:
 * 1. Jangan melakukan pembulatan terlalu awal (simpan presisi penuh, pembulatan hanya pada tampilan).
 * 2. Jangan mengubah nilai realisasi kosong (null) menjadi 0.
 * 3. Target 0 tetap ditampilkan sebagai 0, berbeda dengan Realisasi "Belum tersedia" (null).
 * 4. TLP dihitung dari 4 sumber: BPK, Audit Internal (2 thn terakhir), Audit Kinerja (2 thn terakhir), SPI (thn terakhir).
 */

export interface BpkInput {
  totalRekomendasi: number; // AUrb
  sesuaiRekomendasi: number;
  tidakDapatDitindaklanjutiSah: number;
}

export interface AuditInternalItemInput {
  tahunLha: number;
  unitSatker: string;
  totalRekomendasi: number;
  sesuaiRekomendasi: number;
  belumSesuai: number;
  belumDitindaklanjuti: number;
}

export interface AuditKinerjaItemInput {
  tahunLha: number;
  programUnit: string;
  totalRekomendasi: number;
  sesuaiRekomendasi: number;
  belumSesuai: number;
  belumDitindaklanjuti: number;
}

export interface SpiInput {
  tahunSpi: number;
  totalRekomendasi: number; // AUrs
  sesuaiRekomendasi: number;
  telahDivalidasiKpk: number; // AUtls (telah sesuai rekomendasi Inspektorat DAN telah divalidasi KPK)
}

export interface TlpBreakdownResult {
  bpk: {
    autlb: number;
    aurb: number;
    sesuai: number;
    tddSah: number;
    persentase: number | null;
    tersedia: boolean;
  };
  auditInternal: {
    autli: number;
    auri: number;
    persentase: number | null;
    rentangTahunLha: number[];
    jumlahUnit: number;
    tersedia: boolean;
  };
  auditKinerja: {
    autlk: number;
    aurk: number;
    persentase: number | null;
    rentangTahunLha: number[];
    jumlahProgram: number;
    tersedia: boolean;
  };
  spi: {
    autls: number;
    aurs: number;
    tahunSpi: number | null;
    persentase: number | null;
    tersedia: boolean;
  };
  nilaiTlp: number | null; // Rata-rata 4 sumber jika ke-4 sumber atau sumber tersedia
  semuaEmpatSumberTersedia: boolean;
  jumlahSumberTersedia: number;
  rumusTeks: string;
}

/**
 * 1. Hitung TLP BPK: AUtlb / AUrb * 100
 * AUtlb = sesuaiRekomendasi + tidakDapatDitindaklanjutiSah
 */
export function calculateTlpBpk(input: BpkInput | null | undefined): {
  autlb: number;
  aurb: number;
  sesuai: number;
  tddSah: number;
  persentase: number | null;
  tersedia: boolean;
} {
  if (!input || input.totalRekomendasi <= 0) {
    return {
      autlb: 0,
      aurb: input?.totalRekomendasi ?? 0,
      sesuai: input?.sesuaiRekomendasi ?? 0,
      tddSah: input?.tidakDapatDitindaklanjutiSah ?? 0,
      persentase: null,
      tersedia: false,
    };
  }
  const autlb = Number(input.sesuaiRekomendasi) + Number(input.tidakDapatDitindaklanjutiSah);
  const aurb = Number(input.totalRekomendasi);
  const persentase = (autlb / aurb) * 100;
  return {
    autlb,
    aurb,
    sesuai: Number(input.sesuaiRekomendasi),
    tddSah: Number(input.tidakDapatDitindaklanjutiSah),
    persentase,
    tersedia: true,
  };
}

/**
 * 2. Hitung TLP Audit Internal (2 tahun terakhir): AUtli / AUri * 100
 * Memfilter atau memvalidasi data LHA periode dua tahun terakhir terhadap tahun periode berjalan.
 */
export function calculateTlpAuditInternal(
  items: AuditInternalItemInput[],
  tahunPeriode?: number
): {
  autli: number;
  auri: number;
  persentase: number | null;
  rentangTahunLha: number[];
  jumlahUnit: number;
  tersedia: boolean;
} {
  // Jika tahunPeriode diberikan, 2 tahun terakhir mencakup [tahunPeriode - 2, tahunPeriode - 1, tahunPeriode]
  // agar mengakomodasi definisi 2 tahun anggaran LHA terakhir
  const filtered = items.filter((item) => {
    if (!tahunPeriode) return true;
    return item.tahunLha >= tahunPeriode - 2 && item.tahunLha <= tahunPeriode;
  });

  if (filtered.length === 0) {
    return {
      autli: 0,
      auri: 0,
      persentase: null,
      rentangTahunLha: [],
      jumlahUnit: 0,
      tersedia: false,
    };
  }

  const autli = filtered.reduce((acc, row) => acc + Number(row.sesuaiRekomendasi), 0);
  const auri = filtered.reduce((acc, row) => acc + Number(row.totalRekomendasi), 0);
  const rentangTahunLha = Array.from(new Set(filtered.map((r) => r.tahunLha))).sort();

  if (auri <= 0) {
    return {
      autli,
      auri: 0,
      persentase: null,
      rentangTahunLha,
      jumlahUnit: filtered.length,
      tersedia: false,
    };
  }

  return {
    autli,
    auri,
    persentase: (autli / auri) * 100,
    rentangTahunLha,
    jumlahUnit: filtered.length,
    tersedia: true,
  };
}

/**
 * 3. Hitung TLP Audit Kinerja Program (2 tahun terakhir): AUtlk / AUrk * 100
 */
export function calculateTlpAuditKinerja(
  items: AuditKinerjaItemInput[],
  tahunPeriode?: number
): {
  autlk: number;
  aurk: number;
  persentase: number | null;
  rentangTahunLha: number[];
  jumlahProgram: number;
  tersedia: boolean;
} {
  const filtered = items.filter((item) => {
    if (!tahunPeriode) return true;
    return item.tahunLha >= tahunPeriode - 2 && item.tahunLha <= tahunPeriode;
  });

  if (filtered.length === 0) {
    return {
      autlk: 0,
      aurk: 0,
      persentase: null,
      rentangTahunLha: [],
      jumlahProgram: 0,
      tersedia: false,
    };
  }

  const autlk = filtered.reduce((acc, row) => acc + Number(row.sesuaiRekomendasi), 0);
  const aurk = filtered.reduce((acc, row) => acc + Number(row.totalRekomendasi), 0);
  const rentangTahunLha = Array.from(new Set(filtered.map((r) => r.tahunLha))).sort();

  if (aurk <= 0) {
    return {
      autlk,
      aurk: 0,
      persentase: null,
      rentangTahunLha,
      jumlahProgram: filtered.length,
      tersedia: false,
    };
  }

  return {
    autlk,
    aurk,
    persentase: (autlk / aurk) * 100,
    rentangTahunLha,
    jumlahProgram: filtered.length,
    tersedia: true,
  };
}

/**
 * 4. Hitung TLP SPI (Tahun terakhir): AUtls / AUrs * 100
 * AUtls = rekomendasi yang telah sesuai rekomendasi Inspektorat DAN telah divalidasi KPK
 */
export function calculateTlpSpi(items: SpiInput[]): {
  autls: number;
  aurs: number;
  tahunSpi: number | null;
  persentase: number | null;
  tersedia: boolean;
} {
  if (!items || items.length === 0) {
    return {
      autls: 0,
      aurs: 0,
      tahunSpi: null,
      persentase: null,
      tersedia: false,
    };
  }

  // Gunakan tahun SPI terakhir apabila terdapat lebih dari satu tahun
  const maxYear = Math.max(...items.map((i) => i.tahunSpi));
  const latestItems = items.filter((i) => i.tahunSpi === maxYear);

  const autls = latestItems.reduce((acc, r) => acc + Number(r.telahDivalidasiKpk), 0);
  const aurs = latestItems.reduce((acc, r) => acc + Number(r.totalRekomendasi), 0);

  if (aurs <= 0) {
    return {
      autls,
      aurs: 0,
      tahunSpi: maxYear,
      persentase: null,
      tersedia: false,
    };
  }

  return {
    autls,
    aurs,
    tahunSpi: maxYear,
    persentase: (autls / aurs) * 100,
    tersedia: true,
  };
}

/**
 * Hitung TLP Gabungan (4 Sumber):
 * TLP = [(AUtlb / AUrb × 100%) + (AUtli / AUri × 100%) + (AUtlk / AUrk × 100%) + (AUtls / AUrs × 100%)] / 4
 */
export function calculateTlpAggregate(
  bpkInput: BpkInput | null | undefined,
  auditInternalItems: AuditInternalItemInput[],
  auditKinerjaItems: AuditKinerjaItemInput[],
  spiItems: SpiInput[],
  tahunPeriode?: number
): TlpBreakdownResult {
  const bpk = calculateTlpBpk(bpkInput);
  const auditInternal = calculateTlpAuditInternal(auditInternalItems, tahunPeriode);
  const auditKinerja = calculateTlpAuditKinerja(auditKinerjaItems, tahunPeriode);
  const spi = calculateTlpSpi(spiItems);

  const availableScores = [
    bpk.persentase,
    auditInternal.persentase,
    auditKinerja.persentase,
    spi.persentase,
  ].filter((v): v is number => v !== null && !Number.isNaN(v));

  const jumlahSumberTersedia = availableScores.length;
  const semuaEmpatSumberTersedia = jumlahSumberTersedia === 4;

  // Sesuai rumus resmi: dibagi 4 dari keempat sumber rekomendasi pengawasan
  let nilaiTlp: number | null = null;
  if (jumlahSumberTersedia > 0) {
    const sumFourSources =
      (bpk.persentase ?? 0) +
      (auditInternal.persentase ?? 0) +
      (auditKinerja.persentase ?? 0) +
      (spi.persentase ?? 0);
    nilaiTlp = sumFourSources / 4;
  }

  const rumusTeks =
    jumlahSumberTersedia > 0
      ? `[(${formatDecimal(bpk.persentase)}) + (${formatDecimal(auditInternal.persentase)}) + (${formatDecimal(auditKinerja.persentase)}) + (${formatDecimal(spi.persentase)})] / 4`
      : 'Belum ada data sumber TLP';

  return {
    bpk,
    auditInternal,
    auditKinerja,
    spi,
    nilaiTlp,
    semuaEmpatSumberTersedia,
    jumlahSumberTersedia,
    rumusTeks,
  };
}

/**
 * Hitung PPG:
 * PPG = [(PGtl / PGr × 100) + PPGKPK] / 2
 */
export function calculatePpg(input: {
  totalPelaporanGratifikasi: number; // PGr
  pelaporanDiproses: number; // PGtl
  nilaiPpgKpk: number; // PPGKPK
} | null | undefined): {
  pgtl: number;
  pgr: number;
  rasioProsesPersen: number | null;
  ppgKpk: number | null;
  nilaiPpg: number | null;
  rumusTeks: string;
} {
  if (!input) {
    return {
      pgtl: 0,
      pgr: 0,
      rasioProsesPersen: null,
      ppgKpk: null,
      nilaiPpg: null,
      rumusTeks: 'Belum tersedia',
    };
  }

  const pgtl = Number(input.pelaporanDiproses);
  const pgr = Number(input.totalPelaporanGratifikasi);
  const ppgKpk = Number(input.nilaiPpgKpk);

  // Jika PGr = 0 (tidak ada pelaporan gratifikasi masuk pada triwulan tsb),
  // maka jika PGtl = 0 dan PGr = 0, rasio pemrosesan dapat dianggap 0 atau hanya PPGKPK / 2 sesuai input
  const rasioProsesPersen = pgr > 0 ? (pgtl / pgr) * 100 : 0;
  const nilaiPpg = (rasioProsesPersen + ppgKpk) / 2;

  return {
    pgtl,
    pgr,
    rasioProsesPersen,
    ppgKpk,
    nilaiPpg,
    rumusTeks: pgr > 0
      ? `[(${pgtl} / ${pgr} × 100) + ${formatDecimal(ppgKpk)}] / 2 = [(${formatDecimal(rasioProsesPersen)}) + ${formatDecimal(ppgKpk)}] / 2`
      : `[0 + ${formatDecimal(ppgKpk)}] / 2 (PGr = 0 laporan masuk)`,
  };
}

/**
 * Hitung LHKAN:
 * LHKAN = WLpasn / WLasn × 100%
 */
export function calculateLhkan(
  rows: Array<{
    unitKerja: string;
    jenisLaporan: string;
    jumlahWajibLapor: number;
    jumlahSudahLapor: number;
  }>
): {
  wlpasn: number;
  wlasn: number;
  nilaiLhkan: number | null;
  rumusTeks: string;
} {
  if (!rows || rows.length === 0) {
    return {
      wlpasn: 0,
      wlasn: 0,
      nilaiLhkan: null,
      rumusTeks: 'Belum tersedia',
    };
  }

  const wlasn = rows.reduce((acc, r) => acc + Number(r.jumlahWajibLapor), 0);
  const wlpasn = rows.reduce((acc, r) => acc + Number(r.jumlahSudahLapor), 0);

  if (wlasn <= 0) {
    return {
      wlpasn,
      wlasn: 0,
      nilaiLhkan: null,
      rumusTeks: 'Jumlah wajib lapor (WLasn) = 0',
    };
  }

  const nilaiLhkan = (wlpasn / wlasn) * 100;
  return {
    wlpasn,
    wlasn,
    nilaiLhkan,
    rumusTeks: `${wlpasn} / ${wlasn} × 100% = ${formatDecimal(nilaiLhkan)}%`,
  };
}

/**
 * Hitung WBS:
 * WBS = WBSvr / WBSlp × 100%
 */
export function calculateWbs(
  reports: Array<{
    nomorLaporan: string;
    statusVerifikasi: string;
    statusTindakLanjut: string;
    isDitindaklanjuti: boolean;
  }>
): {
  wbsvr: number;
  wbslp: number;
  nilaiWbs: number | null;
  rumusTeks: string;
} {
  if (!reports || reports.length === 0) {
    return {
      wbsvr: 0,
      wbslp: 0,
      nilaiWbs: null,
      rumusTeks: 'Belum ada laporan pelanggaran masuk',
    };
  }

  const wbslp = reports.length;
  const wbsvr = reports.filter((r) => r.isDitindaklanjuti).length;
  const nilaiWbs = (wbsvr / wbslp) * 100;

  return {
    wbsvr,
    wbslp,
    nilaiWbs,
    rumusTeks: `${wbsvr} / ${wbslp} × 100% = ${formatDecimal(nilaiWbs)}%`,
  };
}

/**
 * Hitung KPI:
 * KPI = Kr / Kt × 100%
 * Kr: Jumlah rumusan kebijakan pengawasan internal yang siap dibahas dan/atau ditetapkan dari 2025 s.d. tahun berjalan
 * Kt: Jumlah total rumusan kebijakan pengawasan internal yang direncanakan s.d. 2029
 */
export function calculateKpi(
  policies: Array<{
    krJumlah: number;
    ktTotal2029: number;
    daftarKebijakan: string;
    statusKebijakan: string;
    tahunTarget: number;
  }>
): {
  kr: number;
  kt: number;
  nilaiKpi: number | null;
  rumusTeks: string;
} {
  if (!policies || policies.length === 0) {
    return {
      kr: 0,
      kt: 0,
      nilaiKpi: null,
      rumusTeks: 'Belum tersedia',
    };
  }

  // Jika tabel mencatat daftar kebijakan per baris atau rekap Kr & Kt:
  // Kita dukung dua pola: jika ktTotal2029 seragam (misal 5 kebijakan s.d. 2029) dan krJumlah diakumulasi atau diambil dari status
  const ktMax = Math.max(...policies.map((p) => Number(p.ktTotal2029)));
  const totalKrExplicit = policies.reduce((acc, p) => acc + Number(p.krJumlah), 0);

  const kt = ktMax > 0 ? ktMax : policies.length;
  const kr = totalKrExplicit;

  if (kt <= 0) {
    return {
      kr: 0,
      kt: 0,
      nilaiKpi: null,
      rumusTeks: 'Total rencana kebijakan (Kt) = 0',
    };
  }

  const nilaiKpi = (kr / kt) * 100;
  return {
    kr,
    kt,
    nilaiKpi,
    rumusTeks: `${kr} / ${kt} × 100% = ${formatDecimal(nilaiKpi)}%`,
  };
}

/**
 * Hitung NCKI:
 * NCKI = [(Realisasi anggaran / Rencana penarikan anggaran) + (Realisasi capaian output / Rencana capaian output)] / 2 × 100
 */
export function calculateNcki(input: {
  rencanaPenarikanAnggaran: number;
  realisasiAnggaran: number;
  rencanaCapaianOutput: number;
  realisasiCapaianOutput: number;
} | null | undefined): {
  rasioAnggaran: number | null;
  rasioOutput: number | null;
  nilaiNcki: number | null;
  rumusTeks: string;
} {
  if (
    !input ||
    input.rencanaPenarikanAnggaran <= 0 ||
    input.rencanaCapaianOutput <= 0
  ) {
    return {
      rasioAnggaran: null,
      rasioOutput: null,
      nilaiNcki: null,
      rumusTeks: 'Belum tersedia',
    };
  }

  const rasioAnggaran = Number(input.realisasiAnggaran) / Number(input.rencanaPenarikanAnggaran);
  const rasioOutput = Number(input.realisasiCapaianOutput) / Number(input.rencanaCapaianOutput);
  const nilaiNcki = ((rasioAnggaran + rasioOutput) / 2) * 100;

  return {
    rasioAnggaran: rasioAnggaran * 100,
    rasioOutput: rasioOutput * 100,
    nilaiNcki,
    rumusTeks: `[(${formatNumberId(input.realisasiAnggaran)} / ${formatNumberId(input.rencanaPenarikanAnggaran)}) + (${formatDecimal(input.realisasiCapaianOutput)} / ${formatDecimal(input.rencanaCapaianOutput)})] / 2 × 100 = [(${formatDecimal(rasioAnggaran * 100)}%) + (${formatDecimal(rasioOutput * 100)}%)] / 2 = ${formatDecimal(nilaiNcki)}`,
  };
}

/**
 * Hitung Indikator Utama 1:
 * IK - Indeks Pengawasan Intern LAN
 * Rumus:
 * IK = [(TLP × 100) + EvAKIP + PPG + (LHKAN × 100) + (WBS × 100) + ZI + (APIP × 100) + (KPI × 100)] / 8
 *
 * Catatan penting:
 * - Nilai komponen TLP, LHKAN, WBS, APIP, dan KPI pada tabel target dan hasil perhitungan sub-komponen
 *   sudah berada pada skala 0-100 (yaitu rasio × 100). Jika seseorang memasukkan rasio desimal <= 1 (dan > 0),
 *   fungsi normalizeToIndex100 memastikan nilainya berada pada skala 0-100 sesuai tabel Perjanjian Kinerja 2026.
 * - Komponen yang nilainya null ("Belum tersedia") TIDAK diubah menjadi 0 pada tampilan komponen.
 *   Untuk perhitungan indeks kumulatif triwulan (/ 8), apabila minimal 1 komponen telah terisi pada triwulan tersebut,
 *   komponen yang tersedia dijumlahkan dan dibagi 8 (sebagaimana target resmi TW I = 32,28, TW II = 57,09, TW III = 67,81, TW IV = 76,50).
 */
export interface IkPengawasanComponentsInput {
  TLP: number | null;
  EvAKIP: number | null;
  PPG: number | null;
  LHKAN: number | null;
  WBS: number | null;
  ZI: number | null;
  APIP: number | null;
  KPI: number | null;
}

export interface IkPengawasanCalculationResult {
  komponenValues: IkPengawasanComponentsInput;
  jumlahKomponenTersedia: number;
  total8Komponen: number | null;
  nilaiIk: number | null; // dibagi 8 sesuai rumus PK 2026
  rataRataKomponenTersedia: number | null; // informasi tambahan: dibagi jumlah komponen yang sudah terisi
  rumusSubstitusi: string;
}

export function calculateIkPengawasanIntern(
  comp: IkPengawasanComponentsInput
): IkPengawasanCalculationResult {
  const keys: KomponenPengawasanType[] = [
    'TLP',
    'EvAKIP',
    'PPG',
    'LHKAN',
    'WBS',
    'ZI',
    'APIP',
    'KPI',
  ];

  const availableKeys = keys.filter(
    (k) => comp[k] !== null && comp[k] !== undefined && !Number.isNaN(Number(comp[k]))
  );

  const jumlahKomponenTersedia = availableKeys.length;
  if (jumlahKomponenTersedia === 0) {
    return {
      komponenValues: comp,
      jumlahKomponenTersedia: 0,
      total8Komponen: null,
      nilaiIk: null,
      rataRataKomponenTersedia: null,
      rumusSubstitusi: 'Belum ada komponen realisasi yang tersedia pada periode ini.',
    };
  }

  const sum = keys.reduce((acc, k) => {
    const val = comp[k];
    return acc + (val !== null && val !== undefined && !Number.isNaN(Number(val)) ? Number(val) : 0);
  }, 0);

  const nilaiIk = sum / 8;
  const rataRataKomponenTersedia = sum / jumlahKomponenTersedia;

  const parts = keys.map((k) => {
    const val = comp[k];
    if (val === null || val === undefined || Number.isNaN(Number(val))) {
      return `${k}: Belum tersedia`;
    }
    return `${k}: ${formatDecimal(val)}`;
  });

  const rumusSubstitusi = `[${parts.join(' + ')}] / 8 = ${formatDecimal(sum)} / 8 = ${formatDecimal(nilaiIk)}`;

  return {
    komponenValues: comp,
    jumlahKomponenTersedia,
    total8Komponen: sum,
    nilaiIk,
    rataRataKomponenTersedia,
    rumusSubstitusi,
  };
}

/**
 * Hitung Indikator Utama 2:
 * IK - Indeks Tata Kelola Internal Inspektorat
 * Rumus:
 * IK = (NES + NCKI + NSAP + SKM) / 4
 */
export interface IkTataKelolaComponentsInput {
  NES: number | null;
  NCKI: number | null;
  NSAP: number | null;
  SKM: number | null;
}

export interface IkTataKelolaCalculationResult {
  komponenValues: IkTataKelolaComponentsInput;
  jumlahKomponenTersedia: number;
  total4Komponen: number | null;
  nilaiIk: number | null; // dibagi 4 sesuai rumus PK 2026
  rataRataKomponenTersedia: number | null;
  rumusSubstitusi: string;
}

export function calculateIkTataKelolaInternal(
  comp: IkTataKelolaComponentsInput
): IkTataKelolaCalculationResult {
  const keys: KomponenTataKelolaType[] = ['NES', 'NCKI', 'NSAP', 'SKM'];
  const availableKeys = keys.filter(
    (k) => comp[k] !== null && comp[k] !== undefined && !Number.isNaN(Number(comp[k]))
  );

  const jumlahKomponenTersedia = availableKeys.length;
  if (jumlahKomponenTersedia === 0) {
    return {
      komponenValues: comp,
      jumlahKomponenTersedia: 0,
      total4Komponen: null,
      nilaiIk: null,
      rataRataKomponenTersedia: null,
      rumusSubstitusi: 'Belum ada komponen realisasi yang tersedia pada periode ini.',
    };
  }

  const sum = keys.reduce((acc, k) => {
    const val = comp[k];
    return acc + (val !== null && val !== undefined && !Number.isNaN(Number(val)) ? Number(val) : 0);
  }, 0);

  const nilaiIk = sum / 4;
  const rataRataKomponenTersedia = sum / jumlahKomponenTersedia;

  const parts = keys.map((k) => {
    const val = comp[k];
    if (val === null || val === undefined || Number.isNaN(Number(val))) {
      return `${k}: Belum tersedia`;
    }
    return `${k}: ${formatDecimal(val)}`;
  });

  const rumusSubstitusi = `(${parts.join(' + ')}) / 4 = ${formatDecimal(sum)} / 4 = ${formatDecimal(nilaiIk)}`;

  return {
    komponenValues: comp,
    jumlahKomponenTersedia,
    total4Komponen: sum,
    nilaiIk,
    rataRataKomponenTersedia,
    rumusSubstitusi,
  };
}

/**
 * Helper pemformatan angka tampilan Bahasa Indonesia (koma sebagai desimal, 2 digit desimal).
 * Ingat: Pembulatan HANYA dilakukan pada tampilan UI, bukan saat penyimpanan.
 */
export function formatDecimal(val: number | null | undefined, digits = 2): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return 'Belum tersedia';
  }
  return Number(val).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatTargetDecimal(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return '-';
  }
  if (Number(val) === 0) {
    return '0';
  }
  return Number(val).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatNumberId(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return '-';
  }
  return Number(val).toLocaleString('id-ID');
}

export function formatStatusLabel(status: StatusDataType | string): string {
  switch (status) {
    case 'BELUM_DIINPUT':
      return 'Belum diinput';
    case 'DRAFT':
      return 'Draft';
    case 'TERSEDIA':
      return 'Tersedia';
    case 'FINAL':
      return 'Final';
    default:
      return status;
  }
}

/**
 * Automated Formula Test Suite (Fitur #15 Testing Formula & Validasi Perhitungan)
 * Memverifikasi keakuratan engine terhadap Target Resmi 2026 & contoh uji dokumen.
 */
export interface FormulaTestCaseResult {
  id: string;
  namaUji: string;
  rumus: string;
  expectedFormatted: string;
  actualFormatted: string;
  actualPrecise: number | null;
  passed: boolean;
  keterangan: string;
}

export function runOfficialFormulaTests(): FormulaTestCaseResult[] {
  const results: FormulaTestCaseResult[] = [];

  // Test 1..4: Verifikasi Target Resmi IK Pengawasan Intern LAN TW I - TW IV
  const quarters: TriwulanType[] = ['TW I', 'TW II', 'TW III', 'TW IV'];
  for (const tw of quarters) {
    const comp: IkPengawasanComponentsInput = {
      TLP: TARGET_KOMPONEN_PENGAWASAN_2026.TLP[tw],
      EvAKIP: TARGET_KOMPONEN_PENGAWASAN_2026.EvAKIP[tw],
      PPG: TARGET_KOMPONEN_PENGAWASAN_2026.PPG[tw],
      LHKAN: TARGET_KOMPONEN_PENGAWASAN_2026.LHKAN[tw],
      WBS: TARGET_KOMPONEN_PENGAWASAN_2026.WBS[tw],
      ZI: TARGET_KOMPONEN_PENGAWASAN_2026.ZI[tw],
      APIP: TARGET_KOMPONEN_PENGAWASAN_2026.APIP[tw],
      KPI: TARGET_KOMPONEN_PENGAWASAN_2026.KPI[tw],
    };
    const calc = calculateIkPengawasanIntern(comp);
    const expected = TARGET_TRIWULAN_IK_PENGAWASAN_2026[tw];
    const expectedStr = formatDecimal(expected);
    const actualStr = formatDecimal(calc.nilaiIk);
    results.push({
      id: `PK-IK1-${tw}`,
      namaUji: `Verifikasi Target Resmi IK Pengawasan Intern 2026 (${tw})`,
      rumus: calc.rumusSubstitusi,
      expectedFormatted: expectedStr,
      actualFormatted: actualStr,
      actualPrecise: calc.nilaiIk,
      passed: expectedStr === actualStr,
      keterangan: `Menguji konsistensi 8 komponen target resmi ${tw} terhadap target IK ${expectedStr}.`,
    });
  }

  // Test 5..8: Verifikasi Target Resmi IK Tata Kelola Internal TW I - TW IV
  for (const tw of quarters) {
    const comp: IkTataKelolaComponentsInput = {
      NES: TARGET_KOMPONEN_TATA_KELOLA_2026.NES[tw],
      NCKI: TARGET_KOMPONEN_TATA_KELOLA_2026.NCKI[tw],
      NSAP: TARGET_KOMPONEN_TATA_KELOLA_2026.NSAP[tw],
      SKM: TARGET_KOMPONEN_TATA_KELOLA_2026.SKM[tw],
    };
    const calc = calculateIkTataKelolaInternal(comp);
    const expected = TARGET_TRIWULAN_IK_TATA_KELOLA_2026[tw];
    const expectedStr = formatDecimal(expected);
    const actualStr = formatDecimal(calc.nilaiIk);
    results.push({
      id: `PK-IK2-${tw}`,
      namaUji: `Verifikasi Target Resmi IK Tata Kelola Internal 2026 (${tw})`,
      rumus: calc.rumusSubstitusi,
      expectedFormatted: expectedStr,
      actualFormatted: actualStr,
      actualPrecise: calc.nilaiIk,
      passed: expectedStr === actualStr,
      keterangan: `Menguji konsistensi 4 komponen target resmi ${tw} terhadap target IK Tata Kelola ${expectedStr}.`,
    });
  }

  // Test 9: Contoh Kasus Spesifikasi Bagian AI (Validasi Perhitungan)
  const sampleAiComp: IkPengawasanComponentsInput = {
    TLP: 78.50,
    EvAKIP: 72.00,
    PPG: 60.00,
    LHKAN: 100.00,
    WBS: 100.00,
    ZI: 80.00,
    APIP: 40.20,
    KPI: 20.00,
  };
  const calcAi = calculateIkPengawasanIntern(sampleAiComp);
  const expectedAi = (78.5 + 72.0 + 60.0 + 100.0 + 100.0 + 80.0 + 40.2 + 20.0) / 8; // 550.7 / 8 = 68.8375
  results.push({
    id: 'SPEC-AI-EXAMPLE',
    namaUji: 'Uji Kasus Dokumen Spesifikasi (Bagian AI - Validasi Perhitungan)',
    rumus: calcAi.rumusSubstitusi,
    expectedFormatted: formatDecimal(expectedAi),
    actualFormatted: formatDecimal(calcAi.nilaiIk),
    actualPrecise: calcAi.nilaiIk,
    passed: Math.abs((calcAi.nilaiIk ?? 0) - expectedAi) < 1e-9,
    keterangan: 'Total 8 komponen = 550,70 dibagi 8 menghasilkan 68,8375 (ditampilkan 68,84).',
  });

  // Test 10: Verifikasi Aturan Realisasi Kosong != 0
  const emptyCheck = formatDecimal(null);
  const targetZeroCheck = formatTargetDecimal(0);
  results.push({
    id: 'RULE-NULL-VS-ZERO',
    namaUji: 'Aturan Pemisahan Target 0 vs Realisasi Belum Tersedia (Null)',
    rumus: 'formatTargetDecimal(0) === "0" && formatDecimal(null) === "Belum tersedia"',
    expectedFormatted: 'Target: 0 | Realisasi: Belum tersedia',
    actualFormatted: `Target: ${targetZeroCheck} | Realisasi: ${emptyCheck}`,
    actualPrecise: null,
    passed: targetZeroCheck === '0' && emptyCheck === 'Belum tersedia',
    keterangan: 'Memastikan sistem tidak mengubah realisasi kosong menjadi angka 0.',
  });

  return results;
}
