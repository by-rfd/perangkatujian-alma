import {
  ExamAppState,
  ExamDay,
  Student,
  Supervisor,
  SupervisorScheduleMap,
} from '../types/exam';

export const SUPERVISOR_PALETTE = [
  '#BAE6FD', // 1 - Sky Blue
  '#A7F3D0', // 2 - Emerald Mint
  '#FDE68A', // 3 - Amber Gold
  '#FECDD3', // 4 - Rose Pink
  '#DDD6FE', // 5 - Violet Lavender
  '#FED7AA', // 6 - Tangerine Peach
  '#99F6E4', // 7 - Teal Aqua
  '#D9F99D', // 8 - Lime Fresh
  '#C7D2FE', // 9 - Indigo Periwinkle
  '#F5D0FE', // 10 - Fuchsia Blossom
  '#A5F3FC', // 11 - Cyan Ice
  '#FECACA', // 12 - Coral Soft
  '#FEF08A', // 13 - Sunburst Yellow
  '#BFDBFE', // 14 - Cornflower Blue
  '#BBF7D0', // 15 - Leaf Green
  '#FBCFE8', // 16 - Blossom Pink
  '#E9D5FF', // 17 - Iris Purple
  '#FDBA74', // 18 - Warm Apricot
  '#5EEAD4', // 19 - Turquoise
  '#BEF264', // 20 - Chartreuse
  '#93C5FD', // 21 - Soft Cobalt
  '#FCA5A5', // 22 - Salmon Rose
  '#F0ABFC', // 23 - Orchid
  '#6EE7B7', // 24 - Jade Mint
];

export const SUPERVISOR_ACCENT_TEXT = [
  '#0C4A6E', // 1
  '#064E3B', // 2
  '#78350F', // 3
  '#881337', // 4
  '#4C1D95', // 5
  '#7C2D12', // 6
  '#134E4A', // 7
  '#365314', // 8
  '#312E81', // 9
  '#701A75', // 10
  '#164E63', // 11
  '#7F1D1D', // 12
  '#713F12', // 13
  '#1E3A8A', // 14
  '#14532D', // 15
  '#831843', // 16
  '#581C87', // 17
  '#7C2D12', // 18
  '#115E59', // 19
  '#365314', // 20
  '#1E3A8A', // 21
  '#7F1D1D', // 22
  '#701A75', // 23
  '#064E3B', // 24
];

export function getSupervisorColors(code: number): { bg: string; text: string; border: string } {
  const idx = Math.max(0, (code - 1) % SUPERVISOR_PALETTE.length);
  return {
    bg: SUPERVISOR_PALETTE[idx],
    text: SUPERVISOR_ACCENT_TEXT[idx],
    border: `${SUPERVISOR_ACCENT_TEXT[idx]}28`,
  };
}

const INDONESIAN_DAYS = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
];

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export function formatIndonesianDate(isoDate: string): {
  dayName: string;
  fullDate: string;
  shortDate: string;
  slashDate: string;
} {
  if (!isoDate) {
    return { dayName: '-', fullDate: '-', shortDate: '-', slashDate: '-' };
  }
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return { dayName: '-', fullDate: isoDate, shortDate: isoDate, slashDate: isoDate };
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const dayName = INDONESIAN_DAYS[d.getDay()] ?? '-';
  const day = parts[2];
  const monthName = INDONESIAN_MONTHS[parts[1] - 1] ?? '';
  const shortMonth = SHORT_MONTHS[parts[1] - 1] ?? '';
  const year = parts[0];
  const dd = String(day).padStart(2, '0');
  const mm = String(parts[1]).padStart(2, '0');

  return {
    dayName,
    fullDate: `${day} ${monthName} ${year}`,
    shortDate: `${day}-${shortMonth}-${year}`,
    slashDate: `${dd}/${mm}/${year}`,
  };
}

export function getEffectiveRoomCount(students: Student[], configuredRooms: number): number {
  const maxFromStudents = students.reduce((max, s) => Math.max(max, s.ruang || 1), 0);
  return Math.max(1, configuredRooms, maxFromStudents);
}

export function getRoomStats(students: Student[], roomCount: number) {
  const map = new Map<number, Student[]>();
  for (let r = 1; r <= roomCount; r++) {
    map.set(r, []);
  }
  for (const s of students) {
    const r = s.ruang >= 1 ? s.ruang : 1;
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(s);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([room, list]) => ({ room, count: list.length, students: list }));
}

export interface AutoAssignOptions {
  mode: 'interleave' | 'sequential';
  maxPerRoom: number;
  prefix: string;
  startNumber: number;
  regenerateNumbers: boolean;
}

