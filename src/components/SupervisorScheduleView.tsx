import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Filter,
  Pencil,
  Printer,
  RotateCcw,
  Shuffle,
} from 'lucide-react';
import { ExamDay, SchoolIdentity, Supervisor, SupervisorScheduleMap } from '../types/exam';
import {
  autoGenerateSupervisorSchedule,
  detectSessionConflicts,
  formatIndonesianDate,
  getSupervisorColors,
} from '../utils/examLogic';
import { PdfDownloadButton } from './PdfDownloadButton';
import {
  PrintOrientation,
  PrintOrientationToggle,
  PrintPageConfig,
} from './PrintOrientationControl';
import { OfficialLetterhead } from './SchoolLogos';

interface SupervisorScheduleViewProps {
  school: SchoolIdentity;
  examDays: ExamDay[];
  supervisors: Supervisor[];
  roomCount: number;
  schedule: SupervisorScheduleMap;
  onUpdateSchedule: (next: SupervisorScheduleMap) => void;
  onUpdateSupervisors: (next: Supervisor[]) => void;
  onUpdateRoomCount: (count: number) => void;
  onUpdateDayCount: (count: number) => void;
}

export const SupervisorScheduleView: React.FC<SupervisorScheduleViewProps> = ({
  school,
  examDays,
  supervisors,
  roomCount,
  schedule,
  onUpdateSchedule,
  onUpdateSupervisors,
  onUpdateRoomCount,
  onUpdateDayCount,
}) => {
  const [printMode, setPrintMode] = useState(false);
  const [highlightCode, setHighlightCode] = useState<number | null>(null);
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
  const sheetRef = useRef<HTMLDivElement>(null);

  const supervisorMap = useMemo(() => {
    const m = new Map<number, Supervisor>();
    supervisors.forEach((s) => m.set(s.code, s));
    return m;
  }, [supervisors]);

  const { shiftCounts, maxShifts, totalConflicts, activeSessionsCount } = useMemo(() => {
    const counts = new Map<number, number>(supervisors.map((s) => [s.code, 0]));
    let conflicts = 0;
    let sessions = 0;

    examDays.forEach((day) => {
      day.sessions.forEach((ses) => {
        const hasSubject = Object.values(ses.subjects).some(
          (v) => v && v.trim() !== '' && v.trim() !== '-'
        );
        if (!hasSubject) return;
        sessions++;
        const key = `${day.id}__${ses.id}`;
        const row = schedule[key];
        const sessionConflicts = detectSessionConflicts(row, roomCount);
        conflicts += sessionConflicts.size;

        if (row) {
          for (let r = 1; r <= roomCount; r++) {
            const code = row[r];
            if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
          }
        }
      });
    });

    let maxVal = 1;
    counts.forEach((v) => {
      if (v > maxVal) maxVal = v;
    });

    return {
      shiftCounts: counts,
      maxShifts: maxVal,
      totalConflicts: conflicts,
      activeSessionsCount: sessions,
    };
  }, [examDays, schedule, roomCount, supervisors]);

  const handleGenerateAuto = () => {
    const generated = autoGenerateSupervisorSchedule(examDays, supervisors, roomCount, Date.now());
    onUpdateSchedule(generated);
  };

  const handleCellChange = (key: string, room: number, code: number) => {
    const prevRow = schedule[key] || {};
    onUpdateSchedule({
      ...schedule,
      [key]: {
        ...prevRow,
        [room]: code,
      },
    });
  };

  // Split supervisors into 3 compact columns when many supervisors exist so print fits cleanly on 1 page
  const legendColumns = useMemo(() => {
    const colCount = supervisors.length > 12 ? 3 : 2;
    const perCol = Math.ceil(supervisors.length / colCount);
    const cols: Supervisor[][] = [];
    for (let i = 0; i < colCount; i++) {
      const slice = supervisors.slice(i * perCol, (i + 1) * perCol);
      if (slice.length > 0) cols.push(slice);
    }
    return cols;
  }, [supervisors]);

  const highlightedSup = highlightCode !== null ? supervisorMap.get(highlightCode) : undefined;

  const totalSlotsNeeded = activeSessionsCount * roomCount;

  const { targetedSum, targetedCount } = useMemo(() => {
    let sum = 0;
    let count = 0;
    supervisors.forEach((s) => {
      if (s.targetShifts && s.targetShifts > 0) {
        sum += s.targetShifts;
        count++;
      }
    });
    return { targetedSum: sum, targetedCount: count };
  }, [supervisors]);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const prepareForPdf = async () => {
    if (!printMode) {
      setPrintMode(true);
      await new Promise((r) => setTimeout(r, 180));
    }
  };

  const handleSupervisorTargetChange = (id: string, rawVal: string) => {
    const parsed = parseInt(rawVal, 10);
    const nextVal = !rawVal.trim() || isNaN(parsed) || parsed <= 0 ? undefined : Math.min(99, parsed);
    onUpdateSupervisors(
      supervisors.map((s) => {
        if (s.id !== id) return s;
        if (nextVal === undefined) {
          const rest = { ...s };
          delete rest.targetShifts;
          return rest;
        }
        return { ...s, targetShifts: nextVal };
      })
    );
  };

  const handleResetAllTargets = () => {
    onUpdateSupervisors(
      supervisors.map((s) => {
        const rest = { ...s };
        delete rest.targetShifts;
        return rest;
      })
    );
  };

  const renderOfficialPrintView = () => (
    <div
      className={`${
        orientation === 'landscape' ? 'max-w-[1100px]' : 'max-w-[780px]'
      } mx-auto print:max-w-none print:w-full`}
    >
      {/* Official Print Table (Plain White Bold Headers) */}
      <div className="overflow-x-auto rounded-lg border border-slate-800 print:rounded-none">
        <table className="w-full border-collapse text-[10.5px] leading-tight">
          <thead>
            <tr className="bg-white text-slate-950 font-bold">
              <th
                rowSpan={2}
                className="border border-slate-800 px-1.5 py-1.5 w-7 text-center font-bold"
              >
                NO
              </th>
              <th
                rowSpan={2}
                className="border border-slate-800 px-2 py-1.5 w-36 text-center font-bold"
              >
                HARI / TANGGAL
              </th>
              <th
                rowSpan={2}
                className="border border-slate-800 px-1.5 py-1.5 w-10 text-center font-bold"
              >
                JAM
              </th>
              <th
                rowSpan={2}
                className="border border-slate-800 px-2 py-1.5 w-28 text-center font-bold"
              >
                WAKTU
              </th>
              <th
                colSpan={roomCount}
                className="border border-slate-800 px-2 py-1 text-center font-bold tracking-wider uppercase"
              >
                RUANG UJIAN
              </th>
            </tr>
            <tr className="bg-white text-slate-950 font-bold">
              {Array.from({ length: roomCount }, (_, idx) => idx + 1).map((r) => (
                <th
                  key={r}
                  className="border border-slate-800 px-1 py-1 text-center font-bold tabular-nums w-10"
                >
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {examDays.map((day, dIdx) => {
              const activeSessions = day.sessions.filter((ses) =>
                Object.values(ses.subjects).some((v) => v && v.trim() !== '' && v.trim() !== '-')
              );
              const rowsToRender = activeSessions.length > 0 ? activeSessions : day.sessions;
              const fd = formatIndonesianDate(day.date);
              const dayBg = dIdx % 2 === 1 ? 'bg-slate-50/90' : 'bg-white';

              return rowsToRender.map((ses, sIdx) => {
                const key = `${day.id}__${ses.id}`;
                const rowMap = schedule[key] || {};
                const conflicts = detectSessionConflicts(rowMap, roomCount);

                return (
                  <tr key={ses.id} className={dayBg}>
                    {sIdx === 0 && (
                      <td
                        rowSpan={rowsToRender.length}
                        className="border border-slate-700 px-1 py-1 text-center font-bold tabular-nums text-slate-900"
                      >
                        {dIdx + 1}
                      </td>
                    )}
                    {sIdx === 0 && (
                      <td
                        rowSpan={rowsToRender.length}
                        className="border border-slate-700 px-2 py-1 text-left whitespace-nowrap text-slate-900"
                      >
                        <span className="font-bold">{fd.dayName}</span>,{' '}
                        <span className="tabular-nums">{fd.fullDate}</span>
                      </td>
                    )}
                    <td className="border border-slate-700 px-1 py-0.5 text-center font-semibold tabular-nums text-slate-800">
                      {ses.jamKe}
                    </td>
                    <td className="border border-slate-700 px-1.5 py-0.5 text-center tabular-nums whitespace-nowrap text-slate-800">
                      {ses.waktu} WIB
                    </td>
                    {Array.from({ length: roomCount }, (_, idx) => idx + 1).map((roomNo) => {
                      const code = rowMap[roomNo] || 0;
                      const colors = code ? getSupervisorColors(code) : null;
                      const isConflict = conflicts.has(roomNo);

                      return (
                        <td
                          key={roomNo}
                          style={{
                            backgroundColor: colors?.bg || '#ffffff',
                            color: colors?.text || '#0f172a',
                          }}
                          className={`border border-slate-700 py-0.5 px-1 text-center font-extrabold tabular-nums ${
                            isConflict ? 'ring-2 ring-inset ring-rose-600' : ''
                          }`}
                        >
                          {code || '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Balanced Print Footer: Compact Multi-Column Legend + Official Signature */}
      <div className="mt-3.5 grid grid-cols-12 gap-3.5 items-start">
        <div
          className={`col-span-12 ${
            orientation === 'landscape' ? 'md:col-span-9 print:col-span-9' : 'print:col-span-12'
          } grid gap-2.5 ${legendColumns.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          {legendColumns.map((group, gIdx) => (
            <table
              key={gIdx}
              className="w-full border-collapse border border-slate-800 text-[9.5px] leading-tight"
            >
              <thead>
                <tr className="bg-white text-slate-950 font-bold">
                  <th className="border border-slate-800 px-1.5 py-1 w-9 text-center font-bold">
                    KODE
                  </th>
                  <th className="border border-slate-800 px-2 py-1 text-left font-bold">
                    NAMA PENGAWAS
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.map((sup) => {
                  const colors = getSupervisorColors(sup.code);
                  return (
                    <tr key={sup.id}>
                      <td
                        className="border border-slate-700 px-1 py-0.5 text-center font-extrabold tabular-nums"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {sup.code}
                      </td>
                      <td
                        className="border border-slate-700 px-1.5 py-0.5 font-semibold truncate max-w-[140px]"
                        style={{ backgroundColor: `${colors.bg}75`, color: '#0f172a' }}
                      >
                        {sup.name}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}
        </div>

        <div
          className={`col-span-12 ${
            orientation === 'landscape'
              ? 'md:col-span-3 print:col-span-3'
              : 'print:col-span-12 flex justify-end'
          } flex justify-end pt-1`}
        >
          <div className="border border-slate-300 print:border-slate-700 rounded-lg print:rounded-none px-4 py-3 text-[11px] text-slate-900 w-full max-w-[220px] bg-slate-50/60 print:bg-white">
            <div>{school.titimangsa}</div>
            <div className="font-medium">Ketua {school.singkatanUjian}</div>
            <div className="h-12" />
            <div className="font-bold underline">{school.ketuaPanitia}</div>
            {school.nipKetua && school.nipKetua !== '-' && (
              <div className="text-[10px] font-mono">NIP. {school.nipKetua}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} marginMm={7} />

      {/* Bento Grid Top Header & Metrics */}
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Jadwal Pengawas Ruang Ujian</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik sel kode untuk ubah pengawas manual, atau sorot nama guru untuk memeriksa sebaran tugasnya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />
            <button
              type="button"
              onClick={handleGenerateAuto}
              disabled={supervisors.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl whitespace-nowrap transition-colors"
            >
              <Shuffle className="w-3.5 h-3.5" /> Acak Anti-Bentrok
            </button>
            <button
              type="button"
              onClick={() => setPrintMode((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl whitespace-nowrap transition-colors"
            >
              {printMode ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {printMode ? 'Mode Edit' : 'Pratinjau Cetak'}
            </button>
            <PdfDownloadButton
              filename={`jadwal-pengawas-${slug}`}
              orientation={orientation}
              paperSize="A4"
              marginMm={7}
              prepareBeforeExport={prepareForPdf}
              getPageElements={() => (sheetRef.current ? [sheetRef.current] : [])}
              label="Unduh PDF"
            />
            <button
              type="button"
              onClick={() => {
                setPrintMode(true);
                setTimeout(() => window.print(), 120);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak A4
            </button>
          </div>
        </div>

        {/* 3 Bento KPI Tiles with Editable Exam Days & Rooms */}
        <div className="xl:col-span-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-4 flex flex-col justify-between gap-2">
            <div className="text-[11px] font-medium text-emerald-200">Hari Ujian</div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={30}
                value={examDays.length}
                onChange={(e) =>
                  onUpdateDayCount(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                aria-label="Jumlah hari ujian"
                className="w-16 px-2 py-1 text-lg font-extrabold tabular-nums bg-white/15 border border-white/25 rounded-lg text-white focus:outline-none focus:border-emerald-300"
              />
              <span className="text-xs text-emerald-200 font-semibold">Hari</span>
            </div>
            <div className="text-[11px] text-slate-300 tabular-nums">
              {activeSessionsCount} sesi aktif
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200/80 p-4 flex flex-col justify-between gap-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            <div className="text-[11px] font-medium text-slate-500">Jumlah Ruang</div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={100}
                value={roomCount}
                onChange={(e) =>
                  onUpdateRoomCount(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                aria-label="Jumlah ruang ujian"
                className="w-16 px-2 py-1 text-lg font-extrabold tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              />
              <span className="text-xs text-slate-600 font-semibold">Ruang</span>
            </div>
            <div className="text-[11px] text-slate-500 tabular-nums">
              {supervisors.length} guru pengawas
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 flex flex-col justify-between ${
              totalConflicts > 0
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-[11px] font-medium">
              <span>Validasi</span>
              {totalConflicts > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
            </div>
            <div className="text-2xl font-extrabold tabular-nums mt-2">{totalConflicts}</div>
            <div className="text-[11px] mt-1">
              {totalConflicts > 0 ? 'Jadwal bentrok' : 'Bebas bentrok'}
            </div>
          </div>
        </div>
      </section>

      {/* Conflict Alert */}
      {totalConflicts > 0 && (
        <div className="no-print px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Terdeteksi <strong>{totalConflicts} ruang</strong> memiliki pengawas ganda pada sesi yang sama (ditandai ring merah). Klik &quot;Acak Anti-Bentrok&quot; untuk memperbaiki otomatis.
          </span>
        </div>
      )}

      {/* Main Sheet Container */}
      <div
        ref={sheetRef}
        className="print-only-container bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)]"
      >
        {/* Official Letterhead (ALWAYS visible) */}
        <OfficialLetterhead
          school={school}
          title={`JADWAL PENGAWAS ${school.jenisUjian}`}
          showAddress={false}
          compact
        />

        {printMode ? (
          renderOfficialPrintView()
        ) : (
          <>
            {/* Interactive On-Screen View */}
            <div className="no-print space-y-5">
              {/* Filter Bar */}
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Filter className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>
                    {highlightedSup ? (
                      <>
                        Menyorot tugas:{' '}
                        <strong className="text-slate-900">
                          #{highlightedSup.code} · {highlightedSup.name}
                        </strong>{' '}
                        ({shiftCounts.get(highlightedSup.code) ?? 0}x sesi)
                      </>
                    ) : (
                      'Pilih pengawas untuk menyorot jadwal tugasnya atau ubah langsung pada kolom ruang.'
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={highlightCode ?? ''}
                    onChange={(e) =>
                      setHighlightCode(e.target.value ? Number(e.target.value) : null)
                    }
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Semua Pengawas (Normal)</option>
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.code}>
                        #{s.code} — {s.name} ({shiftCounts.get(s.code) ?? 0}x)
                      </option>
                    ))}
                  </select>

                  {highlightCode !== null && (
                    <button
                      type="button"
                      onClick={() => setHighlightCode(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg whitespace-nowrap"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Clean Interactive Table */}
              <div className="rounded-xl border border-slate-200/90 overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-white text-slate-950 font-bold border-b border-slate-200">
                      <th
                        rowSpan={2}
                        className="border-r border-slate-200 px-2.5 py-2.5 w-10 text-center font-bold"
                      >
                        NO
                      </th>
                      <th
                        rowSpan={2}
                        className="border-r border-slate-200 px-3 py-2.5 w-44 text-left font-bold"
                      >
                        HARI / TANGGAL
                      </th>
                      <th
                        rowSpan={2}
                        className="border-r border-slate-200 px-2 py-2.5 w-14 text-center font-bold"
                      >
                        JAM
                      </th>
                      <th
                        rowSpan={2}
                        className="border-r border-slate-200 px-3 py-2.5 w-32 text-center font-bold"
                      >
                        WAKTU
                      </th>
                      <th
                        colSpan={roomCount}
                        className="border-b border-slate-200 px-2 py-1.5 text-center text-[11px] font-bold tracking-wider uppercase"
                      >
                        RUANG UJIAN (KODE PENGAWAS)
                      </th>
                    </tr>
                    <tr className="bg-white text-slate-950 font-bold border-b-2 border-slate-200">
                      {Array.from({ length: roomCount }, (_, idx) => idx + 1).map((r) => (
                        <th
                          key={r}
                          className="border-l border-slate-200 px-1.5 py-1.5 text-center w-14 font-bold tabular-nums"
                        >
                          R{r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {examDays.map((day, dIdx) => {
                      const activeSessions = day.sessions.filter((ses) =>
                        Object.values(ses.subjects).some(
                          (v) => v && v.trim() !== '' && v.trim() !== '-'
                        )
                      );
                      const rowsToRender =
                        activeSessions.length > 0 ? activeSessions : day.sessions;
                      const fd = formatIndonesianDate(day.date);

                      return rowsToRender.map((ses, sIdx) => {
                        const key = `${day.id}__${ses.id}`;
                        const rowMap = schedule[key] || {};
                        const conflicts = detectSessionConflicts(rowMap, roomCount);
                        const isDayBoundary = dIdx > 0 && sIdx === 0;

                        return (
                          <tr
                            key={ses.id}
                            className={`${
                              isDayBoundary
                                ? 'border-t-2 border-slate-200'
                                : 'border-t border-slate-100'
                            } hover:bg-slate-50/70 transition-colors`}
                          >
                            {sIdx === 0 && (
                              <td
                                rowSpan={rowsToRender.length}
                                className="border-r border-slate-200 px-2 py-2 text-center font-bold text-slate-700 tabular-nums align-middle bg-slate-50/40"
                              >
                                {dIdx + 1}
                              </td>
                            )}
                            {sIdx === 0 && (
                              <td
                                rowSpan={rowsToRender.length}
                                className="border-r border-slate-200 px-3 py-2 text-left whitespace-nowrap align-middle bg-slate-50/40"
                              >
                                <div className="font-bold text-slate-900">{fd.dayName}</div>
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                  {fd.fullDate}
                                </div>
                              </td>
                            )}
                            <td className="border-r border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-600 tabular-nums">
                              {ses.jamKe}
                            </td>
                            <td className="border-r border-slate-200 px-2.5 py-1.5 text-center text-[11px] text-slate-600 tabular-nums whitespace-nowrap">
                              {ses.waktu} WIB
                            </td>
                            {Array.from({ length: roomCount }, (_, idx) => idx + 1).map(
                              (roomNo) => {
                                const code = rowMap[roomNo] || 0;
                                const colors = code ? getSupervisorColors(code) : null;
                                const isConflict = conflicts.has(roomNo);
                                const supName = code ? supervisorMap.get(code)?.name : '';
                                const isHighlighted =
                                  highlightCode !== null && highlightCode === code;
                                const isDimmed =
                                  highlightCode !== null && highlightCode !== code;

                                return (
                                  <td
                                    key={roomNo}
                                    title={
                                      supName
                                        ? `${code}. ${supName}`
                                        : 'Klik untuk pilih pengawas'
                                    }
                                    className="border-l border-slate-200/80 p-1 text-center"
                                  >
                                    <div
                                      style={{
                                        backgroundColor: colors?.bg || '#f8fafc',
                                        color: colors?.text || '#94a3b8',
                                      }}
                                      className={`rounded-lg transition-all border border-black/10 ${
                                        isConflict
                                          ? 'ring-2 ring-rose-500'
                                          : isHighlighted
                                          ? 'ring-2 ring-emerald-700 shadow-sm scale-[1.03]'
                                          : 'hover:ring-2 hover:ring-slate-400/50'
                                      } ${isDimmed ? 'opacity-25' : ''}`}
                                    >
                                      <select
                                        value={code || ''}
                                        onChange={(e) =>
                                          handleCellChange(
                                            key,
                                            roomNo,
                                            parseInt(e.target.value, 10) || 0
                                          )
                                        }
                                        className="w-full py-1.5 px-1 text-center bg-transparent font-extrabold text-xs tabular-nums focus:outline-none cursor-pointer appearance-none"
                                      >
                                        <option value="">-</option>
                                        {supervisors.map((s) => (
                                          <option key={s.id} value={s.code}>
                                            {s.code} - {s.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </td>
                                );
                              }
                            )}
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>

              {/* Interactive Bento Directory with Target Quota Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className="lg:col-span-8 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Direktori Pengawas &amp; Atur Jatah Ngawas
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Atur target jumlah ngawas per guru (atau kosongkan untuk <strong>Auto</strong>), lalu klik <strong>Acak Anti-Bentrok</strong>. Klik nama guru untuk menyorot tugasnya.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                        Slot: {targetedSum}/{totalSlotsNeeded}
                      </span>
                      {targetedCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetAllTargets}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg whitespace-nowrap"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset Auto
                        </button>
                      )}
                    </div>
                  </div>

                  {targetedSum > totalSlotsNeeded && totalSlotsNeeded > 0 && (
                    <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                      Total jatah yang ditentukan ({targetedSum}x) melebihi kebutuhan total ({totalSlotsNeeded} slot sesi). Beberapa sesi mungkin memprioritaskan guru agar kebutuhan ruang terpenuhi.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {supervisors.map((sup) => {
                      const colors = getSupervisorColors(sup.code);
                      const count = shiftCounts.get(sup.code) ?? 0;
                      const isActive = highlightCode === sup.code;
                      const isOtherDimmed = highlightCode !== null && !isActive;
                      const pct = Math.min(100, Math.round((count / maxShifts) * 100));

                      return (
                        <div
                          key={sup.id}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all ${
                            isActive
                              ? 'bg-white border-emerald-600 ring-2 ring-emerald-500/20 shadow-sm'
                              : 'bg-white border-slate-200/80 hover:border-slate-300'
                          } ${isOtherDimmed ? 'opacity-50' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => setHighlightCode(isActive ? null : sup.code)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                          >
                            <span
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                              className="w-7 h-7 rounded-lg font-extrabold text-xs flex items-center justify-center shrink-0 tabular-nums border border-black/10"
                            >
                              {sup.code}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {sup.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-10 h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600 rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                  Aktual: {count}x
                                </span>
                              </div>
                            </div>
                          </button>

                          <div
                            className="flex items-center gap-1 shrink-0"
                            title="Target jumlah ngawas saat pengacakan (kosong = Auto)"
                          >
                            <input
                              type="number"
                              min={0}
                              max={99}
                              placeholder="Auto"
                              aria-label={`Jatah ngawas ${sup.name}`}
                              value={
                                sup.targetShifts && sup.targetShifts > 0 ? sup.targetShifts : ''
                              }
                              onChange={(e) =>
                                handleSupervisorTargetChange(sup.id, e.target.value)
                              }
                              className="w-12 px-1.5 py-1 text-center text-[11px] font-bold tabular-nums bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white placeholder:font-normal placeholder:text-slate-400"
                            />
                            <span className="text-[11px] font-semibold text-slate-400">x</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Signature Preview Bento Tile */}
                <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Pengesahan Dokumen</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tanda tangan otomatis mengikuti Data Sekolah.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-xs text-slate-900">
                    <div>{school.titimangsa}</div>
                    <div>Ketua {school.singkatanUjian}</div>
                    <div className="h-12" />
                    <div className="font-bold underline">{school.ketuaPanitia}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPrintMode(true);
                      setTimeout(() => window.print(), 120);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Jadwal Resmi
                  </button>
                </div>
              </div>
            </div>

            {/* Print fallback when Ctrl+P is triggered directly from Edit Mode */}
            <div className="hidden print:block">{renderOfficialPrintView()}</div>
          </>
        )}
      </div>
    </div>
  );
};
