export type TriwulanType = 'TW I' | 'TW II' | 'TW III' | 'TW IV';
export type IndikatorType = 'IK_PENGAWASAN' | 'IK_TATA_KELOLA';
export type StatusDataType = 'BELUM_DIINPUT' | 'DRAFT' | 'TERSEDIA' | 'FINAL';
export type RoleType = 'OPERATOR' | 'PIMPINAN';

export type KomponenPengawasanType =
  | 'TLP'
  | 'EvAKIP'
  | 'PPG'
  | 'LHKAN'
  | 'WBS'
  | 'ZI'
  | 'APIP'
  | 'KPI';

export type KomponenTataKelolaType = 'NES' | 'NCKI' | 'NSAP' | 'SKM';

export type KomponenType = KomponenPengawasanType | KomponenTataKelolaType;

export interface KomponenMeta {
  kode: KomponenType;
  nama: string;
  indikator: IndikatorType;
  satuan: string;
  rumusRingkas: string;
  deskripsi: string;
  dalamRumusIndukDikali100: boolean;
}

export const DAFTAR_TRIWULAN: TriwulanType[] = ['TW I', 'TW II', 'TW III', 'TW IV'];
export const DAFTAR_TAHUN_DEFAULT: number[] = [2025, 2026, 2027, 2028, 2029];

export const KOMPONEN_META: Record<KomponenType, KomponenMeta> = {
  TLP: {
    kode: 'TLP',
    nama: 'Persentase hasil rekomendasi pengawasan yang ditindaklanjuti',
    indikator: 'IK_PENGAWASAN',
    satuan: '%',
    rumusRingkas: '[(AUtlb/AUrb×100%) + (AUtli/AUri×100%) + (AUtlk/AUrk×100%) + (AUtls/AUrs×100%)] / 4',
    deskripsi: 'Rata-rata tindak lanjut rekomendasi dari 4 sumber: BPK, Audit Internal (2 thn terakhir), Audit Kinerja (2 thn terakhir), dan SPI (thn terakhir).',
    dalamRumusIndukDikali100: true,
  },
  EvAKIP: {
    kode: 'EvAKIP',
    nama: 'Nilai rata-rata hasil Evaluasi Internal AKIP',
    indikator: 'IK_PENGAWASAN',
    satuan: 'Nilai',
    rumusRingkas: 'Nilai rata-rata hasil Evaluasi Internal AKIP oleh Tim Evaluator Internal AKIP',
    deskripsi: 'Dapat kosong pada triwulan ketika evaluasi belum dilakukan (tidak diubah menjadi 0).',
    dalamRumusIndukDikali100: false,
  },
  PPG: {
    kode: 'PPG',
    nama: 'Indeks Program Pengendalian Gratifikasi di LAN',
    indikator: 'IK_PENGAWASAN',
    satuan: 'Indeks',
    rumusRingkas: '[(PGtl / PGr × 100) + PPGKPK] / 2',
    deskripsi: 'Rata-rata persentase pelaporan gratifikasi tahun berjalan yang telah diproses dan nilai evaluasi PPG KPK terbaru.',
    dalamRumusIndukDikali100: false,
  },
  LHKAN: {
    kode: 'LHKAN',
    nama: 'Persentase kepatuhan pelaporan LHKAN tahun berjalan',
    indikator: 'IK_PENGAWASAN',
    satuan: '%',
    rumusRingkas: 'WLpasn / WLasn × 100%',
    deskripsi: 'Jumlah pelaporan LHKAN tahun berjalan dibagi jumlah wajib lapor LHKAN tahun berjalan dikali 100%.',
    dalamRumusIndukDikali100: true,
  },
  WBS: {
    kode: 'WBS',
    nama: 'Persentase pelaporan pelanggaran tahun berjalan yang ditindaklanjuti',
    indikator: 'IK_PENGAWASAN',
    satuan: '%',
    rumusRingkas: 'WBSvr / WBSlp × 100%',
    deskripsi: 'Jumlah pelaporan pelanggaran tahun berjalan yang masuk ke Inspektorat dan ditindaklanjuti dibagi jumlah laporan masuk dikali 100%.',
    dalamRumusIndukDikali100: true,
  },
  ZI: {
    kode: 'ZI',
    nama: 'Kualitas pembangunan Zona Integritas',
    indikator: 'IK_PENGAWASAN',
    satuan: 'Nilai',
    rumusRingkas: 'Nilai rata-rata evaluasi pembangunan Zona Integritas oleh Tim Penilai Internal',
    deskripsi: 'Menggunakan nilai evaluasi terbaru yang relevan dengan periode berjalan.',
    dalamRumusIndukDikali100: false,
  },
  APIP: {
    kode: 'APIP',
    nama: 'Nilai Kapabilitas APIP LAN',
    indikator: 'IK_PENGAWASAN',
    satuan: 'Nilai',
    rumusRingkas: 'Hasil terbaru penilaian BPKP terkait penerapan tata kelola APIP di LAN (APIP × 100)',
    deskripsi: 'Menggunakan nilai terbaru yang berlaku pada periode tersebut.',
    dalamRumusIndukDikali100: true,
  },
  KPI: {
    kode: 'KPI',
    nama: 'Persentase pemenuhan kebijakan pengawasan internal',
    indikator: 'IK_PENGAWASAN',
    satuan: '%',
    rumusRingkas: 'Kr / Kt × 100%',
    deskripsi: 'Jumlah rumusan kebijakan pengawasan internal yang siap dibahas/ditetapkan (2025 s.d. tahun berjalan) dibagi total rencana s.d. 2029.',
    dalamRumusIndukDikali100: true,
  },
  NES: {
    kode: 'NES',
    nama: 'Nilai Evaluasi SAKIP',
    indikator: 'IK_TATA_KELOLA',
    satuan: 'Nilai',
    rumusRingkas: 'Nilai mutakhir hasil evaluasi internal SAKIP pada unit Inspektorat',
    deskripsi: 'Nilai mutakhir hasil evaluasi internal Sistem Akuntabilitas Instansi Pemerintah pada unit Inspektorat.',
    dalamRumusIndukDikali100: false,
  },
  NCKI: {
    kode: 'NCKI',
    nama: 'Nilai Capaian Keluaran Inspektorat',
    indikator: 'IK_TATA_KELOLA',
    satuan: 'Nilai',
    rumusRingkas: '[(Realisasi Anggaran / Rencana Penarikan) + (Realisasi Output / Rencana Output)] / 2 × 100',
    deskripsi: 'Rata-rata rasio penyerapan anggaran terhadap rencana penarikan dan rasio capaian output terhadap rencana capaian output dikali 100.',
    dalamRumusIndukDikali100: false,
  },
  NSAP: {
    kode: 'NSAP',
    nama: 'Nilai hasil pengawasan kearsipan internal',
    indikator: 'IK_TATA_KELOLA',
    satuan: 'Nilai',
    rumusRingkas: 'Nilai hasil pengawasan kearsipan internal unit Inspektorat oleh Tim Pengawas Kearsipan Internal',
    deskripsi: 'Hasil evaluasi pengawasan kearsipan internal pada unit Inspektorat.',
    dalamRumusIndukDikali100: false,
  },
  SKM: {
    kode: 'SKM',
    nama: 'Indeks kepuasan pengguna layanan Inspektorat',
    indikator: 'IK_TATA_KELOLA',
    satuan: 'Indeks',
    rumusRingkas: 'Indeks kepuasan pengguna layanan Inspektorat berdasarkan survei kepuasan pengguna layanan',
    deskripsi: 'Hasil survei kepuasan masyarakat/pengguna layanan pengawasan internal Inspektorat LAN.',
    dalamRumusIndukDikali100: false,
  },
};

