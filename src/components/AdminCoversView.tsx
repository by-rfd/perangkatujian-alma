import React, { useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { SchoolIdentity } from '../types/exam';
import { PdfDownloadButton } from './PdfDownloadButton';
import {
  PrintOrientation,
  PrintOrientationToggle,
  PrintPageConfig,
} from './PrintOrientationControl';
import { QuietExamPoster } from './RulesAndDoorsView';
import { LogoSekolah } from './SchoolLogos';

interface AdminCoversViewProps {
  school: SchoolIdentity;
  onUpdateSchool: (updater: SchoolIdentity | ((prev: SchoolIdentity) => SchoolIdentity)) => void;
}

type CoverKey =
  | 'harap-tenang'
  | 'hadir-pengawas'
  | 'hadir-peserta'
  | 'hadir-panitia'
  | 'panduan'
  | 'kata-pengantar'
  | 'semua';

export const AdminCoversView: React.FC<AdminCoversViewProps> = ({ school, onUpdateSchool }) => {
  const [selected, setSelected] = useState<CoverKey>('harap-tenang');
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
  const pagesRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const coverDefs: {
    key: 'hadir-pengawas' | 'hadir-peserta' | 'hadir-panitia' | 'panduan';
    label: string;
    title: string;
    isGuide?: boolean;
  }[] = [
    { key: 'hadir-pengawas', label: 'Sampul Hadir Pengawas', title: 'DAFTAR HADIR PENGAWAS' },
    { key: 'hadir-peserta', label: 'Sampul Hadir Peserta', title: 'DAFTAR HADIR PESERTA' },
    { key: 'hadir-panitia', label: 'Sampul Hadir Panitia', title: 'DAFTAR HADIR PANITIA' },
    {
      key: 'panduan',
      label: 'Sampul Panduan',
      title: 'PANDUAN PELAKSANAAN',
      isGuide: true,
    },
  ];

  const handleSelectDoc = (next: CoverKey) => {
    setSelected(next);
    if (next === 'panduan' || next === 'kata-pengantar') {
      setOrientation('portrait');
    } else {
      setOrientation('landscape');
    }
  };

  const sheetClass =
    orientation === 'landscape' ? 'a4-sheet-landscape' : 'a4-sheet-portrait';

  const renderCover = (title: string, isGuide?: boolean) => (
    <div
      className={`${sheetClass} bg-white border-4 border-double border-slate-900 rounded-2xl p-8 sm:p-10 mx-auto flex flex-col items-center justify-between text-center shadow-sm print:rounded-none print:shadow-none`}
    >
      <div className="space-y-1.5 mt-2">
        <div className="text-xl sm:text-2xl font-extrabold uppercase text-slate-950">{title}</div>
        <div className="text-lg sm:text-xl font-extrabold uppercase text-slate-950">
          {school.jenisUjian}
        </div>
        <div className="text-sm sm:text-base font-bold uppercase text-slate-800">
          TAHUN PELAJARAN {school.tahunPelajaran}
        </div>
      </div>

      <div className="my-4">
        {school.rightLogoDataUrl ? (
          <img
            src={school.rightLogoDataUrl}
            alt="Logo Sekolah"
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
          />
        ) : (
          <LogoSekolah className="w-36 h-36 sm:w-44 sm:h-44" />
        )}
      </div>

      <div className="space-y-1 mb-2">
        {isGuide ? (
          <>
            <div className="text-sm sm:text-base font-extrabold uppercase text-slate-950">
              PANITIA {school.jenisUjian}
            </div>
            <div className="text-sm sm:text-base font-extrabold uppercase text-slate-950">
              {school.namaSekolah}
            </div>
            <div className="text-sm sm:text-base font-bold uppercase text-slate-900">
              KECAMATAN {school.kecamatan}
            </div>
          </>
        ) : (
          <>
            <div className="text-sm sm:text-base font-extrabold uppercase text-slate-950">
              {school.namaInstansi}
            </div>
            <div className="text-sm sm:text-base font-extrabold uppercase text-slate-950">
              {school.namaSekolah}
            </div>
          </>
        )}
        <div className="text-sm sm:text-base font-bold text-slate-900 pt-1">
          {school.tahunSampul}
        </div>
      </div>
    </div>
  );

  const renderPreface = () => (
    <div
      className={`${sheetClass} bg-white border border-slate-200 rounded-2xl p-8 sm:p-10 mx-auto flex flex-col justify-between text-slate-950 shadow-sm print:border-0 print:rounded-none print:shadow-none`}
    >
      <div>
        <h2 className="text-lg font-extrabold text-center uppercase tracking-wide mb-6">
          KATA PENGANTAR
        </h2>
        <div className="no-print mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Edit teks Kata Pengantar (otomatis tersimpan):
          </label>
          <textarea
            rows={6}
            value={school.kataPengantar}
            onChange={(e) => onUpdateSchool({ ...school, kataPengantar: e.target.value })}
            className="w-full p-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
          />
        </div>
        <div className="hidden print:block space-y-3 text-[13px] leading-relaxed text-justify whitespace-pre-line">
          {school.kataPengantar}
        </div>
        <div className="no-print mt-3 p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-2.5 text-xs sm:text-sm leading-relaxed text-justify whitespace-pre-line">
          {school.kataPengantar}
        </div>
      </div>

      <div className="mt-6 flex justify-end pr-8">
        <div className="text-sm min-w-[220px]">
          <div>{school.titimangsa}</div>
          <div>Kepala Madrasah</div>
          <div className="h-14" />
          <div className="font-bold underline">{school.kepalaMadrasah}</div>
          {school.nipKepala && school.nipKepala !== '-' && (
            <div className="font-mono text-xs">NIP. {school.nipKepala}</div>
          )}
        </div>
      </div>
    </div>
  );

  const tabs: { key: CoverKey; label: string }[] = [
    { key: 'harap-tenang', label: 'Harap Tenang' },
    { key: 'hadir-pengawas', label: 'Sampul Pengawas' },
    { key: 'hadir-peserta', label: 'Sampul Peserta' },
    { key: 'hadir-panitia', label: 'Sampul Panitia' },
    { key: 'panduan', label: 'Sampul Panduan' },
    { key: 'kata-pengantar', label: 'Kata Pengantar' },
    { key: 'semua', label: 'Semua (6 Hal)' },
  ];

  const activeLabel = tabs.find((t) => t.key === selected)?.label || 'Dokumen';

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} marginMm={8} />

      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Administrasi, Poster &amp; Sampul Dokumen
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Poster &quot;HARAP TENANG SEDANG UJIAN&quot;, sampul daftar hadir, panduan, dan kata pengantar siap cetak A4.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <PrintOrientationToggle value={orientation} onChange={setOrientation} />
              <PdfDownloadButton
                filename={`administrasi-${selected}-${slug}`}
                orientation={orientation}
                paperSize="A4"
                marginMm={6}
                getPageElements={() =>
                  pagesRef.current
                    ? Array.from(pagesRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]'))
                    : []
                }
                label="Unduh PDF"
              />
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak A4
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-100">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleSelectDoc(t.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
                  selected === t.key
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dark Bento Spec Tile */}
        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">Dokumen Aktif</div>
          <div className="text-xl font-extrabold leading-snug">{activeLabel}</div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            Kertas: A4 {orientation === 'landscape' ? 'Landscape (297 × 210 mm)' : 'Portrait (210 × 297 mm)'}
          </div>
        </div>
      </section>

      <div ref={pagesRef} className="space-y-6">
        {selected === 'semua' ? (
          <>
            <div data-pdf-page="true" className="print-only-container print-page-break">
              <QuietExamPoster school={school} orientation={orientation} />
            </div>
            {coverDefs.map((c) => (
              <div key={c.key} data-pdf-page="true" className="print-only-container print-page-break">
                {renderCover(c.title, c.isGuide)}
              </div>
            ))}
            <div data-pdf-page="true" className="print-only-container">{renderPreface()}</div>
          </>
        ) : selected === 'harap-tenang' ? (
          <div data-pdf-page="true" className="print-only-container">
            <QuietExamPoster school={school} orientation={orientation} />
          </div>
        ) : selected === 'kata-pengantar' ? (
          <div data-pdf-page="true" className="print-only-container">{renderPreface()}</div>
        ) : (
          <div data-pdf-page="true" className="print-only-container">
            {(() => {
              const found = coverDefs.find((c) => c.key === selected) || coverDefs[0];
              return renderCover(found.title, found.isGuide);
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
