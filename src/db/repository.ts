import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  apip,
  changeLogs,
  evakip,
  ikuRealizations,
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
  users,
  wbs,
  zi,
} from './schema.ts';
import {
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
import {
  calculateIkPengawasanIntern,
  calculateIkTataKelolaInternal,
  calculateKpi,
  calculateLhkan,
  calculateNcki,
  calculatePpg,
  calculateTlpAggregate,
  calculateWbs,
  formatDecimal,
} from '../engine/calculationEngine.ts';

export async function getOrCreateUser(uid: string, email: string, nama?: string) {
  try {
    const cleanName = nama || email.split('@')[0] || 'Operator Inspektorat';
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        nama: cleanName,
        role: 'OPERATOR',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Gagal menyinkronkan profil pengguna.', { cause: error });
  }
}

export async function updateUserRole(uid: string, role: 'OPERATOR' | 'PIMPINAN') {
  try {
    const result = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.uid, uid))
      .returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in updateUserRole:', error);
    throw new Error('Gagal mengubah peran pengguna.', { cause: error });
  }
}

let isSeeding = false;

export async function ensureInitialDataSeeded() {
  if (isSeeding) return;
  try {
    const existingTargets = await db
      .select()
      .from(indicatorTargets)
      .where(eq(indicatorTargets.tahun, 2026));

    if (existingTargets.length > 0) {
      return;
    }

    isSeeding = true;

    // 1. Buat System User default untuk seed awal
    const sysUserRes = await db
      .insert(users)
      .values({
        uid: 'system-lan-2026',
        email: 'inspektorat@lan.go.id',
        nama: 'Sistem Perjanjian Kinerja LAN',
        role: 'OPERATOR',
        unitKerja: 'Inspektorat LAN',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { updatedAt: new Date() },
      })
      .returning();
    const sysUserId = sysUserRes[0].id;

    // 2. Buat Periode untuk 2025, 2026, 2027, 2028, 2029
    const yearsToCreate = [2025, 2026, 2027, 2028, 2029];
    const periodMap2026: Record<TriwulanType, number> = {
      'TW I': 0,
      'TW II': 0,
      'TW III': 0,
      'TW IV': 0,
    };

    for (const yr of yearsToCreate) {
      for (const tw of DAFTAR_TRIWULAN) {
        const statusDefault =
          yr === 2026 && (tw === 'TW I' || tw === 'TW II')
            ? 'TERSEDIA'
            : yr === 2026 && tw === 'TW III'
            ? 'DRAFT'
            : 'BELUM_DIINPUT';

        const insertedPeriod = await db
          .insert(periods)
          .values({
            tahun: yr,
            triwulan: tw,
            statusPeriode: statusDefault,
            isLocked: false,
            createdBy: sysUserId,
            updatedBy: sysUserId,
          })
          .returning();

        if (yr === 2026) {
          periodMap2026[tw] = insertedPeriod[0].id;
        }
      }
    }

    // 3. Simpan TARGET RESMI 2026 (Induk & Komponen)
    for (const tw of DAFTAR_TRIWULAN) {
      const pId = periodMap2026[tw];

      // Target Induk 1: IK Pengawasan Intern LAN
      await db.insert(indicatorTargets).values({
        periodId: pId,
        tahun: 2026,
        triwulan: tw,
        indikatorKode: 'IK_PENGAWASAN',
        indikatorNama: 'IK - Indeks Pengawasan Intern LAN',
        targetTahunan: TARGET_TAHUNAN_2026.IK_PENGAWASAN,
        targetTriwulan: TARGET_TRIWULAN_IK_PENGAWASAN_2026[tw],
        sumberDokumen: 'Perjanjian Kinerja Inspektur LAN Tahun 2026',
        isOfficial: true,
        createdBy: sysUserId,
        updatedBy: sysUserId,
      });

      // Target Induk 2: IK Tata Kelola Internal Inspektorat
      await db.insert(indicatorTargets).values({
        periodId: pId,
        tahun: 2026,
        triwulan: tw,
        indikatorKode: 'IK_TATA_KELOLA',
        indikatorNama: 'IK - Indeks Tata Kelola Internal Inspektorat',
        targetTahunan: TARGET_TAHUNAN_2026.IK_TATA_KELOLA,
        targetTriwulan: TARGET_TRIWULAN_IK_TATA_KELOLA_2026[tw],
        sumberDokumen: 'Perjanjian Kinerja Inspektur LAN Tahun 2026',
        isOfficial: true,
        createdBy: sysUserId,
        updatedBy: sysUserId,
      });

      // Target Komponen Pengawasan Intern
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
      for (const k of pengawasanKeys) {
        await db.insert(subindicatorTargets).values({
          periodId: pId,
          tahun: 2026,
          triwulan: tw,
          indikatorKode: 'IK_PENGAWASAN',
          komponenKode: k,
          komponenNama: KOMPONEN_META[k].nama,
          targetNilai: TARGET_KOMPONEN_PENGAWASAN_2026[k][tw],
          satuan: KOMPONEN_META[k].satuan,
          isOfficial: true,
          createdBy: sysUserId,
          updatedBy: sysUserId,
        });
      }

      // Target Komponen Tata Kelola Internal
      const tataKelolaKeys: KomponenTataKelolaType[] = ['NES', 'NCKI', 'NSAP', 'SKM'];
      for (const k of tataKelolaKeys) {
        await db.insert(subindicatorTargets).values({
          periodId: pId,
          tahun: 2026,
          triwulan: tw,
          indikatorKode: 'IK_TATA_KELOLA',
          komponenKode: k,
          komponenNama: KOMPONEN_META[k].nama,
          targetNilai: TARGET_KOMPONEN_TATA_KELOLA_2026[k][tw],
          satuan: KOMPONEN_META[k].satuan,
          isOfficial: true,
          createdBy: sysUserId,
          updatedBy: sysUserId,
        });
      }
    }

    // 4. Buat SAMPLE DATA UJI (dengan flag isSampleData = true) untuk 2026 TW I, TW II, TW III
    // Agar sistem langsung dapat diuji tanpa mencampuradukkan Target Resmi dan Realisasi Resmi.
    await seedSampleData2026(periodMap2026, sysUserId);
  } catch (error) {
    console.error('Error seeding initial data:', error);
  } finally {
    isSeeding = false;
  }
}

