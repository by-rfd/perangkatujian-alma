import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  CreditCard,
  Database,
  DoorClosed,
  FileSpreadsheet,
  FileText,
  Grid2X2,
  IdCard,
  LayoutGrid,
  Printer,
  ScrollText,
  UserCheck,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ExamAppState, TabId } from '../types/exam';
import {
  formatIndonesianDate,
  getActiveSessionsList,
  getEffectiveRoomCount,
  getRoomStats,
  getSupervisorColors,
} from '../utils/examLogic';
import { LogoSekolah } from './SchoolLogos';

interface DashboardViewProps {
  state: ExamAppState;
  onNavigate: (tab: TabId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ state, onNavigate }) => {
  const { school, students, supervisors, examDays, tracks, supervisorSchedule, committee } = state;
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState(0);
  const [monitorMode, setMonitorMode] = useState<'cards' | 'table'>('cards');

  const safeDayIdx = Math.min(selectedDayIdx, Math.max(0, examDays.length - 1));
  const currentDay = examDays[safeDayIdx];
  const daySessions = currentDay?.sessions ?? [];
  const safeSessionIdx = Math.min(selectedSessionIdx, Math.max(0, daySessions.length - 1));
  const currentSession = daySessions[safeSessionIdx];

  const roomCount = useMemo(
    () => getEffectiveRoomCount(students, school.jumlahRuang),
    [students, school.jumlahRuang]
  );

  const roomStats = useMemo(() => getRoomStats(students, roomCount), [students, roomCount]);
  const activeSessionsCount = useMemo(() => getActiveSessionsList(examDays).length, [examDays]);
  const photoCount = useMemo(
    () => students.filter((s) => Boolean(s.photoDataUrl)).length,
    [students]
  );

  const supervisorByCode = useMemo(() => {
    const map = new Map<number, string>();
    supervisors.forEach((s) => map.set(s.code, s.name));
    return map;
  }, [supervisors]);

  const formattedDate = currentDay ? formatIndonesianDate(currentDay.date) : null;
  const startDateFormatted = school.tanggalMulai
    ? formatIndonesianDate(school.tanggalMulai).fullDate
    : '-';

  const setupSteps: {
    step: string;
    title: string;
    detail: string;
    done: boolean;
    tab: TabId;
  }[] = [
    {
      step: '01',
      title: 'Identitas Sekolah & Kop',
      detail: `${school.singkatanSekolah || '-'} · ${school.singkatanUjian}`,
      done: Boolean(school.namaSekolah && school.ketuaPanitia),
      tab: 'data-sekolah',
    },
    {
      step: '02',
      title: 'Panitia & Pengawas',
      detail: `${committee.length} Panitia · ${supervisors.length} Pengawas`,
      done: committee.length > 0 && supervisors.length > 0,
      tab: 'panitia',
    },
    {
      step: '03',
      title: 'Database Peserta & Foto',
      detail: `${students.length} Peserta · ${photoCount} Foto`,
      done: students.length > 0,
      tab: 'database',
    },
    {
      step: '04',
      title: 'Jadwal Mata Pelajaran',
      detail: `${examDays.length} Hari · ${activeSessionsCount} Sesi`,
      done: activeSessionsCount > 0,
      tab: 'jadwal-ujian',
    },
  ];

  const completedCount = setupSteps.filter((s) => s.done).length;
  const readinessPct = Math.round((completedCount / setupSteps.length) * 100);
  const photoCoveragePct =
    students.length > 0 ? Math.round((photoCount / students.length) * 100) : 0;

  const printShortcuts: {
    id: TabId;
    label: string;
    meta: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'kartu-ujian',
      label: 'Kartu Peserta Ujian',
      meta: `A4 Portrait · 8 Kartu/Hal`,
      icon: CreditCard,
    },
    {
      id: 'administrasi',
      label: 'Administrasi & Harap Tenang',
      meta: 'A4 Landscape · Poster & Sampul',
      icon: FileText,
    },
    {
      id: 'denah',
      label: 'Denah Tempat Duduk',
      meta: `A4 Landscape · ${roomCount} Ruang`,
      icon: LayoutGrid,
    },
    {
      id: 'jadwal-pengawas',
      label: 'Jadwal Pengawas',
      meta: 'A4 Landscape · Anti-Bentrok',
      icon: UserCheck,
    },
    {
      id: 'daftar-hadir-peserta',
      label: 'Daftar Hadir Peserta',
      meta: `A4 Landscape · ${roomCount} Ruang`,
      icon: ClipboardCheck,
    },
    {
      id: 'daftar-hadir-pengawas',
      label: 'Hadir Pengawas & Panitia',
      meta: 'A4 Landscape · Matriks Paraf',
      icon: Grid2X2,
    },
    {
      id: 'no-pintu',
      label: 'Nomor Pintu Ruang',
      meta: `A4 Landscape · 001–${String(roomCount).padStart(3, '0')}`,
      icon: DoorClosed,
    },
    {
      id: 'kartu-panitia',
      label: 'Kartu Tanda Panitia',
      meta: `A4 Portrait · ${committee.length} Panitia`,
      icon: IdCard,
    },
    {
      id: 'tata-tertib',
      label: 'Tata Tertib Peserta',
      meta: 'A4 Portrait · Otomatis',
      icon: ScrollText,
    },
    {
      id: 'proposal',
      label: 'Proposal Ujian & RAB',
      meta: 'A4 Portrait · Cetak & PDF',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Modern High-Contrast Hero Banner (Focal Anchor) */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A221B] via-[#0F2E24] to-[#0E2430] text-white p-6 sm:p-8 shadow-[0_12px_32px_-12px_rgba(10,34,27,0.38)]"
      >
        {/* Subtle Architectural Grid Pattern */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
        >
          <defs>
            <pattern id="hero-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-7 items-stretch">
          {/* Left Hero Column: Institutional Identity & Primary Actions */}
          <div className="xl:col-span-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center p-1.5 shrink-0">
                  {school.rightLogoDataUrl ? (
                    <img
                      src={school.rightLogoDataUrl}
                      alt={school.namaSekolah}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <LogoSekolah className="w-full h-full" />
                  )}
                </div>
                <div className="text-xs font-medium text-emerald-200/90 leading-snug">
                  <span>{school.jenisUjian}</span>
                  <span className="mx-1.5 text-white/30" aria-hidden="true">
                    ·
                  </span>
                  <span>Semester {school.semester}</span>
                  <span className="mx-1.5 text-white/30" aria-hidden="true">
                    ·
                  </span>
                  <span className="tabular-nums">{school.tahunPelajaran}</span>
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight leading-[1.15] text-white text-balance">
                  {school.namaSekolah}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  {school.alamat}
                </p>
              </div>

              {/* Clean Executive Metadata Line */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300 pt-1">
                <span>
                  Kepala:{' '}
                  <strong className="font-semibold text-white">{school.kepalaMadrasah}</strong>
                </span>
                <span className="text-white/25 hidden sm:inline" aria-hidden="true">
                  |
                </span>
                <span>
                  Ketua Panitia:{' '}
                  <strong className="font-semibold text-white">{school.ketuaPanitia}</strong>
                </span>
                <span className="text-white/25 hidden sm:inline" aria-hidden="true">
                  |
                </span>
                <span className="tabular-nums">
                  Mulai: <strong className="font-semibold text-white">{startDateFormatted}</strong>
                </span>
              </div>
            </div>

            {/* Primary & Secondary Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('kartu-ujian')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-4 h-4" /> Cetak Kartu A4 (8/Hal)
              </button>
              <button
                type="button"
                onClick={() => onNavigate('administrasi')}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <FileText className="w-4 h-4 text-emerald-300" /> Administrasi &amp; Harap Tenang
              </button>
              <button
                type="button"
                onClick={() => onNavigate('database')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-emerald-200 hover:text-white rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <Database className="w-3.5 h-3.5" /> Kelola Peserta
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Hero Column: Otomatisasi 4-Langkah Panel */}
          <div className="xl:col-span-5 bg-white/[0.06] border border-white/12 rounded-2xl p-5 flex flex-col justify-between gap-4 backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white">Kesiapan Data Inti</div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Isi 4 data utama, seluruh dokumen terbit otomatis
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-extrabold text-emerald-300 tabular-nums leading-none">
                    {readinessPct}%
                  </div>
                  <div className="text-[10px] text-slate-300 tabular-nums mt-0.5">
                    {completedCount}/4 modul
                  </div>
                </div>
              </div>

              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${readinessPct}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {setupSteps.map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => onNavigate(s.tab)}
                  className="w-full py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3 text-left group hover:bg-white/[0.04] -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {s.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                        {s.step}. {s.title}
                      </div>
                      <div className="text-[11px] text-slate-300/90 tabular-nums truncate">
                        {s.detail}
                      </div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-300 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* 2. Full-Width 4-Column KPI Metrics Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('database')}
          className="text-left p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500/70 transition-all group shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Peserta</span>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-2">
            {students.length}
          </div>
          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
              <span>Kelengkapan foto</span>
              <span className="font-semibold text-slate-700">
                {photoCount}/{students.length} ({photoCoveragePct}%)
              </span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${photoCoveragePct}%` }}
              />
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('denah')}
          className="text-left p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500/70 transition-all group shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Ruang Ujian</span>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-2">
            {roomCount}
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 tabular-nums">
            Kapasitas maksimal {school.maxSiswaPerRuang} peserta per ruang
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('jadwal-ujian')}
          className="text-left p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500/70 transition-all group shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Sesi Ujian</span>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-2">
            {activeSessionsCount}
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 tabular-nums">
            Terjadwal dalam {examDays.length} hari · {tracks.length} jurusan/tingkat
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('jadwal-pengawas')}
          className="text-left p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500/70 transition-all group shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Pengawas &amp; Panitia</span>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 transition-colors" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums tracking-tight mt-2">
            {supervisors.length}
          </div>
          <div className="mt-2.5 text-[11px] text-slate-500 tabular-nums">
            Guru pengawas aktif · {committee.length} panitia inti
          </div>
        </button>
      </section>

      {/* 3. Asymmetric Workspace Hierarchy: 8-Col Live Monitor + 4-Col Print Hub */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns: Interactive Day & Session Monitor */}
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Monitor Pelaksanaan &amp; Pengawas Harian
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih hari dan sesi untuk meninjau mata pelajaran serta pembagian pengawas per ruang.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit shrink-0">
              <button
                type="button"
                onClick={() => setMonitorMode('cards')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  monitorMode === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Kartu Ruang
              </button>
              <button
                type="button"
                onClick={() => setMonitorMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  monitorMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Tabel Sesi
              </button>
            </div>
          </div>

          {examDays.length > 0 && currentDay ? (
            <>
              {/* Day Selector Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {examDays.map((day, dIdx) => {
                  const fd = formatIndonesianDate(day.date);
                  const isSelected = dIdx === safeDayIdx;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setSelectedDayIdx(dIdx);
                        setSelectedSessionIdx(0);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-left transition-all shrink-0 border ${
                        isSelected
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                          : 'bg-slate-50/90 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`text-[11px] font-medium ${
                          isSelected ? 'text-emerald-100' : 'text-slate-500'
                        }`}
                      >
                        Hari {dIdx + 1}
                      </div>
                      <div className="text-xs font-bold whitespace-nowrap tabular-nums">
                        {fd.dayName}, {fd.shortDate}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Session Switcher + Active Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                  {daySessions.map((ses, sIdx) => {
                    const isActive = sIdx === safeSessionIdx;
                    return (
                      <button
                        key={ses.id}
                        type="button"
                        onClick={() => setSelectedSessionIdx(sIdx)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Sesi {ses.jamKe}{' '}
                        <span className="font-normal text-slate-400 ml-1 tabular-nums">
                          {ses.waktu}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {formattedDate && currentSession && (
                  <div className="text-xs font-medium text-slate-600 tabular-nums">
                    {formattedDate.dayName}, {formattedDate.fullDate} · {currentSession.waktu} WIB
                  </div>
                )}
              </div>

              {/* Active Subjects Strip (Calm Tonal Surface so Hero stays primary focal anchor) */}
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${Math.max(1, tracks.length)}, minmax(0, 1fr))`,
                }}
              >
                {tracks.map((track) => (
                  <div
                    key={track}
                    className="px-4 py-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70"
                  >
                    <div className="text-[11px] font-semibold text-emerald-800">
                      Mapel · {track}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {currentSession?.subjects[track] || '-'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Room Monitor */}
              {monitorMode === 'cards' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {roomStats.map((rs) => {
                    const key = currentSession ? `${currentDay.id}__${currentSession.id}` : '';
                    const supCode = key ? supervisorSchedule[key]?.[rs.room] : undefined;
                    const supName = supCode ? supervisorByCode.get(supCode) : undefined;
                    const colors = supCode ? getSupervisorColors(supCode) : null;
                    const pct = Math.min(
                      100,
                      Math.round((rs.count / Math.max(1, school.maxSiswaPerRuang)) * 100)
                    );

                    return (
                      <div
                        key={rs.room}
                        className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-bold text-slate-900 tabular-nums">
                              Ruang {String(rs.room).padStart(2, '0')}
                            </div>
                            <div className="text-xs text-slate-500 tabular-nums">
                              {rs.count} / {school.maxSiswaPerRuang} peserta
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate('denah')}
                            className="text-[11px] font-semibold text-emerald-700 hover:underline whitespace-nowrap"
                          >
                            Denah
                          </button>
                        </div>

                        <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500 shrink-0">Pengawas:</span>
                          {supCode && supName ? (
                            <span className="inline-flex items-center gap-1.5 min-w-0 text-xs font-semibold text-slate-800">
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums shrink-0"
                                style={{
                                  backgroundColor: colors?.bg,
                                  color: colors?.text,
                                  border: `1px solid ${colors?.border}`,
                                }}
                              >
                                {supCode}
                              </span>
                              <span className="truncate">{supName}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Belum dijadwalkan</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white border-b-2 border-slate-200 text-slate-950 font-bold">
                      <tr>
                        <th className="py-2.5 px-3 font-bold whitespace-nowrap">Ruang</th>
                        {daySessions.map((ses) => (
                          <th
                            key={ses.id}
                            className="py-2.5 px-3 font-bold whitespace-nowrap"
                          >
                            Sesi {ses.jamKe}{' '}
                            <span className="font-normal text-slate-500 tabular-nums">
                              ({ses.waktu})
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.from({ length: roomCount }, (_, idx) => idx + 1).map((roomNo) => (
                        <tr key={roomNo} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                            Ruang {roomNo}
                          </td>
                          {daySessions.map((ses, sIdx) => {
                            const key = `${currentDay.id}__${ses.id}`;
                            const code = supervisorSchedule[key]?.[roomNo];
                            const name = code ? supervisorByCode.get(code) : undefined;
                            const colors = code ? getSupervisorColors(code) : null;
                            const isActiveSes = sIdx === safeSessionIdx;
                            return (
                              <td
                                key={ses.id}
                                className={`py-2.5 px-3 whitespace-nowrap ${
                                  isActiveSes ? 'bg-emerald-50/40 font-medium' : ''
                                }`}
                              >
                                {code && name ? (
                                  <span className="inline-flex items-center gap-2 text-slate-800">
                                    <span
                                      className="inline-block w-5 text-center rounded text-[11px] font-bold py-0.5 tabular-nums"
                                      style={{
                                        backgroundColor: colors?.bg,
                                        color: colors?.text,
                                        border: `1px solid ${colors?.border}`,
                                      }}
                                    >
                                      {code}
                                    </span>
                                    <span>{name}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center space-y-3">
              <div className="text-sm text-slate-500">
                Belum ada jadwal ujian. Tambahkan jadwal mata pelajaran agar monitor aktif.
              </div>
              <button
                type="button"
                onClick={() => onNavigate('jadwal-ujian')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl"
              >
                <CalendarDays className="w-3.5 h-3.5" /> Atur Jadwal Ujian
              </button>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Pusat Cetak Dokumen */}
        <aside className="xl:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pusat Dokumen Siap Cetak</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Terformat otomatis dalam ukuran F4 &amp; A4
              </p>
            </div>
            <Users className="w-4 h-4 text-emerald-700 shrink-0" />
          </div>

          <div className="divide-y divide-slate-100 mt-1">
            {printShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className="w-full py-3 flex items-center justify-between gap-3 text-left group hover:bg-slate-50 -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-50 border border-slate-200/70 group-hover:border-emerald-200 flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="w-4 h-4 text-slate-600 group-hover:text-emerald-700 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-900 truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{item.meta}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-700 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
};