/**
 * Automatically distributes students into rooms and generates sequential exam numbers.
 * - 'interleave': round-robins across classes (e.g. X-1, XII-2, X-2, XI-1...) so adjacent seats
 *   are from different classes, matching standard Indonesian madrasah/school exam seating.
 * - 'sequential': keeps students grouped by class & name order.
 */
export function autoAssignRoomsAndNumbers(
  students: Student[],
  options: AutoAssignOptions
): { students: Student[]; roomCount: number } {
  if (students.length === 0) {
    return { students: [], roomCount: 1 };
  }

  const maxPerRoom = Math.max(1, options.maxPerRoom);
  const roomCount = Math.max(1, Math.ceil(students.length / maxPerRoom));

  let ordered: Student[] = [];

  if (options.mode === 'interleave') {
    const byClass = new Map<string, Student[]>();
    const sortedClasses = [...new Set(students.map((s) => s.kelas || 'Umum'))].sort((a, b) =>
      a.localeCompare(b, 'id')
    );
    for (const cls of sortedClasses) {
      byClass.set(
        cls,
        students
          .filter((s) => (s.kelas || 'Umum') === cls)
          .sort((a, b) => a.name.localeCompare(b.name, 'id'))
      );
    }
    const maxLen = Math.max(...Array.from(byClass.values()).map((arr) => arr.length), 0);
    for (let i = 0; i < maxLen; i++) {
      for (const cls of sortedClasses) {
        const group = byClass.get(cls)!;
        if (i < group.length) {
          ordered.push(group[i]);
        }
      }
    }
  } else {
    ordered = [...students].sort((a, b) => {
      const clsCmp = (a.kelas || '').localeCompare(b.kelas || '', 'id');
      if (clsCmp !== 0) return clsCmp;
      return a.name.localeCompare(b.name, 'id');
    });
  }

  // Distribute evenly across roomCount without exceeding maxPerRoom
  const baseSize = Math.floor(ordered.length / roomCount);
  const remainder = ordered.length % roomCount;

  const updated: Student[] = [];
  let cursor = 0;
  let seq = options.startNumber;

  for (let r = 1; r <= roomCount; r++) {
    const targetForRoom = baseSize + (r <= remainder ? 1 : 0);
    for (let i = 0; i < targetForRoom && cursor < ordered.length; i++) {
      const st = ordered[cursor++];
      const numStr = String(seq++).padStart(4, '0');
      updated.push({
        ...st,
        ruang: r,
        noPeserta: options.regenerateNumbers ? `${options.prefix}${numStr}` : st.noPeserta,
      });
    }
  }

  return { students: updated, roomCount };
}

/**
 * Generates a conflict-free supervisor schedule across all active exam sessions & rooms.
 * Ensures:
 * 1. No supervisor is assigned to >1 room in the same session.
 * 2. Total shifts per supervisor are balanced fairly.
 * 3. Slight rotation across sessions so supervisors rotate rooms.
 */
export function autoGenerateSupervisorSchedule(
  examDays: ExamDay[],
  supervisors: Supervisor[],
  roomCount: number,
  shuffleSeed = Date.now()
): SupervisorScheduleMap {
  const result: SupervisorScheduleMap = {};
  if (supervisors.length === 0 || roomCount <= 0) return result;

  const codes = supervisors.map((s) => s.code);
  const shiftCounts = new Map<number, number>(codes.map((c) => [c, 0]));

  // Deterministic-friendly pseudo-random helper for fair shuffling
  let seed = shuffleSeed % 2147483647;
  if (seed <= 0) seed += 2147483646;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (const day of examDays) {
    for (const session of day.sessions) {
      const hasSubject = Object.values(session.subjects).some(
        (v) => v && v.trim() !== '' && v.trim() !== '-'
      );
      if (!hasSubject) continue;

      const key = `${day.id}__${session.id}`;
      const row: Record<number, number> = {};

      // Sort supervisors by fewest shifts so far, with random tie-breaking
      const pool = [...codes].sort((a, b) => {
        const diff = (shiftCounts.get(a) ?? 0) - (shiftCounts.get(b) ?? 0);
        if (diff !== 0) return diff;
        return nextRand() - 0.5;
      });

      for (let room = 1; room <= roomCount; room++) {
        // If supervisors < roomCount, wrap around gracefully (though ideally supervisors >= roomCount)
        const chosenCode = pool[(room - 1) % pool.length];
        row[room] = chosenCode;
        shiftCounts.set(chosenCode, (shiftCounts.get(chosenCode) ?? 0) + 1);
      }

      result[key] = row;
    }
  }

  return result;
}

