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
import { formatIndonesianDate, formatRupiah } from '../utils/examLogic';
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

export const ProposalView: React.FC<ProposalViewProps> = ({
  school,
  committee,
  supervisors,
  students,
  tracks,
  examDays,
  roomCount,
  proposal,
  onUpdateProposal,
}) => {
  const [mode, setMode] = useState<'edit' | 'print'>('edit');
  const printContainerRef = useRef<HTMLDivElement>(null);

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

  const handleBudgetChange = (
    id: string,
    patch: Partial<ProposalBudgetItem>
  ) => {
    updateField(
      'budgetItems',
      proposal.budgetItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      )
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

  const handleListTextChange = (
    key: 'dasarHukum' | 'tujuanKegiatan',
    rawText: string
  ) => {
    const lines = rawText.split(/\r?\n/);
    updateField(key, lines);
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
    return Array.from(
      printContainerRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')
    );
  };

  const inputCls =
    'w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors';

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation="portrait" paperSize="A4" marginMm={10} />

      {/* Top Bento Control Header */}
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Proposal Kegiatan &amp; Rencana Anggaran Ujian
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Susun proposal resmi lengkap dengan halaman sampul, jadwal pelaksanaan, susunan panitia, dan rincian RAB. Data kepesertaan, panitia, dan hari ujian terisi otomatis.
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
              marginMm={8}
              prepareBeforeExport={prepareForPdf}
              getPageElements={getPdfPages}
              label="Unduh PDF"
            />

            <button
              type="button"
              onClick={() => {
                setMode('print');
                setTimeout(() => window.print(), 140);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Proposal
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">
            Total Rencana Anggaran (RAB)
          </div>
          <div className="text-2xl font-extrabold tabular-nums">
            {formatRupiah(totalBudget)}
          </div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            {proposal.budgetItems.length} pos anggaran · {students.length} peserta · {roomCount} ruang
          </div>
        </div>
      </section>

      {/* Edit Mode Form */}
      {mode === 'edit' && (
        <div className="no-print space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Left Form: Identitas Surat & Narasi */}
            <div className="xl:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">
                  Identitas Surat &amp; Naskah Proposal
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Lengkapi nomor surat, latar belakang, dasar hukum, tujuan, dan penutup.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nomor Surat Proposal
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  A. Latar Belakang
                </label>
                <textarea
                  rows={4}
                  value={proposal.latarBelakang}
                  onChange={(e) => updateField('latarBelakang', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  B. Dasar Hukum (satu poin per baris)
                </label>
                <textarea
                  rows={4}
                  value={proposal.dasarHukum.join('\n')}
                  onChange={(e) => handleListTextChange('dasarHukum', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  C. Tujuan Kegiatan (satu poin per baris)
                </label>
                <textarea
                  rows={4}
                  value={proposal.tujuanKegiatan.join('\n')}
                  onChange={(e) => handleListTextChange('tujuanKegiatan', e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Penutup Proposal
                </label>
                <textarea
                  rows={3}
                  value={proposal.penutup}
                  onChange={(e) => updateField('penutup', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Right Form: Tabel RAB Interaktif + Ringkasan Otomatis */}
            <div className="xl:col-span-6 space-y-5">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
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

              {/* Sync Summary Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-3">
                <div className="text-xs font-bold text-slate-900">
                  Data Tersinkron Otomatis ke Proposal
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[11px] text-slate-500">Pelaksanaan</div>
                    <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                      {examDays.length} Hari ({totalSessions} Sesi)
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[11px] text-slate-500">Peserta &amp; Ruang</div>
                    <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                      {students.length} Siswa · {roomCount} Ruang
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="text-[11px] text-slate-500">Tim Pelaksana</div>
                    <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                      {committee.length} Panitia · {supervisors.length} Pengawas
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Rentang tanggal ujian: <strong className="text-slate-700">{dateRangeLabel}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print / PDF Multi-page A4 Portrait Sheets */}
      <div
        ref={printContainerRef}
        className={`space-y-6 ${mode === 'edit' ? 'hidden print:block' : ''}`}
      >
        {/* PAGE 1: COVER PROPOSAL */}
        <div
          data-pdf-page="true"
          className="print-only-container print-page-break max-w-[794px] w-full min-h-[1060px] bg-white border-4 border-double border-slate-900 rounded-2xl p-10 mx-auto flex flex-col items-center justify-between text-center shadow-sm print:rounded-none print:shadow-none"
        >
          <div className="space-y-2 mt-4">
            <div className="text-sm font-bold uppercase tracking-wider text-slate-700">
              {school.namaInstansi}
            </div>
            <div className="text-2xl font-black uppercase tracking-wide text-slate-950 mt-6">
              PROPOSAL KEGIATAN
            </div>
            <div className="text-xl font-extrabold uppercase text-slate-900">
              {school.jenisUjian}
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
            <div className="mt-4 px-6 py-2.5 border border-slate-900 text-xs font-bold uppercase tracking-wider text-slate-900">
              Nomor: {proposal.nomorSurat}
            </div>
          </div>

          <div className="space-y-1.5 mb-4">
            <div className="text-sm font-bold uppercase text-slate-800">
              DISUSUN OLEH:
            </div>
            <div className="text-base font-extrabold uppercase text-slate-950">
              PANITIA PELAKSANA {school.singkatanUjian}
            </div>
            <div className="text-lg font-black uppercase text-slate-950">
              {school.namaSekolah}
            </div>
            <div className="text-xs font-medium text-slate-700 max-w-md mx-auto">
              {school.alamat}
            </div>
            <div className="text-sm font-bold text-slate-900 pt-2">
              {school.tahunSampul}
            </div>
          </div>
        </div>

        {/* PAGE 2: SURAT PENGANTAR & BAB I - III */}
        <div
          data-pdf-page="true"
          className="print-only-container print-page-break max-w-[794px] w-full min-h-[1060px] bg-white border border-slate-200 rounded-2xl p-9 mx-auto text-slate-950 shadow-sm print:border-0 print:rounded-none print:shadow-none space-y-5"
        >
          <OfficialLetterhead school={school} title="PROPOSAL KEGIATAN UJIAN" compact />

          {/* Metadata Surat */}
          <div className="grid grid-cols-12 gap-4 text-[11.5px] leading-relaxed">
            <div className="col-span-7">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-20 font-semibold">Nomor</td>
                    <td className="w-3">:</td>
                    <td>{proposal.nomorSurat}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold">Lampiran</td>
                    <td>:</td>
                    <td>{proposal.lampiran}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold align-top">Perihal</td>
                    <td className="align-top">:</td>
                    <td className="font-bold">{proposal.perihal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-span-5 text-left pl-4">
              <div>{school.titimangsa}</div>
              <div className="mt-1">Kepada Yth.</div>
              <div className="font-bold">Kepala {school.namaSekolah}</div>
              <div>di Tempat</div>
            </div>
          </div>

          {/* BAB I */}
          <section className="space-y-2.5 text-[11.5px] leading-relaxed">
            <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-800 pb-1">
              BAB I · PENDAHULUAN
            </h2>
            <div>
              <div className="font-bold">A. Latar Belakang</div>
              <p className="text-justify mt-1 whitespace-pre-line">{proposal.latarBelakang}</p>
            </div>
            <div>
              <div className="font-bold">B. Dasar Hukum</div>
              <ol className="list-decimal pl-5 mt-1 space-y-0.5">
                {proposal.dasarHukum
                  .filter((line) => line.trim() !== '')
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ol>
            </div>
            <div>
              <div className="font-bold">C. Tujuan Kegiatan</div>
              <ol className="list-decimal pl-5 mt-1 space-y-0.5">
                {proposal.tujuanKegiatan
                  .filter((line) => line.trim() !== '')
                  .map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
              </ol>
            </div>
          </section>

          {/* BAB II */}
          <section className="space-y-2 text-[11.5px] leading-relaxed">
            <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-800 pb-1">
              BAB II · WAKTU, TEMPAT &amp; SASARAN KEGIATAN
            </h2>
            <table className="w-full text-[11.5px]">
              <tbody>
                <tr>
                  <td className="w-40 py-0.5 font-semibold">Nama Kegiatan</td>
                  <td className="w-3">:</td>
                  <td>
                    {school.jenisUjian} ({school.singkatanUjian}) Tahun Pelajaran{' '}
                    {school.tahunPelajaran}
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Waktu Pelaksanaan</td>
                  <td>:</td>
                  <td className="tabular-nums">
                    {dateRangeLabel} ({examDays.length} hari / {totalSessions} sesi)
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Tempat</td>
                  <td>:</td>
                  <td>{proposal.tempatPelaksanaan}</td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Peserta &amp; Ruang</td>
                  <td>:</td>
                  <td className="tabular-nums">
                    {students.length} Peserta didik terbagi dalam {roomCount} ruang ujian (Kelompok:{' '}
                    {tracks.join(', ')})
                  </td>
                </tr>
                <tr>
                  <td className="py-0.5 font-semibold">Panitia &amp; Pengawas</td>
                  <td>:</td>
                  <td className="tabular-nums">
                    {committee.length} Panitia inti dan {supervisors.length} Guru pengawas ruang
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* BAB III: Susunan Panitia */}
          <section className="space-y-2 text-[11px]">
            <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-800 pb-1">
              BAB III · SUSUNAN KEPANITIAAN
            </h2>
            <table className="w-full border-collapse border border-slate-800 text-[10.5px]">
              <thead>
                <tr className="bg-white text-slate-950 font-bold">
                  <th className="border border-slate-800 px-2 py-1.5 w-10 text-center">NO</th>
                  <th className="border border-slate-800 px-2.5 py-1.5 text-left">NAMA LENGKAP</th>
                  <th className="border border-slate-800 px-2.5 py-1.5 text-left w-48">
                    JABATAN KEPANITIAAN
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 px-2 py-1 text-center tabular-nums">1</td>
                  <td className="border border-slate-800 px-2.5 py-1 font-semibold">
                    {school.kepalaMadrasah}
                  </td>
                  <td className="border border-slate-800 px-2.5 py-1">Penanggung Jawab</td>
                </tr>
                {committee.map((m, i) => (
                  <tr key={m.id}>
                    <td className="border border-slate-800 px-2 py-1 text-center tabular-nums">
                      {i + 2}
                    </td>
                    <td className="border border-slate-800 px-2.5 py-1 font-medium">{m.name}</td>
                    <td className="border border-slate-800 px-2.5 py-1">{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* PAGE 3: BAB IV (RAB), BAB V (PENUTUP) & PENGESAHAN */}
        <div
          data-pdf-page="true"
          className="print-only-container max-w-[794px] w-full min-h-[1060px] bg-white border border-slate-200 rounded-2xl p-9 mx-auto text-slate-950 shadow-sm print:border-0 print:rounded-none print:shadow-none flex flex-col justify-between gap-6"
        >
          <div className="space-y-6">
            {/* Ringkasan Jadwal Pelaksanaan */}
            <section className="space-y-2 text-[11px]">
              <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-800 pb-1">
                RINGKASAN JADWAL PELAKSANAAN ({examDays.length} HARI)
              </h2>
              <table className="w-full border-collapse border border-slate-800 text-[10px]">
                <thead>
                  <tr className="bg-white text-slate-950 font-bold">
                    <th className="border border-slate-800 px-2 py-1 w-8 text-center">NO</th>
                    <th className="border border-slate-800 px-2 py-1 w-36 text-left">
                      HARI / TANGGAL
                    </th>
                    <th className="border border-slate-800 px-2 py-1 text-left">
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

            {/* BAB IV: RAB */}
            <section className="space-y-2 text-[11px]">
              <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-800 pb-1">
                BAB IV · RENCANA ANGGARAN BIAYA (RAB)
              </h2>
              <table className="w-full border-collapse border border-slate-800 text-[10.5px]">
                <thead>
                  <tr className="bg-white text-slate-950 font-bold">
                    <th className="border border-slate-800 px-2 py-1.5 w-9 text-center">NO</th>
                    <th className="border border-slate-800 px-2.5 py-1.5 text-left">
                      URAIAN KEBUTUHAN
                    </th>
                    <th className="border border-slate-800 px-2 py-1.5 w-14 text-center">VOL</th>
                    <th className="border border-slate-800 px-2 py-1.5 w-20 text-center">SATUAN</th>
                    <th className="border border-slate-800 px-2.5 py-1.5 w-28 text-right">
                      HARGA SATUAN
                    </th>
                    <th className="border border-slate-800 px-2.5 py-1.5 w-28 text-right">
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
                        <td className="border border-slate-800 px-2 py-1.5 text-center tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5">{item.uraian}</td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center tabular-nums">
                          {item.volume}
                        </td>
                        <td className="border border-slate-800 px-2 py-1.5 text-center">
                          {item.satuan}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5 text-right tabular-nums">
                          {formatRupiah(item.hargaSatuan)}
                        </td>
                        <td className="border border-slate-800 px-2.5 py-1.5 text-right font-semibold tabular-nums">
                          {formatRupiah(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-bold">
                    <td
                      colSpan={5}
                      className="border border-slate-800 px-3 py-2 text-right uppercase"
                    >
                      Jumlah Total Rencana Anggaran Biaya
                    </td>
                    <td className="border border-slate-800 px-2.5 py-2 text-right tabular-nums">
                      {formatRupiah(totalBudget)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* BAB V: PENUTUP */}
            <section className="space-y-1.5 text-[11.5px] leading-relaxed">
              <h2 className="text-xs font-extrabold uppercase tracking-wide border-b border-slate-800 pb-1">
                BAB V · PENUTUP
              </h2>
              <p className="text-justify whitespace-pre-line">{proposal.penutup}</p>
            </section>
          </div>

          {/* Lembar Pengesahan Ganda */}
          <div className="pt-4 grid grid-cols-2 gap-8 text-xs text-slate-950">
            <div className="pl-4">
              <div>Mengetahui / Menyetujui,</div>
              <div>Kepala {school.namaSekolah}</div>
              <div className="h-16" />
              <div className="font-bold underline">{school.kepalaMadrasah}</div>
              {school.nipKepala && school.nipKepala !== '-' && (
                <div className="text-[11px] font-mono">NIP. {school.nipKepala}</div>
              )}
            </div>

            <div className="pl-8">
              <div>{school.titimangsa}</div>
              <div>Ketua Panitia {school.singkatanUjian}</div>
              <div className="h-16" />
              <div className="font-bold underline">{school.ketuaPanitia}</div>
              {school.nipKetua && school.nipKetua !== '-' && (
                <div className="text-[11px] font-mono">NIP. {school.nipKetua}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
