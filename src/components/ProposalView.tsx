import React, { useMemo, useRef, useState } from 'react';
import {
  Eye,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { createDefaultProposal } from '../data/initialData';
import {
  CommitteeMember,
  ExamDay,
  ExamProposal,
  ProposalBudgetItem,
  SchoolIdentity,
  Student,
  Supervisor,
} from '../types/exam';
import { formatIndonesianDate, formatRupiah, getRoomStats } from '../utils/examLogic';
import { PdfDownloadButton } from './PdfDownloadButton';
import { PrintPageConfig } from './PrintOrientationControl';
import { LogoSekolah, OfficialLetterhead } from './SchoolLogos';

interface ProposalViewProps {
  school: SchoolIdentity;
  committee: CommitteeMember[];
  supervisors: Supervisor[];
  students: Student[];
  tracks: string[];
  examDays: ExamDay[];
  roomCount: number;
  proposal: ExamProposal;
  onUpdateProposal: (next: ExamProposal) => void;
}

type EditorTab = 'pengantar' | 'bab1' | 'bab2_3' | 'bab4_rab';

export const ProposalView: React.FC<ProposalViewProps> = ({
  school,
  committee,
  supervisors,
  students,
  tracks,
  examDays,
  roomCount,
  proposal: rawProposal,
  onUpdateProposal,
}) => {
  const [mode, setMode] = useState<'edit' | 'print'>('edit');
  const [editorTab, setEditorTab] = useState<EditorTab>('pengantar');
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Merge defaults so older saved workspaces always have every required chapter populated
  const proposal = useMemo<ExamProposal>(() => {
    const defaults = createDefaultProposal();
    return {
      ...defaults,
      ...rawProposal,
      kataPengantar: rawProposal.kataPengantar || defaults.kataPengantar,
      pengertian: rawProposal.pengertian || defaults.pengertian,
      ruangLingkup: rawProposal.ruangLingkup || defaults.ruangLingkup,
      sasaran: rawProposal.sasaran || defaults.sasaran,
      sistematikaPenulisan: rawProposal.sistematikaPenulisan || defaults.sistematikaPenulisan,
      organisasiKepanitiaan: rawProposal.organisasiKepanitiaan || defaults.organisasiKepanitiaan,
      pembagianTugas: rawProposal.pembagianTugas || defaults.pembagianTugas,
      tahapPerencanaan: rawProposal.tahapPerencanaan || defaults.tahapPerencanaan,
      publikasi: rawProposal.publikasi || defaults.publikasi,
      pengadaanPiranti: rawProposal.pengadaanPiranti || defaults.pengadaanPiranti,
      pengadministrasian: rawProposal.pengadministrasian || defaults.pengadministrasian,
      pelaksanaanPengawasan: rawProposal.pelaksanaanPengawasan || defaults.pelaksanaanPengawasan,
      pemeriksaanPengolahan: rawProposal.pemeriksaanPengolahan || defaults.pemeriksaanPengolahan,
      penilaian: rawProposal.penilaian || defaults.penilaian,
      kegiatanAkhir: rawProposal.kegiatanAkhir || defaults.kegiatanAkhir,
    };
  }, [rawProposal]);

  const totalBudget = useMemo(
    () =>
      proposal.budgetItems.reduce(
        (sum, item) => sum + (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0),
        0
      ),
    [proposal.budgetItems]
  );

  const totalSessions = useMemo(
    () => examDays.reduce((acc, d) => acc + d.sessions.length, 0),
    [examDays]
  );

  const roomStats = useMemo(() => getRoomStats(students, roomCount), [students, roomCount]);

  const committeeRows = useMemo(() => {
    const hasPenanggungJawab = committee.some((m) =>
      m.role.trim().toLowerCase().includes('penanggung jawab')
    );
    if (hasPenanggungJawab) {
      return committee.map((m) => ({ id: m.id, name: m.name, role: m.role }));
    }
    return [
      { id: 'pj-auto', name: school.kepalaMadrasah, role: 'Penanggung Jawab' },
      ...committee.map((m) => ({ id: m.id, name: m.name, role: m.role })),
    ];
  }, [committee, school.kepalaMadrasah]);

  const dateRangeLabel = useMemo(() => {
    if (examDays.length === 0) return '-';
    const first = formatIndonesianDate(examDays[0].date);
    const last = formatIndonesianDate(examDays[examDays.length - 1].date);
    if (examDays.length === 1) return `${first.dayName}, ${first.fullDate}`;
    return `${first.dayName}, ${first.fullDate} s.d. ${last.dayName}, ${last.fullDate}`;
  }, [examDays]);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const updateField = <K extends keyof ExamProposal>(key: K, value: ExamProposal[K]) => {
    onUpdateProposal({ ...proposal, [key]: value });
  };

  const handleBudgetChange = (id: string, patch: Partial<ProposalBudgetItem>) => {
    updateField(
      'budgetItems',
      proposal.budgetItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleAddBudgetItem = () => {
    updateField('budgetItems', [
      ...proposal.budgetItems,
      {
        id: `rab-${Date.now()}`,
        uraian: 'Item Anggaran Baru',
        volume: 1,
        satuan: 'Paket',
        hargaSatuan: 100000,
      },
    ]);
  };

  const handleRemoveBudgetItem = (id: string) => {
    updateField(
      'budgetItems',
      proposal.budgetItems.filter((item) => item.id !== id)
    );
  };

  const handleListTextChange = (key: 'dasarHukum' | 'tujuanKegiatan', rawText: string) => {
    updateField(key, rawText.split(/\r?\n/));
  };

  const handleResetDefault = () => {
    onUpdateProposal(createDefaultProposal());
  };

  const prepareForPdf = async () => {
    if (mode !== 'print') {
      setMode('print');
      await new Promise((r) => setTimeout(r, 180));
    }
  };

  const getPdfPages = (): HTMLElement[] => {
    if (!printContainerRef.current) return [];
    return Array.from(printContainerRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]'));
  };

  const inputCls =
    'w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors';

  const tocEntries = [
    { label: 'HALAMAN SAMPUL', page: 'i', bold: true },
    { label: 'KATA PENGANTAR', page: 'ii', bold: true },
    { label: 'DAFTAR ISI', page: 'iii', bold: true },
    { label: 'BAB I PENDAHULUAN', page: '1', bold: true },
    { label: 'A. Latar Belakang', page: '1', indent: true },
    { label: 'B. Pengertian', page: '1', indent: true },
    { label: 'C. Dasar', page: '1', indent: true },
    { label: 'D. Tujuan', page: '1', indent: true },
    { label: 'E. Ruang Lingkup', page: '2', indent: true },
    { label: 'F. Sasaran', page: '2', indent: true },
    { label: 'G. Sistematika Penulisan', page: '2', indent: true },
    { label: 'BAB II PENGORGANISASIAN', page: '3', bold: true },
    { label: 'A. Organisasi Kepanitiaan', page: '3', indent: true },
    { label: 'B. Susunan Panitia', page: '3', indent: true },
    { label: 'C. Pembagian Tugas', page: '3', indent: true },
    { label: 'BAB III TAHAP PELAKSANAAN', page: '4', bold: true },
    { label: 'A. Tahap Perencanaan', page: '4', indent: true },
    { label: 'B. Publikasi', page: '4', indent: true },
    { label: 'C. Pengadaan Piranti Penilaian', page: '4', indent: true },
    { label: 'D. Pengadministrasian', page: '4', indent: true },
    { label: 'E. Pelaksanaan dan Pengawasan', page: '5', indent: true },
    { label: 'F. Pemeriksaan dan Pengolahan Nilai', page: '5', indent: true },
    { label: 'G. Penilaian', page: '5', indent: true },
    { label: 'H. Kegiatan Akhir', page: '5', indent: true },
    { label: 'BAB IV PENUTUP', page: '6', bold: true },
    { label: 'LAMPIRAN-LAMPIRAN', page: '7', bold: true },
  ];

  const pageSheetCls =
    'proposal-a4-sheet print-page-break bg-white border border-slate-200 rounded-2xl px-[15mm] py-[13mm] mx-auto text-slate-950 shadow-sm';

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation="portrait" paperSize="A4" marginMm={12} />

      {/* Top Bento Control Header */}
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Proposal Penyelenggaraan Ujian (BAB I – IV &amp; Lampiran)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Format resmi lengkap: Kata Pengantar, Daftar Isi, BAB I Pendahuluan (A–G), BAB II Pengorganisasian (A–C), BAB III Tahap Pelaksanaan (A–H), BAB IV Penutup, dan Lampiran Jadwal &amp; RAB.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit Proposal
              </button>
              <button
                type="button"
                onClick={() => setMode('print')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'print' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Pratinjau Cetak
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDefault}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Template Bawaan
            </button>

            <PdfDownloadButton
              filename={`proposal-${slug}`}
              orientation="portrait"
              paperSize="A4"
              marginMm={10}
              prepareBeforeExport={prepareForPdf}
              getPageElements={getPdfPages}
              label="Unduh PDF (A4)"
            />

            <button
              type="button"
              onClick={() => {
                setMode('print');
                setTimeout(() => window.print(), 140);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak A4
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">
            Kertas A4 Portrait (210 × 297 mm) · RAB
          </div>
          <div className="text-2xl font-extrabold tabular-nums">
            {formatRupiah(totalBudget)}
          </div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            {proposal.budgetItems.length} pos anggaran · {examDays.length} hari efektif · {roomCount} ruang
          </div>
        </div>
      </section>

      {/* Edit Mode Form with Sub-Tabs */}
      {mode === 'edit' && (
        <div className="no-print space-y-4">
          {/* Sub-navigation for Proposal Chapters */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-2 flex flex-wrap gap-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            {[
              { id: 'pengantar' as EditorTab, label: '1. Sampul & Kata Pengantar' },
              { id: 'bab1' as EditorTab, label: '2. BAB I Pendahuluan (A–G)' },
              { id: 'bab2_3' as EditorTab, label: '3. BAB II & III (Organisasi & Pelaksanaan)' },
              { id: 'bab4_rab' as EditorTab, label: '4. BAB IV Penutup & Lampiran RAB' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditorTab(t.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap ${
                  editorTab === t.id
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Sampul, Surat & Kata Pengantar */}
          {editorTab === 'pengantar' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  Identitas Proposal &amp; Kata Pengantar
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Daftar Isi dibuat otomatis sesuai bab dan sub-bab proposal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nomor Dokumen / Surat
                  </label>
                  <input
                    type="text"
                    value={proposal.nomorSurat}
                    onChange={(e) => updateField('nomorSurat', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Lampiran
                  </label>
                  <input
                    type="text"
                    value={proposal.lampiran}
                    onChange={(e) => updateField('lampiran', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Perihal
                  </label>
                  <input
                    type="text"
                    value={proposal.perihal}
                    onChange={(e) => updateField('perihal', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tempat Pelaksanaan
                  </label>
                  <input
                    type="text"
                    value={proposal.tempatPelaksanaan}
                    onChange={(e) => updateField('tempatPelaksanaan', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Teks Kata Pengantar
                </label>
                <textarea
                  rows={7}
                  value={proposal.kataPengantar || ''}
                  onChange={(e) => updateField('kataPengantar', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* TAB 2: BAB I PENDAHULUAN (A - G) */}
          {editorTab === 'bab1' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">BAB I · PENDAHULUAN (A–G)</h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    A. Latar Belakang
                  </label>
                  <textarea
                    rows={5}
                    value={proposal.latarBelakang}
                    onChange={(e) => updateField('latarBelakang', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    B. Pengertian
                  </label>
                  <textarea
                    rows={5}
                    value={proposal.pengertian || ''}
                    onChange={(e) => updateField('pengertian', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    C. Dasar (satu poin per baris)
                  </label>
                  <textarea
                    rows={5}
                    value={proposal.dasarHukum.join('\n')}
                    onChange={(e) => handleListTextChange('dasarHukum', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    D. Tujuan (satu poin per baris)
                  </label>
                  <textarea
                    rows={5}
                    value={proposal.tujuanKegiatan.join('\n')}
                    onChange={(e) => handleListTextChange('tujuanKegiatan', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    E. Ruang Lingkup
                  </label>
                  <textarea
                    rows={4}
                    value={proposal.ruangLingkup || ''}
                    onChange={(e) => updateField('ruangLingkup', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    F. Sasaran
                  </label>
                  <textarea
                    rows={4}
                    value={proposal.sasaran || ''}
                    onChange={(e) => updateField('sasaran', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  G. Sistematika Penulisan
                </label>
                <textarea
                  rows={3}
                  value={proposal.sistematikaPenulisan || ''}
                  onChange={(e) => updateField('sistematikaPenulisan', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* TAB 3: BAB II & BAB III */}
          {editorTab === 'bab2_3' && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    BAB II · PENGORGANISASIAN (A–C)
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Bagian B. Susunan Panitia otomatis diambil dari menu Panitia &amp; Pengawas ({committee.length} panitia).
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      A. Organisasi Kepanitiaan
                    </label>
                    <textarea
                      rows={4}
                      value={proposal.organisasiKepanitiaan || ''}
                      onChange={(e) => updateField('organisasiKepanitiaan', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      C. Pembagian Tugas
                    </label>
                    <textarea
                      rows={6}
                      value={proposal.pembagianTugas || ''}
                      onChange={(e) => updateField('pembagianTugas', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900">
                    BAB III · TAHAP PELAKSANAAN (A–H)
                  </h2>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      A. Tahap Perencanaan
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.tahapPerencanaan || ''}
                      onChange={(e) => updateField('tahapPerencanaan', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      B. Publikasi
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.publikasi || ''}
                      onChange={(e) => updateField('publikasi', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      C. Pengadaan Piranti Penilaian
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.pengadaanPiranti || ''}
                      onChange={(e) => updateField('pengadaanPiranti', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      D. Pengadministrasian
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.pengadministrasian || ''}
                      onChange={(e) => updateField('pengadministrasian', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      E. Pelaksanaan dan Pengawasan
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.pelaksanaanPengawasan || ''}
                      onChange={(e) => updateField('pelaksanaanPengawasan', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      F. Pemeriksaan dan Pengolahan Nilai
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.pemeriksaanPengolahan || ''}
                      onChange={(e) => updateField('pemeriksaanPengolahan', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      G. Penilaian
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.penilaian || ''}
                      onChange={(e) => updateField('penilaian', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      H. Kegiatan Akhir
                    </label>
                    <textarea
                      rows={3}
                      value={proposal.kegiatanAkhir || ''}
                      onChange={(e) => updateField('kegiatanAkhir', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BAB IV Penutup & Lampiran RAB */}
          {editorTab === 'bab4_rab' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-5 space-y-4">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3">
                  <h2 className="text-sm font-bold text-slate-900">BAB IV · PENUTUP</h2>
                  <textarea
                    rows={5}
                    value={proposal.penutup}
                    onChange={(e) => updateField('penutup', e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3">
                  <div className="text-xs font-bold text-slate-900">
                    Lampiran Otomatis yang Disertakan
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <strong className="text-slate-900">Lampiran 1:</strong> Jadwal Pelaksanaan ({examDays.length} hari / {totalSessions} sesi · {dateRangeLabel})
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <strong className="text-slate-900">Lampiran 2:</strong> Rencana Anggaran Biaya (RAB)
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                      <strong className="text-slate-900">Lampiran 3:</strong> Rekapitulasi {students.length} Peserta di {roomCount} Ruang
                    </div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Rencana Anggaran Biaya (RAB)
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tambah atau sesuaikan pos anggaran pelaksanaan ujian.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddBudgetItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Item
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-white text-slate-950 font-bold border-b-2 border-slate-200">
                        <th className="py-2.5 px-2.5 w-8 text-center">No</th>
                        <th className="py-2.5 px-2.5">Uraian Kebutuhan</th>
                        <th className="py-2.5 px-2 w-16 text-center">Vol</th>
                        <th className="py-2.5 px-2 w-20 text-center">Satuan</th>
                        <th className="py-2.5 px-2 w-28 text-right">Harga (Rp)</th>
                        <th className="py-2.5 px-2.5 w-28 text-right">Jumlah</th>
                        <th className="py-2.5 px-2 w-9"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proposal.budgetItems.map((item, idx) => {
                        const subtotal =
                          (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="py-2 px-2.5 text-center tabular-nums text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={item.uraian}
                                onChange={(e) =>
                                  handleBudgetChange(item.id, { uraian: e.target.value })
                                }
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                min={0}
                                value={item.volume}
                                onChange={(e) =>
                                  handleBudgetChange(item.id, {
                                    volume: Math.max(0, Number(e.target.value) || 0),
                                  })
                                }
                                className="w-full px-1.5 py-1 text-xs text-center tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="text"
                                value={item.satuan}
                                onChange={(e) =>
                                  handleBudgetChange(item.id, { satuan: e.target.value })
                                }
                                className="w-full px-2 py-1 text-xs text-center border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                              />
                            </td>
                            <td className="py-1.5 px-1.5">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={item.hargaSatuan}
                                onChange={(e) =>
                                  handleBudgetChange(item.id, {
                                    hargaSatuan: Math.max(0, parseInt(e.target.value, 10) || 0),
                                  })
                                }
                                className="w-full px-2 py-1 text-xs text-right tabular-nums border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                              />
                            </td>
                            <td className="py-2 px-2.5 text-right font-semibold tabular-nums text-slate-800 whitespace-nowrap">
                              {formatRupiah(subtotal)}
                            </td>
                            <td className="py-1.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveBudgetItem(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                aria-label="Hapus item anggaran"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50/70 font-bold text-slate-900 border-t-2 border-slate-200">
                        <td colSpan={5} className="py-2.5 px-3 text-right">
                          TOTAL ANGGARAN
                        </td>
                        <td className="py-2.5 px-2.5 text-right tabular-nums whitespace-nowrap">
                          {formatRupiah(totalBudget)}
                        </td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print / PDF Multi-page A4 Portrait Sheets */}
      <div
        ref={printContainerRef}
        className={`space-y-6 ${mode === 'edit' ? 'hidden print:block' : ''}`}
      >
        {/* PAGE 1: HALAMAN SAMPUL (COVER A4) */}
        <div
          data-pdf-page="true"
          className="proposal-a4-sheet proposal-cover-sheet print-page-break bg-white border border-slate-200 rounded-2xl p-[12mm] mx-auto text-slate-950 shadow-sm"
        >
          <div className="w-full h-full min-h-[270mm] print:min-h-0 border-4 border-double border-slate-900 p-10 flex flex-col items-center justify-between text-center">
            <div className="space-y-2 mt-4">
              <div className="text-sm font-bold uppercase tracking-wider text-slate-700">
                {school.namaInstansi}
              </div>
              <div className="text-2xl font-black uppercase tracking-wide text-slate-950 mt-6">
                PROPOSAL PENYELENGGARAAN
              </div>
              <div className="text-xl font-extrabold uppercase text-slate-900">
                {school.jenisUjian} ({school.singkatanUjian})
              </div>
              <div className="text-sm font-bold uppercase text-slate-800">
                SEMESTER {school.semester} · TAHUN PELAJARAN {school.tahunPelajaran}
              </div>
            </div>

            <div className="my-8 flex flex-col items-center gap-4">
              {school.rightLogoDataUrl ? (
                <img
                  src={school.rightLogoDataUrl}
                  alt="Logo Sekolah"
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <LogoSekolah className="w-44 h-44" />
              )}
              <div className="mt-4 px-6 py-2 border border-slate-900 text-xs font-bold uppercase tracking-wider text-slate-900">
                Nomor: {proposal.nomorSurat}
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="text-sm font-bold uppercase text-slate-800">DISUSUN OLEH:</div>
              <div className="text-base font-extrabold uppercase text-slate-950">
                PANITIA PELAKSANA {school.singkatanUjian}
              </div>
              <div className="text-lg font-black uppercase text-slate-950">{school.namaSekolah}</div>
              <div className="text-xs font-medium text-slate-700 max-w-md mx-auto">
                {school.alamat}
              </div>
              <div className="text-sm font-bold text-slate-900 pt-2">{school.tahunSampul}</div>
            </div>
          </div>
        </div>

        {/* PAGE 2: KATA PENGANTAR */}
        <div data-pdf-page="true" className={pageSheetCls}>
          <OfficialLetterhead school={school} title="PROPOSAL PENYELENGGARAAN UJIAN" compact />

          <h2 className="text-sm font-extrabold text-center uppercase tracking-wide mt-5 mb-4 border-b border-slate-800 pb-1.5">
            KATA PENGANTAR
          </h2>

          <p className="text-[12px] leading-relaxed text-justify whitespace-pre-line">
            {proposal.kataPengantar}
          </p>

          <div className="mt-6 flex justify-end pr-8">
            <div className="text-xs text-slate-950 min-w-[210px]">
              <div>{school.titimangsa}</div>
              <div>Panitia Pelaksana {school.singkatanUjian}</div>
              <div className="h-12" />
              <div className="font-bold underline">{school.ketuaPanitia}</div>
              {school.nipKetua && school.nipKetua !== '-' && (
                <div className="font-mono text-[11px]">NIP. {school.nipKetua}</div>
              )}
            </div>
          </div>
        </div>

        {/* PAGE 3: DAFTAR ISI */}
        <div data-pdf-page="true" className={pageSheetCls}>
          <h2 className="text-sm font-extrabold text-center uppercase tracking-wide mb-5 border-b-2 border-slate-900 pb-2">
            DAFTAR ISI
          </h2>

          <div className="space-y-1.5 text-[11.5px] leading-snug">
            {tocEntries.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-baseline gap-2 ${item.indent ? 'pl-6' : 'pt-1'} ${
                  item.bold ? 'font-bold text-slate-950' : 'font-normal text-slate-800'
                }`}
              >
                <span className="shrink-0">{item.label}</span>
                <span className="flex-1 border-b border-dotted border-slate-400 mx-1" />
                <span className="shrink-0 font-mono tabular-nums w-8 text-right">
                  {item.page}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PAGE 4: BAB I PENDAHULUAN (A - G) */}
        <div data-pdf-page="true" className={`${pageSheetCls} space-y-3`}>
          <h2 className="text-sm font-extrabold text-center uppercase tracking-wide border-b-2 border-slate-900 pb-1.5">
            BAB I · PENDAHULUAN
          </h2>

          <div className="space-y-2.5 text-[11.5px] leading-relaxed">
            <div>
              <div className="font-bold">A. Latar Belakang</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">{proposal.latarBelakang}</p>
            </div>

            <div>
              <div className="font-bold">B. Pengertian</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">{proposal.pengertian}</p>
            </div>

            <div>
              <div className="font-bold">C. Dasar</div>
              <ol className="list-decimal pl-5 mt-0.5 space-y-0.5">
                {proposal.dasarHukum
                  .filter((line) => line.trim() !== '')
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ol>
            </div>

            <div>
              <div className="font-bold">D. Tujuan</div>
              <ol className="list-decimal pl-5 mt-0.5 space-y-0.5">
                {proposal.tujuanKegiatan
                  .filter((line) => line.trim() !== '')
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ol>
            </div>

            <div>
              <div className="font-bold">E. Ruang Lingkup</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">{proposal.ruangLingkup}</p>
            </div>

            <div>
              <div className="font-bold">F. Sasaran</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.sasaran} (Total terdaftar saat ini: {students.length} peserta didik dalam{' '}
                {roomCount} ruang ujian untuk kelompok {tracks.join(', ')}).
              </p>
            </div>

            <div>
              <div className="font-bold">G. Sistematika Penulisan</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.sistematikaPenulisan}
              </p>
            </div>
          </div>
        </div>

        {/* PAGE 5: BAB II PENGORGANISASIAN (A - C) */}
        <div data-pdf-page="true" className={`${pageSheetCls} space-y-3.5`}>
          <h2 className="text-sm font-extrabold text-center uppercase tracking-wide border-b-2 border-slate-900 pb-1.5">
            BAB II · PENGORGANISASIAN
          </h2>

          <div className="space-y-3 text-[11.5px] leading-relaxed">
            <div>
              <div className="font-bold">A. Organisasi Kepanitiaan</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.organisasiKepanitiaan}
              </p>
            </div>

            <div>
              <div className="font-bold mb-1.5">B. Susunan Panitia</div>
              <table className="w-full border-collapse border border-slate-800 text-[11px]">
                <thead>
                  <tr className="bg-white text-slate-950 font-bold">
                    <th className="border border-slate-800 px-2 py-1.5 w-10 text-center font-bold">
                      NO
                    </th>
                    <th className="border border-slate-800 px-2.5 py-1.5 text-left font-bold">
                      NAMA LENGKAP
                    </th>
                    <th className="border border-slate-800 px-2.5 py-1.5 text-left w-52 font-bold">
                      JABATAN KEPANITIAAN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {committeeRows.map((m, i) => (
                    <tr key={m.id}>
                      <td className="border border-slate-800 px-2 py-1 text-center tabular-nums">
                        {i + 1}
                      </td>
                      <td
                        className={`border border-slate-800 px-2.5 py-1 ${
                          i === 0 ? 'font-semibold' : 'font-medium'
                        }`}
                      >
                        {m.name}
                      </td>
                      <td className="border border-slate-800 px-2.5 py-1">{m.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <div className="font-bold">C. Pembagian Tugas</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">{proposal.pembagianTugas}</p>
            </div>
          </div>
        </div>

        {/* PAGE 6: BAB III TAHAP PELAKSANAAN (A - H) */}
        <div data-pdf-page="true" className={`${pageSheetCls} space-y-3`}>
          <h2 className="text-sm font-extrabold text-center uppercase tracking-wide border-b-2 border-slate-900 pb-1.5">
            BAB III · TAHAP PELAKSANAAN
          </h2>

          <div className="space-y-2.5 text-[11.5px] leading-relaxed">
            <div>
              <div className="font-bold">A. Tahap Perencanaan</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.tahapPerencanaan}
              </p>
            </div>
            <div>
              <div className="font-bold">B. Publikasi</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">{proposal.publikasi}</p>
            </div>
            <div>
              <div className="font-bold">C. Pengadaan Piranti Penilaian</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.pengadaanPiranti}
              </p>
            </div>
            <div>
              <div className="font-bold">D. Pengadministrasian</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.pengadministrasian}
              </p>
            </div>
            <div>
              <div className="font-bold">E. Pelaksanaan dan Pengawasan</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.pelaksanaanPengawasan}
              </p>
              <div className="mt-1 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50/60 text-[11px] tabular-nums">
                Jadwal efektif: <strong>{dateRangeLabel}</strong> ({examDays.length} hari /{' '}
                {totalSessions} sesi) di <strong>{proposal.tempatPelaksanaan}</strong> dengan{' '}
                <strong>{roomCount} ruang</strong> dan <strong>{supervisors.length} pengawas</strong>.
              </div>
            </div>
            <div>
              <div className="font-bold">F. Pemeriksaan dan Pengolahan Nilai</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">
                {proposal.pemeriksaanPengolahan}
              </p>
            </div>
            <div>
              <div className="font-bold">G. Penilaian</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">{proposal.penilaian}</p>
            </div>
            <div>
              <div className="font-bold">H. Kegiatan Akhir</div>
              <p className="text-justify mt-0.5 whitespace-pre-line">{proposal.kegiatanAkhir}</p>
            </div>
          </div>
        </div>

        {/* PAGE 7: BAB IV PENUTUP & PENGESAHAN (TTD tepat di bawah isi teks) */}
        <div data-pdf-page="true" className={`${pageSheetCls} space-y-5`}>
          <h2 className="text-sm font-extrabold text-center uppercase tracking-wide border-b-2 border-slate-900 pb-1.5">
            BAB IV · PENUTUP
          </h2>

          <p className="text-[12px] leading-relaxed text-justify whitespace-pre-line">
            {proposal.penutup}
          </p>

          {/* Lembar Pengesahan Ganda tepat di bawah paragraf penutup */}
          <div className="pt-4 grid grid-cols-2 gap-8 text-xs text-slate-950">
            <div className="pl-4">
              <div>Mengetahui / Menyetujui,</div>
              <div>Kepala {school.namaSekolah}</div>
              <div className="h-14" />
              <div className="font-bold underline">{school.kepalaMadrasah}</div>
              {school.nipKepala && school.nipKepala !== '-' && (
                <div className="text-[11px] font-mono">NIP. {school.nipKepala}</div>
              )}
            </div>

            <div className="pl-8">
              <div>{school.titimangsa}</div>
              <div>Ketua Panitia {school.singkatanUjian}</div>
              <div className="h-14" />
              <div className="font-bold underline">{school.ketuaPanitia}</div>
              {school.nipKetua && school.nipKetua !== '-' && (
                <div className="text-[11px] font-mono">NIP. {school.nipKetua}</div>
              )}
            </div>
          </div>
        </div>

        {/* PAGE 8: LAMPIRAN-LAMPIRAN */}
        <div
          data-pdf-page="true"
          className="proposal-a4-sheet bg-white border border-slate-200 rounded-2xl px-[15mm] py-[13mm] mx-auto text-slate-950 shadow-sm space-y-5"
        >
          <h2 className="text-sm font-extrabold text-center uppercase tracking-wide border-b-2 border-slate-900 pb-1.5">
            LAMPIRAN-LAMPIRAN
          </h2>

          {/* Lampiran 1: Jadwal Pelaksanaan */}
          <section className="space-y-1.5 text-[11px]">
            <h3 className="text-xs font-extrabold uppercase">
              Lampiran 1. Ringkasan Jadwal Pelaksanaan ({examDays.length} Hari Efektif)
            </h3>
            <table className="w-full border-collapse border border-slate-800 text-[10px]">
              <thead>
                <tr className="bg-white text-slate-950 font-bold">
                  <th className="border border-slate-800 px-2 py-1 w-8 text-center font-bold">NO</th>
                  <th className="border border-slate-800 px-2 py-1 w-36 text-left font-bold">
                    HARI / TANGGAL
                  </th>
                  <th className="border border-slate-800 px-2 py-1 text-left font-bold">
                    MATA PELAJARAN &amp; WAKTU
                  </th>
                </tr>
              </thead>
              <tbody>
                {examDays.map((day, idx) => {
                  const fd = formatIndonesianDate(day.date);
                  const summary = day.sessions
                    .map((ses) => {
                      const subjList = Array.from(
                        new Set(
                          Object.values(ses.subjects).filter(
                            (v) => v && v.trim() !== '' && v.trim() !== '-'
                          )
                        )
                      );
                      return subjList.length > 0
                        ? `Jam ${ses.jamKe} (${ses.waktu}): ${subjList.join(' / ')}`
                        : null;
                    })
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <tr key={day.id}>
                      <td className="border border-slate-800 px-2 py-1 text-center tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 px-2 py-1 whitespace-nowrap">
                        <strong>{fd.dayName}</strong>, {fd.fullDate}
                      </td>
                      <td className="border border-slate-800 px-2 py-1">
                        {summary || `${day.sessions.length} Sesi Ujian`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {/* Lampiran 2: RAB */}
          <section className="space-y-1.5 text-[11px]">
            <h3 className="text-xs font-extrabold uppercase">
              Lampiran 2. Rencana Anggaran Biaya (RAB)
            </h3>
            <table className="w-full border-collapse border border-slate-800 text-[10.5px]">
              <thead>
                <tr className="bg-white text-slate-950 font-bold">
                  <th className="border border-slate-800 px-2 py-1.5 w-9 text-center font-bold">
                    NO
                  </th>
                  <th className="border border-slate-800 px-2.5 py-1.5 text-left font-bold">
                    URAIAN KEBUTUHAN
                  </th>
                  <th className="border border-slate-800 px-2 py-1.5 w-14 text-center font-bold">
                    VOL
                  </th>
                  <th className="border border-slate-800 px-2 py-1.5 w-20 text-center font-bold">
                    SATUAN
                  </th>
                  <th className="border border-slate-800 px-2.5 py-1.5 w-28 text-right font-bold">
                    HARGA SATUAN
                  </th>
                  <th className="border border-slate-800 px-2.5 py-1.5 w-28 text-right font-bold">
                    JUMLAH
                  </th>
                </tr>
              </thead>
              <tbody>
                {proposal.budgetItems.map((item, idx) => {
                  const subtotal =
                    (Number(item.volume) || 0) * (Number(item.hargaSatuan) || 0);
                  return (
                    <tr key={item.id}>
                      <td className="border border-slate-800 px-2 py-1 text-center tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-800 px-2.5 py-1">{item.uraian}</td>
                      <td className="border border-slate-800 px-2 py-1 text-center tabular-nums">
                        {item.volume}
                      </td>
                      <td className="border border-slate-800 px-2 py-1 text-center">
                        {item.satuan}
                      </td>
                      <td className="border border-slate-800 px-2.5 py-1 text-right tabular-nums">
                        {formatRupiah(item.hargaSatuan)}
                      </td>
                      <td className="border border-slate-800 px-2.5 py-1 text-right font-semibold tabular-nums">
                        {formatRupiah(subtotal)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td
                    colSpan={5}
                    className="border border-slate-800 px-3 py-1.5 text-right uppercase"
                  >
                    Jumlah Total Rencana Anggaran Biaya
                  </td>
                  <td className="border border-slate-800 px-2.5 py-1.5 text-right tabular-nums">
                    {formatRupiah(totalBudget)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Lampiran 3: Rekap Ruang & Peserta */}
          <section className="space-y-1.5 text-[11px]">
            <h3 className="text-xs font-extrabold uppercase">
              Lampiran 3. Rekapitulasi Ruang &amp; Peserta ({students.length} Siswa · {roomCount}{' '}
              Ruang)
            </h3>
            <table className="w-full border-collapse border border-slate-800 text-[10px]">
              <thead>
                <tr className="bg-white text-slate-950 font-bold">
                  {roomStats.map((rs) => (
                    <th
                      key={rs.room}
                      className="border border-slate-800 px-1.5 py-1 text-center font-bold tabular-nums"
                    >
                      Ruang {rs.room}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {roomStats.map((rs) => (
                    <td
                      key={rs.room}
                      className="border border-slate-800 px-1.5 py-1.5 text-center font-semibold tabular-nums"
                    >
                      {rs.count} Siswa
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
};
