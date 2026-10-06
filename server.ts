import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  getOrCreateUser,
  updateUserRole,
  getFullPeriodData,
  getAnnualOverviewData,
  getChangeLogs,
  ensureInitialDataSeeded,
} from './src/db/repository.ts';
import {
  saveTlBpk,
  addTlAuditInternalRow,
  deleteTlAuditInternalRow,
  addTlAuditKinerjaRow,
  deleteTlAuditKinerjaRow,
  saveTlSpi,
  saveEvakip,
  savePpg,
  addLhkanRow,
  deleteLhkanRow,
  addWbsRow,
  deleteWbsRow,
  saveZi,
  saveApip,
  addKpiRow,
  deleteKpiRow,
  saveNes,
  saveNcki,
  saveNsap,
  saveSkm,
  updatePeriodLockStatus,
  saveCustomTarget,
} from './src/db/mutations.ts';
import { TriwulanType } from './src/data/officialTargets.ts';
import { runOfficialFormulaTests } from './src/engine/calculationEngine.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Public health & formula test endpoint
  app.get('/api/formula-tests', (_req, res) => {
    try {
      const results = runOfficialFormulaTests();
      res.json({ tests: results });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal menjalankan pengujian formula' });
    }
  });

  // Public read endpoints for Dashboard & Laporan (agar Pimpinan/Eksekutif dapat langsung memantau,
  // serta mendukung autentikasi penuh untuk manajemen & perubahan data)
  app.get('/api/overview', async (req, res) => {
    try {
      const tahun = Number(req.query.tahun) || 2026;
      const includeSample = req.query.includeSample !== 'false';
      const data = await getAnnualOverviewData(tahun, includeSample);
      res.json(data);
    } catch (error: any) {
      console.error('Error in GET /api/overview:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat ringkasan tahunan' });
    }
  });

  app.get('/api/period', async (req, res) => {
    try {
      const tahun = Number(req.query.tahun) || 2026;
      const triwulan = (req.query.triwulan as TriwulanType) || 'TW III';
      const includeSample = req.query.includeSample !== 'false';
      const data = await getFullPeriodData(tahun, triwulan, includeSample);
      res.json(data);
    } catch (error: any) {
      console.error('Error in GET /api/period:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat data periode' });
    }
  });

  app.get('/api/logs', async (req, res) => {
    try {
      const tahun = req.query.tahun ? Number(req.query.tahun) : undefined;
      const triwulan = req.query.triwulan ? String(req.query.triwulan) : undefined;
      const logs = await getChangeLogs(tahun, triwulan);
      res.json({ logs });
    } catch (error: any) {
      console.error('Error in GET /api/logs:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat riwayat perubahan' });
    }
  });

  // Authenticated User Profile Sync
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || 'operator@lan.go.id';
      const name = req.user!.name || email.split('@')[0];
      const dbUser = await getOrCreateUser(uid, email, name);
      res.json({ user: dbUser });
    } catch (error: any) {
      console.error('Error in GET /api/me:', error);
      res.status(500).json({ error: error.message || 'Gagal memuat profil pengguna' });
    }
  });

  app.post('/api/me/role', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { role } = req.body;
      if (role !== 'OPERATOR' && role !== 'PIMPINAN') {
        return res.status(400).json({ error: 'Role tidak valid' });
      }
      const updated = await updateUserRole(uid, role);
      res.json({ user: updated });
    } catch (error: any) {
      console.error('Error in POST /api/me/role:', error);
      res.status(500).json({ error: error.message || 'Gagal mengubah role' });
    }
  });

  // Helper untuk mendapatkan user context (mendukung token Firebase Auth)
  async function resolveUserContext(req: AuthRequest) {
    const uid = req.user!.uid;
    const email = req.user!.email || 'operator@lan.go.id';
    const name = req.user!.name || email.split('@')[0];
    const dbUser = await getOrCreateUser(uid, email, name);
    return {
      id: dbUser.id,
      uid: dbUser.uid,
      email: dbUser.email,
      nama: dbUser.nama,
      role: dbUser.role,
    };
  }

  // Protected Mutation Endpoints
  app.post('/api/data/bpk', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveTlBpk(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data BPK' });
    }
  });

  app.post('/api/data/audit-internal', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await addTlAuditInternalRow(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menambah data Audit Internal' });
    }
  });

  app.delete('/api/data/audit-internal/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      await deleteTlAuditInternalRow(Number(req.params.id), user);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menghapus data Audit Internal' });
    }
  });

  app.post('/api/data/audit-kinerja', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await addTlAuditKinerjaRow(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menambah data Audit Kinerja' });
    }
  });

  app.delete('/api/data/audit-kinerja/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      await deleteTlAuditKinerjaRow(Number(req.params.id), user);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menghapus data Audit Kinerja' });
    }
  });

  app.post('/api/data/spi', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveTlSpi(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data SPI' });
    }
  });

  app.post('/api/data/evakip', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveEvakip(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data EvAKIP' });
    }
  });

  app.post('/api/data/ppg', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await savePpg(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data PPG' });
    }
  });

  app.post('/api/data/lhkan', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await addLhkanRow(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menambah data LHKAN' });
    }
  });

  app.delete('/api/data/lhkan/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      await deleteLhkanRow(Number(req.params.id), user);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menghapus data LHKAN' });
    }
  });

  app.post('/api/data/wbs', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await addWbsRow(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menambah data WBS' });
    }
  });

  app.delete('/api/data/wbs/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      await deleteWbsRow(Number(req.params.id), user);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menghapus data WBS' });
    }
  });

  app.post('/api/data/zi', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveZi(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data ZI' });
    }
  });

  app.post('/api/data/apip', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveApip(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data APIP' });
    }
  });

  app.post('/api/data/kpi', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await addKpiRow(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menambah data KPI' });
    }
  });

  app.delete('/api/data/kpi/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      await deleteKpiRow(Number(req.params.id), user);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menghapus data KPI' });
    }
  });

  app.post('/api/data/nes', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveNes(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data NES' });
    }
  });

  app.post('/api/data/ncki', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveNcki(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data NCKI' });
    }
  });

  app.post('/api/data/nsap', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveNsap(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data NSAP' });
    }
  });

  app.post('/api/data/skm', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, ...payload } = req.body;
      await saveSkm(Number(tahun), String(triwulan), payload, user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan data SKM' });
    }
  });

  app.post('/api/period/status', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, action, alasan } = req.body;
      await updatePeriodLockStatus(Number(tahun), String(triwulan), action, String(alasan || ''), user);
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal mengubah status periode' });
    }
  });

  app.post('/api/targets', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { tahun, triwulan, indikatorKode, komponenKode, targetNilai } = req.body;
      await saveCustomTarget(
        Number(tahun),
        String(triwulan),
        indikatorKode,
        komponenKode || null,
        Number(targetNilai),
        user
      );
      const updated = await getFullPeriodData(Number(tahun), triwulan as TriwulanType, true);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Gagal menyimpan target' });
    }
  });

  // Bulk Import Excel Endpoint
  app.post('/api/import-excel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await resolveUserContext(req);
      const { records } = req.body as {
        records: Array<{
          tahun: number;
          triwulan: string;
          kategori: string;
          data: Record<string, any>;
        }>;
      };

      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ error: 'Tidak ada baris data untuk diimpor.' });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        try {
          const thn = Number(rec.tahun) || 2026;
          const tw = String(rec.triwulan || 'TW I');
          const kat = String(rec.kategori || '').toUpperCase();
          const d = rec.data || {};

          if (kat === 'BPK') {
            await saveTlBpk(
              thn,
              tw,
              {
                totalRekomendasi: Number(d.totalRekomendasi || 0),
                sesuaiRekomendasi: Number(d.sesuaiRekomendasi || 0),
                tidakDapatDitindaklanjutiSah: Number(d.tidakDapatDitindaklanjutiSah || 0),
                sumberDokumen: d.sumberDokumen || 'Import Excel IKU_Pengawasan_Intern_2026.xlsx',
                keterangan: d.keterangan || 'Import via Excel',
              },
              user
            );
          } else if (kat === 'AUDIT_INTERNAL') {
            await addTlAuditInternalRow(
              thn,
              tw,
              {
                tahunLha: Number(d.tahunLha || thn - 1),
                unitSatker: String(d.unitSatker || 'Satker LAN'),
                totalRekomendasi: Number(d.totalRekomendasi || 0),
                sesuaiRekomendasi: Number(d.sesuaiRekomendasi || 0),
                belumSesuai: Number(d.belumSesuai || 0),
                belumDitindaklanjuti: Number(d.belumDitindaklanjuti || 0),
                sumberDokumen: 'Import Excel IKU_Pengawasan_Intern_2026.xlsx',
              },
              user
            );
          } else if (kat === 'AUDIT_KINERJA') {
            await addTlAuditKinerjaRow(
              thn,
              tw,
              {
                tahunLha: Number(d.tahunLha || thn - 1),
                programUnit: String(d.programUnit || 'Program LAN'),
                totalRekomendasi: Number(d.totalRekomendasi || 0),
                sesuaiRekomendasi: Number(d.sesuaiRekomendasi || 0),
                belumSesuai: Number(d.belumSesuai || 0),
                belumDitindaklanjuti: Number(d.belumDitindaklanjuti || 0),
                sumberDokumen: 'Import Excel IKU_Pengawasan_Intern_2026.xlsx',
              },
              user
            );
          } else if (kat === 'SPI') {
            await saveTlSpi(
              thn,
              tw,
              {
                tahunSpi: Number(d.tahunSpi || thn - 1),
                totalRekomendasi: Number(d.totalRekomendasi || 0),
                sesuaiRekomendasi: Number(d.sesuaiRekomendasi || 0),
                telahDivalidasiKpk: Number(d.telahDivalidasiKpk || 0),
                statusTindakLanjut: String(d.statusTindakLanjut || 'Sesuai & Tervalidasi KPK'),
                sumberDokumen: 'Import Excel IKU_Pengawasan_Intern_2026.xlsx',
              },
              user
            );
          } else if (kat === 'EVAKIP') {
            await saveEvakip(
              thn,
              tw,
              {
                nilaiEvakip:
                  d.nilaiEvakip === null || d.nilaiEvakip === '' || d.nilaiEvakip === undefined
                    ? null
                    : Number(d.nilaiEvakip),
                sumberDokumen: d.sumberDokumen || 'Import Excel',
                keterangan: d.keterangan || '',
              },
              user
            );
          } else if (kat === 'PPG') {
            await savePpg(
              thn,
              tw,
              {
                totalPelaporanGratifikasi: Number(d.totalPelaporanGratifikasi || 0),
                pelaporanDiproses: Number(d.pelaporanDiproses || 0),
                nilaiPpgKpk: Number(d.nilaiPpgKpk || 0),
                sumberDokumen: d.sumberDokumen || 'Import Excel',
              },
              user
            );
          } else if (kat === 'LHKAN') {
            await addLhkanRow(
              thn,
              tw,
              {
                unitKerja: String(d.unitKerja || 'Unit Kerja LAN'),
                jenisLaporan: String(d.jenisLaporan || 'LHKAN'),
                jumlahWajibLapor: Number(d.jumlahWajibLapor || 0),
                jumlahSudahLapor: Number(d.jumlahSudahLapor || 0),
                sumberDokumen: d.sumberDokumen || 'Import Excel',
              },
              user
            );
          } else if (kat === 'ZI') {
            await saveZi(
              thn,
              tw,
              {
                nilaiEvaluasiZi:
                  d.nilaiEvaluasiZi === null || d.nilaiEvaluasiZi === ''
                    ? null
                    : Number(d.nilaiEvaluasiZi),
                sumberEvaluasi: d.sumberEvaluasi || 'Import Excel',
              },
              user
            );
          } else if (kat === 'APIP') {
            await saveApip(
              thn,
              tw,
              {
                nilaiKapabilitasApip:
                  d.nilaiKapabilitasApip === null || d.nilaiKapabilitasApip === ''
                    ? null
                    : Number(d.nilaiKapabilitasApip),
                tahunPeriodePenilaian: String(d.tahunPeriodePenilaian || thn),
                sumberDokumen: d.sumberDokumen || 'Import Excel',
              },
              user
            );
          } else if (kat === 'NES') {
            await saveNes(
              thn,
              tw,
              {
                nilaiNes:
                  d.nilaiNes === null || d.nilaiNes === '' ? null : Number(d.nilaiNes),
                sumberDokumen: d.sumberDokumen || 'Import Excel',
              },
              user
            );
          } else if (kat === 'NCKI') {
            await saveNcki(
              thn,
              tw,
              {
                rencanaPenarikanAnggaran: Number(d.rencanaPenarikanAnggaran || 0),
                realisasiAnggaran: Number(d.realisasiAnggaran || 0),
                rencanaCapaianOutput: Number(d.rencanaCapaianOutput || 0),
                realisasiCapaianOutput: Number(d.realisasiCapaianOutput || 0),
                sumberDokumen: d.sumberDokumen || 'Import Excel',
              },
              user
            );
          } else if (kat === 'NSAP') {
            await saveNsap(
              thn,
              tw,
              {
                nilaiNsap:
                  d.nilaiNsap === null || d.nilaiNsap === '' ? null : Number(d.nilaiNsap),
                sumberDokumen: d.sumberDokumen || 'Import Excel',
              },
              user
            );
          } else if (kat === 'SKM') {
            await saveSkm(
              thn,
              tw,
              {
                nilaiSkm:
                  d.nilaiSkm === null || d.nilaiSkm === '' ? null : Number(d.nilaiSkm),
                jumlahResponden: Number(d.jumlahResponden || 0),
                periodeSurvei: String(d.periodeSurvei || `${tw} ${thn}`),
                sumberData: d.sumberData || 'Import Excel',
              },
              user
            );
          } else {
            errors.push(`Baris ${i + 1}: Kategori "${kat}" tidak dikenali.`);
            continue;
          }
          importedCount++;
        } catch (rowErr: any) {
          errors.push(`Baris ${i + 1}: ${rowErr.message || 'Gagal impor baris'}`);
        }
      }

      res.json({
        importedCount,
        totalSubmitted: records.length,
        errors,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Gagal memproses import Excel' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server IKU Pengawasan Intern LAN berjalan pada http://0.0.0.0:${PORT}`);
    // Inisialisasi data target resmi secara asinkron saat request atau setelah server siap
    ensureInitialDataSeeded().catch((err) =>
      console.error('Background seed check info:', err)
    );
  });
}

startServer();
