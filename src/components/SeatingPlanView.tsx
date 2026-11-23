import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Printer } from 'lucide-react';
import { SchoolIdentity, Student } from '../types/exam';
import {
  PrintOrientation,
  PrintOrientationToggle,
  PrintPageConfig,
} from './PrintOrientationControl';
import { OfficialLetterhead } from './SchoolLogos';

interface SeatingPlanViewProps {
  school: SchoolIdentity;
  students: Student[];
  roomCount: number;
  onSwapStudents: (idA: string, idB: string) => void;
}

export const SeatingPlanView: React.FC<SeatingPlanViewProps> = ({
  school,
  students,
  roomCount,
  onSwapStudents,
}) => {
  const [selectedRoom, setSelectedRoom] = useState<number>(1);
  const [printAllRooms, setPrintAllRooms] = useState(false);
  const [showKelas, setShowKelas] = useState(false);
  const [swapCandidateId, setSwapCandidateId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<PrintOrientation>('landscape');

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

  const roomsToRender = printAllRooms
    ? Array.from({ length: roomCount }, (_, i) => i + 1)
    : [Math.min(selectedRoom, roomCount)];

  const handleSeatClick = (st: Student | undefined) => {
    if (!st || printAllRooms) return;
    if (!swapCandidateId) {
      setSwapCandidateId(st.id);
    } else if (swapCandidateId === st.id) {
      setSwapCandidateId(null);
    } else {
      onSwapStudents(swapCandidateId, st.id);
      setSwapCandidateId(null);
    }
  };

  const activeRoomStudents = studentsByRoom.get(Math.min(selectedRoom, roomCount)) ?? [];
  const activeDesks = Math.max(20, Math.ceil(activeRoomStudents.length / 2));

  return (
    <div className="space-y-5">
      <PrintPageConfig orientation={orientation} marginMm={8} />

      {/* Top Bento Grid */}
      <section className="no-print grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Denah Tempat Duduk Otomatis</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Otomatis tersusun dari Database Peserta (4 kolom × 5 baris meja ganda). Klik 2 kursi untuk menukar posisi duduk peserta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PrintOrientationToggle value={orientation} onChange={setOrientation} />
            <select
              value={selectedRoom}
              disabled={printAllRooms}
              onChange={(e) => {
                setSelectedRoom(Number(e.target.value));
                setSwapCandidateId(null);
              }}
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
                checked={showKelas}
                onChange={(e) => setShowKelas(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700"
              />
              Tampilkan Kelas
            </label>

            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={printAllRooms}
                onChange={(e) => setPrintAllRooms(e.target.checked)}
                className="rounded border-slate-300 text-emerald-700"
              />
              Semua Ruang
            </label>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Denah
            </button>
          </div>
        </div>

        {/* Dark Bento Tile: Room Summary */}
        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-emerald-300">
            {printAllRooms ? 'Mode Cetak Semua Ruang' : `Ruang ${selectedRoom} Terpilih`}
          </div>
          <div className="text-2xl font-extrabold tabular-nums">
            {printAllRooms ? `${roomCount} Ruang` : `${activeRoomStudents.length} Peserta`}
          </div>
          <div className="text-[11px] text-slate-300 tabular-nums pt-2 border-t border-white/10">
            {printAllRooms
              ? `Total ${students.length} siswa · A4 ${orientation === 'landscape' ? 'Landscape' : 'Portrait'}`
              : `${activeDesks} meja ganda · maks ${school.maxSiswaPerRuang} kursi`}
          </div>
        </div>
      </section>

      {swapCandidateId && !printAllRooms && (
        <div className="no-print px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-emerald-700" />
            Kursi pertama dipilih. Klik kursi lain di ruang ini untuk menukar posisi duduk.
          </span>
          <button
            type="button"
            onClick={() => setSwapCandidateId(null)}
            className="font-semibold underline"
          >
            Batalkan
          </button>
        </div>
      )}

      {/* Denah Pages */}
      <div className="space-y-6">
        {roomsToRender.map((roomNo, pageIdx) => {
          const roomStudents = studentsByRoom.get(roomNo) ?? [];
          const totalDesks = Math.max(20, Math.ceil(roomStudents.length / 2));
          const rows = Math.ceil(totalDesks / 4);

          return (
            <div
              key={roomNo}
              className={`print-only-container bg-white border border-slate-200 rounded-xl p-6 max-w-5xl mx-auto ${
                pageIdx < roomsToRender.length - 1 ? 'print-page-break' : ''
              }`}
            >
              <OfficialLetterhead
                school={school}
                title={school.jenisUjian}
                compact
              />

              <div className="text-center font-bold text-sm tracking-wide text-slate-950 mb-4">
                DENAH TEMPAT DUDUK
              </div>

              {/* Pengawas & Box Ruang */}
              <div className="flex items-center justify-between mb-5 print:mb-3 gap-4">
                <div className="border-2 border-slate-900 px-10 py-1.5 print:py-1 text-xs font-bold uppercase text-slate-900">
                  PENGAWAS
                </div>

                <div className="flex border-2 border-slate-900 text-slate-900">
                  <div className="px-4 py-1.5 print:py-1 text-xs font-bold border-r-2 border-slate-900 flex items-center">
                    RUANG
                  </div>
                  <div className="px-5 py-1 print:py-0.5 text-xl print:text-lg font-extrabold font-mono tabular-nums">
                    {roomNo}
                  </div>
                </div>
              </div>

              {/* 4 Columns x N Rows of Double Desks */}
              <div className="space-y-3 print:space-y-2">
                {Array.from({ length: rows }, (_, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="grid grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-3 print:gap-2"
                  >
                    {Array.from({ length: 4 }, (_, colIdx) => {
                      const deskIdx = rowIdx * 4 + colIdx;
                      const leftSt = roomStudents[deskIdx * 2];
                      const rightSt = roomStudents[deskIdx * 2 + 1];

                      return (
                        <div
                          key={colIdx}
                          className="grid grid-cols-2 border-2 border-slate-900 bg-white min-h-[60px] print:min-h-[48px]"
                        >
                          {[leftSt, rightSt].map((st, sideIdx) => {
                            const isSelected = st && swapCandidateId === st.id;
                            return (
                              <div
                                key={sideIdx}
                                onClick={() => handleSeatClick(st)}
                                className={`flex flex-col justify-between text-center ${
                                  sideIdx === 0 ? 'border-r border-slate-800' : ''
                                } ${
                                  st && !printAllRooms
                                    ? 'cursor-pointer hover:bg-emerald-50/70'
                                    : ''
                                } ${isSelected ? 'bg-emerald-100 ring-2 ring-inset ring-emerald-700' : ''}`}
                              >
                                <div className="border-b border-slate-800 px-1 py-0.5 text-[9px] print:text-[8px] font-mono tabular-nums font-medium text-slate-800 truncate">
                                  {st ? st.noPeserta : '-'}
                                </div>
                                <div className="px-1 py-1.5 print:py-1 flex-1 flex flex-col items-center justify-center">
                                  <div className="text-[9.5px] print:text-[8.5px] font-bold leading-tight text-slate-950 uppercase break-words line-clamp-2">
                                    {st ? st.name : '-'}
                                  </div>
                                  {st && showKelas && (
                                    <div className="no-print text-[8.5px] font-mono text-emerald-800 mt-0.5">
                                      {st.kelas}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-6 print:mt-3 flex justify-end pr-6">
                <div className="text-xs text-slate-900 min-w-[190px]">
                  <div>{school.titimangsa}</div>
                  <div>Ketua {school.singkatanUjian}</div>
                  <div className="h-12 print:h-9" />
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
