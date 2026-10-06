import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  apip,
  evakip,
  indicatorTargets,
  kpi,
  lhkan,
  ncki,
  nes,
  nsap,
  periods,
  ppg,
  skm,
  subindicatorTargets,
  tlAuditInternal,
  tlAuditKinerja,
  tlBpk,
  tlSpi,
  wbs,
  zi,
} from './schema.ts';
import {
  getOrCreatePeriod,
  logChange,
  recalculateAndPersistPeriod,
  formatDecimal,
} from './repository.ts';

export interface UserContext {
  id: number;
  uid: string;
  email: string;
  nama: string;
  role: string;
}

async function assertEditable(tahun: number, triwulan: string, user: UserContext, allowFinalOverride = false) {
  if (user.role === 'PIMPINAN') {
    throw new Error('Akses ditolak: Role Pimpinan hanya memiliki hak baca (lihat dashboard & laporan) dan tidak dapat mengubah data.');
  }
  const period = await getOrCreatePeriod(tahun, triwulan, user.id);
  if (period.isLocked && !allowFinalOverride) {
    throw new Error(
      `Periode ${tahun} ${triwulan} telah berstatus FINAL dan dikunci. Buka kunci periode terlebih dahulu dengan mekanisme otorisasi khusus jika ingin melakukan revisi.`
    );
  }
  return period;
}

