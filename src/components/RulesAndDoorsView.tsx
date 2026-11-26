import React, { useRef, useState } from 'react';
import { Eye, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { ExamRule, SchoolIdentity } from '../types/exam';
import { PdfDownloadButton } from './PdfDownloadButton';
import {
  PrintOrientation,
  PrintOrientationToggle,
  PrintPageConfig,
} from './PrintOrientationControl';
import { LogoSekolah, OfficialLetterhead } from './SchoolLogos';

interface QuietExamPosterProps {
  school: SchoolIdentity;
  orientation?: PrintOrientation;
}

export const QuietExamPoster: React.FC<QuietExamPosterProps> = ({
  school,
  orientation = 'landscape',
}) => {
  const sheetClass =
    orientation === 'landscape' ? 'a4-sheet-landscape' : 'a4-sheet-portrait';

  return (
    <div
      className={`${sheetClass} bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mx-auto relative overflow-hidden flex flex-col justify-between shadow-sm print:border-0 print:rounded-none print:shadow-none print:p-4`}
    >
      <OfficialLetterhead school={school} title={school.jenisUjian} />

      <div className="relative flex-1 flex flex-col items-center justify-center py-6 text-center">
        <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
          {school.rightLogoDataUrl ? (
            <img
              src={school.rightLogoDataUrl}
              alt=""
              className="w-[290px] h-[290px] sm:w-[360px] sm:h-[360px] object-contain"
            />
          ) : (
            <LogoSekolah className="w-[290px] h-[290px] sm:w-[360px] sm:h-[360px]" />
          )}
        </div>

        <div
          className="relative z-10 space-y-3 sm:space-y-5 select-none uppercase font-black tracking-wide text-slate-950"
          style={{
            WebkitTextStroke: '3px #ffffff',
            paintOrder: 'stroke fill',
            textShadow: '0 4px 10px rgba(15, 23, 42, 0.35)',
          }}
        >
          <div className="text-5xl sm:text-7xl lg:text-[82px] leading-[1.06]">
            HARAP TENANG
          </div>
          <div className="text-5xl sm:text-7xl lg:text-[82px] leading-[1.06]">
            SEDANG UJIAN
          </div>
        </div>
      </div>
    </div>
  );
};

interface RoomDoorSignProps {
  school: SchoolIdentity;
  roomNo: number;
  orientation?: PrintOrientation;
}

export const RoomDoorSign: React.FC<RoomDoorSignProps> = ({
  school,
  roomNo,
  orientation = 'landscape',
}) => {
  const sheetClass =
    orientation === 'landscape' ? 'a4-sheet-landscape' : 'a4-sheet-portrait';

  return (
    <div
      className={`${sheetClass} bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 mx-auto relative overflow-hidden flex flex-col justify-between shadow-sm print:border-0 print:rounded-none print:shadow-none print:p-4`}
    >
      <OfficialLetterhead school={school} title={school.jenisUjian} />

      <div className="relative flex-1 flex flex-col items-center justify-center py-6 text-center">
        <div className="absolute inset-0 flex items-center justify-center opacity-15 pointer-events-none">
          {school.rightLogoDataUrl ? (
            <img
              src={school.rightLogoDataUrl}
              alt=""
              className="w-[290px] h-[290px] sm:w-[360px] sm:h-[360px] object-contain"
            />
          ) : (
            <LogoSekolah className="w-[290px] h-[290px] sm:w-[360px] sm:h-[360px]" />
          )}
        </div>

        <div
          className="relative z-10 leading-none select-none"
          style={{
            WebkitTextStroke: '3px #ffffff',
            paintOrder: 'stroke fill',
            textShadow: '0 4px 10px rgba(15, 23, 42, 0.35)',
          }}
        >
          <div className="text-5xl sm:text-7xl font-black tracking-widest text-slate-950 uppercase">
            RUANG
          </div>
          <div className="text-[110px] sm:text-[175px] font-black font-mono tabular-nums tracking-tight text-slate-950 mt-2 leading-none">
            {String(roomNo).padStart(3, '0')}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExamRulesViewProps {
  school: SchoolIdentity;
  rules: ExamRule[];
  onUpdateRules: (rules: ExamRule[]) => void;
}

export const ExamRulesView: React.FC<ExamRulesViewProps> = ({
  school,
  rules,
  onUpdateRules,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [orientation, setOrientation] = useState<PrintOrientation>('portrait');
  const rulesSheetRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const prepareRulesForPdf = async () => {
    if (editMode) {
      setEditMode(false);
      await new Promise((r) => setTimeout(r, 180));
    }
  };

  const renderText = (txt: string) =>
    txt.replace(/\{\{SINGKATAN\}\}/g, school.singkatanUjian || 'UJIAN');

  const handleAddRule = () => {
    onUpdateRules([
      ...rules,
      { id: `r-${Date.now()}`, text: 'Aturan baru tata tertib peserta ujian...' },
    ]);
  };

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} marginMm={10} />

      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Tata Tertib Peserta Ujian</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Singkatan ujian ({school.singkatanUjian}), kop madrasah, dan tanda tangan ketua otomatis menyesuaikan pengaturan sekolah.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl whitespace-nowrap"
            >
              {editMode ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {editMode ? 'Pratinjau Dokumen' : 'Edit Poin Tata Tertib'}
            </button>
            <PdfDownloadButton
              filename={`tata-tertib-${slug}`}
              orientation={orientation}
              paperSize="A4"
              marginMm={10}
              prepareBeforeExport={prepareRulesForPdf}
              getPageElements={() => (rulesSheetRef.current ? [rulesSheetRef.current] : [])}
              label="Unduh PDF"
            />
            <button
              type="button"
              onClick={() => {
                setEditMode(false);
                setTimeout(() => window.print(), 120);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Tata Tertib
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">Poin Tata Tertib</div>
          <div className="text-2xl font-extrabold tabular-nums">{rules.length} Pasal</div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            Format cetak: A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'} · {editMode ? 'Mode Edit' : 'Siap Cetak'}
          </div>
        </div>
      </section>

      {editMode && (
        <div className="no-print bg-white border border-slate-200 rounded-xl p-6 space-y-3 max-w-4xl mx-auto">
          <div className="text-xs text-slate-500 mb-2">
            Gunakan placeholder <code className="font-mono bg-slate-100 px-1 rounded">{'{{SINGKATAN}}'}</code> agar otomatis diganti dengan singkatan ujian ({school.singkatanUjian}).
          </div>
          {rules.map((rule, idx) => (
            <div key={rule.id} className="p-3 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-mono font-bold text-slate-500 pt-2 w-6">
                  {idx + 1}.
                </span>
                <textarea
                  rows={2}
                  value={rule.text}
                  onChange={(e) =>
                    onUpdateRules(
                      rules.map((r) => (r.id === rule.id ? { ...r, text: e.target.value } : r))
                    )
                  }
                  className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => onUpdateRules(rules.filter((r) => r.id !== rule.id))}
                  className="p-1.5 text-slate-400 hover:text-rose-600"
                  aria-label="Hapus aturan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {rule.subItems && (
                <div className="pl-8 space-y-1.5">
                  {rule.subItems.map((sub, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">
                        {String.fromCharCode(97 + sIdx)}.
                      </span>
                      <input
                        type="text"
                        value={sub}
                        onChange={(e) =>
                          onUpdateRules(
                            rules.map((r) =>
                              r.id === rule.id
                                ? {
                                    ...r,
                                    subItems: r.subItems?.map((item, ii) =>
                                      ii === sIdx ? e.target.value : item
                                    ),
                                  }
                                : r
                            )
                          )
                        }
                        className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddRule}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Poin Aturan
          </button>
        </div>
      )}

      <div
        ref={rulesSheetRef}
        className={`print-only-container bg-white border border-slate-200 rounded-xl p-10 mx-auto text-slate-950 ${
          orientation === 'landscape' ? 'max-w-5xl' : 'max-w-4xl'
        } ${editMode ? 'hidden print:block' : ''}`}
      >
        <OfficialLetterhead
          school={school}
          title="TATA TERTIB PESERTA"
          subtitle={school.jenisUjian}
          showAddress={false}
        />

        <ol className="mt-6 space-y-2 text-[13px] leading-relaxed">
          {rules.map((rule, idx) => (
            <li key={rule.id} className="flex items-start gap-3">
              <span className="font-mono w-6 shrink-0">{idx + 1}.</span>
              <div className="flex-1">
                <div>{renderText(rule.text)}</div>
                {rule.subItems && rule.subItems.length > 0 && (
                  <ol className="mt-1 space-y-1 pl-2">
                    {rule.subItems.map((sub, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2.5">
                        <span className="w-5 shrink-0">{String.fromCharCode(97 + sIdx)}.</span>
                        <span>{renderText(sub)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex justify-end pr-10">
          <div className="text-xs text-slate-950 min-w-[200px]">
            <div>{school.titimangsa}</div>
            <div>Ketua {school.singkatanUjian}</div>
            <div className="h-16" />
            <div className="font-bold underline">{school.ketuaPanitia}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DoorSignsViewProps {
  school: SchoolIdentity;
  roomCount: number;
}

export const DoorSignsView: React.FC<DoorSignsViewProps> = ({ school, roomCount }) => {
  const [selectedView, setSelectedView] = useState<'all-doors' | 'single-door' | 'quiet'>('all-doors');
  const [singleRoom, setSingleRoom] = useState(1);
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
  const doorsPagesRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const doorsToRender =
    selectedView === 'quiet'
      ? []
      : selectedView === 'single-door'
      ? [Math.min(singleRoom, roomCount)]
      : Array.from({ length: roomCount }, (_, i) => i + 1);

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} marginMm={8} />

      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Nomor Pintu &amp; Poster Ujian</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Otomatis menghasilkan papan nomor Ruang 001 s.d. {String(roomCount).padStart(3, '0')} serta poster &quot;HARAP TENANG SEDANG UJIAN&quot; ukuran A4 Landscape.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />

            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedView('all-doors')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  selectedView === 'all-doors' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Semua Ruang ({roomCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedView('single-door')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  selectedView === 'single-door' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Pilih Ruang
              </button>
              <button
                type="button"
                onClick={() => setSelectedView('quiet')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  selectedView === 'quiet' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Poster Harap Tenang
              </button>
            </div>

            {selectedView === 'single-door' && (
              <select
                value={singleRoom}
                onChange={(e) => setSingleRoom(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
              >
                {Array.from({ length: roomCount }, (_, i) => i + 1).map((r) => (
                  <option key={r} value={r}>
                    RUANG {String(r).padStart(3, '0')}
                  </option>
                ))}
              </select>
            )}

            <PdfDownloadButton
              filename={`nomor-pintu-poster-${slug}`}
              orientation={orientation}
              paperSize="A4"
              marginMm={6}
              getPageElements={() =>
                doorsPagesRef.current
                  ? Array.from(doorsPagesRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]'))
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

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">Papan Pintu &amp; Poster</div>
          <div className="text-2xl font-extrabold tabular-nums">
            {selectedView === 'quiet'
              ? 'Poster Harap Tenang'
              : selectedView === 'single-door'
              ? `RUANG ${String(Math.min(singleRoom, roomCount)).padStart(3, '0')}`
              : `${roomCount} Lembar Ruang`}
          </div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            Ukuran A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'} · 1 lembar/halaman
          </div>
        </div>
      </section>

      <div ref={doorsPagesRef} className="space-y-6">
        {doorsToRender.map((roomNo, idx) => (
          <div
            key={roomNo}
            data-pdf-page="true"
            className={`print-only-container ${
              idx < doorsToRender.length - 1 ? 'print-page-break' : ''
            }`}
          >
            <RoomDoorSign school={school} roomNo={roomNo} orientation={orientation} />
          </div>
        ))}

        {selectedView === 'quiet' && (
          <div data-pdf-page="true" className="print-only-container">
            <QuietExamPoster school={school} orientation={orientation} />
          </div>
        )}
      </div>
    </div>
  );
};
