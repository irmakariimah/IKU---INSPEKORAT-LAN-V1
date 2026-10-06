import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. TABEL USERS
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  nama: text('nama').notNull().default('Operator Inspektorat LAN'),
  role: text('role').notNull().default('OPERATOR'), // 'OPERATOR' | 'PIMPINAN'
  unitKerja: text('unit_kerja').notNull().default('Inspektorat LAN'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 2. TABEL PERIODS
export const periods = pgTable('periods', {
  id: serial('id').primaryKey(),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(), // 'TW I' | 'TW II' | 'TW III' | 'TW IV'
  statusPeriode: text('status_periode').notNull().default('DRAFT'), // 'BELUM_DIINPUT' | 'DRAFT' | 'TERSEDIA' | 'FINAL'
  isLocked: boolean('is_locked').notNull().default(false),
  catatanFinalisasi: text('catatan_finalisasi'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 3. TABEL INDICATOR_TARGETS (Target Induk IK)
export const indicatorTargets = pgTable('indicator_targets', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(), // 'TW I' | 'TW II' | 'TW III' | 'TW IV'
  indikatorKode: text('indikator_kode').notNull(), // 'IK_PENGAWASAN' | 'IK_TATA_KELOLA'
  indikatorNama: text('indikator_nama').notNull(),
  targetTahunan: doublePrecision('target_tahunan').notNull(),
  targetTriwulan: doublePrecision('target_triwulan').notNull(),
  sumberDokumen: text('sumber_dokumen').default('Perjanjian Kinerja Inspektur LAN Tahun 2026'),
  isOfficial: boolean('is_official').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 4. TABEL SUBINDICATOR_TARGETS (Target Setiap Komponen)
export const subindicatorTargets = pgTable('subindicator_targets', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  indikatorKode: text('indikator_kode').notNull(), // 'IK_PENGAWASAN' | 'IK_TATA_KELOLA'
  komponenKode: text('komponen_kode').notNull(), // 'TLP'|'EvAKIP'|'PPG'|'LHKAN'|'WBS'|'ZI'|'APIP'|'KPI'|'NES'|'NCKI'|'NSAP'|'SKM'
  komponenNama: text('komponen_nama').notNull(),
  targetNilai: doublePrecision('target_nilai').notNull(),
  satuan: text('satuan').notNull().default('Nilai/Persen'),
  isOfficial: boolean('is_official').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 5. TABEL IKU_REALIZATIONS (Rekapitulasi Realisasi Komponen & Indikator per Periode)
export const ikuRealizations = pgTable('iku_realizations', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  indikatorKode: text('indikator_kode').notNull(),
  komponenKode: text('komponen_kode').notNull(),
  nilaiRealisasi: doublePrecision('nilai_realisasi'), // Nullable! Kosong != 0
  statusData: text('status_data').notNull().default('BELUM_DIINPUT'), // 'BELUM_DIINPUT' | 'DRAFT' | 'TERSEDIA' | 'FINAL'
  isSampleData: boolean('is_sample_data').notNull().default(false),
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 6. TABEL TL_BPK (Sumber 1 TLP: Rekomendasi BPK)
export const tlBpk = pgTable('tl_bpk', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  totalRekomendasi: doublePrecision('total_rekomendasi').notNull(), // AUrb
  sesuaiRekomendasi: doublePrecision('sesuai_rekomendasi').notNull(),
  tidakDapatDitindaklanjutiSah: doublePrecision('tidak_dapat_ditindaklanjuti_sah').notNull(),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 7. TABEL TL_AUDIT_INTERNAL (Sumber 2 TLP: Audit Internal 2 Tahun Terakhir)
export const tlAuditInternal = pgTable('tl_audit_internal', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  tahunLha: integer('tahun_lha').notNull(), // 2 tahun terakhir (misal 2024, 2025 untuk periode 2026, atau 2025-2026)
  unitSatker: text('unit_satker').notNull(),
  totalRekomendasi: doublePrecision('total_rekomendasi').notNull(), // AUri
  sesuaiRekomendasi: doublePrecision('sesuai_rekomendasi').notNull(), // AUtli
  belumSesuai: doublePrecision('belum_sesuai').notNull().default(0),
  belumDitindaklanjuti: doublePrecision('belum_ditindaklanjuti').notNull().default(0),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 8. TABEL TL_AUDIT_KINERJA (Sumber 3 TLP: Audit Kinerja Program 2 Tahun Terakhir)
export const tlAuditKinerja = pgTable('tl_audit_kinerja', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  tahunLha: integer('tahun_lha').notNull(), // 2 tahun terakhir
  programUnit: text('program_unit').notNull(),
  totalRekomendasi: doublePrecision('total_rekomendasi').notNull(), // AUrk
  sesuaiRekomendasi: doublePrecision('sesuai_rekomendasi').notNull(), // AUtlk
  belumSesuai: doublePrecision('belum_sesuai').notNull().default(0),
  belumDitindaklanjuti: doublePrecision('belum_ditindaklanjuti').notNull().default(0),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 9. TABEL TL_SPI (Sumber 4 TLP: Survei Penilaian Integritas Tahun Terakhir)
export const tlSpi = pgTable('tl_spi', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  tahunSpi: integer('tahun_spi').notNull(), // Tahun terakhir
  totalRekomendasi: doublePrecision('total_rekomendasi').notNull(), // AUrs
  sesuaiRekomendasi: doublePrecision('sesuai_rekomendasi').notNull(),
  telahDivalidasiKpk: doublePrecision('telah_divalidasi_kpk').notNull(), // AUtls (sesuai & telah divalidasi KPK)
  statusTindakLanjut: text('status_tindak_lanjut').notNull().default('Sesuai & Tervalidasi KPK'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 10. TABEL EVAKIP (Nilai Rata-rata Hasil Evaluasi Internal AKIP)
export const evakip = pgTable('evakip', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  nilaiEvakip: doublePrecision('nilai_evakip'), // Nullable! Jangan ubah nilai kosong menjadi 0
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 11. TABEL PPG (Indeks Program Pengendalian Gratifikasi di LAN)
export const ppg = pgTable('ppg', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  totalPelaporanGratifikasi: doublePrecision('total_pelaporan_gratifikasi').notNull(), // PGr
  pelaporanDiproses: doublePrecision('pelaporan_diproses').notNull(), // PGtl
  nilaiPpgKpk: doublePrecision('nilai_ppg_kpk').notNull(), // PPGKPK
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 12. TABEL LHKAN (Persentase Kepatuhan Pelaporan LHKAN Tahun Berjalan)
export const lhkan = pgTable('lhkan', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  unitKerja: text('unit_kerja').notNull(),
  jenisLaporan: text('jenis_laporan').notNull(), // LHKPN / LHKASN / SPT
  jumlahWajibLapor: doublePrecision('jumlah_wajib_lapor').notNull(), // WLasn
  jumlahSudahLapor: doublePrecision('jumlah_sudah_lapor').notNull(), // WLpasn
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 13. TABEL WBS (Persentase Pelaporan Pelanggaran Tahun Berjalan yang Ditindaklanjuti)
export const wbs = pgTable('wbs', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  nomorLaporan: text('nomor_laporan').notNull(),
  tanggal: text('tanggal').notNull(),
  jenisPelaporan: text('jenis_pelaporan').notNull(),
  statusVerifikasi: text('status_verifikasi').notNull(), // 'Terverifikasi' | 'Proses Verifikasi' | 'Tidak Memenuhi Syarat'
  statusTindakLanjut: text('status_tindak_lanjut').notNull(), // 'Ditindaklanjuti' | 'Belum Ditindaklanjuti' | 'Selesai'
  isDitindaklanjuti: boolean('is_ditindaklanjuti').notNull().default(true), // WBSvr flag
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 14. TABEL ZI (Kualitas Pembangunan Zona Integritas)
export const zi = pgTable('zi', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  nilaiEvaluasiZi: doublePrecision('nilai_evaluasi_zi'), // Nullable
  sumberEvaluasi: text('sumber_evaluasi'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 15. TABEL APIP (Nilai Kapabilitas APIP LAN)
export const apip = pgTable('apip', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  nilaiKapabilitasApip: doublePrecision('nilai_kapabilitas_apip'), // Nullable
  tahunPeriodePenilaian: text('tahun_periode_penilaian').notNull(),
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 16. TABEL KPI (Persentase Pemenuhan Kebijakan Pengawasan Internal 2025-2029)
export const kpi = pgTable('kpi', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  krJumlah: doublePrecision('kr_jumlah').notNull(), // Rumusan kebijakan siap dibahas/ditetapkan 2025 s.d. tahun berjalan
  ktTotal2029: doublePrecision('kt_total_2029').notNull(), // Total rumusan kebijakan direncanakan s.d. 2029
  daftarKebijakan: text('daftar_kebijakan').notNull(), // Nama/Judul Kebijakan atau JSON daftar kebijakan
  statusKebijakan: text('status_kebijakan').notNull(), // 'Direncanakan' | 'Penyusunan' | 'Siap Dibahas' | 'Ditetapkan'
  tahunTarget: integer('tahun_target').notNull(), // 2025..2029
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 17. TABEL NES (Nilai Evaluasi SAKIP - Tata Kelola Internal)
export const nes = pgTable('nes', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  nilaiNes: doublePrecision('nilai_nes'), // Nullable
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 18. TABEL NCKI (Nilai Capaian Keluaran Inspektorat - Tata Kelola Internal)
export const ncki = pgTable('ncki', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  rencanaPenarikanAnggaran: doublePrecision('rencana_penarikan_anggaran').notNull(),
  realisasiAnggaran: doublePrecision('realisasi_anggaran').notNull(),
  rencanaCapaianOutput: doublePrecision('rencana_capaian_output').notNull(),
  realisasiCapaianOutput: doublePrecision('realisasi_capaian_output').notNull(),
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 19. TABEL NSAP (Nilai Hasil Pengawasan Kearsipan Internal - Tata Kelola Internal)
export const nsap = pgTable('nsap', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  nilaiNsap: doublePrecision('nilai_nsap'), // Nullable
  sumberDokumen: text('sumber_dokumen'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 20. TABEL SKM (Indeks Kepuasan Pengguna Layanan Inspektorat - Tata Kelola Internal)
export const skm = pgTable('skm', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  nilaiSkm: doublePrecision('nilai_skm'), // Nullable
  jumlahResponden: integer('jumlah_responden').notNull().default(0),
  periodeSurvei: text('periode_survei').notNull(),
  sumberData: text('sumber_data'),
  keterangan: text('keterangan'),
  statusData: text('status_data').notNull().default('DRAFT'),
  isSampleData: boolean('is_sample_data').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// 21. TABEL CHANGE_LOGS (Riwayat Perubahan Data & Audit Trail)
export const changeLogs = pgTable('change_logs', {
  id: serial('id').primaryKey(),
  periodId: integer('period_id').references(() => periods.id),
  tahun: integer('tahun').notNull(),
  triwulan: text('triwulan').notNull(),
  tanggal: text('tanggal').notNull(),
  waktu: text('waktu').notNull(),
  userNama: text('user_nama').notNull(),
  userEmail: text('user_email').notNull(),
  indikator: text('indikator').notNull(),
  komponen: text('komponen').notNull(),
  nilaiSebelum: text('nilai_sebelum').notNull(),
  nilaiSesudah: text('nilai_sesudah').notNull(),
  keterangan: text('keterangan'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  updatedBy: integer('updated_by').references(() => users.id),
});

// RELATIONS
export const usersRelations = relations(users, ({ many }) => ({
  periodsCreated: many(periods),
  changeLogsCreated: many(changeLogs),
}));

export const periodsRelations = relations(periods, ({ one, many }) => ({
  creator: one(users, {
    fields: [periods.createdBy],
    references: [users.id],
  }),
  indicatorTargets: many(indicatorTargets),
  subindicatorTargets: many(subindicatorTargets),
  ikuRealizations: many(ikuRealizations),
  tlBpk: many(tlBpk),
  tlAuditInternal: many(tlAuditInternal),
  tlAuditKinerja: many(tlAuditKinerja),
  tlSpi: many(tlSpi),
  evakip: many(evakip),
  ppg: many(ppg),
  lhkan: many(lhkan),
  wbs: many(wbs),
  zi: many(zi),
  apip: many(apip),
  kpi: many(kpi),
  nes: many(nes),
  ncki: many(ncki),
  nsap: many(nsap),
  skm: many(skm),
  changeLogs: many(changeLogs),
}));
