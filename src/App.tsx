import React, { useCallback, useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Layout, NavSection } from './components/Layout.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { InputDataView } from './views/InputDataView.tsx';
import { TargetView } from './views/TargetView.tsx';
import { LaporanImportView } from './views/LaporanImportView.tsx';
import { ValidasiView } from './views/ValidasiView.tsx';
import { RiwayatPengaturanView } from './views/RiwayatPengaturanView.tsx';
import { DetailCalculationModal } from './components/DetailCalculationModal.tsx';
import { KomponenType, TriwulanType } from './data/officialTargets.ts';

function MainWorkspace() {
  const { activeRole } = useAuth();
  const [activeSection, setActiveSection] = useState<NavSection>('DASHBOARD');
  const [tahun, setTahun] = useState<number>(2026);
  const [triwulan, setTriwulan] = useState<TriwulanType>('TW III');
  const [hasInitializedQuarter, setHasInitializedQuarter] = useState<boolean>(false);
  const [indikatorFilter, setIndikatorFilter] = useState<
    'SEMUA' | 'IK_PENGAWASAN' | 'IK_TATA_KELOLA'
  >('SEMUA');
  const [includeSampleData, setIncludeSampleData] = useState<boolean>(true);

  const [overviewData, setOverviewData] = useState<any>(null);
  const [periodData, setPeriodData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [detailModalKomponen, setDetailModalKomponen] = useState<KomponenType | null>(null);
  const [selectedInputKomponen, setSelectedInputKomponen] = useState<KomponenType | null>(null);

  const fetchAllData = useCallback(async () => {
    setErrorMsg(null);
    try {
      const ovRes = await fetch(
        `/api/overview?tahun=${tahun}&includeSample=${includeSampleData}`
      );
      if (!ovRes.ok) {
        throw new Error('Gagal memuat ringkasan data dari server.');
      }
      const ovJson = await ovRes.json();
      setOverviewData(ovJson);

      let targetTw = triwulan;
      if (!hasInitializedQuarter && ovJson.latestQuarterWithData) {
        targetTw = ovJson.latestQuarterWithData as TriwulanType;
        setTriwulan(targetTw);
        setHasInitializedQuarter(true);
      }

      const foundInOverview = (ovJson.quarters || []).find(
        (q: any) => q.triwulan === targetTw
      );
      if (foundInOverview) {
        setPeriodData(foundInOverview);
      } else {
        const pRes = await fetch(
          `/api/period?tahun=${tahun}&triwulan=${encodeURIComponent(
            targetTw
          )}&includeSample=${includeSampleData}`
        );
        if (pRes.ok) {
          const pJson = await pRes.json();
          setPeriodData(pJson);
        }
      }
    } catch (err: any) {
      console.error('Failed loading workspace data:', err);
      setErrorMsg(err.message || 'Gagal memuat data kinerja.');
    }
  }, [tahun, triwulan, includeSampleData, hasInitializedQuarter]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleNavigateToInputKomponen = (kode: KomponenType) => {
    setSelectedInputKomponen(kode);
    if (kode === 'TLP') {
      setActiveSection('DATA_TLP');
    } else if (['NES', 'NCKI', 'NSAP', 'SKM'].includes(kode)) {
      setActiveSection('DATA_TATA_KELOLA');
    } else {
      setActiveSection('DATA_IKU');
    }
  };

  return (
    <Layout
      activeSection={activeSection}
      onSelectSection={(sec) => {
        setSelectedInputKomponen(null);
        setActiveSection(sec);
      }}
      tahunAktif={tahun}
      triwulanAktif={triwulan}
      onChangeTahun={(newYear) => setTahun(newYear)}
      onChangeTriwulan={(newTw) => {
        setHasInitializedQuarter(true);
        setTriwulan(newTw);
      }}
    >
      {errorMsg && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={fetchAllData}
            className="rounded bg-red-800 px-3 py-1 text-white hover:bg-red-900"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {activeSection === 'DASHBOARD' && (
        <DashboardView
          tahun={tahun}
          triwulan={triwulan}
          indikatorFilter={indikatorFilter}
          includeSampleData={includeSampleData}
          overviewData={overviewData}
          periodData={periodData}
          onChangeTahun={(yr) => setTahun(yr)}
          onChangeTriwulan={(tw) => {
            setHasInitializedQuarter(true);
            setTriwulan(tw);
          }}
          onChangeIndikatorFilter={setIndikatorFilter}
          onChangeIncludeSample={setIncludeSampleData}
          onSelectKomponenDetail={(kode) => setDetailModalKomponen(kode)}
        />
      )}

      {(activeSection === 'INPUT_DATA' ||
        activeSection === 'DATA_TLP' ||
        activeSection === 'DATA_IKU' ||
        activeSection === 'DATA_TATA_KELOLA') && (
        <InputDataView
          mode={activeSection}
          tahun={tahun}
          triwulan={triwulan}
          selectedKomponenInitial={selectedInputKomponen}
          periodData={periodData}
          onChangeTahun={(yr) => setTahun(yr)}
          onChangeTriwulan={(tw) => {
            setHasInitializedQuarter(true);
            setTriwulan(tw);
          }}
          onRefresh={fetchAllData}
        />
      )}

      {activeSection === 'TARGET' && <TargetView onRefreshData={fetchAllData} />}

      {activeSection === 'LAPORAN' && (
        <LaporanImportView
          tahun={tahun}
          triwulan={triwulan}
          periodData={periodData}
          onChangeTahun={(yr) => setTahun(yr)}
          onChangeTriwulan={(tw) => {
            setHasInitializedQuarter(true);
            setTriwulan(tw);
          }}
          onRefresh={fetchAllData}
        />
      )}

      {activeSection === 'VALIDASI' && <ValidasiView periodData={periodData} />}

      {(activeSection === 'RIWAYAT' || activeSection === 'PENGATURAN') && (
        <RiwayatPengaturanView
          mode={activeSection}
          tahun={tahun}
          triwulan={triwulan}
          includeSampleData={includeSampleData}
          onChangeIncludeSample={setIncludeSampleData}
        />
      )}

      <DetailCalculationModal
        komponenKode={detailModalKomponen}
        periodData={periodData}
        onClose={() => setDetailModalKomponen(null)}
        onNavigateToInput={handleNavigateToInputKomponen}
        canEdit={activeRole === 'OPERATOR'}
      />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainWorkspace />
    </AuthProvider>
  );
}