// 1. Simpan Data BPK
export async function saveTlBpk(
  tahun: number,
  triwulan: string,
  payload: {
    totalRekomendasi: number;
    sesuaiRekomendasi: number;
    tidakDapatDitindaklanjutiSah: number;
    sumberDokumen?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(tlBpk)
      .where(and(eq(tlBpk.tahun, tahun), eq(tlBpk.triwulan, triwulan)))
      .orderBy(desc(tlBpk.id));

    const prevText =
      existing.length > 0
        ? `Total=${existing[0].totalRekomendasi}, Sesuai=${existing[0].sesuaiRekomendasi}, TDD Sah=${existing[0].tidakDapatDitindaklanjutiSah}`
        : 'Belum diinput';

    // Hapus data lama periode ini (atau sample data) dan simpan data resmi baru
    await db
      .delete(tlBpk)
      .where(and(eq(tlBpk.tahun, tahun), eq(tlBpk.triwulan, triwulan)));

    await db.insert(tlBpk).values({
      periodId: period.id,
      tahun,
      triwulan,
      totalRekomendasi: Number(payload.totalRekomendasi),
      sesuaiRekomendasi: Number(payload.sesuaiRekomendasi),
      tidakDapatDitindaklanjutiSah: Number(payload.tidakDapatDitindaklanjutiSah),
      sumberDokumen: payload.sumberDokumen || 'LHP BPK RI',
      keterangan: payload.keterangan || '',
      statusData: payload.statusData || 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    const newRatio =
      payload.totalRekomendasi > 0
        ? ((Number(payload.sesuaiRekomendasi) + Number(payload.tidakDapatDitindaklanjutiSah)) /
            Number(payload.totalRekomendasi)) *
          100
        : 0;

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'TLP - BPK',
      nilaiSebelum: prevText,
      nilaiSesudah: `Total=${payload.totalRekomendasi}, Sesuai=${payload.sesuaiRekomendasi}, TDD Sah=${payload.tidakDapatDitindaklanjutiSah} (${formatDecimal(newRatio)}%)`,
      keterangan: payload.keterangan || 'Input/pembaruan data rekomendasi BPK',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveTlBpk:', error);
    throw new Error(error.message || 'Gagal menyimpan data TLP BPK.', { cause: error });
  }
}

// 2. Tambah / Update / Hapus Baris Audit Internal (2 Tahun Terakhir)
export async function addTlAuditInternalRow(
  tahun: number,
  triwulan: string,
  payload: {
    tahunLha: number;
    unitSatker: string;
    totalRekomendasi: number;
    sesuaiRekomendasi: number;
    belumSesuai: number;
    belumDitindaklanjuti: number;
    sumberDokumen?: string;
    keterangan?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);

    // Jika sebelumnya hanya berisi sample data pada periode ini, bersihkan sample data saat operator mulai input resmi
    await db
      .delete(tlAuditInternal)
      .where(
        and(
          eq(tlAuditInternal.tahun, tahun),
          eq(tlAuditInternal.triwulan, triwulan),
          eq(tlAuditInternal.isSampleData, true)
        )
      );

    await db.insert(tlAuditInternal).values({
      periodId: period.id,
      tahun,
      triwulan,
      tahunLha: Number(payload.tahunLha),
      unitSatker: payload.unitSatker,
      totalRekomendasi: Number(payload.totalRekomendasi),
      sesuaiRekomendasi: Number(payload.sesuaiRekomendasi),
      belumSesuai: Number(payload.belumSesuai || 0),
      belumDitindaklanjuti: Number(payload.belumDitindaklanjuti || 0),
      sumberDokumen: payload.sumberDokumen || `LHA Audit Internal ${payload.tahunLha}`,
      keterangan: payload.keterangan || '',
      statusData: 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'TLP - Audit Internal',
      nilaiSebelum: 'Penambahan baris LHA',
      nilaiSesudah: `LHA ${payload.tahunLha} (${payload.unitSatker}): Sesuai ${payload.sesuaiRekomendasi}/${payload.totalRekomendasi}`,
      keterangan: payload.keterangan || 'Tambah data Audit Internal (2 tahun terakhir)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in addTlAuditInternalRow:', error);
    throw new Error(error.message || 'Gagal menambah data Audit Internal.', { cause: error });
  }
}

export async function deleteTlAuditInternalRow(id: number, user: UserContext) {
  try {
    const rows = await db.select().from(tlAuditInternal).where(eq(tlAuditInternal.id, id));
    if (rows.length === 0) return;
    const row = rows[0];
    await assertEditable(row.tahun, row.triwulan, user);

    await db.delete(tlAuditInternal).where(eq(tlAuditInternal.id, id));

    await logChange({
      tahun: row.tahun,
      triwulan: row.triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'TLP - Audit Internal',
      nilaiSebelum: `LHA ${row.tahunLha} (${row.unitSatker}): ${row.sesuaiRekomendasi}/${row.totalRekomendasi}`,
      nilaiSesudah: 'Dihapus',
      keterangan: 'Penghapusan baris data Audit Internal',
    });

    await recalculateAndPersistPeriod(row.tahun, row.triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in deleteTlAuditInternalRow:', error);
    throw new Error(error.message || 'Gagal menghapus data Audit Internal.', { cause: error });
  }
}

// 3. Tambah / Hapus Baris Audit Kinerja Program (2 Tahun Terakhir)
export async function addTlAuditKinerjaRow(
  tahun: number,
  triwulan: string,
  payload: {
    tahunLha: number;
    programUnit: string;
    totalRekomendasi: number;
    sesuaiRekomendasi: number;
    belumSesuai: number;
    belumDitindaklanjuti: number;
    sumberDokumen?: string;
    keterangan?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);

    await db
      .delete(tlAuditKinerja)
      .where(
        and(
          eq(tlAuditKinerja.tahun, tahun),
          eq(tlAuditKinerja.triwulan, triwulan),
          eq(tlAuditKinerja.isSampleData, true)
        )
      );

    await db.insert(tlAuditKinerja).values({
      periodId: period.id,
      tahun,
      triwulan,
      tahunLha: Number(payload.tahunLha),
      programUnit: payload.programUnit,
      totalRekomendasi: Number(payload.totalRekomendasi),
      sesuaiRekomendasi: Number(payload.sesuaiRekomendasi),
      belumSesuai: Number(payload.belumSesuai || 0),
      belumDitindaklanjuti: Number(payload.belumDitindaklanjuti || 0),
      sumberDokumen: payload.sumberDokumen || `LHA Audit Kinerja ${payload.tahunLha}`,
      keterangan: payload.keterangan || '',
      statusData: 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'TLP - Audit Kinerja',
      nilaiSebelum: 'Penambahan baris LHA',
      nilaiSesudah: `LHA ${payload.tahunLha} (${payload.programUnit}): Sesuai ${payload.sesuaiRekomendasi}/${payload.totalRekomendasi}`,
      keterangan: payload.keterangan || 'Tambah data Audit Kinerja Program (2 tahun terakhir)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in addTlAuditKinerjaRow:', error);
    throw new Error(error.message || 'Gagal menambah data Audit Kinerja.', { cause: error });
  }
}

export async function deleteTlAuditKinerjaRow(id: number, user: UserContext) {
  try {
    const rows = await db.select().from(tlAuditKinerja).where(eq(tlAuditKinerja.id, id));
    if (rows.length === 0) return;
    const row = rows[0];
    await assertEditable(row.tahun, row.triwulan, user);

    await db.delete(tlAuditKinerja).where(eq(tlAuditKinerja.id, id));

    await logChange({
      tahun: row.tahun,
      triwulan: row.triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'TLP - Audit Kinerja',
      nilaiSebelum: `LHA ${row.tahunLha} (${row.programUnit}): ${row.sesuaiRekomendasi}/${row.totalRekomendasi}`,
      nilaiSesudah: 'Dihapus',
      keterangan: 'Penghapusan baris data Audit Kinerja',
    });

    await recalculateAndPersistPeriod(row.tahun, row.triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in deleteTlAuditKinerjaRow:', error);
    throw new Error(error.message || 'Gagal menghapus data Audit Kinerja.', { cause: error });
  }
}

// 4. Simpan Data SPI (Tahun Terakhir)
export async function saveTlSpi(
  tahun: number,
  triwulan: string,
  payload: {
    tahunSpi: number;
    totalRekomendasi: number;
    sesuaiRekomendasi: number;
    telahDivalidasiKpk: number;
    statusTindakLanjut: string;
    sumberDokumen?: string;
    keterangan?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(tlSpi)
      .where(and(eq(tlSpi.tahun, tahun), eq(tlSpi.triwulan, triwulan)));

    const prevText =
      existing.length > 0
        ? `SPI ${existing[0].tahunSpi}: Validasi KPK=${existing[0].telahDivalidasiKpk}/${existing[0].totalRekomendasi}`
        : 'Belum diinput';

    await db
      .delete(tlSpi)
      .where(and(eq(tlSpi.tahun, tahun), eq(tlSpi.triwulan, triwulan)));

    await db.insert(tlSpi).values({
      periodId: period.id,
      tahun,
      triwulan,
      tahunSpi: Number(payload.tahunSpi),
      totalRekomendasi: Number(payload.totalRekomendasi),
      sesuaiRekomendasi: Number(payload.sesuaiRekomendasi),
      telahDivalidasiKpk: Number(payload.telahDivalidasiKpk),
      statusTindakLanjut: payload.statusTindakLanjut || 'Sesuai & Tervalidasi KPK',
      sumberDokumen: payload.sumberDokumen || `Laporan SPI KPK ${payload.tahunSpi}`,
      keterangan: payload.keterangan || '',
      statusData: 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'TLP - SPI',
      nilaiSebelum: prevText,
      nilaiSesudah: `SPI ${payload.tahunSpi}: Sesuai=${payload.sesuaiRekomendasi}, Validasi KPK=${payload.telahDivalidasiKpk}/${payload.totalRekomendasi}`,
      keterangan: payload.keterangan || 'Input/pembaruan data rekomendasi SPI',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveTlSpi:', error);
    throw new Error(error.message || 'Gagal menyimpan data TLP SPI.', { cause: error });
  }
}

// 5. Simpan EvAKIP (mendukung nilai kosong / null)
export async function saveEvakip(
  tahun: number,
  triwulan: string,
  payload: {
    nilaiEvakip: number | null; // null jika evaluasi belum dilakukan!
    sumberDokumen?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(evakip)
      .where(and(eq(evakip.tahun, tahun), eq(evakip.triwulan, triwulan)));

    const prevText =
      existing.length > 0 && existing[0].nilaiEvakip !== null
        ? formatDecimal(existing[0].nilaiEvakip)
        : 'Belum tersedia';

    await db
      .delete(evakip)
      .where(and(eq(evakip.tahun, tahun), eq(evakip.triwulan, triwulan)));

    if (payload.nilaiEvakip !== null && payload.nilaiEvakip !== undefined) {
      await db.insert(evakip).values({
        periodId: period.id,
        tahun,
        triwulan,
        nilaiEvakip: Number(payload.nilaiEvakip),
        sumberDokumen: payload.sumberDokumen || 'LHE Evaluasi Internal AKIP',
        keterangan: payload.keterangan || '',
        statusData: payload.statusData || 'TERSEDIA',
        isSampleData: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'EvAKIP',
      nilaiSebelum: prevText,
      nilaiSesudah:
        payload.nilaiEvakip !== null ? formatDecimal(payload.nilaiEvakip) : 'Belum tersedia (Kosong)',
      keterangan: payload.keterangan || 'Pembaruan data Evaluasi Internal AKIP',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveEvakip:', error);
    throw new Error(error.message || 'Gagal menyimpan data EvAKIP.', { cause: error });
  }
}

// 6. Simpan PPG
export async function savePpg(
  tahun: number,
  triwulan: string,
  payload: {
    totalPelaporanGratifikasi: number;
    pelaporanDiproses: number;
    nilaiPpgKpk: number;
    sumberDokumen?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(ppg)
      .where(and(eq(ppg.tahun, tahun), eq(ppg.triwulan, triwulan)));

    const prevText =
      existing.length > 0
        ? `PGtl=${existing[0].pelaporanDiproses}/${existing[0].totalPelaporanGratifikasi}, PPGKPK=${existing[0].nilaiPpgKpk}`
        : 'Belum diinput';

    await db
      .delete(ppg)
      .where(and(eq(ppg.tahun, tahun), eq(ppg.triwulan, triwulan)));

    await db.insert(ppg).values({
      periodId: period.id,
      tahun,
      triwulan,
      totalPelaporanGratifikasi: Number(payload.totalPelaporanGratifikasi),
      pelaporanDiproses: Number(payload.pelaporanDiproses),
      nilaiPpgKpk: Number(payload.nilaiPpgKpk),
      sumberDokumen: payload.sumberDokumen || 'Laporan UPG & Evaluasi KPK',
      keterangan: payload.keterangan || '',
      statusData: payload.statusData || 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'PPG',
      nilaiSebelum: prevText,
      nilaiSesudah: `PGtl=${payload.pelaporanDiproses}/${payload.totalPelaporanGratifikasi}, PPGKPK=${payload.nilaiPpgKpk}`,
      keterangan: payload.keterangan || 'Pembaruan data Indeks Pengendalian Gratifikasi (PPG)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in savePpg:', error);
    throw new Error(error.message || 'Gagal menyimpan data PPG.', { cause: error });
  }
}

// 7. Tambah / Hapus Baris LHKAN
export async function addLhkanRow(
  tahun: number,
  triwulan: string,
  payload: {
    unitKerja: string;
    jenisLaporan: string;
    jumlahWajibLapor: number;
    jumlahSudahLapor: number;
    sumberDokumen?: string;
    keterangan?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);

    await db
      .delete(lhkan)
      .where(
        and(
          eq(lhkan.tahun, tahun),
          eq(lhkan.triwulan, triwulan),
          eq(lhkan.isSampleData, true)
        )
      );

    await db.insert(lhkan).values({
      periodId: period.id,
      tahun,
      triwulan,
      unitKerja: payload.unitKerja,
      jenisLaporan: payload.jenisLaporan,
      jumlahWajibLapor: Number(payload.jumlahWajibLapor),
      jumlahSudahLapor: Number(payload.jumlahSudahLapor),
      sumberDokumen: payload.sumberDokumen || 'Rekap Kepatuhan LHKAN',
      keterangan: payload.keterangan || '',
      statusData: 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'LHKAN',
      nilaiSebelum: 'Penambahan baris unit kerja',
      nilaiSesudah: `${payload.unitKerja} (${payload.jenisLaporan}): ${payload.jumlahSudahLapor}/${payload.jumlahWajibLapor}`,
      keterangan: payload.keterangan || 'Input kepatuhan pelaporan LHKAN',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in addLhkanRow:', error);
    throw new Error(error.message || 'Gagal menambah data LHKAN.', { cause: error });
  }
}

export async function deleteLhkanRow(id: number, user: UserContext) {
  try {
    const rows = await db.select().from(lhkan).where(eq(lhkan.id, id));
    if (rows.length === 0) return;
    const row = rows[0];
    await assertEditable(row.tahun, row.triwulan, user);

    await db.delete(lhkan).where(eq(lhkan.id, id));

    await logChange({
      tahun: row.tahun,
      triwulan: row.triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'LHKAN',
      nilaiSebelum: `${row.unitKerja}: ${row.jumlahSudahLapor}/${row.jumlahWajibLapor}`,
      nilaiSesudah: 'Dihapus',
      keterangan: 'Penghapusan baris LHKAN',
    });

    await recalculateAndPersistPeriod(row.tahun, row.triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in deleteLhkanRow:', error);
    throw new Error(error.message || 'Gagal menghapus data LHKAN.', { cause: error });
  }
}

// 8. Tambah / Hapus Baris WBS
export async function addWbsRow(
  tahun: number,
  triwulan: string,
  payload: {
    nomorLaporan: string;
    tanggal: string;
    jenisPelaporan: string;
    statusVerifikasi: string;
    statusTindakLanjut: string;
    isDitindaklanjuti: boolean;
    sumberDokumen?: string;
    keterangan?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);

    await db
      .delete(wbs)
      .where(
        and(eq(wbs.tahun, tahun), eq(wbs.triwulan, triwulan), eq(wbs.isSampleData, true))
      );

    await db.insert(wbs).values({
      periodId: period.id,
      tahun,
      triwulan,
      nomorLaporan: payload.nomorLaporan,
      tanggal: payload.tanggal,
      jenisPelaporan: payload.jenisPelaporan,
      statusVerifikasi: payload.statusVerifikasi,
      statusTindakLanjut: payload.statusTindakLanjut,
      isDitindaklanjuti: Boolean(payload.isDitindaklanjuti),
      sumberDokumen: payload.sumberDokumen || 'Register WBS Inspektorat',
      keterangan: payload.keterangan || '',
      statusData: 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'WBS',
      nilaiSebelum: 'Penambahan laporan WBS',
      nilaiSesudah: `${payload.nomorLaporan} (${payload.jenisPelaporan}) - ${payload.statusTindakLanjut}`,
      keterangan: payload.keterangan || 'Input laporan pelanggaran WBS',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in addWbsRow:', error);
    throw new Error(error.message || 'Gagal menambah data WBS.', { cause: error });
  }
}

export async function deleteWbsRow(id: number, user: UserContext) {
  try {
    const rows = await db.select().from(wbs).where(eq(wbs.id, id));
    if (rows.length === 0) return;
    const row = rows[0];
    await assertEditable(row.tahun, row.triwulan, user);

    await db.delete(wbs).where(eq(wbs.id, id));

    await logChange({
      tahun: row.tahun,
      triwulan: row.triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'WBS',
      nilaiSebelum: `${row.nomorLaporan} - ${row.statusTindakLanjut}`,
      nilaiSesudah: 'Dihapus',
      keterangan: 'Penghapusan laporan WBS',
    });

    await recalculateAndPersistPeriod(row.tahun, row.triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in deleteWbsRow:', error);
    throw new Error(error.message || 'Gagal menghapus data WBS.', { cause: error });
  }
}

// 9. Simpan ZI
export async function saveZi(
  tahun: number,
  triwulan: string,
  payload: {
    nilaiEvaluasiZi: number | null;
    sumberEvaluasi?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(zi)
      .where(and(eq(zi.tahun, tahun), eq(zi.triwulan, triwulan)));

    const prevText =
      existing.length > 0 && existing[0].nilaiEvaluasiZi !== null
        ? formatDecimal(existing[0].nilaiEvaluasiZi)
        : 'Belum tersedia';

    await db
      .delete(zi)
      .where(and(eq(zi.tahun, tahun), eq(zi.triwulan, triwulan)));

    if (payload.nilaiEvaluasiZi !== null && payload.nilaiEvaluasiZi !== undefined) {
      await db.insert(zi).values({
        periodId: period.id,
        tahun,
        triwulan,
        nilaiEvaluasiZi: Number(payload.nilaiEvaluasiZi),
        sumberEvaluasi: payload.sumberEvaluasi || 'LHE TPI Pembangunan Zona Integritas',
        keterangan: payload.keterangan || '',
        statusData: payload.statusData || 'TERSEDIA',
        isSampleData: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'ZI',
      nilaiSebelum: prevText,
      nilaiSesudah:
        payload.nilaiEvaluasiZi !== null ? formatDecimal(payload.nilaiEvaluasiZi) : 'Belum tersedia',
      keterangan: payload.keterangan || 'Pembaruan nilai evaluasi Zona Integritas (ZI)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveZi:', error);
    throw new Error(error.message || 'Gagal menyimpan data ZI.', { cause: error });
  }
}

// 10. Simpan APIP
export async function saveApip(
  tahun: number,
  triwulan: string,
  payload: {
    nilaiKapabilitasApip: number | null;
    tahunPeriodePenilaian: string;
    sumberDokumen?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(apip)
      .where(and(eq(apip.tahun, tahun), eq(apip.triwulan, triwulan)));

    const prevText =
      existing.length > 0 && existing[0].nilaiKapabilitasApip !== null
        ? formatDecimal(existing[0].nilaiKapabilitasApip)
        : 'Belum tersedia';

    await db
      .delete(apip)
      .where(and(eq(apip.tahun, tahun), eq(apip.triwulan, triwulan)));

    if (payload.nilaiKapabilitasApip !== null && payload.nilaiKapabilitasApip !== undefined) {
      await db.insert(apip).values({
        periodId: period.id,
        tahun,
        triwulan,
        nilaiKapabilitasApip: Number(payload.nilaiKapabilitasApip),
        tahunPeriodePenilaian: payload.tahunPeriodePenilaian || String(tahun),
        sumberDokumen: payload.sumberDokumen || 'Hasil Penilaian BPKP terkait Kapabilitas APIP',
        keterangan: payload.keterangan || '',
        statusData: payload.statusData || 'TERSEDIA',
        isSampleData: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'APIP',
      nilaiSebelum: prevText,
      nilaiSesudah:
        payload.nilaiKapabilitasApip !== null
          ? `${formatDecimal(payload.nilaiKapabilitasApip)} (${payload.tahunPeriodePenilaian})`
          : 'Belum tersedia',
      keterangan: payload.keterangan || 'Pembaruan nilai Kapabilitas APIP LAN',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveApip:', error);
    throw new Error(error.message || 'Gagal menyimpan data APIP.', { cause: error });
  }
}

// 11. Tambah / Hapus Kebijakan Pengawasan Internal (KPI)
export async function addKpiRow(
  tahun: number,
  triwulan: string,
  payload: {
    krJumlah: number;
    ktTotal2029: number;
    daftarKebijakan: string;
    statusKebijakan: string;
    tahunTarget: number;
    sumberDokumen?: string;
    keterangan?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);

    await db
      .delete(kpi)
      .where(
        and(eq(kpi.tahun, tahun), eq(kpi.triwulan, triwulan), eq(kpi.isSampleData, true))
      );

    await db.insert(kpi).values({
      periodId: period.id,
      tahun,
      triwulan,
      krJumlah: Number(payload.krJumlah),
      ktTotal2029: Number(payload.ktTotal2029),
      daftarKebijakan: payload.daftarKebijakan,
      statusKebijakan: payload.statusKebijakan,
      tahunTarget: Number(payload.tahunTarget),
      sumberDokumen: payload.sumberDokumen || 'Daftar Rencana Kebijakan Pengawasan 2025-2029',
      keterangan: payload.keterangan || '',
      statusData: 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'KPI',
      nilaiSebelum: 'Penambahan kebijakan pengawasan',
      nilaiSesudah: `${payload.daftarKebijakan} [${payload.statusKebijakan}] (Kr=${payload.krJumlah}, Kt=${payload.ktTotal2029})`,
      keterangan: payload.keterangan || 'Input daftar kebijakan pengawasan internal',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in addKpiRow:', error);
    throw new Error(error.message || 'Gagal menambah data KPI.', { cause: error });
  }
}

export async function deleteKpiRow(id: number, user: UserContext) {
  try {
    const rows = await db.select().from(kpi).where(eq(kpi.id, id));
    if (rows.length === 0) return;
    const row = rows[0];
    await assertEditable(row.tahun, row.triwulan, user);

    await db.delete(kpi).where(eq(kpi.id, id));

    await logChange({
      tahun: row.tahun,
      triwulan: row.triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Pengawasan Intern LAN',
      komponen: 'KPI',
      nilaiSebelum: `${row.daftarKebijakan} (Kr=${row.krJumlah})`,
      nilaiSesudah: 'Dihapus',
      keterangan: 'Penghapusan baris kebijakan KPI',
    });

    await recalculateAndPersistPeriod(row.tahun, row.triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in deleteKpiRow:', error);
    throw new Error(error.message || 'Gagal menghapus data KPI.', { cause: error });
  }
}

// 12. Simpan NES (Tata Kelola Internal)
export async function saveNes(
  tahun: number,
  triwulan: string,
  payload: {
    nilaiNes: number | null;
    sumberDokumen?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(nes)
      .where(and(eq(nes.tahun, tahun), eq(nes.triwulan, triwulan)));

    const prevText =
      existing.length > 0 && existing[0].nilaiNes !== null
        ? formatDecimal(existing[0].nilaiNes)
        : 'Belum tersedia';

    await db
      .delete(nes)
      .where(and(eq(nes.tahun, tahun), eq(nes.triwulan, triwulan)));

    if (payload.nilaiNes !== null && payload.nilaiNes !== undefined) {
      await db.insert(nes).values({
        periodId: period.id,
        tahun,
        triwulan,
        nilaiNes: Number(payload.nilaiNes),
        sumberDokumen: payload.sumberDokumen || 'LHE SAKIP Unit Inspektorat',
        keterangan: payload.keterangan || '',
        statusData: payload.statusData || 'TERSEDIA',
        isSampleData: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Tata Kelola Internal Inspektorat',
      komponen: 'NES',
      nilaiSebelum: prevText,
      nilaiSesudah: payload.nilaiNes !== null ? formatDecimal(payload.nilaiNes) : 'Belum tersedia',
      keterangan: payload.keterangan || 'Pembaruan Nilai Evaluasi SAKIP (NES)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveNes:', error);
    throw new Error(error.message || 'Gagal menyimpan data NES.', { cause: error });
  }
}

// 13. Simpan NCKI (Tata Kelola Internal)
export async function saveNcki(
  tahun: number,
  triwulan: string,
  payload: {
    rencanaPenarikanAnggaran: number;
    realisasiAnggaran: number;
    rencanaCapaianOutput: number;
    realisasiCapaianOutput: number;
    sumberDokumen?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(ncki)
      .where(and(eq(ncki.tahun, tahun), eq(ncki.triwulan, triwulan)));

    const prevText =
      existing.length > 0
        ? `Anggaran=${existing[0].realisasiAnggaran}/${existing[0].rencanaPenarikanAnggaran}, Output=${existing[0].realisasiCapaianOutput}/${existing[0].rencanaCapaianOutput}`
        : 'Belum diinput';

    await db
      .delete(ncki)
      .where(and(eq(ncki.tahun, tahun), eq(ncki.triwulan, triwulan)));

    await db.insert(ncki).values({
      periodId: period.id,
      tahun,
      triwulan,
      rencanaPenarikanAnggaran: Number(payload.rencanaPenarikanAnggaran),
      realisasiAnggaran: Number(payload.realisasiAnggaran),
      rencanaCapaianOutput: Number(payload.rencanaCapaianOutput),
      realisasiCapaianOutput: Number(payload.realisasiCapaianOutput),
      sumberDokumen: payload.sumberDokumen || 'Laporan SMART / OM-SPAN Inspektorat',
      keterangan: payload.keterangan || '',
      statusData: payload.statusData || 'TERSEDIA',
      isSampleData: false,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Tata Kelola Internal Inspektorat',
      komponen: 'NCKI',
      nilaiSebelum: prevText,
      nilaiSesudah: `Anggaran=${payload.realisasiAnggaran}/${payload.rencanaPenarikanAnggaran}, Output=${payload.realisasiCapaianOutput}/${payload.rencanaCapaianOutput}`,
      keterangan: payload.keterangan || 'Pembaruan Nilai Capaian Keluaran Inspektorat (NCKI)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveNcki:', error);
    throw new Error(error.message || 'Gagal menyimpan data NCKI.', { cause: error });
  }
}

// 14. Simpan NSAP (Tata Kelola Internal)
export async function saveNsap(
  tahun: number,
  triwulan: string,
  payload: {
    nilaiNsap: number | null;
    sumberDokumen?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(nsap)
      .where(and(eq(nsap.tahun, tahun), eq(nsap.triwulan, triwulan)));

    const prevText =
      existing.length > 0 && existing[0].nilaiNsap !== null
        ? formatDecimal(existing[0].nilaiNsap)
        : 'Belum tersedia';

    await db
      .delete(nsap)
      .where(and(eq(nsap.tahun, tahun), eq(nsap.triwulan, triwulan)));

    if (payload.nilaiNsap !== null && payload.nilaiNsap !== undefined) {
      await db.insert(nsap).values({
        periodId: period.id,
        tahun,
        triwulan,
        nilaiNsap: Number(payload.nilaiNsap),
        sumberDokumen: payload.sumberDokumen || 'LHP Pengawasan Kearsipan Internal',
        keterangan: payload.keterangan || '',
        statusData: payload.statusData || 'TERSEDIA',
        isSampleData: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Tata Kelola Internal Inspektorat',
      komponen: 'NSAP',
      nilaiSebelum: prevText,
      nilaiSesudah: payload.nilaiNsap !== null ? formatDecimal(payload.nilaiNsap) : 'Belum tersedia',
      keterangan: payload.keterangan || 'Pembaruan Nilai Pengawasan Kearsipan Internal (NSAP)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveNsap:', error);
    throw new Error(error.message || 'Gagal menyimpan data NSAP.', { cause: error });
  }
}

// 15. Simpan SKM (Tata Kelola Internal)
export async function saveSkm(
  tahun: number,
  triwulan: string,
  payload: {
    nilaiSkm: number | null;
    jumlahResponden: number;
    periodeSurvei: string;
    sumberData?: string;
    keterangan?: string;
    statusData?: string;
  },
  user: UserContext
) {
  try {
    const period = await assertEditable(tahun, triwulan, user);
    const existing = await db
      .select()
      .from(skm)
      .where(and(eq(skm.tahun, tahun), eq(skm.triwulan, triwulan)));

    const prevText =
      existing.length > 0 && existing[0].nilaiSkm !== null
        ? formatDecimal(existing[0].nilaiSkm)
        : 'Belum tersedia';

    await db
      .delete(skm)
      .where(and(eq(skm.tahun, tahun), eq(skm.triwulan, triwulan)));

    if (payload.nilaiSkm !== null && payload.nilaiSkm !== undefined) {
      await db.insert(skm).values({
        periodId: period.id,
        tahun,
        triwulan,
        nilaiSkm: Number(payload.nilaiSkm),
        jumlahResponden: Number(payload.jumlahResponden || 0),
        periodeSurvei: payload.periodeSurvei || `${triwulan} ${tahun}`,
        sumberData: payload.sumberData || 'Laporan Survei Kepuasan Masyarakat Inspektorat',
        keterangan: payload.keterangan || '',
        statusData: payload.statusData || 'TERSEDIA',
        isSampleData: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: 'IK Tata Kelola Internal Inspektorat',
      komponen: 'SKM',
      nilaiSebelum: prevText,
      nilaiSesudah:
        payload.nilaiSkm !== null
          ? `${formatDecimal(payload.nilaiSkm)} (${payload.jumlahResponden} responden)`
          : 'Belum tersedia',
      keterangan: payload.keterangan || 'Pembaruan Indeks Kepuasan Pengguna Layanan (SKM)',
    });

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in saveSkm:', error);
    throw new Error(error.message || 'Gagal menyimpan data SKM.', { cause: error });
  }
}

// 16. Ubah Status Periode (DRAFT / FINAL) & Mekanisme Buka Kunci Khusus
export async function updatePeriodLockStatus(
  tahun: number,
  triwulan: string,
  action: 'FINALIZE' | 'UNLOCK_SPECIAL',
  alasan: string,
  user: UserContext
) {
  try {
    if (user.role === 'PIMPINAN') {
      throw new Error('Role Pimpinan tidak dapat mengubah status kunci periode.');
    }

    const period = await getOrCreatePeriod(tahun, triwulan, user.id);

    if (action === 'FINALIZE') {
      await db
        .update(periods)
        .set({
          statusPeriode: 'FINAL',
          isLocked: true,
          catatanFinalisasi: alasan || 'Diverifikasi dan difinalisasi oleh Operator',
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(periods.id, period.id));

      await logChange({
        tahun,
        triwulan,
        userId: user.id,
        userNama: user.nama,
        userEmail: user.email,
        indikator: 'Seluruh Indikator',
        komponen: 'STATUS_PERIODE',
        nilaiSebelum: period.statusPeriode,
        nilaiSesudah: 'FINAL (Terkunci)',
        keterangan: alasan || 'Finalisasi data periode',
      });
    } else {
      if (!alasan || alasan.trim().length < 5) {
        throw new Error('Mekanisme buka kunci FINAL wajib menyertakan alasan otorisasi revisi.');
      }
      await db
        .update(periods)
        .set({
          statusPeriode: 'DRAFT',
          isLocked: false,
          catatanFinalisasi: `Dibuka kembali: ${alasan}`,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .where(eq(periods.id, period.id));

      await logChange({
        tahun,
        triwulan,
        userId: user.id,
        userNama: user.nama,
        userEmail: user.email,
        indikator: 'Seluruh Indikator',
        komponen: 'STATUS_PERIODE',
        nilaiSebelum: 'FINAL (Terkunci)',
        nilaiSesudah: 'DRAFT (Dibuka untuk revisi)',
        keterangan: `Otorisasi Buka Kunci FINAL: ${alasan}`,
      });
    }

    await recalculateAndPersistPeriod(tahun, triwulan, user.id, false);
  } catch (error: any) {
    console.error('Database mutation failed in updatePeriodLockStatus:', error);
    throw new Error(error.message || 'Gagal memperbarui status periode.', { cause: error });
  }
}

// 17. Simpan Target Tahun Berikutnya (2027, 2028, 2029, dst.)
// Catatan: Target Resmi 2026 dilindungi agar tidak berubah sembarangan sesuai aturan AH.2
export async function saveCustomTarget(
  tahun: number,
  triwulan: string,
  indikatorKode: 'IK_PENGAWASAN' | 'IK_TATA_KELOLA',
  komponenKode: string | null,
  targetNilai: number,
  user: UserContext
) {
  try {
    if (user.role === 'PIMPINAN') {
      throw new Error('Role Pimpinan tidak dapat mengubah target.');
    }
    if (tahun === 2026) {
      throw new Error(
        'Target Tahun 2026 merupakan TARGET RESMI Perjanjian Kinerja Inspektur LAN Tahun 2026 dan dikunci sesuai ketentuan peraturan.'
      );
    }

    const period = await getOrCreatePeriod(tahun, triwulan, user.id);

    if (!komponenKode || komponenKode === 'INDUK') {
      await db
        .delete(indicatorTargets)
        .where(
          and(
            eq(indicatorTargets.tahun, tahun),
            eq(indicatorTargets.triwulan, triwulan),
            eq(indicatorTargets.indikatorKode, indikatorKode)
          )
        );

      await db.insert(indicatorTargets).values({
        periodId: period.id,
        tahun,
        triwulan,
        indikatorKode,
        indikatorNama:
          indikatorKode === 'IK_PENGAWASAN'
            ? 'IK - Indeks Pengawasan Intern LAN'
            : 'IK - Indeks Tata Kelola Internal Inspektorat',
        targetTahunan: targetNilai,
        targetTriwulan: targetNilai,
        sumberDokumen: `Target Perjanjian Kinerja Tahun ${tahun}`,
        isOfficial: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    } else {
      await db
        .delete(subindicatorTargets)
        .where(
          and(
            eq(subindicatorTargets.tahun, tahun),
            eq(subindicatorTargets.triwulan, triwulan),
            eq(subindicatorTargets.komponenKode, komponenKode)
          )
        );

      await db.insert(subindicatorTargets).values({
        periodId: period.id,
        tahun,
        triwulan,
        indikatorKode,
        komponenKode,
        komponenNama: komponenKode,
        targetNilai,
        satuan: 'Nilai/Persen',
        isOfficial: false,
        createdBy: user.id,
        updatedBy: user.id,
      });
    }

    await logChange({
      tahun,
      triwulan,
      userId: user.id,
      userNama: user.nama,
      userEmail: user.email,
      indikator: indikatorKode,
      komponen: komponenKode || 'TARGET_INDUK',
      nilaiSebelum: 'Target sebelumnya',
      nilaiSesudah: formatDecimal(targetNilai),
      keterangan: `Penetapan target tahun ${tahun} ${triwulan}`,
    });
  } catch (error: any) {
    console.error('Database mutation failed in saveCustomTarget:', error);
    throw new Error(error.message || 'Gagal menyimpan target.', { cause: error });
  }
}