export async function seedSampleData2026(
  periodMap2026: Record<TriwulanType, number>,
  sysUserId: number
) {
  // --- TW I 2026 (Sample Data Uji: TLP, PPG, LHKAN, APIP, NCKI tersedia; EvAKIP, WBS, ZI, KPI, NES, NSAP, SKM belum tersedia / null) ---
  const pTw1 = periodMap2026['TW I'];
  await db.insert(tlBpk).values({
    periodId: pTw1,
    tahun: 2026,
    triwulan: 'TW I',
    totalRekomendasi: 40,
    sesuaiRekomendasi: 31,
    tidakDapatDitindaklanjutiSah: 2,
    statusData: 'TERSEDIA',
    isSampleData: true,
    sumberDokumen: '[DATA UJI] LHP BPK RI Semester II/2025',
    keterangan: 'Simulasi data uji TW I 2026 (33/40 = 82,50%)',
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(tlAuditInternal).values([
    {
      periodId: pTw1,
      tahun: 2026,
      triwulan: 'TW I',
      tahunLha: 2024,
      unitSatker: 'Puslatbang PKASN & KMP (LHA 2024)',
      totalRekomendasi: 25,
      sesuaiRekomendasi: 18,
      belumSesuai: 5,
      belumDitindaklanjuti: 2,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Rekap LHA Audit Ketaatan 2024',
      keterangan: 'Periode 2 tahun terakhir (2024-2025)',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw1,
      tahun: 2026,
      triwulan: 'TW I',
      tahunLha: 2025,
      unitSatker: 'Biro SDM & Umum Sekretariat Utama (LHA 2025)',
      totalRekomendasi: 25,
      sesuaiRekomendasi: 15,
      belumSesuai: 7,
      belumDitindaklanjuti: 3,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Rekap LHA Audit Ketaatan 2025',
      keterangan: 'Periode 2 tahun terakhir (2024-2025)',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(tlAuditKinerja).values([
    {
      periodId: pTw1,
      tahun: 2026,
      triwulan: 'TW I',
      tahunLha: 2024,
      programUnit: 'Program Pelatihan Kepemimpinan Nasional (LHA 2024)',
      totalRekomendasi: 20,
      sesuaiRekomendasi: 14,
      belumSesuai: 4,
      belumDitindaklanjuti: 2,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] LHA Audit Kinerja 2024',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw1,
      tahun: 2026,
      triwulan: 'TW I',
      tahunLha: 2025,
      programUnit: 'Program Inovasi Administrasi Negara (LHA 2025)',
      totalRekomendasi: 20,
      sesuaiRekomendasi: 12,
      belumSesuai: 5,
      belumDitindaklanjuti: 3,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] LHA Audit Kinerja 2025',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(tlSpi).values({
    periodId: pTw1,
    tahun: 2026,
    triwulan: 'TW I',
    tahunSpi: 2025,
    totalRekomendasi: 12,
    sesuaiRekomendasi: 8,
    telahDivalidasiKpk: 7,
    statusTindakLanjut: 'Sesuai & Tervalidasi KPK',
    statusData: 'TERSEDIA',
    isSampleData: true,
    sumberDokumen: '[DATA UJI] Laporan Tindak Lanjut SPI KPK 2025',
    keterangan: 'Rekomendasi SPI tahun terakhir (7/12 = 58,33%)',
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(ppg).values({
    periodId: pTw1,
    tahun: 2026,
    triwulan: 'TW I',
    totalPelaporanGratifikasi: 4,
    pelaporanDiproses: 4,
    nilaiPpgKpk: 0,
    sumberDokumen: '[DATA UJI] Laporan UPG LAN TW I 2026',
    keterangan: '4 laporan gratifikasi diproses 100%, evaluasi KPK akhir tahun',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(lhkan).values([
    {
      periodId: pTw1,
      tahun: 2026,
      triwulan: 'TW I',
      unitKerja: 'Seluruh Satker LAN (Wajib Lapor LHKPN)',
      jenisLaporan: 'LHKPN',
      jumlahWajibLapor: 185,
      jumlahSudahLapor: 185,
      sumberDokumen: '[DATA UJI] e-LHKPN KPK per 31 Maret 2026',
      keterangan: 'Kepatuhan LHKPN 100%',
      statusData: 'TERSEDIA',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw1,
      tahun: 2026,
      triwulan: 'TW I',
      unitKerja: 'Pegawai ASN LAN (Wajib Lapor SPT/LHKASN)',
      jenisLaporan: 'LHKASN / SPT Tahunan',
      jumlahWajibLapor: 815,
      jumlahSudahLapor: 811,
      sumberDokumen: '[DATA UJI] Rekap Kepatuhan LHKASN TW I 2026',
      keterangan: '811 dari 815 telah lapor pada TW I',
      statusData: 'TERSEDIA',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(apip).values({
    periodId: pTw1,
    tahun: 2026,
    triwulan: 'TW I',
    nilaiKapabilitasApip: 40.20,
    tahunPeriodePenilaian: 'Penilaian BPKP 2025 (Berlaku 2026)',
    sumberDokumen: '[DATA UJI] Surat Deputi BPKP Hasil Evaluasi Kapabilitas APIP LAN',
    keterangan: 'Nilai Kapabilitas APIP terbaru yang berlaku pada periode berjalan',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(ncki).values({
    periodId: pTw1,
    tahun: 2026,
    triwulan: 'TW I',
    rencanaPenarikanAnggaran: 1850000000,
    realisasiAnggaran: 1835000000,
    rencanaCapaianOutput: 25,
    realisasiCapaianOutput: 25,
    sumberDokumen: '[DATA UJI] Laporan SMART/OM-SPAN TW I 2026',
    keterangan: 'Simulasi capaian anggaran & output TW I',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  // Sinkronisasi rekap iku_realizations untuk TW I
  await recalculateAndPersistPeriod(2026, 'TW I', sysUserId, true);

  // --- TW II 2026 (Sample Data Uji: TLP, PPG, LHKAN, WBS, ZI, APIP, KPI, NCKI tersedia; EvAKIP, NES, NSAP, SKM masih Belum Tersedia / null) ---
  const pTw2 = periodMap2026['TW II'];
  await db.insert(tlBpk).values({
    periodId: pTw2,
    tahun: 2026,
    triwulan: 'TW II',
    totalRekomendasi: 42,
    sesuaiRekomendasi: 33,
    tidakDapatDitindaklanjutiSah: 2,
    statusData: 'TERSEDIA',
    isSampleData: true,
    sumberDokumen: '[DATA UJI] LHP BPK RI Semester I/2026',
    keterangan: 'Simulasi data uji TW II 2026 (35/42 = 83,33%)',
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(tlAuditInternal).values([
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      tahunLha: 2024,
      unitSatker: 'Puslatbang PKASN, KMP, KDOD, Maroko (LHA 2024)',
      totalRekomendasi: 30,
      sesuaiRekomendasi: 22,
      belumSesuai: 6,
      belumDitindaklanjuti: 2,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan TLHA Internal 2024',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      tahunLha: 2025,
      unitSatker: 'Politeknik STIA LAN Jakarta, Bandung, Makassar (LHA 2025)',
      totalRekomendasi: 30,
      sesuaiRekomendasi: 19,
      belumSesuai: 8,
      belumDitindaklanjuti: 3,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan TLHA Internal 2025',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(tlAuditKinerja).values([
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      tahunLha: 2024,
      programUnit: 'Program Pengembangan Kompetensi ASN (LHA 2024)',
      totalRekomendasi: 20,
      sesuaiRekomendasi: 14,
      belumSesuai: 4,
      belumDitindaklanjuti: 2,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan Audit Kinerja 2024',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      tahunLha: 2025,
      programUnit: 'Program Kajian Kebijakan Administrasi Negara (LHA 2025)',
      totalRekomendasi: 20,
      sesuaiRekomendasi: 13,
      belumSesuai: 5,
      belumDitindaklanjuti: 2,
      statusData: 'TERSEDIA',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan Audit Kinerja 2025',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(tlSpi).values({
    periodId: pTw2,
    tahun: 2026,
    triwulan: 'TW II',
    tahunSpi: 2025,
    totalRekomendasi: 12,
    sesuaiRekomendasi: 8,
    telahDivalidasiKpk: 8,
    statusTindakLanjut: 'Sesuai & Tervalidasi KPK',
    statusData: 'TERSEDIA',
    isSampleData: true,
    sumberDokumen: '[DATA UJI] Rencana Aksi SPI KPK TW II 2026',
    keterangan: '8 dari 12 rekomendasi SPI telah divalidasi KPK',
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(ppg).values({
    periodId: pTw2,
    tahun: 2026,
    triwulan: 'TW II',
    totalPelaporanGratifikasi: 6,
    pelaporanDiproses: 6,
    nilaiPpgKpk: 0,
    sumberDokumen: '[DATA UJI] Laporan UPG LAN Semester I 2026',
    keterangan: 'Seluruh laporan gratifikasi diproses tepat waktu',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(lhkan).values({
    periodId: pTw2,
    tahun: 2026,
    triwulan: 'TW II',
    unitKerja: 'Seluruh Unit Kerja LAN (LHKPN & LHKASN)',
    jenisLaporan: 'Gabungan LHKPN & LHKASN',
    jumlahWajibLapor: 1000,
    jumlahSudahLapor: 1000,
    sumberDokumen: '[DATA UJI] Berita Acara Rekonsiliasi LHKAN Semester I 2026',
    keterangan: 'Tuntas 100% seluruh wajib lapor',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(wbs).values([
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      nomorLaporan: 'WBS/LAN/2026/001',
      tanggal: '2026-04-15',
      jenisPelaporan: 'Disiplin & Etika Pegawai',
      statusVerifikasi: 'Terverifikasi',
      statusTindakLanjut: 'Ditindaklanjuti',
      isDitindaklanjuti: true,
      sumberDokumen: '[DATA UJI] Register Pengaduan WBS Inspektorat',
      keterangan: 'Telah dilakukan telaah dan klarifikasi',
      statusData: 'TERSEDIA',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      nomorLaporan: 'WBS/LAN/2026/002',
      tanggal: '2026-05-22',
      jenisPelaporan: 'Layanan Publik Akademik',
      statusVerifikasi: 'Terverifikasi',
      statusTindakLanjut: 'Selesai',
      isDitindaklanjuti: true,
      sumberDokumen: '[DATA UJI] Register Pengaduan WBS Inspektorat',
      keterangan: 'Telah diterbitkan LHP/rekomendasi',
      statusData: 'TERSEDIA',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(zi).values({
    periodId: pTw2,
    tahun: 2026,
    triwulan: 'TW II',
    nilaiEvaluasiZi: 81.25,
    sumberEvaluasi: '[DATA UJI] LHE Tim Penilai Internal (TPI) ZI LAN TW II 2026',
    keterangan: 'Rata-rata hasil evaluasi TPI terhadap unit kerja diusulkan WBK/WBBM',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(apip).values({
    periodId: pTw2,
    tahun: 2026,
    triwulan: 'TW II',
    nilaiKapabilitasApip: 40.20,
    tahunPeriodePenilaian: 'Penilaian BPKP 2025 (Berlaku 2026)',
    sumberDokumen: '[DATA UJI] Surat Deputi BPKP Hasil Evaluasi Kapabilitas APIP LAN',
    keterangan: 'Nilai Kapabilitas APIP terbaru yang berlaku',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(kpi).values([
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      krJumlah: 1,
      ktTotal2029: 5,
      daftarKebijakan: 'Peraturan Kepala LAN tentang Piagam Audit Intern (Internal Audit Charter) Pembaruan 2025',
      statusKebijakan: 'Ditetapkan',
      tahunTarget: 2025,
      sumberDokumen: '[DATA UJI] Peta Jalan Kebijakan Pengawasan 2025-2029',
      keterangan: 'Telah ditetapkan (1 dari 5 rencana kebijakan s.d. 2029 = 20%)',
      statusData: 'TERSEDIA',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw2,
      tahun: 2026,
      triwulan: 'TW II',
      krJumlah: 0,
      ktTotal2029: 5,
      daftarKebijakan: 'Pedoman Pengawasan Berbasis Risiko (RBIA) Terintegrasi LAN',
      statusKebijakan: 'Penyusunan',
      tahunTarget: 2026,
      sumberDokumen: '[DATA UJI] Peta Jalan Kebijakan Pengawasan 2025-2029',
      keterangan: 'Sedang dalam tahap penyusunan draft pada TW II',
      statusData: 'TERSEDIA',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(ncki).values({
    periodId: pTw2,
    tahun: 2026,
    triwulan: 'TW II',
    rencanaPenarikanAnggaran: 3800000000,
    realisasiAnggaran: 3775000000,
    rencanaCapaianOutput: 55,
    realisasiCapaianOutput: 55,
    sumberDokumen: '[DATA UJI] Laporan SMART/OM-SPAN TW II 2026',
    keterangan: 'Simulasi capaian anggaran & output TW II',
    statusData: 'TERSEDIA',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await recalculateAndPersistPeriod(2026, 'TW II', sysUserId, true);

  // --- TW III 2026 (Sample Data Uji: TLP, EvAKIP, PPG, LHKAN, WBS, ZI, APIP, KPI, NES, NCKI tersedia; NSAP, SKM masih Belum Tersedia) ---
  const pTw3 = periodMap2026['TW III'];
  await db.insert(tlBpk).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    totalRekomendasi: 42,
    sesuaiRekomendasi: 36,
    tidakDapatDitindaklanjutiSah: 2,
    statusData: 'DRAFT',
    isSampleData: true,
    sumberDokumen: '[DATA UJI] Pemantauan TLHP BPK RI TW III 2026',
    keterangan: 'Simulasi data uji TW III 2026 (38/42 = 90,48%)',
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(tlAuditInternal).values([
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      tahunLha: 2024,
      unitSatker: 'Seluruh Satker Pusat & Puslatbang (LHA 2024)',
      totalRekomendasi: 30,
      sesuaiRekomendasi: 26,
      belumSesuai: 3,
      belumDitindaklanjuti: 1,
      statusData: 'DRAFT',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan TLHA Internal 2024',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      tahunLha: 2025,
      unitSatker: 'Politeknik STIA LAN & Unit Teknis (LHA 2025)',
      totalRekomendasi: 30,
      sesuaiRekomendasi: 24,
      belumSesuai: 4,
      belumDitindaklanjuti: 2,
      statusData: 'DRAFT',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan TLHA Internal 2025',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(tlAuditKinerja).values([
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      tahunLha: 2024,
      programUnit: 'Program Pengembangan Kompetensi ASN (LHA 2024)',
      totalRekomendasi: 20,
      sesuaiRekomendasi: 17,
      belumSesuai: 2,
      belumDitindaklanjuti: 1,
      statusData: 'DRAFT',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan Audit Kinerja 2024',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      tahunLha: 2025,
      programUnit: 'Program Kajian Kebijakan Administrasi Negara (LHA 2025)',
      totalRekomendasi: 20,
      sesuaiRekomendasi: 16,
      belumSesuai: 3,
      belumDitindaklanjuti: 1,
      statusData: 'DRAFT',
      isSampleData: true,
      sumberDokumen: '[DATA UJI] Pemantauan Audit Kinerja 2025',
      keterangan: 'Periode 2 tahun terakhir',
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(tlSpi).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    tahunSpi: 2025,
    totalRekomendasi: 12,
    sesuaiRekomendasi: 10,
    telahDivalidasiKpk: 9,
    statusTindakLanjut: 'Sesuai & Tervalidasi KPK',
    statusData: 'DRAFT',
    isSampleData: true,
    sumberDokumen: '[DATA UJI] Monitoring Rencana Aksi SPI KPK TW III 2026',
    keterangan: '9 dari 12 rekomendasi SPI telah divalidasi KPK (75,00%)',
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(evakip).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    nilaiEvakip: 73.40,
    sumberDokumen: '[DATA UJI] Laporan Hasil Evaluasi Internal AKIP Tahun 2026',
    keterangan: 'Rata-rata hasil evaluasi AKIP seluruh unit kerja LAN oleh Tim Evaluator Internal',
    statusData: 'DRAFT',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(ppg).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    totalPelaporanGratifikasi: 8,
    pelaporanDiproses: 8,
    nilaiPpgKpk: 0,
    sumberDokumen: '[DATA UJI] Laporan UPG LAN TW III 2026',
    keterangan: '8 laporan gratifikasi diproses 100%',
    statusData: 'DRAFT',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(lhkan).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    unitKerja: 'Seluruh Unit Kerja LAN (LHKPN & LHKASN)',
    jenisLaporan: 'Gabungan LHKPN & LHKASN',
    jumlahWajibLapor: 1000,
    jumlahSudahLapor: 1000,
    sumberDokumen: '[DATA UJI] Pemantauan LHKAN TW III 2026',
    keterangan: 'Kepatuhan 100%',
    statusData: 'DRAFT',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(wbs).values([
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      nomorLaporan: 'WBS/LAN/2026/001',
      tanggal: '2026-04-15',
      jenisPelaporan: 'Disiplin & Etika Pegawai',
      statusVerifikasi: 'Terverifikasi',
      statusTindakLanjut: 'Selesai',
      isDitindaklanjuti: true,
      sumberDokumen: '[DATA UJI] Register Pengaduan WBS Inspektorat',
      keterangan: 'Tuntas ditindaklanjuti',
      statusData: 'DRAFT',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      nomorLaporan: 'WBS/LAN/2026/002',
      tanggal: '2026-05-22',
      jenisPelaporan: 'Layanan Publik Akademik',
      statusVerifikasi: 'Terverifikasi',
      statusTindakLanjut: 'Selesai',
      isDitindaklanjuti: true,
      sumberDokumen: '[DATA UJI] Register Pengaduan WBS Inspektorat',
      keterangan: 'Tuntas ditindaklanjuti',
      statusData: 'DRAFT',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      nomorLaporan: 'WBS/LAN/2026/003',
      tanggal: '2026-08-10',
      jenisPelaporan: 'Pengadaan Barang/Jasa',
      statusVerifikasi: 'Terverifikasi',
      statusTindakLanjut: 'Ditindaklanjuti',
      isDitindaklanjuti: true,
      sumberDokumen: '[DATA UJI] Register Pengaduan WBS Inspektorat',
      keterangan: 'Audit Tujuan Tertentu sedang berjalan',
      statusData: 'DRAFT',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(zi).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    nilaiEvaluasiZi: 81.80,
    sumberEvaluasi: '[DATA UJI] LHE Tim Penilai Internal (TPI) ZI LAN TW III 2026',
    keterangan: 'Pemantauan tindak lanjut lembar kerja evaluasi ZI',
    statusData: 'DRAFT',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(apip).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    nilaiKapabilitasApip: 40.20,
    tahunPeriodePenilaian: 'Penilaian BPKP 2025 (Berlaku 2026)',
    sumberDokumen: '[DATA UJI] Surat Deputi BPKP Hasil Evaluasi Kapabilitas APIP LAN',
    keterangan: 'Nilai Kapabilitas APIP terbaru yang berlaku',
    statusData: 'DRAFT',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(kpi).values([
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      krJumlah: 1,
      ktTotal2029: 5,
      daftarKebijakan: 'Peraturan Kepala LAN tentang Piagam Audit Intern (Internal Audit Charter) Pembaruan 2025',
      statusKebijakan: 'Ditetapkan',
      tahunTarget: 2025,
      sumberDokumen: '[DATA UJI] Peta Jalan Kebijakan Pengawasan 2025-2029',
      keterangan: 'Ditetapkan 2025',
      statusData: 'DRAFT',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
    {
      periodId: pTw3,
      tahun: 2026,
      triwulan: 'TW III',
      krJumlah: 0,
      ktTotal2029: 5,
      daftarKebijakan: 'Pedoman Pengawasan Berbasis Risiko (RBIA) Terintegrasi LAN',
      statusKebijakan: 'Penyusunan',
      tahunTarget: 2026,
      sumberDokumen: '[DATA UJI] Peta Jalan Kebijakan Pengawasan 2025-2029',
      keterangan: 'Target siap dibahas pada TW IV 2026',
      statusData: 'DRAFT',
      isSampleData: true,
      createdBy: sysUserId,
      updatedBy: sysUserId,
    },
  ]);

  await db.insert(nes).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    nilaiNes: 82.60,
    sumberDokumen: '[DATA UJI] LHE SAKIP Unit Inspektorat LAN Tahun 2026',
    keterangan: 'Hasil evaluasi akuntabilitas kinerja unit Inspektorat',
    statusData: 'DRAFT',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await db.insert(ncki).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    rencanaPenarikanAnggaran: 6200000000,
    realisasiAnggaran: 6165000000,
    rencanaCapaianOutput: 85,
    realisasiCapaianOutput: 85,
    sumberDokumen: '[DATA UJI] Laporan SMART/OM-SPAN TW III 2026',
    keterangan: 'Simulasi capaian anggaran & output TW III',
    statusData: 'DRAFT',
    isSampleData: true,
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  await recalculateAndPersistPeriod(2026, 'TW III', sysUserId, true);

  // Catat log inisialisasi pada change_logs
  await db.insert(changeLogs).values({
    periodId: pTw3,
    tahun: 2026,
    triwulan: 'TW III',
    tanggal: '2026-09-30',
    waktu: '08:00:00',
    userNama: 'Sistem Perjanjian Kinerja LAN',
    userEmail: 'inspektorat@lan.go.id',
    indikator: 'IK Pengawasan Intern & Tata Kelola',
    komponen: 'TARGET_RESMI_2026 & DATA_UJI_AWAL',
    nilaiSebelum: 'Belum diinput',
    nilaiSesudah: 'Target Resmi 2026 (PK Inspektur) + Data Uji Simulasi TW I-III',
    keterangan: 'Inisialisasi database dengan pemisahan tegas antara TARGET RESMI 2026 dan Data Simulasi/Realisasi.',
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });
}

export async function getOrCreatePeriod(tahun: number, triwulan: string, userId?: number) {
  try {
    const existing = await db
      .select()
      .from(periods)
      .where(and(eq(periods.tahun, tahun), eq(periods.triwulan, triwulan)));

    if (existing.length > 0) {
      return existing[0];
    }

    const inserted = await db
      .insert(periods)
      .values({
        tahun,
        triwulan,
        statusPeriode: 'DRAFT',
        isLocked: false,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreatePeriod:', error);
    throw new Error('Gagal memuat atau membuat periode.', { cause: error });
  }
}

/**
 * Menghitung ulang seluruh komponen pada suatu Tahun & Triwulan dari tabel-tabel detail
 * dan menyimpannya ke tabel iku_realizations.
 */
export async function recalculateAndPersistPeriod(
  tahun: number,
  triwulan: string,
  userId?: number,
  isSampleFlag = false
) {
  try {
    const period = await getOrCreatePeriod(tahun, triwulan, userId);

    // Ambil semua data detail untuk periode (tahun, triwulan)
    const [
      bpkRows,
      auditIntRows,
      auditKinRows,
      spiRows,
      evakipRows,
      ppgRows,
      lhkanRows,
      wbsRows,
      ziRows,
      apipRows,
      kpiRows,
      nesRows,
      nckiRows,
      nsapRows,
      skmRows,
    ] = await Promise.all([
      db.select().from(tlBpk).where(and(eq(tlBpk.tahun, tahun), eq(tlBpk.triwulan, triwulan))).orderBy(desc(tlBpk.id)),
      db.select().from(tlAuditInternal).where(and(eq(tlAuditInternal.tahun, tahun), eq(tlAuditInternal.triwulan, triwulan))),
      db.select().from(tlAuditKinerja).where(and(eq(tlAuditKinerja.tahun, tahun), eq(tlAuditKinerja.triwulan, triwulan))),
      db.select().from(tlSpi).where(and(eq(tlSpi.tahun, tahun), eq(tlSpi.triwulan, triwulan))),
      db.select().from(evakip).where(and(eq(evakip.tahun, tahun), eq(evakip.triwulan, triwulan))).orderBy(desc(evakip.id)),
      db.select().from(ppg).where(and(eq(ppg.tahun, tahun), eq(ppg.triwulan, triwulan))).orderBy(desc(ppg.id)),
      db.select().from(lhkan).where(and(eq(lhkan.tahun, tahun), eq(lhkan.triwulan, triwulan))),
      db.select().from(wbs).where(and(eq(wbs.tahun, tahun), eq(wbs.triwulan, triwulan))),
      db.select().from(zi).where(and(eq(zi.tahun, tahun), eq(zi.triwulan, triwulan))).orderBy(desc(zi.id)),
      db.select().from(apip).where(and(eq(apip.tahun, tahun), eq(apip.triwulan, triwulan))).orderBy(desc(apip.id)),
      db.select().from(kpi).where(and(eq(kpi.tahun, tahun), eq(kpi.triwulan, triwulan))),
      db.select().from(nes).where(and(eq(nes.tahun, tahun), eq(nes.triwulan, triwulan))).orderBy(desc(nes.id)),
      db.select().from(ncki).where(and(eq(ncki.tahun, tahun), eq(ncki.triwulan, triwulan))).orderBy(desc(ncki.id)),
      db.select().from(nsap).where(and(eq(nsap.tahun, tahun), eq(nsap.triwulan, triwulan))).orderBy(desc(nsap.id)),
      db.select().from(skm).where(and(eq(skm.tahun, tahun), eq(skm.triwulan, triwulan))).orderBy(desc(skm.id)),
    ]);

    const tlpCalc = calculateTlpAggregate(
      bpkRows[0] ?? null,
      auditIntRows,
      auditKinRows,
      spiRows,
      tahun
    );

    const evakipVal =
      evakipRows.length > 0 && evakipRows[0].nilaiEvakip !== null
        ? Number(evakipRows[0].nilaiEvakip)
        : null;

    const ppgCalc = calculatePpg(ppgRows[0] ?? null);
    const lhkanCalc = calculateLhkan(lhkanRows);
    const wbsCalc = calculateWbs(wbsRows);

    const ziVal =
      ziRows.length > 0 && ziRows[0].nilaiEvaluasiZi !== null
        ? Number(ziRows[0].nilaiEvaluasiZi)
        : null;

    const apipVal =
      apipRows.length > 0 && apipRows[0].nilaiKapabilitasApip !== null
        ? Number(apipRows[0].nilaiKapabilitasApip)
        : null;

    const kpiCalc = calculateKpi(kpiRows);

    const nesVal =
      nesRows.length > 0 && nesRows[0].nilaiNes !== null
        ? Number(nesRows[0].nilaiNes)
        : null;

    const nckiCalc = calculateNcki(nckiRows[0] ?? null);

    const nsapVal =
      nsapRows.length > 0 && nsapRows[0].nilaiNsap !== null
        ? Number(nsapRows[0].nilaiNsap)
        : null;

    const skmVal =
      skmRows.length > 0 && skmRows[0].nilaiSkm !== null
        ? Number(skmRows[0].nilaiSkm)
        : null;

    const computedMap: Array<{
      indikatorKode: 'IK_PENGAWASAN' | 'IK_TATA_KELOLA';
      komponenKode: string;
      nilai: number | null;
      statusData: string;
      isSample: boolean;
      sumber: string;
    }> = [
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'TLP',
        nilai: tlpCalc.nilaiTlp,
        statusData: bpkRows[0]?.statusData || auditIntRows[0]?.statusData || (tlpCalc.nilaiTlp !== null ? 'DRAFT' : 'BELUM_DIINPUT'),
        isSample: Boolean(bpkRows[0]?.isSampleData || isSampleFlag),
        sumber: tlpCalc.rumusTeks,
      },
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'EvAKIP',
        nilai: evakipVal,
        statusData: evakipVal !== null ? (evakipRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(evakipRows[0]?.isSampleData || isSampleFlag),
        sumber: evakipRows[0]?.sumberDokumen || 'Evaluasi Internal AKIP',
      },
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'PPG',
        nilai: ppgCalc.nilaiPpg,
        statusData: ppgCalc.nilaiPpg !== null ? (ppgRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(ppgRows[0]?.isSampleData || isSampleFlag),
        sumber: ppgRows[0]?.sumberDokumen || ppgCalc.rumusTeks,
      },
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'LHKAN',
        nilai: lhkanCalc.nilaiLhkan,
        statusData: lhkanCalc.nilaiLhkan !== null ? (lhkanRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(lhkanRows[0]?.isSampleData || isSampleFlag),
        sumber: lhkanRows[0]?.sumberDokumen || lhkanCalc.rumusTeks,
      },
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'WBS',
        nilai: wbsCalc.nilaiWbs,
        statusData: wbsCalc.nilaiWbs !== null ? (wbsRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(wbsRows[0]?.isSampleData || isSampleFlag),
        sumber: wbsRows[0]?.sumberDokumen || wbsCalc.rumusTeks,
      },
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'ZI',
        nilai: ziVal,
        statusData: ziVal !== null ? (ziRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(ziRows[0]?.isSampleData || isSampleFlag),
        sumber: ziRows[0]?.sumberEvaluasi || 'Evaluasi TPI Zona Integritas',
      },
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'APIP',
        nilai: apipVal,
        statusData: apipVal !== null ? (apipRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(apipRows[0]?.isSampleData || isSampleFlag),
        sumber: apipRows[0]?.sumberDokumen || 'Penilaian Kapabilitas APIP BPKP',
      },
      {
        indikatorKode: 'IK_PENGAWASAN',
        komponenKode: 'KPI',
        nilai: kpiCalc.nilaiKpi,
        statusData: kpiCalc.nilaiKpi !== null ? (kpiRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(kpiRows[0]?.isSampleData || isSampleFlag),
        sumber: kpiRows[0]?.sumberDokumen || kpiCalc.rumusTeks,
      },
      {
        indikatorKode: 'IK_TATA_KELOLA',
        komponenKode: 'NES',
        nilai: nesVal,
        statusData: nesVal !== null ? (nesRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(nesRows[0]?.isSampleData || isSampleFlag),
        sumber: nesRows[0]?.sumberDokumen || 'Evaluasi SAKIP Inspektorat',
      },
      {
        indikatorKode: 'IK_TATA_KELOLA',
        komponenKode: 'NCKI',
        nilai: nckiCalc.nilaiNcki,
        statusData: nckiCalc.nilaiNcki !== null ? (nckiRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(nckiRows[0]?.isSampleData || isSampleFlag),
        sumber: nckiRows[0]?.sumberDokumen || nckiCalc.rumusTeks,
      },
      {
        indikatorKode: 'IK_TATA_KELOLA',
        komponenKode: 'NSAP',
        nilai: nsapVal,
        statusData: nsapVal !== null ? (nsapRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(nsapRows[0]?.isSampleData || isSampleFlag),
        sumber: nsapRows[0]?.sumberDokumen || 'Pengawasan Kearsipan Internal',
      },
      {
        indikatorKode: 'IK_TATA_KELOLA',
        komponenKode: 'SKM',
        nilai: skmVal,
        statusData: skmVal !== null ? (skmRows[0]?.statusData || 'DRAFT') : 'BELUM_DIINPUT',
        isSample: Boolean(skmRows[0]?.isSampleData || isSampleFlag),
        sumber: skmRows[0]?.sumberData || 'Survei Kepuasan Masyarakat',
      },
    ];

    // Hapus baris rekap lama pada iku_realizations untuk periode ini dan simpan ulang
    await db
      .delete(ikuRealizations)
      .where(and(eq(ikuRealizations.tahun, tahun), eq(ikuRealizations.triwulan, triwulan)));

    for (const item of computedMap) {
      await db.insert(ikuRealizations).values({
        periodId: period.id,
        tahun,
        triwulan,
        indikatorKode: item.indikatorKode,
        komponenKode: item.komponenKode,
        nilaiRealisasi: item.nilai,
        statusData: period.isLocked ? 'FINAL' : item.statusData,
        isSampleData: item.isSample,
        sumberDokumen: item.sumber,
        updatedBy: userId,
        createdBy: userId,
      });
    }
  } catch (error) {
    console.error('Database query failed in recalculateAndPersistPeriod:', error);
    throw new Error('Gagal menghitung ulang realisasi periode.', { cause: error });
  }
}

export async function getFullPeriodData(
  tahun: number,
  triwulan: TriwulanType,
  includeSampleData = true
) {
  try {
    await ensureInitialDataSeeded();
    const period = await getOrCreatePeriod(tahun, triwulan);

    const [
      indTargets,
      subTargets,
      bpkRowsAll,
      auditIntRowsAll,
      auditKinRowsAll,
      spiRowsAll,
      evakipRowsAll,
      ppgRowsAll,
      lhkanRowsAll,
      wbsRowsAll,
      ziRowsAll,
      apipRowsAll,
      kpiRowsAll,
      nesRowsAll,
      nckiRowsAll,
      nsapRowsAll,
      skmRowsAll,
    ] = await Promise.all([
      db.select().from(indicatorTargets).where(and(eq(indicatorTargets.tahun, tahun), eq(indicatorTargets.triwulan, triwulan))),
      db.select().from(subindicatorTargets).where(and(eq(subindicatorTargets.tahun, tahun), eq(subindicatorTargets.triwulan, triwulan))),
      db.select().from(tlBpk).where(and(eq(tlBpk.tahun, tahun), eq(tlBpk.triwulan, triwulan))).orderBy(desc(tlBpk.id)),
      db.select().from(tlAuditInternal).where(and(eq(tlAuditInternal.tahun, tahun), eq(tlAuditInternal.triwulan, triwulan))),
      db.select().from(tlAuditKinerja).where(and(eq(tlAuditKinerja.tahun, tahun), eq(tlAuditKinerja.triwulan, triwulan))),
      db.select().from(tlSpi).where(and(eq(tlSpi.tahun, tahun), eq(tlSpi.triwulan, triwulan))),
      db.select().from(evakip).where(and(eq(evakip.tahun, tahun), eq(evakip.triwulan, triwulan))).orderBy(desc(evakip.id)),
      db.select().from(ppg).where(and(eq(ppg.tahun, tahun), eq(ppg.triwulan, triwulan))).orderBy(desc(ppg.id)),
      db.select().from(lhkan).where(and(eq(lhkan.tahun, tahun), eq(lhkan.triwulan, triwulan))),
      db.select().from(wbs).where(and(eq(wbs.tahun, tahun), eq(wbs.triwulan, triwulan))),
      db.select().from(zi).where(and(eq(zi.tahun, tahun), eq(zi.triwulan, triwulan))).orderBy(desc(zi.id)),
      db.select().from(apip).where(and(eq(apip.tahun, tahun), eq(apip.triwulan, triwulan))).orderBy(desc(apip.id)),
      db.select().from(kpi).where(and(eq(kpi.tahun, tahun), eq(kpi.triwulan, triwulan))),
      db.select().from(nes).where(and(eq(nes.tahun, tahun), eq(nes.triwulan, triwulan))).orderBy(desc(nes.id)),
      db.select().from(ncki).where(and(eq(ncki.tahun, tahun), eq(ncki.triwulan, triwulan))).orderBy(desc(ncki.id)),
      db.select().from(nsap).where(and(eq(nsap.tahun, tahun), eq(nsap.triwulan, triwulan))).orderBy(desc(nsap.id)),
      db.select().from(skm).where(and(eq(skm.tahun, tahun), eq(skm.triwulan, triwulan))).orderBy(desc(skm.id)),
    ]);

    // Filter apakah menampilkan data simulasi atau hanya realisasi resmi
    const filterSample = <T extends { isSampleData: boolean }>(rows: T[]) =>
      includeSampleData ? rows : rows.filter((r) => !r.isSampleData);

    const bpkRows = filterSample(bpkRowsAll);
    const auditIntRows = filterSample(auditIntRowsAll);
    const auditKinRows = filterSample(auditKinRowsAll);
    const spiRows = filterSample(spiRowsAll);
    const evakipRows = filterSample(evakipRowsAll);
    const ppgRows = filterSample(ppgRowsAll);
    const lhkanRows = filterSample(lhkanRowsAll);
    const wbsRows = filterSample(wbsRowsAll);
    const ziRows = filterSample(ziRowsAll);
    const apipRows = filterSample(apipRowsAll);
    const kpiRows = filterSample(kpiRowsAll);
    const nesRows = filterSample(nesRowsAll);
    const nckiRows = filterSample(nckiRowsAll);
    const nsapRows = filterSample(nsapRowsAll);
    const skmRows = filterSample(skmRowsAll);

    // Hitung melalui Calculation Engine
    const tlpDetail = calculateTlpAggregate(
      bpkRows[0] ?? null,
      auditIntRows,
      auditKinRows,
      spiRows,
      tahun
    );
    const ppgDetail = calculatePpg(ppgRows[0] ?? null);
    const lhkanDetail = calculateLhkan(lhkanRows);
    const wbsDetail = calculateWbs(wbsRows);
    const kpiDetail = calculateKpi(kpiRows);
    const nckiDetail = calculateNcki(nckiRows[0] ?? null);

    const evakipVal =
      evakipRows.length > 0 && evakipRows[0].nilaiEvakip !== null
        ? Number(evakipRows[0].nilaiEvakip)
        : null;
    const ziVal =
      ziRows.length > 0 && ziRows[0].nilaiEvaluasiZi !== null
        ? Number(ziRows[0].nilaiEvaluasiZi)
        : null;
    const apipVal =
      apipRows.length > 0 && apipRows[0].nilaiKapabilitasApip !== null
        ? Number(apipRows[0].nilaiKapabilitasApip)
        : null;
    const nesVal =
      nesRows.length > 0 && nesRows[0].nilaiNes !== null
        ? Number(nesRows[0].nilaiNes)
        : null;
    const nsapVal =
      nsapRows.length > 0 && nsapRows[0].nilaiNsap !== null
        ? Number(nsapRows[0].nilaiNsap)
        : null;
    const skmVal =
      skmRows.length > 0 && skmRows[0].nilaiSkm !== null
        ? Number(skmRows[0].nilaiSkm)
        : null;

    const ikPengawasanCalc = calculateIkPengawasanIntern({
      TLP: tlpDetail.nilaiTlp,
      EvAKIP: evakipVal,
      PPG: ppgDetail.nilaiPpg,
      LHKAN: lhkanDetail.nilaiLhkan,
      WBS: wbsDetail.nilaiWbs,
      ZI: ziVal,
      APIP: apipVal,
      KPI: kpiDetail.nilaiKpi,
    });

    const ikTataKelolaCalc = calculateIkTataKelolaInternal({
      NES: nesVal,
      NCKI: nckiDetail.nilaiNcki,
      NSAP: nsapVal,
      SKM: skmVal,
    });

    // Target mapping (fallback ke konstanta resmi 2026 jika tahun 2026)
    const targetIkPengawasan =
      indTargets.find((t) => t.indikatorKode === 'IK_PENGAWASAN')?.targetTriwulan ??
      (tahun === 2026 ? TARGET_TRIWULAN_IK_PENGAWASAN_2026[triwulan] : 76.50);
    const targetTahunanPengawasan =
      indTargets.find((t) => t.indikatorKode === 'IK_PENGAWASAN')?.targetTahunan ??
      TARGET_TAHUNAN_2026.IK_PENGAWASAN;

    const targetIkTataKelola =
      indTargets.find((t) => t.indikatorKode === 'IK_TATA_KELOLA')?.targetTriwulan ??
      (tahun === 2026 ? TARGET_TRIWULAN_IK_TATA_KELOLA_2026[triwulan] : 87.80);
    const targetTahunanTataKelola =
      indTargets.find((t) => t.indikatorKode === 'IK_TATA_KELOLA')?.targetTahunan ??
      TARGET_TAHUNAN_2026.IK_TATA_KELOLA;

    const getSubTarget = (kode: string, fallback: number) => {
      const found = subTargets.find((s) => s.komponenKode === kode);
      return found !== undefined ? Number(found.targetNilai) : fallback;
    };

    const komponenPengawasanList = (
      ['TLP', 'EvAKIP', 'PPG', 'LHKAN', 'WBS', 'ZI', 'APIP', 'KPI'] as KomponenPengawasanType[]
    ).map((kode) => {
      const target = getSubTarget(
        kode,
        TARGET_KOMPONEN_PENGAWASAN_2026[kode][triwulan]
      );
      const realisasi = ikPengawasanCalc.komponenValues[kode];
      let status: string = 'BELUM_DIINPUT';
      let isSample = false;

      if (realisasi !== null) {
        status = period.isLocked ? 'FINAL' : period.statusPeriode === 'FINAL' ? 'FINAL' : 'TERSEDIA';
        if (kode === 'TLP') isSample = Boolean(bpkRows[0]?.isSampleData || auditIntRows[0]?.isSampleData);
        if (kode === 'EvAKIP') isSample = Boolean(evakipRows[0]?.isSampleData);
        if (kode === 'PPG') isSample = Boolean(ppgRows[0]?.isSampleData);
        if (kode === 'LHKAN') isSample = Boolean(lhkanRows[0]?.isSampleData);
        if (kode === 'WBS') isSample = Boolean(wbsRows[0]?.isSampleData);
        if (kode === 'ZI') isSample = Boolean(ziRows[0]?.isSampleData);
        if (kode === 'APIP') isSample = Boolean(apipRows[0]?.isSampleData);
        if (kode === 'KPI') isSample = Boolean(kpiRows[0]?.isSampleData);
      }

      return {
        kode,
        nama: KOMPONEN_META[kode].nama,
        satuan: KOMPONEN_META[kode].satuan,
        rumusRingkas: KOMPONEN_META[kode].rumusRingkas,
        target,
        realisasi,
        selisih: realisasi !== null ? realisasi - target : null,
        capaianPersen:
          realisasi !== null && target > 0 ? (realisasi / target) * 100 : null,
        statusData: status,
        isSampleData: isSample,
      };
    });

    const komponenTataKelolaList = (
      ['NES', 'NCKI', 'NSAP', 'SKM'] as KomponenTataKelolaType[]
    ).map((kode) => {
      const target = getSubTarget(
        kode,
        TARGET_KOMPONEN_TATA_KELOLA_2026[kode][triwulan]
      );
      const realisasi = ikTataKelolaCalc.komponenValues[kode];
      let status: string = 'BELUM_DIINPUT';
      let isSample = false;

      if (realisasi !== null) {
        status = period.isLocked ? 'FINAL' : period.statusPeriode === 'FINAL' ? 'FINAL' : 'TERSEDIA';
        if (kode === 'NES') isSample = Boolean(nesRows[0]?.isSampleData);
        if (kode === 'NCKI') isSample = Boolean(nckiRows[0]?.isSampleData);
        if (kode === 'NSAP') isSample = Boolean(nsapRows[0]?.isSampleData);
        if (kode === 'SKM') isSample = Boolean(skmRows[0]?.isSampleData);
      }

      return {
        kode,
        nama: KOMPONEN_META[kode].nama,
        satuan: KOMPONEN_META[kode].satuan,
        rumusRingkas: KOMPONEN_META[kode].rumusRingkas,
        target,
        realisasi,
        selisih: realisasi !== null ? realisasi - target : null,
        capaianPersen:
          realisasi !== null && target > 0 ? (realisasi / target) * 100 : null,
        statusData: status,
        isSampleData: isSample,
      };
    });

    return {
      tahun,
      triwulan,
      period,
      includeSampleData,
      ikPengawasan: {
        kode: 'IK_PENGAWASAN',
        nama: 'IK - Indeks Pengawasan Intern LAN',
        targetTahunan: targetTahunanPengawasan,
        targetTriwulan: targetIkPengawasan,
        realisasi: ikPengawasanCalc.nilaiIk,
        rataRataTersedia: ikPengawasanCalc.rataRataKomponenTersedia,
        jumlahKomponenTersedia: ikPengawasanCalc.jumlahKomponenTersedia,
        totalKomponen: 8,
        selisih:
          ikPengawasanCalc.nilaiIk !== null
            ? ikPengawasanCalc.nilaiIk - targetIkPengawasan
            : null,
        capaianPersen:
          ikPengawasanCalc.nilaiIk !== null && targetIkPengawasan > 0
            ? (ikPengawasanCalc.nilaiIk / targetIkPengawasan) * 100
            : null,
        statusData:
          ikPengawasanCalc.nilaiIk === null
            ? 'BELUM_DIINPUT'
            : period.isLocked
            ? 'FINAL'
            : period.statusPeriode,
        rumusSubstitusi: ikPengawasanCalc.rumusSubstitusi,
        komponen: komponenPengawasanList,
      },
      ikTataKelola: {
        kode: 'IK_TATA_KELOLA',
        nama: 'IK - Indeks Tata Kelola Internal Inspektorat',
        targetTahunan: targetTahunanTataKelola,
        targetTriwulan: targetIkTataKelola,
        realisasi: ikTataKelolaCalc.nilaiIk,
        rataRataTersedia: ikTataKelolaCalc.rataRataKomponenTersedia,
        jumlahKomponenTersedia: ikTataKelolaCalc.jumlahKomponenTersedia,
        totalKomponen: 4,
        selisih:
          ikTataKelolaCalc.nilaiIk !== null
            ? ikTataKelolaCalc.nilaiIk - targetIkTataKelola
            : null,
        capaianPersen:
          ikTataKelolaCalc.nilaiIk !== null && targetIkTataKelola > 0
            ? (ikTataKelolaCalc.nilaiIk / targetIkTataKelola) * 100
            : null,
        statusData:
          ikTataKelolaCalc.nilaiIk === null
            ? 'BELUM_DIINPUT'
            : period.isLocked
            ? 'FINAL'
            : period.statusPeriode,
        rumusSubstitusi: ikTataKelolaCalc.rumusSubstitusi,
        komponen: komponenTataKelolaList,
      },
      details: {
        tlp: {
          summary: tlpDetail,
          bpk: bpkRows[0] ?? null,
          auditInternal: auditIntRows,
          auditKinerja: auditKinRows,
          spi: spiRows,
        },
        evakip: evakipRows[0] ?? null,
        ppg: {
          row: ppgRows[0] ?? null,
          calc: ppgDetail,
        },
        lhkan: {
          rows: lhkanRows,
          calc: lhkanDetail,
        },
        wbs: {
          rows: wbsRows,
          calc: wbsDetail,
        },
        zi: ziRows[0] ?? null,
        apip: apipRows[0] ?? null,
        kpi: {
          rows: kpiRows,
          calc: kpiDetail,
        },
        nes: nesRows[0] ?? null,
        ncki: {
          row: nckiRows[0] ?? null,
          calc: nckiDetail,
        },
        nsap: nsapRows[0] ?? null,
        skm: skmRows[0] ?? null,
      },
    };
  } catch (error) {
    console.error('Database query failed in getFullPeriodData:', error);
    throw new Error('Gagal mengambil data kinerja periode.', { cause: error });
  }
}

export async function getAnnualOverviewData(tahun: number, includeSampleData = true) {
  try {
    await ensureInitialDataSeeded();
    const quartersData = await Promise.all(
      DAFTAR_TRIWULAN.map((tw) => getFullPeriodData(tahun, tw, includeSampleData))
    );

    // Cari triwulan terakhir yang memiliki data realisasi
    let latestQuarterWithData: TriwulanType = 'TW I';
    for (const qd of quartersData) {
      if (qd.ikPengawasan.realisasi !== null || qd.ikTataKelola.realisasi !== null) {
        latestQuarterWithData = qd.triwulan;
      }
    }

    return {
      tahun,
      latestQuarterWithData,
      quarters: quartersData,
    };
  } catch (error) {
    console.error('Database query failed in getAnnualOverviewData:', error);
    throw new Error('Gagal memuat ringkasan tahunan.', { cause: error });
  }
}

export async function logChange(params: {
  tahun: number;
  triwulan: string;
  userId?: number;
  userNama: string;
  userEmail: string;
  indikator: string;
  komponen: string;
  nilaiSebelum: string;
  nilaiSesudah: string;
  keterangan?: string;
}) {
  try {
    const period = await getOrCreatePeriod(params.tahun, params.triwulan, params.userId);
    const now = new Date();
    const tanggal = now.toISOString().split('T')[0];
    const waktu = now.toTimeString().split(' ')[0];

    await db.insert(changeLogs).values({
      periodId: period.id,
      tahun: params.tahun,
      triwulan: params.triwulan,
      tanggal,
      waktu,
      userNama: params.userNama,
      userEmail: params.userEmail,
      indikator: params.indikator,
      komponen: params.komponen,
      nilaiSebelum: params.nilaiSebelum,
      nilaiSesudah: params.nilaiSesudah,
      keterangan: params.keterangan || 'Pembaruan data melalui aplikasi',
      createdBy: params.userId,
      updatedBy: params.userId,
    });
  } catch (error) {
    console.error('Database query failed in logChange:', error);
  }
}

export async function getChangeLogs(tahun?: number, triwulan?: string) {
  try {
    await ensureInitialDataSeeded();
    const conditions = [];
    if (tahun) conditions.push(eq(changeLogs.tahun, tahun));
    if (triwulan && triwulan !== 'SEMUA') conditions.push(eq(changeLogs.triwulan, triwulan));

    if (conditions.length > 0) {
      return await db
        .select()
        .from(changeLogs)
        .where(and(...conditions))
        .orderBy(desc(changeLogs.id))
        .limit(200);
    }

    return await db.select().from(changeLogs).orderBy(desc(changeLogs.id)).limit(200);
  } catch (error) {
    console.error('Database query failed in getChangeLogs:', error);
    throw new Error('Gagal memuat riwayat perubahan.', { cause: error });
  }
}

export { formatDecimal };
