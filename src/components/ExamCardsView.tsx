import React, { useMemo, useRef, useState } from 'react';
import { Globe, MessageCircle, Printer, Search, Share2, User } from 'lucide-react';
import { CommitteeMember, SchoolIdentity, Student } from '../types/exam';
import { PdfDownloadButton } from './PdfDownloadButton';
import {
  PrintOrientation,
  PrintOrientationToggle,
  PrintPageConfig,
} from './PrintOrientationControl';
import { LeftLogo, RightLogo } from './SchoolLogos';

interface StudentCardsViewProps {
  school: SchoolIdentity;
  students: Student[];
  roomCount: number;
}

export const StudentCardsView: React.FC<StudentCardsViewProps> = ({
  school,
  students,
  roomCount,
}) => {
  const [filterRuang, setFilterRuang] = useState<string>('1');
  const [search, setSearch] = useState('');
  const studentPagesRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterRuang !== 'ALL' && String(s.ruang) !== filterRuang) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.noPeserta.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q)
      );
    });
  }, [students, filterRuang, search]);

  // Chunk into pages of 8 cards (2 columns x 4 rows per A4 Portrait sheet)
  const pages = useMemo(() => {
    const chunks: Student[][] = [];
    for (let i = 0; i < filtered.length; i += 8) {
      chunks.push(filtered.slice(i, i + 8));
    }
    return chunks;
  }, [filtered]);

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation="portrait" paperSize="A4" marginMm={8} />

      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Kartu Peserta Ujian ({filtered.length} Kartu)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tata letak presisi 2 kolom × 4 baris (8 kartu per lembar A4 Portrait). Logo dan pasfoto otomatis sinkron dari Data Sekolah &amp; Database Peserta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari peserta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl w-44 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <select
              value={filterRuang}
              onChange={(e) => setFilterRuang(e.target.value)}
              className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white"
            >
              <option value="ALL">Semua Ruang ({students.length})</option>
              {Array.from({ length: roomCount }, (_, i) => i + 1).map((r) => (
                <option key={r} value={String(r)}>
                  Ruang {r}
                </option>
              ))}
            </select>

            <PdfDownloadButton
              filename={`kartu-peserta-${slug}`}
              orientation="portrait"
              paperSize="A4"
              marginMm={6}
              disabled={filtered.length === 0}
              getPageElements={() =>
                studentPagesRef.current
                  ? Array.from(
                      studentPagesRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')
                    )
                  : []
              }
              label="Unduh PDF"
            />

            <button
              type="button"
              onClick={() => window.print()}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak A4 ({pages.length} Hal)
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">Kertas A4 Portrait (210 × 297 mm)</div>
          <div className="text-2xl font-extrabold tabular-nums">
            {pages.length} Lembar · {filtered.length} Kartu
          </div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            8 kartu per lembar (2 kolom × 4 baris)
          </div>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-sm text-slate-500">
          Tidak ada kartu peserta untuk ditampilkan.
        </div>
      ) : (
        <div ref={studentPagesRef} className="space-y-6">
          {pages.map((chunk, pIdx) => (
            <div
              key={pIdx}
              data-pdf-page="true"
              className={`print-only-container a4-cards-portrait bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mx-auto shadow-sm print:shadow-none print:rounded-none ${
                pIdx < pages.length - 1 ? 'print-page-break' : ''
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-4 print:grid-cols-2 print:grid-rows-4 print:h-full gap-3.5 print:gap-x-3.5 print:gap-y-3">
                {chunk.map((st) => (
                  <div
                    key={st.id}
                    className="print-avoid-break min-h-[225px] print:min-h-0 print:h-full border border-slate-900 border-r-[2.5px] border-b-[2.5px] bg-white px-3 py-2 flex flex-col justify-between"
                  >
                    {/* Kop Kartu (Logo Kemenag Kiri + Identitas + Logo Sekolah Kanan) */}
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b-[3px] border-double border-slate-900">
                      <div className="shrink-0">
                        <LeftLogo school={school} className="w-9 h-9" />
                      </div>

                      <div className="text-center leading-tight flex-1 min-w-0">
                        <div className="text-[7.5px] font-semibold italic uppercase text-slate-900 truncate">
                          {school.namaInstansi}
                        </div>
                        <div className="text-[9.5px] font-extrabold uppercase text-slate-950 truncate mt-[1px]">
                          {school.namaSekolah}
                        </div>
                        <div className="text-[13.5px] font-black uppercase text-slate-950 leading-none tracking-tight mt-[1px]">
                          ({school.singkatanSekolah})
                        </div>
                        <div className="text-[6.8px] text-slate-700 truncate mt-[1.5px]">
                          {school.alamat}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <RightLogo school={school} className="w-9 h-9" />
                      </div>
                    </div>

                    {/* Judul Kartu */}
                    <div className="text-center my-1.5">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-950 leading-tight">
                        KARTU PESERTA
                      </div>
                      <div className="text-[8px] font-bold uppercase text-slate-900 leading-tight mt-[1px]">
                        {school.jenisUjian}
                      </div>
                    </div>

                    {/* Isi Kartu: Kotak Pasfoto Kiri + Identitas & TTD Kanan */}
                    <div className="flex items-stretch gap-3 flex-1 min-h-0">
                      <div className="w-[58px] h-[76px] border border-slate-900 bg-slate-50/40 flex items-center justify-center shrink-0 overflow-hidden self-start mt-0.5">
                        {st.photoDataUrl ? (
                          <img
                            src={st.photoDataUrl}
                            alt={st.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="no-print text-[8px] font-medium text-slate-300 text-center px-1 leading-tight">
                            Foto 3×4
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between text-[9px] leading-[1.35] text-slate-950">
                        <table className="w-full border-collapse">
                          <tbody>
                            <tr>
                              <td className="w-[58px] align-top whitespace-nowrap py-[0.5px]">
                                No. Peserta
                              </td>
                              <td className="w-2.5 align-top text-center py-[0.5px]">:</td>
                              <td className="font-mono tabular-nums font-semibold py-[0.5px]">
                                {st.noPeserta}
                              </td>
                            </tr>
                            <tr>
                              <td className="align-top whitespace-nowrap py-[0.5px]">Nama Siswa</td>
                              <td className="align-top text-center py-[0.5px]">:</td>
                              <td className="uppercase font-bold break-words leading-[1.2] py-[0.5px]">
                                {st.name}
                              </td>
                            </tr>
                            <tr>
                              <td className="align-top whitespace-nowrap py-[0.5px]">NISN</td>
                              <td className="align-top text-center py-[0.5px]">:</td>
                              <td className="font-mono tabular-nums py-[0.5px]">
                                {st.nisn || '-'}
                              </td>
                            </tr>
                            <tr>
                              <td className="align-top whitespace-nowrap py-[0.5px]">Kelas</td>
                              <td className="align-top text-center py-[0.5px]">:</td>
                              <td className="font-semibold py-[0.5px]">{st.kelas}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="mt-2 ml-auto w-[134px] text-[8px] leading-[1.25] text-slate-950">
                          <div className="truncate">{school.titimangsa}</div>
                          <div className="truncate">Ketua {school.singkatanUjian}</div>
                          <div className="h-6" />
                          <div className="font-bold truncate">{school.ketuaPanitia}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface CommitteeCardsViewProps {
  school: SchoolIdentity;
  committee: CommitteeMember[];
}

export const CommitteeCardsView: React.FC<CommitteeCardsViewProps> = ({ school, committee }) => {
  const [orientation, setOrientation] = useState<PrintOrientation>('portrait');
  const committeePagesRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  // Portrait card size: 5.5 cm (55mm) wide x 8.5 cm (85mm) tall
  // A4 Portrait (194mm x 281mm printable): 3 cols x 3 rows = 9 cards/sheet
  // A4 Landscape (281mm x 194mm printable): 4 cols x 2 rows = 8 cards/sheet
  const cardsPerPage = orientation === 'landscape' ? 8 : 9;

  const pages = useMemo(() => {
    const chunks: CommitteeMember[][] = [];
    for (let i = 0; i < committee.length; i += cardsPerPage) {
      chunks.push(committee.slice(i, i + cardsPerPage));
    }
    return chunks;
  }, [committee, cardsPerPage]);

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} paperSize="A4" marginMm={8} />
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Kartu Tanda Pengenal Panitia ({committee.length} Kartu)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Posisi <strong>Portrait 5,5 cm × 8,5 cm</strong> (55 × 85 mm) — muat {cardsPerPage} kartu per lembar A4 ({orientation === 'landscape' ? '4 × 2' : '3 × 3'}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />
            <PdfDownloadButton
              filename={`kartu-panitia-${slug}`}
              orientation={orientation}
              paperSize="A4"
              marginMm={8}
              disabled={committee.length === 0}
              getPageElements={() =>
                committeePagesRef.current
                  ? Array.from(
                      committeePagesRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')
                    )
                  : []
              }
              label="Unduh PDF"
            />
            <button
              type="button"
              onClick={() => window.print()}
              disabled={committee.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Kartu Panitia
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">
            Kartu Portrait · 5,5 cm × 8,5 cm
          </div>
          <div className="text-2xl font-extrabold tabular-nums">
            {pages.length} Hal · {committee.length} Kartu
          </div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            A4 {orientation === 'landscape' ? 'Landscape (4×2)' : 'Portrait (3×3)'} · {cardsPerPage} kartu/lembar
          </div>
        </div>
      </section>

      {committee.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-sm text-slate-500">
          Belum ada data panitia. Tambahkan di menu Panitia &amp; Pengawas.
        </div>
      ) : (
        <div
          ref={committeePagesRef}
          className="space-y-6 overflow-x-auto pb-2 print:overflow-visible print:pb-0"
        >
          {pages.map((chunk, pIdx) => (
            <div
              key={pIdx}
              data-pdf-page="true"
              className={`print-only-container bg-white border border-slate-200 rounded-xl p-4 mx-auto shadow-sm print:shadow-none print:rounded-none ${
                orientation === 'landscape'
                  ? 'w-[281mm] min-h-[192mm]'
                  : 'w-[194mm] min-h-[276mm]'
              } print:w-full print:min-h-0 ${
                pIdx < pages.length - 1 ? 'print-page-break' : ''
              }`}
            >
              <div
                className={`grid justify-center content-start ${
                  orientation === 'landscape'
                    ? 'grid-cols-4 gap-x-[6mm] gap-y-[6mm]'
                    : 'grid-cols-3 gap-x-[6mm] gap-y-[5mm]'
                }`}
              >
                {chunk.map((member) => (
                  <div
                    key={member.id}
                    className="print-avoid-break w-[55mm] h-[85mm] shrink-0 box-border border-[1.5px] border-slate-900 bg-white flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top Header Strip */}
                    <div className="bg-[#0F2C59] text-white px-1.5 py-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        <div className="shrink-0 bg-white/15 p-0.5 rounded-full">
                          <LeftLogo school={school} className="w-5 h-5" />
                        </div>
                        <div className="text-center flex-1 min-w-0 leading-[1.15]">
                          <div className="text-[4.8px] text-emerald-200 font-medium truncate uppercase">
                            {school.namaInstansi}
                          </div>
                          <div className="text-[6.8px] font-extrabold uppercase tracking-tight truncate">
                            {school.namaSekolah}
                          </div>
                          <div className="text-[6.2px] font-bold truncate">
                            ({school.singkatanSekolah})
                          </div>
                          <div className="text-[4.5px] text-slate-200 truncate">
                            {school.alamat}
                          </div>
                        </div>
                        <div className="shrink-0 bg-white/15 p-0.5 rounded-full">
                          <RightLogo school={school} className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Center Vertical Portrait Photo & Identity (5.5 x 8.5 cm) */}
                    <div className="px-2.5 py-2 flex flex-col items-center justify-center text-center flex-1 min-h-0">
                      <div className="text-[6px] font-bold uppercase tracking-wider text-[#0F2C59] mb-1">
                        KARTU PANITIA
                      </div>

                      <div className="w-[20mm] h-[26mm] border border-slate-900 p-[1px] bg-white mb-1.5 shrink-0">
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden">
                          {member.photoDataUrl ? (
                            <img
                              src={member.photoDataUrl}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                      </div>

                      <div className="text-[8.5px] font-extrabold uppercase text-slate-950 leading-[1.15] line-clamp-2 break-words w-full">
                        {member.name}
                      </div>

                      <div className="mt-1 px-2.5 py-0.5 bg-[#0F2C59] text-white text-[6.8px] font-bold uppercase tracking-wider max-w-full truncate">
                        {member.role}
                      </div>

                      <div className="mt-1.5 text-[6.3px] font-bold uppercase text-slate-900 leading-tight line-clamp-2 w-full">
                        {school.jenisUjian}
                      </div>
                      <div className="text-[5.8px] font-medium uppercase text-slate-600 leading-tight mt-0.5 truncate w-full">
                        TP {school.tahunPelajaran}
                      </div>
                    </div>

                    {/* Bottom Contact Strip */}
                    <div className="bg-[#0F2C59] text-white px-1.5 py-1 text-[5.2px] flex items-center justify-between gap-1 shrink-0">
                      <span className="inline-flex items-center gap-0.5 truncate">
                        <Globe className="w-2 h-2 text-emerald-300 shrink-0" />
                        {school.sosmedIg || '-'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 truncate">
                        <Share2 className="w-2 h-2 text-emerald-300 shrink-0" />
                        {school.sosmedFb || '-'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-mono truncate">
                        <MessageCircle className="w-2 h-2 text-emerald-300 shrink-0" />
                        {school.sosmedWa || '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
