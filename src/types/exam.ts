export type TabId =
  | 'dashboard'
  | 'data-sekolah'
  | 'panitia'
  | 'database'
  | 'jadwal-ujian'
  | 'jadwal-pengawas'
  | 'denah'
  | 'no-pintu'
  | 'kartu-ujian'
  | 'kartu-panitia'
  | 'daftar-hadir-peserta'
  | 'daftar-hadir-pengawas'
  | 'tata-tertib'
  | 'proposal'
  | 'administrasi';

export interface SchoolIdentity {
  pemerintahDaerah: string;
  namaInstansi: string;
  namaSekolah: string;
  singkatanSekolah: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  jenisUjian: string;
  singkatanUjian: string;
  semester: string;
  tahunPelajaran: string;
  ketuaPanitia: string;
  nipKetua: string;
  kepalaMadrasah: string;
  nipKepala: string;
  tanggalMulai: string; // YYYY-MM-DD
  titimangsa: string;
  prefixNoPeserta: string;
  maxSiswaPerRuang: number;
  jumlahRuang: number;
  sosmedIg: string;
  sosmedFb: string;
  sosmedWa: string;
  tahunSampul: string;
  leftLogoDataUrl?: string;
  rightLogoDataUrl?: string;
  kataPengantar: string;
}

export interface CommitteeMember {
  id: string;
  name: string;
  role: string;
  photoDataUrl?: string;
}

export interface Supervisor {
  id: string;
  code: number;
  name: string;
  color: string;
  targetShifts?: number;
}

export interface Student {
  id: string;
  noPeserta: string;
  name: string;
  nisn: string;
  kelas: string;
  ruang: number;
  photoDataUrl?: string;
}

export interface ExamSession {
  id: string;
  jamKe: number;
  waktu: string;
  subjects: Record<string, string>; // track -> subject name
}

export interface ExamDay {
  id: string;
  date: string; // YYYY-MM-DD
  sessions: ExamSession[];
}

export type SupervisorScheduleMap = Record<string, Record<number, number>>;
// key: `${dayId}__${sessionId}`, value: { [roomNumber]: supervisorCode }

export interface ExamRule {
  id: string;
  text: string;
  subItems?: string[];
}

export interface ProposalBudgetItem {
  id: string;
  uraian: string;
  volume: number;
  satuan: string;
  hargaSatuan: number;
}

export interface ExamProposal {
  nomorSurat: string;
  lampiran: string;
  perihal: string;
  kataPengantar?: string;
  latarBelakang: string;
  pengertian?: string;
  dasarHukum: string[];
  tujuanKegiatan: string[];
  ruangLingkup?: string;
  sasaran?: string;
  sistematikaPenulisan?: string;
  organisasiKepanitiaan?: string;
  pembagianTugas?: string;
  tahapPerencanaan?: string;
  publikasi?: string;
  pengadaanPiranti?: string;
  pengadministrasian?: string;
  pelaksanaanPengawasan?: string;
  pemeriksaanPengolahan?: string;
  penilaian?: string;
  kegiatanAkhir?: string;
  tempatPelaksanaan: string;
  penutup: string;
  budgetItems: ProposalBudgetItem[];
}

export interface ExamAppState {
  school: SchoolIdentity;
  committee: CommitteeMember[];
  supervisors: Supervisor[];
  students: Student[];
  tracks: string[]; // e.g. ['X', 'IPA', 'IPS']
  examDays: ExamDay[];
  supervisorSchedule: SupervisorScheduleMap;
  rules: ExamRule[];
  proposal?: ExamProposal;
}
