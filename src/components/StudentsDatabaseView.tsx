import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  ClipboardPaste,
  Download,
  ImagePlus,
  Link2,
  Plus,
  Search,
  Shuffle,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { SchoolIdentity, Student } from '../types/exam';
import {
  autoAssignRoomsAndNumbers,
  exportStudentsCsv,
  getEffectiveRoomCount,
  getRoomStats,
  parseStudentsFromText,
  resizeImageFileToDataUrl,
} from '../utils/examLogic';

interface StudentsDatabaseViewProps {
  students: Student[];
  school: SchoolIdentity;
  onUpdateStudents: (students: Student[]) => void;
  onUpdateRoomCount: (roomCount: number) => void;
}

export const StudentsDatabaseView: React.FC<StudentsDatabaseViewProps> = ({
  students,
  school,
  onUpdateStudents,
  onUpdateRoomCount,
}) => {
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterRuang, setFilterRuang] = useState('ALL');
  const [filterPhoto, setFilterPhoto] = useState<'ALL' | 'WITH_PHOTO' | 'NO_PHOTO'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 40;

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [assignMode, setAssignMode] = useState<'interleave' | 'sequential'>('interleave');
  const [assignMaxPerRoom, setAssignMaxPerRoom] = useState(school.maxSiswaPerRuang || 40);
  const [assignPrefix, setAssignPrefix] = useState(school.prefixNoPeserta || '21-524-25-');
  const [assignRegenNumbers, setAssignRegenNumbers] = useState(true);

  const [photoModalStudentId, setPhotoModalStudentId] = useState<string | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState('');

  const [showAddRow, setShowAddRow] = useState(false);
  const [newStudent, setNewStudent] = useState<{
    name: string;
    nisn: string;
    kelas: string;
    ruang: number;
    photoDataUrl?: string;
  }>({
    name: '',
    nisn: '',
    kelas: 'X-1',
    ruang: 1,
    photoDataUrl: undefined,
  });

  const [feedback, setFeedback] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const bulkPhotoInputRef = useRef<HTMLInputElement>(null);

  const roomCount = useMemo(
    () => getEffectiveRoomCount(students, school.jumlahRuang),
    [students, school.jumlahRuang]
  );

  const uniqueClasses = useMemo(
    () => [...new Set(students.map((s) => s.kelas).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')),
    [students]
  );

  const photoCount = useMemo(
    () => students.filter((s) => Boolean(s.photoDataUrl)).length,
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (filterKelas !== 'ALL' && s.kelas !== filterKelas) return false;
      if (filterRuang !== 'ALL' && String(s.ruang) !== filterRuang) return false;
      if (filterPhoto === 'WITH_PHOTO' && !s.photoDataUrl) return false;
      if (filterPhoto === 'NO_PHOTO' && s.photoDataUrl) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.noPeserta.toLowerCase().includes(q) ||
        s.nisn.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q)
      );
    });
  }, [students, search, filterKelas, filterRuang, filterPhoto]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filteredStudents.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredStudents, safePage]
  );

  const roomStats = useMemo(() => getRoomStats(students, roomCount), [students, roomCount]);

  const parsedPreview = useMemo(
    () => parseStudentsFromText(importText, school.prefixNoPeserta, importMode === 'replace' ? 0 : students.length),
    [importText, school.prefixNoPeserta, importMode, students.length]
  );

  const activePhotoStudent = useMemo(
    () => students.find((s) => s.id === photoModalStudentId) || null,
    [students, photoModalStudentId]
  );

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    const base = importMode === 'replace' ? [] : [...students];
    const added: Student[] = parsedPreview.map((item, i) => ({
      ...item,
      id: `st-${Date.now()}-${i}`,
    }));
    onUpdateStudents([...base, ...added]);
    setImportText('');
    setShowImportModal(false);
    setFeedback(`${added.length} peserta berhasil diimpor.`);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ''));
      setShowImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleAutoAssign = () => {
    const { students: updated, roomCount: newRooms } = autoAssignRoomsAndNumbers(students, {
      mode: assignMode,
      maxPerRoom: assignMaxPerRoom,
      prefix: assignPrefix,
      startNumber: 1,
      regenerateNumbers: assignRegenNumbers,
    });
    onUpdateStudents(updated);
    onUpdateRoomCount(newRooms);
    setShowAutoAssignModal(false);
    setFeedback(
      `${updated.length} peserta berhasil dibagi otomatis ke ${newRooms} ruang (${
        assignMode === 'interleave' ? 'Acak Silang Kelas' : 'Urut Kelas'
      }).`
    );
  };

  const handleNewStudentPhoto = async (file?: File) => {
    if (!file) return;
    const url = await resizeImageFileToDataUrl(file);
    if (url) {
      setNewStudent((prev) => ({ ...prev, photoDataUrl: url }));
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name.trim()) return;
    const nextNo = `${school.prefixNoPeserta}${String(students.length + 1).padStart(4, '0')}`;
    onUpdateStudents([
      ...students,
      {
        id: `st-${Date.now()}`,
        noPeserta: nextNo,
        name: newStudent.name.trim().toUpperCase(),
        nisn: newStudent.nisn.trim(),
        kelas: newStudent.kelas.trim() || 'X-1',
        ruang: newStudent.ruang || 1,
        photoDataUrl: newStudent.photoDataUrl,
      },
    ]);
    setNewStudent({
      name: '',
      nisn: '',
      kelas: newStudent.kelas,
      ruang: newStudent.ruang,
      photoDataUrl: undefined,
    });
    setShowAddRow(false);
    setFeedback('Peserta baru berhasil ditambahkan.');
  };

  const handleSinglePhoto = async (id: string, file?: File) => {
    if (!file) return;
    const dataUrl = await resizeImageFileToDataUrl(file);
    if (dataUrl) {
      onUpdateStudents(
        students.map((s) => (s.id === id ? { ...s, photoDataUrl: dataUrl } : s))
      );
      setFeedback('Foto peserta berhasil disimpan dan otomatis tampil di Kartu Ujian.');
    }
  };

  const handleBulkPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []) as File[];
    if (files.length === 0) return;

    const loaded = await Promise.all(
      files.map(async (f) => {
        const baseName = f.name.replace(/\.[^.]+$/, '').toLowerCase().trim();
        const url = await resizeImageFileToDataUrl(f);
        return { key: baseName, url };
      })
    );
    let matchedCount = 0;

    const updated = students.map((st) => {
      const nameKey = st.name.toLowerCase().trim();
      const nisnKey = st.nisn.toLowerCase().trim();
      const noKey = st.noPeserta.toLowerCase().trim();
      const hit = loaded.find(
        (item) =>
          item.url &&
          (item.key === nameKey ||
            (nisnKey && item.key === nisnKey) ||
            item.key === noKey)
      );
      if (hit) {
        matchedCount++;
        return { ...st, photoDataUrl: hit.url };
      }
      return st;
    });

    onUpdateStudents(updated);
    setFeedback(
      `${matchedCount} dari ${files.length} foto berhasil dicocokkan otomatis berdasarkan Nama/NISN/No. Peserta.`
    );
    e.target.value = '';
  };

  const updateStudentField = (id: string, patch: Partial<Student>) => {
    onUpdateStudents(students.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const openPhotoModal = (st: Student) => {
    setPhotoModalStudentId(st.id);
    setPhotoUrlInput(
      st.photoDataUrl && !st.photoDataUrl.startsWith('data:') ? st.photoDataUrl : ''
    );
  };

  const handleSavePhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoModalStudentId || !photoUrlInput.trim()) return;
    updateStudentField(photoModalStudentId, { photoDataUrl: photoUrlInput.trim() });
    setPhotoModalStudentId(null);
    setFeedback('URL foto peserta berhasil disimpan.');
  };

  const photoPct =
    students.length > 0 ? Math.round((photoCount / students.length) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Row 1 Bento Grid */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Main Action Bento Tile (6 cols) */}
        <div className="xl:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Database Peserta Ujian ({students.length} Siswa)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola biodata, bagi ruang otomatis, dan unggah foto peserta yang langsung tampil di Kartu Ujian F4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAutoAssignModal(true)}
              disabled={students.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-xl whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5" /> Bagi Ruang &amp; No. Otomatis
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl whitespace-nowrap"
            >
              <ClipboardPaste className="w-3.5 h-3.5" /> Paste Excel
            </button>
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" /> Upload CSV
            </button>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bulkPhotoInputRef.current?.click()}
              title="Pilih banyak file foto sekaligus (nama file harus sesuai Nama/NISN/No. Peserta)"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl whitespace-nowrap"
            >
              <ImagePlus className="w-3.5 h-3.5" /> Foto Massal
            </button>
            <input
              ref={bulkPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleBulkPhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => exportStudentsCsv(students)}
              disabled={students.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 rounded-xl whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Ekspor CSV
            </button>
          </div>
        </div>

        {/* Photo Coverage Bento Tile (3 cols) */}
        <div className="xl:col-span-3 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between gap-3">
          <div className="text-xs font-medium text-emerald-300">Kelengkapan Foto</div>
          <div>
            <div className="text-3xl font-extrabold tabular-nums">
              {photoCount}{' '}
              <span className="text-sm font-medium text-slate-300">/ {students.length}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-2.5">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{ width: `${photoPct}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-slate-300 tabular-nums">
            {photoPct}% pasfoto siap cetak kartu F4
          </div>
        </div>

        {/* Interactive Room Filter Bento Tile (3 cols) */}
        <div className="xl:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900">Sebaran {roomCount} Ruang</span>
            {filterRuang !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setFilterRuang('ALL');
                  setPage(1);
                }}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {roomStats.map((rs) => {
              const active = filterRuang === String(rs.room);
              return (
                <button
                  key={rs.room}
                  type="button"
                  onClick={() => {
                    setFilterRuang(active ? 'ALL' : String(rs.room));
                    setPage(1);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold tabular-nums transition-colors border ${
                    active
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                  }`}
                >
                  R{rs.room}: {rs.count}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {feedback && (
        <div className="px-4 py-2.5 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="underline">
            Tutup
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NISN, atau nomor peserta..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <select
            value={filterKelas}
            onChange={(e) => {
              setFilterKelas(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">Semua Kelas</option>
            {uniqueClasses.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>

          <select
            value={filterRuang}
            onChange={(e) => {
              setFilterRuang(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">Semua Ruang</option>
            {Array.from({ length: roomCount }, (_, i) => i + 1).map((r) => (
              <option key={r} value={String(r)}>
                Ruang {r}
              </option>
            ))}
          </select>

          <select
            value={filterPhoto}
            onChange={(e) => {
              setFilterPhoto(e.target.value as 'ALL' | 'WITH_PHOTO' | 'NO_PHOTO');
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">Semua Status Foto</option>
            <option value="WITH_PHOTO">Sudah Ada Foto ({photoCount})</option>
            <option value="NO_PHOTO">Belum Ada Foto ({students.length - photoCount})</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setShowAddRow((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Peserta
        </button>
      </div>

      {/* Inline Add Student Form (with Photo Input) */}
      {showAddRow && (
        <form
          onSubmit={handleAddStudent}
          className="bg-white border border-emerald-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-2 flex items-center gap-3">
            <div className="w-12 h-14 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
              {newStudent.photoDataUrl ? (
                <img
                  src={newStudent.photoDataUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-600 mb-1">Foto 3×4</div>
              <label className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 cursor-pointer whitespace-nowrap">
                <Camera className="w-3 h-3" /> Pilih Foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleNewStudentPhoto(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              placeholder="CONTOH: AHMAD FAUZAN"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">NISN</label>
            <input
              type="text"
              value={newStudent.nisn}
              onChange={(e) => setNewStudent({ ...newStudent, nisn: e.target.value })}
              placeholder="009..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Kelas</label>
            <input
              type="text"
              value={newStudent.kelas}
              onChange={(e) => setNewStudent({ ...newStudent, kelas: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <div className="w-20">
              <label className="block text-xs font-medium text-slate-600 mb-1">Ruang</label>
              <input
                type="number"
                min={1}
                value={newStudent.ruang}
                onChange={(e) =>
                  setNewStudent({ ...newStudent, ruang: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
                className="w-full px-2.5 py-2 text-sm tabular-nums border border-slate-200 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
            >
              Simpan
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-3 font-semibold w-12">No</th>
                <th className="py-3 px-3 font-semibold w-44">Foto Peserta</th>
                <th className="py-3 px-3 font-semibold w-40">No. Peserta</th>
                <th className="py-3 px-3 font-semibold">Nama Peserta</th>
                <th className="py-3 px-3 font-semibold w-32">NISN</th>
                <th className="py-3 px-3 font-semibold w-28">Kelas</th>
                <th className="py-3 px-3 font-semibold w-24 text-center">Ruang</th>
                <th className="py-3 px-3 font-semibold w-16 text-right">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                    {students.length === 0
                      ? 'Belum ada data peserta. Klik "Paste Excel / CSV" atau "Tambah Peserta".'
                      : 'Tidak ada peserta yang cocok dengan filter pencarian.'}
                  </td>
                </tr>
              ) : (
                paginated.map((st, idx) => {
                  const globalIdx = (safePage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 tabular-nums text-slate-400">
                        {globalIdx}
                      </td>
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => openPhotoModal(st)}
                            className="w-9 h-11 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 hover:border-emerald-500 transition-colors"
                            title="Klik untuk kelola foto peserta"
                          >
                            {st.photoDataUrl ? (
                              <img
                                src={st.photoDataUrl}
                                alt={st.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-slate-400" />
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 cursor-pointer whitespace-nowrap">
                              <Camera className="w-3 h-3" />
                              {st.photoDataUrl ? 'Ganti' : 'Unggah'}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSinglePhoto(st.id, e.target.files?.[0])}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => openPhotoModal(st)}
                              className="p-1 text-slate-500 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-100"
                              title="Input URL atau hapus foto"
                            >
                              <Link2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={st.noPeserta}
                          onChange={(e) => updateStudentField(st.id, { noPeserta: e.target.value })}
                          className="w-full tabular-nums text-xs text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none py-1"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={st.name}
                          onChange={(e) => updateStudentField(st.id, { name: e.target.value })}
                          className="w-full text-xs font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none py-1"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={st.nisn}
                          onChange={(e) => updateStudentField(st.id, { nisn: e.target.value })}
                          className="w-full tabular-nums text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none py-1"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={st.kelas}
                          onChange={(e) => updateStudentField(st.id, { kelas: e.target.value })}
                          className="w-full text-xs text-slate-700 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none py-1"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={st.ruang}
                          onChange={(e) =>
                            updateStudentField(st.id, {
                              ruang: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-14 text-center tabular-nums text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded py-1"
                        />
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onUpdateStudents(students.filter((s) => s.id !== st.id))}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          aria-label={`Hapus ${st.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredStudents.length > pageSize && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="tabular-nums">
              Menampilkan {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredStudents.length)} dari {filteredStudents.length}{' '}
              peserta
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="px-2 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Kelola Foto Peserta */}
      {activePhotoStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Input Foto Peserta</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activePhotoStudent.name} · {activePhotoStudent.noPeserta}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalStudentId(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-20 h-24 rounded border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {activePhotoStudent.photoDataUrl ? (
                  <img
                    src={activePhotoStudent.photoDataUrl}
                    alt={activePhotoStudent.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-300" />
                )}
              </div>

              <div className="space-y-2 flex-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Pilih File Foto (JPG/PNG)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        await handleSinglePhoto(activePhotoStudent.id, f);
                        setPhotoModalStudentId(null);
                      }
                    }}
                    className="hidden"
                  />
                </label>

                {activePhotoStudent.photoDataUrl && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        updateStudentField(activePhotoStudent.id, { photoDataUrl: undefined });
                        setPhotoModalStudentId(null);
                        setFeedback('Foto peserta dihapus.');
                      }}
                      className="text-xs font-medium text-rose-600 hover:underline"
                    >
                      Hapus Foto Saat Ini
                    </button>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSavePhotoUrl} className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Atau tempel URL / tautan foto langsung:
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={!photoUrlInput.trim()}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg"
                >
                  Simpan URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paste Excel / CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Impor Peserta (Paste dari Excel / CSV)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Salin kolom dari Excel (format: <span className="font-semibold">Nama | NISN | Kelas</span>{' '}
                atau <span className="font-semibold">No Peserta | Nama | NISN | Kelas | Ruang</span>) lalu tempel di bawah ini.
              </p>
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setImportMode('append')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  importMode === 'append' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Tambahkan ke Daftar
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  importMode === 'replace' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Ganti Semua Peserta
              </button>
            </div>

            <textarea
              rows={7}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={'Nama\tNISN\tKelas\nAHMAD RAMDANI\t0095898329\tX-1\nADIRA ZAHRATU SITA\t0077365011\tXII-2'}
              className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />

            <div className="text-xs text-slate-600">
              Terdeteksi:{' '}
              <span className="tabular-nums font-bold text-emerald-700">{parsedPreview.length}</span>{' '}
              baris peserta siap diimpor.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={parsedPreview.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg"
              >
                Impor {parsedPreview.length} Peserta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Auto Assign Ruang & Nomor Peserta */}
      {showAutoAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bagi Ruang &amp; Nomor Peserta Otomatis
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Otomatis menghitung kebutuhan ruang dari {students.length} peserta dan menyusun tempat duduk merata.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Metode Pengacakan Ruang
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAssignMode('interleave')}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      assignMode === 'interleave'
                        ? 'border-emerald-600 bg-emerald-50/60'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Acak Silang Kelas</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Menyilang kelas X, XI, XII dalam tiap ruang agar tidak duduk bersebelahan sekelas.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignMode('sequential')}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      assignMode === 'sequential'
                        ? 'border-emerald-600 bg-emerald-50/60'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-900">Urut Kelas &amp; Nama</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Mengelompokkan peserta berurutan berdasarkan kelas lalu abjad nama.
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Max Siswa per Ruang
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={assignMaxPerRoom}
                    onChange={(e) => setAssignMaxPerRoom(Math.max(1, parseInt(e.target.value, 10) || 40))}
                    className="w-full px-3 py-2 text-sm tabular-nums border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Awalan No. Peserta
                  </label>
                  <input
                    type="text"
                    value={assignPrefix}
                    onChange={(e) => setAssignPrefix(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={assignRegenNumbers}
                  onChange={(e) => setAssignRegenNumbers(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                Generate ulang Nomor Peserta berurutan ({assignPrefix}0001 s.d.{' '}
                {String(students.length).padStart(4, '0')})
              </label>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                Estimasi hasil:{' '}
                <span className="tabular-nums font-bold text-emerald-700">
                  {Math.max(1, Math.ceil(students.length / Math.max(1, assignMaxPerRoom)))} Ruang
                </span>{' '}
                (~{Math.ceil(students.length / Math.max(1, Math.ceil(students.length / Math.max(1, assignMaxPerRoom))))} siswa/ruang).
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAutoAssignModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAutoAssign}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg"
              >
                Proses Otomatis Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