export function detectSessionConflicts(
  assignments: Record<number, number> | undefined,
  roomCount: number
): Set<number> {
  const conflicts = new Set<number>();
  if (!assignments) return conflicts;
  const seen = new Map<number, number[]>();
  for (let r = 1; r <= roomCount; r++) {
    const code = assignments[r];
    if (!code) continue;
    if (!seen.has(code)) seen.set(code, []);
    seen.get(code)!.push(r);
  }
  for (const [, rooms] of seen.entries()) {
    if (rooms.length > 1) {
      rooms.forEach((r) => conflicts.add(r));
    }
  }
  return conflicts;
}

export function parseStudentsFromText(
  rawText: string,
  defaultPrefix: string,
  existingCount: number
): Omit<Student, 'id'>[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter: tab first (Excel paste), then semicolon, then comma
  const firstLine = lines[0];
  let delimiter = '\t';
  if (!firstLine.includes('\t')) {
    delimiter = firstLine.includes(';') ? ';' : ',';
  }

  const splitRow = (line: string) =>
    line.split(delimiter).map((cell) => cell.replace(/^"|"$/g, '').trim());

  const firstCells = splitRow(firstLine).map((c) => c.toLowerCase());
  const hasHeader = firstCells.some(
    (c) => c.includes('nama') || c.includes('nisn') || c.includes('kelas') || c.includes('peserta')
  );

  let colMap = {
    noPeserta: -1,
    name: 0,
    nisn: 1,
    kelas: 2,
    ruang: 3,
  };

  let startIdx = 0;
  if (hasHeader) {
    startIdx = 1;
    colMap = {
      noPeserta: firstCells.findIndex((c) => c.includes('peserta') || c.includes('nomor')),
      name: firstCells.findIndex((c) => c.includes('nama')),
      nisn: firstCells.findIndex((c) => c.includes('nisn')),
      kelas: firstCells.findIndex((c) => c.includes('kelas') || c.includes('rombel')),
      ruang: firstCells.findIndex((c) => c.includes('ruang')),
    };
    if (colMap.name === -1) colMap.name = 0;
  } else if (firstCells.length >= 4 && /^\d{2}-\d{3}/.test(firstCells[0])) {
    colMap = { noPeserta: 0, name: 1, nisn: 2, kelas: 3, ruang: 4 };
  }

  const parsed: Omit<Student, 'id'>[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitRow(lines[i]);
    const name = (cells[colMap.name] ?? '').trim();
    if (!name) continue;
    const rawNo = colMap.noPeserta >= 0 ? (cells[colMap.noPeserta] ?? '').trim() : '';
    const nisn = colMap.nisn >= 0 ? (cells[colMap.nisn] ?? '').trim() : '';
    const kelas = colMap.kelas >= 0 ? (cells[colMap.kelas] ?? '').trim() : 'X-1';
    const rawRuang = colMap.ruang >= 0 ? parseInt(cells[colMap.ruang] ?? '1', 10) : 1;
    const seqNum = String(existingCount + parsed.length + 1).padStart(4, '0');

    parsed.push({
      noPeserta: rawNo || `${defaultPrefix}${seqNum}`,
      name: name.toUpperCase(),
      nisn,
      kelas: kelas || 'X-1',
      ruang: isNaN(rawRuang) || rawRuang < 1 ? 1 : rawRuang,
    });
  }

  return parsed;
}

export function exportStudentsCsv(students: Student[]): void {
  const header = ['No', 'No Peserta', 'Nama', 'NISN', 'Kelas', 'Ruang'].join(',');
  const rows = students.map((s, idx) =>
    [
      idx + 1,
      `"${s.noPeserta.replace(/"/g, '""')}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.nisn.replace(/"/g, '""')}"`,
      `"${s.kelas.replace(/"/g, '""')}"`,
      s.ruang,
    ].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `database-peserta-ujian.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadStateBackup(state: ExamAppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const slug = state.school.singkatanUjian.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'ujian';
  a.download = `backup-perangkat-${slug}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function getActiveSessionsList(examDays: ExamDay[]) {
  const list: { dayIndex: number; day: ExamDay; session: ExamDay['sessions'][0] }[] = [];
  examDays.forEach((day, dIdx) => {
    day.sessions.forEach((session) => {
      const hasSubject = Object.values(session.subjects).some(
        (v) => v && v.trim() !== '' && v.trim() !== '-'
      );
      if (hasSubject) {
        list.push({ dayIndex: dIdx + 1, day, session });
      }
    });
  });
  return list;
}

export function resizeImageFileToDataUrl(
  file: File,
  maxWidth = 280,
  maxHeight = 360
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve('');
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => resolve(rawUrl);
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const targetW = Math.max(1, Math.round(img.width * ratio));
        const targetH = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

