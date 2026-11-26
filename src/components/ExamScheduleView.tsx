import React, { useRef, useState } from 'react';
import { Eye, Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { ExamDay, SchoolIdentity } from '../types/exam';
import { formatIndonesianDate } from '../utils/examLogic';
import { PdfDownloadButton } from './PdfDownloadButton';
import {
  PrintOrientation,
  PrintOrientationToggle,
  PrintPageConfig,
} from './PrintOrientationControl';
import { OfficialLetterhead } from './SchoolLogos';

interface ExamScheduleViewProps {
  school: SchoolIdentity;
  tracks: string[];
  examDays: ExamDay[];
  roomCount: number;
  onUpdateTracks: (tracks: string[]) => void;
  onUpdateExamDays: (days: ExamDay[]) => void;
  onUpdateRoomCount: (count: number) => void;
  onUpdateDayCount: (count: number) => void;
}

export const ExamScheduleView: React.FC<ExamScheduleViewProps> = ({
  school,
  tracks,
  examDays,
  roomCount,
  onUpdateTracks,
  onUpdateExamDays,
  onUpdateRoomCount,
  onUpdateDayCount,
}) => {
  const [mode, setMode] = useState<'edit' | 'print'>('edit');
  const [newTrack, setNewTrack] = useState('');
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
  const printSheetRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const prepareForPdf = async () => {
    if (mode !== 'print') {
      setMode('print');
      await new Promise((r) => setTimeout(r, 180));
    }
  };

  const handleAddDay = () => {
    const lastDate = examDays[examDays.length - 1]?.date || school.tanggalMulai || '2026-06-02';
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 1);
    const nextIso = d.toISOString().slice(0, 10);
    const dayId = `d-${Date.now()}`;
    const emptySubjects: Record<string, string> = {};
    tracks.forEach((t) => (emptySubjects[t] = ''));
    onUpdateExamDays([
      ...examDays,
      {
        id: dayId,
        date: nextIso,
        sessions: [
          { id: `${dayId}-s1`, jamKe: 1, waktu: '07.00 - 08.30', subjects: { ...emptySubjects } },
          { id: `${dayId}-s2`, jamKe: 2, waktu: '08.45 - 10.15', subjects: { ...emptySubjects } },
        ],
      },
    ]);
  };

  const handleAddSession = (dayId: string) => {
    onUpdateExamDays(
      examDays.map((day) => {
        if (day.id !== dayId) return day;
        const nextJam = day.sessions.length + 1;
        const emptySubjects: Record<string, string> = {};
        tracks.forEach((t) => (emptySubjects[t] = ''));
        return {
          ...day,
          sessions: [
            ...day.sessions,
            {
              id: `${day.id}-s${Date.now()}`,
              jamKe: nextJam,
              waktu: nextJam === 3 ? '10.30 - 12.00' : '08.45 - 10.15',
              subjects: emptySubjects,
            },
          ],
        };
      })
    );
  };

  const handleRemoveSession = (dayId: string, sessionId: string) => {
    onUpdateExamDays(
      examDays.map((day) => {
        if (day.id !== dayId) return day;
        const filtered = day.sessions
          .filter((s) => s.id !== sessionId)
          .map((s, idx) => ({ ...s, jamKe: idx + 1 }));
        return { ...day, sessions: filtered };
      })
    );
  };

  const handleUpdateSubject = (dayId: string, sessionId: string, track: string, val: string) => {
    onUpdateExamDays(
      examDays.map((day) => {
        if (day.id !== dayId) return day;
        return {
          ...day,
          sessions: day.sessions.map((ses) =>
            ses.id === sessionId
              ? { ...ses, subjects: { ...ses.subjects, [track]: val } }
              : ses
          ),
        };
      })
    );
  };

  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTrack.trim().toUpperCase();
    if (!clean || tracks.includes(clean)) return;
    onUpdateTracks([...tracks, clean]);
    setNewTrack('');
  };

  const handleRemoveTrack = (track: string) => {
    if (tracks.length <= 1) return;
    onUpdateTracks(tracks.filter((t) => t !== track));
  };

  const totalSessions = examDays.reduce((acc, d) => acc + d.sessions.length, 0);

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} marginMm={8} />

      {/* Top Bento Grid */}
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Jadwal Mata Pelajaran Ujian</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tanggal dan jam ujian otomatis membentuk kolom Daftar Hadir Peserta, Jadwal Pengawas, dan Monitor Harian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  mode === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" /> Mode Edit
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

            <PdfDownloadButton
              filename={`jadwal-ujian-${slug}`}
              orientation={orientation}
              paperSize="A4"
              marginMm={8}
              prepareBeforeExport={prepareForPdf}
              getPageElements={() => (printSheetRef.current ? [printSheetRef.current] : [])}
              label="Unduh PDF"
            />

            <button
              type="button"
              onClick={() => {
                setMode('print');
                setTimeout(() => window.print(), 120);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Jadwal
            </button>
          </div>
        </div>

        {/* Summary Bento Tile with Editable Hari & Ruang */}
        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">Atur Hari &amp; Ruang</span>
            <span className="text-[11px] text-slate-300 tabular-nums">
              {totalSessions} Sesi · {tracks.length} Jurusan
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Jumlah Hari</label>
              <input
                type="number"
                min={1}
                max={30}
                value={examDays.length}
                onChange={(e) =>
                  onUpdateDayCount(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className="w-full px-2.5 py-1.5 text-sm font-extrabold tabular-nums bg-white/15 border border-white/25 rounded-xl text-white focus:outline-none focus:border-emerald-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Jumlah Ruang</label>
              <input
                type="number"
                min={1}
                max={100}
                value={roomCount}
                onChange={(e) =>
                  onUpdateRoomCount(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className="w-full px-2.5 py-1.5 text-sm font-extrabold tabular-nums bg-white/15 border border-white/25 rounded-xl text-white focus:outline-none focus:border-emerald-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
            <span className="text-[11px] text-slate-300">
              A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
            </span>
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleAddDay}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg whitespace-nowrap"
              >
                <Plus className="w-3 h-3" /> Hari Baru
              </button>
            )}
          </div>
        </div>
      </section>

      {mode === 'edit' && (
        <div className="no-print space-y-4">
          {/* Jurusan / Kelompok Kelas Columns */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Kolom Tingkat / Jurusan:</span>
              {tracks.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-800 rounded-lg"
                >
                  {t}
                  {tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(t)}
                      className="text-slate-400 hover:text-rose-600"
                      aria-label={`Hapus kolom ${t}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            <form onSubmit={handleAddTrack} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Tambah jurusan (mis. AGAMA)"
                value={newTrack}
                onChange={(e) => setNewTrack(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 whitespace-nowrap"
              >
                + Kolom
              </button>
            </form>
          </div>

          {/* 2-Column Bento Grid of Days */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {examDays.map((day, dIdx) => {
              const fd = formatIndonesianDate(day.date);
              return (
                <div
                  key={day.id}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)]"
                >
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-emerald-800">
                        HARI {dIdx + 1}
                      </span>
                      <input
                        type="date"
                        value={day.date}
                        onChange={(e) =>
                          onUpdateExamDays(
                            examDays.map((d) =>
                              d.id === day.id ? { ...d, date: e.target.value } : d
                            )
                          )
                        }
                        className="px-2.5 py-1 text-xs font-mono bg-white border border-slate-200 rounded-md"
                      />
                      <span className="text-xs font-medium text-slate-600">
                        {fd.dayName}, {fd.fullDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddSession(day.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-white border border-emerald-200 rounded-md hover:bg-emerald-50"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Jam
                      </button>
                      {examDays.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateExamDays(examDays.filter((d) => d.id !== day.id))
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          aria-label="Hapus hari"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white border-b-2 border-slate-200 text-slate-950 font-bold">
                        <tr>
                          <th className="py-2 px-3 w-16 text-center font-bold">Jam</th>
                          <th className="py-2 px-3 w-36 font-bold">Waktu</th>
                          {tracks.map((t) => (
                            <th key={t} className="py-2 px-3 font-bold">
                              Mapel {t}
                            </th>
                          ))}
                          <th className="py-2 px-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {day.sessions.map((ses) => (
                          <tr key={ses.id}>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-slate-700">
                              {ses.jamKe}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={ses.waktu}
                                onChange={(e) =>
                                  onUpdateExamDays(
                                    examDays.map((d) =>
                                      d.id === day.id
                                        ? {
                                            ...d,
                                            sessions: d.sessions.map((s) =>
                                              s.id === ses.id ? { ...s, waktu: e.target.value } : s
                                            ),
                                          }
                                        : d
                                    )
                                  )
                                }
                                className="w-full px-2 py-1 font-mono text-xs border border-slate-200 rounded"
                              />
                            </td>
                            {tracks.map((t) => (
                              <td key={t} className="py-2 px-3">
                                <input
                                  type="text"
                                  value={ses.subjects[t] ?? ''}
                                  placeholder="-"
                                  onChange={(e) =>
                                    handleUpdateSubject(day.id, ses.id, t, e.target.value)
                                  }
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                                />
                              </td>
                            ))}
                            <td className="py-2 px-3 text-right">
                              {day.sessions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSession(day.id, ses.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                  aria-label="Hapus sesi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddDay}
            className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl text-xs font-semibold text-slate-600 hover:text-emerald-800 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tambah Hari Ujian Baru
          </button>
        </div>
      )}

      {/* Print Preview & Ctrl+P Fallback */}
      <div
        ref={printSheetRef}
        className={`print-only-container bg-white border border-slate-200 rounded-xl p-8 max-w-5xl mx-auto ${
          mode === 'edit' ? 'hidden print:block' : ''
        }`}
      >
        <OfficialLetterhead
          school={school}
          title={`JADWAL ${school.jenisUjian}`}
        />

        <table className="w-full border-collapse border border-slate-900 text-xs mt-4">
          <thead>
            <tr className="bg-white text-slate-950 font-bold">
              <th rowSpan={2} className="border border-slate-900 px-2 py-2 text-center w-28 font-bold">
                HARI / TANGGAL
              </th>
              <th rowSpan={2} className="border border-slate-900 px-2 py-2 text-center w-12 font-bold">
                JAM
              </th>
              <th rowSpan={2} className="border border-slate-900 px-2 py-2 text-center w-28 font-bold">
                WAKTU
              </th>
              <th colSpan={tracks.length} className="border border-slate-900 px-2 py-1.5 text-center font-bold">
                MATA PELAJARAN
              </th>
            </tr>
            <tr className="bg-white text-slate-950 font-bold">
              {tracks.map((t) => (
                <th key={t} className="border border-slate-900 px-2 py-1.5 text-center font-bold">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {examDays.map((day) => {
              const fd = formatIndonesianDate(day.date);
              return day.sessions.map((ses, sIdx) => (
                <tr key={ses.id}>
                  {sIdx === 0 && (
                    <td
                      rowSpan={day.sessions.length}
                      className="border border-slate-900 px-2 py-1.5 text-center align-middle font-medium"
                    >
                      <div>{fd.dayName}</div>
                      <div className="font-mono text-[11px]">{fd.shortDate}</div>
                    </td>
                  )}
                  <td className="border border-slate-900 px-2 py-1 text-center font-mono tabular-nums">
                    {ses.jamKe}
                  </td>
                  <td className="border border-slate-900 px-2 py-1 text-center font-mono tabular-nums">
                    {Object.values(ses.subjects).some((v) => v && v !== '-') ? ses.waktu : ''}
                  </td>
                  {tracks.map((t) => (
                    <td key={t} className="border border-slate-900 px-2 py-1 text-center uppercase">
                      {ses.subjects[t] && ses.subjects[t] !== '-' ? ses.subjects[t] : ''}
                    </td>
                  ))}
                </tr>
              ));
            })}
          </tbody>
        </table>

        <div className="mt-8 flex justify-end pr-8">
          <div className="text-xs text-slate-900 min-w-[210px]">
            <div>{school.titimangsa}</div>
            <div>Ketua {school.singkatanUjian}</div>
            <div className="h-16" />
            <div className="font-bold underline">{school.ketuaPanitia}</div>
            {school.nipKetua && school.nipKetua !== '-' && (
              <div className="font-mono text-[11px]">NIP. {school.nipKetua}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