// O. TARGET TAHUNAN RESMI 2026
export const TARGET_TAHUNAN_2026: Record<IndikatorType, number> = {
  IK_PENGAWASAN: 76.50,
  IK_TATA_KELOLA: 87.80,
};

// P. TARGET TRIWULAN RESMI 2026 - IK PENGAWASAN INTERN LAN
export const TARGET_TRIWULAN_IK_PENGAWASAN_2026: Record<TriwulanType, number> = {
  'TW I': 32.28,
  'TW II': 57.09,
  'TW III': 67.81,
  'TW IV': 76.50,
};

export const TARGET_KOMPONEN_PENGAWASAN_2026: Record<KomponenPengawasanType, Record<TriwulanType, number>> = {
  TLP: { 'TW I': 68.50, 'TW II': 66.50, 'TW III': 80.25, 'TW IV': 89.80 },
  EvAKIP: { 'TW I': 0, 'TW II': 0, 'TW III': 72.00, 'TW IV': 72.00 },
  PPG: { 'TW I': 50.00, 'TW II': 50.00, 'TW III': 50.00, 'TW IV': 90.00 },
  LHKAN: { 'TW I': 99.50, 'TW II': 100.00, 'TW III': 100.00, 'TW IV': 100.00 },
  WBS: { 'TW I': 0, 'TW II': 100.00, 'TW III': 100.00, 'TW IV': 100.00 },
  ZI: { 'TW I': 0, 'TW II': 80.00, 'TW III': 80.00, 'TW IV': 80.00 },
  APIP: { 'TW I': 40.20, 'TW II': 40.20, 'TW III': 40.20, 'TW IV': 40.20 },
  KPI: { 'TW I': 0, 'TW II': 20.00, 'TW III': 20.00, 'TW IV': 40.00 },
};

// Q. TARGET TRIWULAN RESMI 2026 - IK TATA KELOLA INTERNAL INSPEKTORAT
export const TARGET_TRIWULAN_IK_TATA_KELOLA_2026: Record<TriwulanType, number> = {
  'TW I': 24.75,
  'TW II': 24.75,
  'TW III': 45.25,
  'TW IV': 87.80,
};

export const TARGET_KOMPONEN_TATA_KELOLA_2026: Record<KomponenTataKelolaType, Record<TriwulanType, number>> = {
  NES: { 'TW I': 0, 'TW II': 0, 'TW III': 82.00, 'TW IV': 82.00 },
  NCKI: { 'TW I': 99.00, 'TW II': 99.00, 'TW III': 99.00, 'TW IV': 99.00 },
  NSAP: { 'TW I': 0, 'TW II': 0, 'TW III': 0, 'TW IV': 87.20 },
  SKM: { 'TW I': 0, 'TW II': 0, 'TW III': 0, 'TW IV': 83.00 },
};
