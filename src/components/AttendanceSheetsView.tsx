import React, { useMemo, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import {
  CommitteeMember,
  ExamDay,
  SchoolIdentity,
  Student,
  Supervisor,
  SupervisorScheduleMap,
} from '../types/exam';
import { formatIndonesianDate } from '../utils/examLogic';
import { PdfDownloadButton } from './PdfDownloadButton';
import {
  PrintOrientation,
  PrintOrientationToggle,
  PrintPageConfig,
} from './PrintOrientationControl';
import { OfficialLetterhead } from './SchoolLogos';

interface StudentAttendanceViewProps {
  school: SchoolIdentity;
  students: Student[];
  examDays: ExamDay[];
  roomCount: number;
  onUpdateRoomCount: (count: number) => void;
  onUpdateDayCount: (count: number) => void;
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({
  school,
  students,
  examDays,
  roomCount,
  onUpdateRoomCount,
  onUpdateDayCount,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<number>(1);
  const [printAll, setPrintAll] = useState(false);
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
  const sheetsContainerRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const studentsByRoom = useMemo(() => {
    const map = new Map<number, Student[]>();
    for (let r = 1; r <= roomCount; r++) map.set(r, []);
    students.forEach((s) => {
      const r = s.ruang >= 1 ? s.ruang : 1;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(s);
    });
    return map;
  }, [students, roomCount]);

  const roomsToRender = printAll
    ? Array.from({ length: roomCount }, (_, i) => i + 1)
    : [Math.min(selectedRoom, roomCount)];

  const sheetWidthCls =
    orientation === 'landscape' ? 'a4-landscape-doc' : 'max-w-[780px] w-full';

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} paperSize="A4" marginMm={6} />
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Daftar Hadir Peserta Ujian</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Terformat A4 Landscape (297 × 210 mm). Daftar peserta per ruang dan kolom tanggal tanda tangan otomatis mengikuti Jadwal Ujian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />
            <select
              value={selectedRoom}
              disabled={printAll}
              onChange={(e) => setSelectedRoom(Number(e.target.value))}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white disabled:opacity-50"
            >
              {Array.from({ length: roomCount }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  Ruang {r} ({studentsByRoom.get(r)?.length ?? 0} Siswa)
                </option>
              ))}
            </select>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={printAll}
                onChange={(e) => setPrintAll(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700"
              />
              Cetak Semua Ruang
            </label>

            <PdfDownloadButton
              filename={`daftar-hadir-peserta-${slug}`}
              orientation={orientation}
              paperSize="A4"
              marginMm={6}
              getPageElements={() =>
                sheetsContainerRef.current
                  ? Array.from(
                      sheetsContainerRef.current.querySelectorAll<HTMLElement>('[data-pdf-page]')
                    )
                  : []
              }
              label="Unduh PDF"
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak A4{' '}
              {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-medium text-emerald-300">
            Atur Jumlah Ruang &amp; Hari Cetak
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            {printAll
              ? `${roomCount} ruang siap cetak`
              : `Ruang ${Math.min(selectedRoom, roomCount)} (${
                  studentsByRoom.get(Math.min(selectedRoom, roomCount))?.length ?? 0
                } siswa)`}{' '}
            · {examDays.length} hari ujian
          </div>
        </div>
      </section>

      <div ref={sheetsContainerRef} className="space-y-6">
        {roomsToRender.map((roomNo, idx) => {
          const list = studentsByRoom.get(roomNo) ?? [];
          const isDense = list.length > 30;
          return (
            <div
              key={roomNo}
              data-pdf-page="true"
              className={`print-only-container ${sheetWidthCls} bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mx-auto shadow-sm overflow-x-auto print:overflow-visible print:rounded-none print:shadow-none ${
                idx < roomsToRender.length - 1 ? 'print-page-break' : ''
              }`}
            >
              <OfficialLetterhead
                school={school}
                subtitle={school.jenisUjian}
                showAddress={false}
                compact
              />

              <div className="flex items-center justify-between mb-2">
                <div className="w-28 text-[11px] font-semibold text-slate-500 tabular-nums">
                  {list.length} Peserta
                </div>
                <div className="text-sm font-extrabold uppercase tracking-wide text-slate-950">
                  DAFTAR HADIR PESERTA
                </div>
                <div className="text-xs font-extrabold uppercase text-slate-950 bg-white border border-slate-800 px-3 py-0.5 rounded-md print:rounded-none w-28 text-center">
                  RUANG {String(roomNo).padStart(2, '0')}
                </div>
              </div>

              <table
                className={`w-full border-collapse border border-slate-800 ${
                  isDense ? 'text-[9.5px] print:text-[8.5px]' : 'text-[10.5px] print:text-[9.5px]'
                }`}
              >
                <thead>
                  <tr className="bg-white text-slate-950 font-bold">
                    <th
                      rowSpan={2}
                      className="border border-slate-800 px-1.5 py-1.5 w-8 text-center font-bold"
                    >
                      NO
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-slate-800 px-2 py-1.5 w-28 text-center font-bold"
                    >
                      NO PESERTA
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-slate-800 px-2 py-1.5 text-left min-w-[165px] font-bold"
                    >
                      NAMA PESERTA
                    </th>
                    <th
                      rowSpan={2}
                      className="border border-slate-800 px-1.5 py-1.5 w-16 text-center font-bold"
                    >
                      KELAS
                    </th>
                    {examDays.map((day) => {
                      const fd = formatIndonesianDate(day.date);
                      return (
                        <th
                          key={day.id}
                          className="border border-slate-800 px-1 py-1 text-center font-bold"
                        >
                          {fd.dayName}
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="bg-white text-slate-950 font-bold">
                    {examDays.map((day) => {
                      const fd = formatIndonesianDate(day.date);
                      return (
                        <th
                          key={day.id}
                          className="border border-slate-800 px-1 py-1 text-center font-mono text-[9px] font-bold whitespace-nowrap"
                        >
                          {fd.shortDate}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4 + examDays.length}
                        className="border border-slate-700 py-6 text-center text-slate-500"
                      >
                        Belum ada peserta pada Ruang {roomNo}.
                      </td>
                    </tr>
                  ) : (
                    list.map((st, sIdx) => (
                      <tr key={st.id} className={sIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                        <td
                          className={`border border-slate-700 px-1 text-center font-mono tabular-nums ${
                            isDense ? 'py-[2px]' : 'py-1'
                          }`}
                        >
                          {sIdx + 1}
                        </td>
                        <td
                          className={`border border-slate-700 px-1.5 text-center font-mono tabular-nums ${
                            isDense ? 'py-[2px]' : 'py-1'
                          }`}
                        >
                          {st.noPeserta}
                        </td>
                        <td
                          className={`border border-slate-700 px-2 font-medium uppercase leading-tight ${
                            isDense ? 'py-[2px]' : 'py-1'
                          }`}
                        >
                          {st.name}
                        </td>
                        <td
                          className={`border border-slate-700 px-1.5 text-center whitespace-nowrap ${
                            isDense ? 'py-[2px]' : 'py-1'
                          }`}
                        >
                          {st.kelas}
                        </td>
                        {examDays.map((day) => (
                          <td key={day.id} className="border border-slate-700 px-1" />
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="mt-3 print:mt-2 flex justify-end pr-6">
                <div className="text-[11px] text-slate-900 min-w-[200px]">
                  <div>{school.titimangsa}</div>
                  <div>Ketua {school.singkatanUjian}</div>
                  <div className="h-10 print:h-9" />
                  <div className="font-bold underline">{school.ketuaPanitia}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SupervisorAttendanceViewProps {
  school: SchoolIdentity;
  examDays: ExamDay[];
  supervisors: Supervisor[];
  committee: CommitteeMember[];
  roomCount: number;
  schedule: SupervisorScheduleMap;
  onUpdateRoomCount: (count: number) => void;
  onUpdateDayCount: (count: number) => void;
}

export const SupervisorAttendanceView: React.FC<SupervisorAttendanceViewProps> = ({
  school,
  examDays,
  supervisors,
  committee,
  roomCount,
  schedule,
  onUpdateRoomCount,
  onUpdateDayCount,
}) => {
  const [sheetTab, setSheetTab] = useState<'pengawas' | 'panitia'>('pengawas');
  const [autofillNames, setAutofillNames] = useState(true);
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');
  const sheetRef = useRef<HTMLDivElement>(null);

  const slug =
    school.singkatanUjian?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ujian';

  const supervisorByCode = useMemo(() => {
    const map = new Map<number, string>();
    supervisors.forEach((s) => map.set(s.code, s.name));
    return map;
  }, [supervisors]);

  const sheetWidthCls =
    orientation === 'landscape' ? 'a4-landscape-doc' : 'max-w-[780px] w-full';

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} paperSize="A4" marginMm={6} />
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Daftar Hadir Pengawas &amp; Panitia
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Terformat A4 Landscape (297 × 210 mm). Otomatis terhubung dengan Jadwal Pengawas, Data Panitia, dan Tanggal Ujian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />
            <div className="flex items-center p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSheetTab('pengawas')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  sheetTab === 'pengawas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Hadir Pengawas
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('panitia')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  sheetTab === 'panitia' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Hadir Panitia
              </button>
            </div>

            {sheetTab === 'pengawas' && (
              <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={autofillNames}
                  onChange={(e) => setAutofillNames(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                Isi Nama Guru Otomatis
              </label>
            )}

            <PdfDownloadButton
              filename={`daftar-hadir-${sheetTab}-${slug}`}
              orientation={orientation}
              paperSize="A4"
              marginMm={6}
              getPageElements={() => (sheetRef.current ? [sheetRef.current] : [])}
              label="Unduh PDF"
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak A4{' '}
              {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
            </button>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-medium text-emerald-300">
            {sheetTab === 'pengawas' ? 'Atur Ruang & Hari Pengawas' : 'Atur Kolom Hari Panitia'}
          </div>
          <div className="grid grid-cols-2 gap-3">
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
          </div>
          <div className="text-[11px] text-slate-300 pt-2 border-t border-white/10 tabular-nums">
            A4 {orientation === 'landscape' ? 'Landscape' : 'Portrait'} ·{' '}
            {sheetTab === 'pengawas'
              ? `${roomCount} Ruang × ${examDays.length} Hari`
              : `${committee.length} Panitia × ${examDays.length} Hari`}
          </div>
        </div>
      </section>

      {sheetTab === 'pengawas' ? (
        <div
          ref={sheetRef}
          className={`print-only-container ${sheetWidthCls} bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mx-auto shadow-sm overflow-x-auto print:overflow-visible print:rounded-none print:shadow-none`}
        >
          <OfficialLetterhead
            school={school}
            title={`DAFTAR HADIR PENGAWAS ${school.jenisUjian}`}
            showAddress={false}
            compact
          />

          <table className="w-full table-fixed border-collapse border border-slate-800 text-[9px] print:text-[8px] leading-tight">
            <thead>
              <tr className="bg-white text-slate-950 font-bold">
                <th
                  rowSpan={3}
                  className="border border-slate-800 px-1 py-1 w-6 text-center font-bold"
                >
                  NO
                </th>
                <th
                  rowSpan={3}
                  className="border border-slate-800 px-1.5 py-1 w-[94px] text-center font-bold"
                >
                  HARI / TANGGAL
                </th>
                <th
                  rowSpan={3}
                  className="border border-slate-800 px-0.5 py-1 w-7 text-center font-bold"
                >
                  JAM
                </th>
                <th
                  colSpan={roomCount * 2}
                  className="border border-slate-800 px-2 py-1 text-center font-bold tracking-wider uppercase"
                >
                  RUANG UJIAN
                </th>
              </tr>
              <tr className="bg-white text-slate-950 font-bold">
                {Array.from({ length: roomCount }, (_, i) => i + 1).map((r) => (
                  <th
                    key={r}
                    colSpan={2}
                    className="border border-slate-800 px-1 py-0.5 text-center font-bold tabular-nums"
                  >
                    RUANG {r}
                  </th>
                ))}
              </tr>
              <tr className="bg-white text-slate-950 font-bold text-[7.5px]">
                {Array.from({ length: roomCount }, (_, i) => i + 1).map((r) => (
                  <React.Fragment key={r}>
                    <th className="border border-slate-800 px-0.5 py-0.5 text-center font-bold">
                      NAMA GURU
                    </th>
                    <th className="border border-slate-800 px-0.5 py-0.5 text-center w-[28px] font-bold">
                      PARAF
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {examDays.map((day, dIdx) => {
                const activeSessions = day.sessions.filter((ses) =>
                  Object.values(ses.subjects).some((v) => v && v.trim() !== '' && v.trim() !== '-')
                );
                const rows = activeSessions.length > 0 ? activeSessions : day.sessions;
                const fd = formatIndonesianDate(day.date);
                const dayBg = dIdx % 2 === 1 ? 'bg-slate-50/75' : 'bg-white';

                return rows.map((ses, sIdx) => {
                  const key = `${day.id}__${ses.id}`;
                  const rowMap = schedule[key] || {};
                  return (
                    <tr key={ses.id} className={dayBg}>
                      {sIdx === 0 && (
                        <td
                          rowSpan={rows.length}
                          className="border border-slate-700 px-1 py-1 text-center font-mono font-bold tabular-nums"
                        >
                          {dIdx + 1}
                        </td>
                      )}
                      {sIdx === 0 && (
                        <td
                          rowSpan={rows.length}
                          className="border border-slate-700 px-1.5 py-1 text-left leading-snug"
                        >
                          <div className="font-bold text-slate-900">{fd.dayName}</div>
                          <div className="text-[8px] text-slate-700 tabular-nums">
                            {fd.fullDate}
                          </div>
                        </td>
                      )}
                      <td className="border border-slate-700 px-0.5 py-1 text-center font-mono font-semibold tabular-nums">
                        {ses.jamKe}
                      </td>
                      {Array.from({ length: roomCount }, (_, i) => i + 1).map((r) => {
                        const code = rowMap[r];
                        const name = autofillNames && code ? supervisorByCode.get(code) : '';
                        return (
                          <React.Fragment key={r}>
                            <td className="border border-slate-700 px-1 py-1 text-[8px] print:text-[7.2px] leading-[1.15] break-words">
                              {name || ''}
                            </td>
                            <td className="border border-slate-700 px-0.5 py-1" />
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>

          <div className="mt-4 print:mt-3 flex justify-end pr-6">
            <div className="text-[11px] text-slate-900 min-w-[200px]">
              <div>{school.titimangsa}</div>
              <div>Ketua {school.singkatanUjian}</div>
              <div className="h-11 print:h-10" />
              <div className="font-bold underline">{school.ketuaPanitia}</div>
            </div>
          </div>
        </div>
      ) : (
        /* Daftar Hadir Panitia */
        <div
          ref={sheetRef}
          className={`print-only-container ${sheetWidthCls} bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 mx-auto shadow-sm overflow-x-auto print:overflow-visible print:rounded-none print:shadow-none`}
        >
          <OfficialLetterhead
            school={school}
            subtitle={school.jenisUjian}
            showAddress={false}
            compact
          />

          <div className="text-center text-sm font-extrabold uppercase tracking-wide text-slate-950 mb-3">
            DAFTAR HADIR PANITIA
          </div>

          <table className="w-full border-collapse border border-slate-800 text-xs">
            <thead>
              <tr className="bg-white text-slate-950 font-bold">
                <th rowSpan={2} className="border border-slate-800 px-2 py-2 w-10 text-center font-bold">
                  NO
                </th>
                <th
                  rowSpan={2}
                  className="border border-slate-800 px-3 py-2 text-left min-w-[180px] font-bold"
                >
                  NAMA PANITIA
                </th>
                <th rowSpan={2} className="border border-slate-800 px-3 py-2 text-center w-36 font-bold">
                  JABATAN
                </th>
                <th colSpan={examDays.length} className="border border-slate-800 px-2 py-1.5 text-center font-bold">
                  TANDA TANGAN
                </th>
              </tr>
              <tr className="bg-white text-slate-950 font-bold">
                {examDays.map((day) => {
                  const fd = formatIndonesianDate(day.date);
                  return (
                    <th
                      key={day.id}
                      className="border border-slate-800 px-1.5 py-1.5 text-center text-[10px] font-bold whitespace-nowrap"
                    >
                      <div>{fd.dayName}</div>
                      <div className="font-mono text-[9.5px]">{fd.shortDate}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {committee.map((member, idx) => (
                <tr key={member.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="border border-slate-700 px-2 py-2.5 text-center font-mono tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-700 px-3 py-2.5 font-semibold">
                    {member.name}
                  </td>
                  <td className="border border-slate-700 px-3 py-2.5 text-center">
                    {member.role}
                  </td>
                  {examDays.map((day) => (
                    <td key={day.id} className="border border-slate-700 px-2 py-2.5" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end pr-8">
            <div className="text-xs text-slate-900 min-w-[200px]">
              <div>{school.titimangsa}</div>
              <div>Ketua {school.singkatanUjian}</div>
              <div className="h-14" />
              <div className="font-bold underline">{school.ketuaPanitia}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
