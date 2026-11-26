import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { ExamAppState, SchoolIdentity } from '../types/exam';
import { downloadStateBackup, formatIndonesianDate, isWeekendIso } from '../utils/examLogic';
import { LogoKemenag, LogoSekolah, OfficialLetterhead } from './SchoolLogos';

interface SchoolSettingsViewProps {
  state: ExamAppState;
  onUpdateSchool: (updater: SchoolIdentity | ((prev: SchoolIdentity) => SchoolIdentity)) => void;
  onUpdateRoomCount: (count: number) => void;
  onUpdateDayCount: (count: number) => void;
  onUpdateStartDate: (isoDate: string) => void;
  onLoadSampleData: () => void;
  onResetEmpty: () => void;
  onImportStateJson: (newState: ExamAppState) => void;
}

function resizeLogoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = () => {
      const rawUrl = String(reader.result || '');
      if (!rawUrl) {
        reject(new Error('File kosong'));
        return;
      }
      // Keep SVG or already small images (< 180 KB) untouched
      if (file.type === 'image/svg+xml' || rawUrl.length < 240_000) {
        resolve(rawUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const maxDim = 420;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawUrl);
          return;
        }
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(rawUrl);
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const SchoolSettingsView: React.FC<SchoolSettingsViewProps> = ({
  state,
  onUpdateSchool,
  onUpdateRoomCount,
  onUpdateDayCount,
  onUpdateStartDate,
  onLoadSampleData,
  onResetEmpty,
  onImportStateJson,
}) => {
  const { school } = state;
  const [confirmMode, setConfirmMode] = useState<'none' | 'empty' | 'sample'>('none');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const updateField = <K extends keyof SchoolIdentity>(key: K, value: SchoolIdentity[K]) => {
    onUpdateSchool((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (
    side: 'leftLogoDataUrl' | 'rightLogoDataUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await resizeLogoToDataUrl(file);
      updateField(side, dataUrl);
      setStatusMsg(
        side === 'leftLogoDataUrl'
          ? 'Logo Kemenag / Kiri berhasil diperbarui di seluruh menu & dokumen.'
          : 'Logo Sekolah berhasil diperbarui di seluruh menu & dokumen.'
      );
    } catch {
      setStatusMsg('Gagal memproses file logo. Gunakan format PNG, JPG, atau SVG.');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ExamAppState;
        if (!parsed.school || !Array.isArray(parsed.students)) {
          setStatusMsg('Format file backup JSON tidak valid.');
          return;
        }
        onImportStateJson(parsed);
        setStatusMsg('Data backup berhasil dipulihkan.');
      } catch {
        setStatusMsg('Gagal membaca file JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const fieldCls =
    'w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-colors';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <div className="space-y-5">
      {/* Row 1 Bento Grid: Live Kop Preview (8 cols) + Identity/Template Summary Tile (4 cols) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-bold text-slate-900">
                Pratinjau Kop Surat Otomatis (Live)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap perubahan langsung mengisi seluruh dokumen cetak, kartu, denah, dan sampul.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => downloadStateBackup(state)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> Backup JSON
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" /> Pulihkan JSON
              </button>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
              />
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 border border-slate-200/80">
            <OfficialLetterhead school={school} title={school.jenisUjian} />
          </div>
        </div>

        {/* Dark Bento Summary & Template Tile */}
        <div className="xl:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] via-[#0F2E24] to-[#0E2430] text-white p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div>
            <div className="text-xs font-medium text-emerald-300">Ringkasan Lembaga</div>
            <div className="text-lg font-extrabold tracking-tight mt-1 truncate">
              {school.singkatanSekolah || school.namaSekolah}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10 text-xs">
              <div>
                <div className="text-slate-400">Singkatan Ujian</div>
                <div className="font-bold text-white mt-0.5">{school.singkatanUjian}</div>
              </div>
              <div>
                <div className="text-slate-400">Semester / Tahun</div>
                <div className="font-bold text-white mt-0.5 tabular-nums">
                  {school.semester} · {school.tahunSampul}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Max / Ruang</div>
                <div className="font-bold text-white mt-0.5 tabular-nums">
                  {school.maxSiswaPerRuang} siswa
                </div>
              </div>
              <div>
                <div className="text-slate-400">Prefix Peserta</div>
                <div className="font-mono font-bold text-emerald-300 mt-0.5 truncate">
                  {school.prefixNoPeserta}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="text-[11px] text-slate-300">
              Template data simulasi atau mulai dari data kosong:
            </div>
            {confirmMode === 'none' ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmMode('sample')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Data Contoh
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode('empty')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-200 bg-white/10 hover:bg-rose-500/20 border border-white/15 rounded-xl whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Mulai Kosong
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 bg-white/10 p-2.5 rounded-xl">
                <span className="text-[11px] text-white w-full">
                  {confirmMode === 'empty'
                    ? 'Kosongkan daftar siswa & mulai baru?'
                    : 'Kembalikan ke data contoh MA Al-Ma\'sum?'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmMode === 'empty') onResetEmpty();
                    else onLoadSampleData();
                    setConfirmMode('none');
                    setStatusMsg(
                      confirmMode === 'empty'
                        ? 'Workspace dikosongkan. Silakan isi data sekolah dan impor peserta.'
                        : 'Data contoh MA Al-Ma\'sum berhasil dimuat ulang.'
                    );
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-emerald-400 text-slate-950 rounded-lg"
                >
                  Ya, Lanjutkan
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode('none')}
                  className="px-2.5 py-1 text-xs text-slate-200 hover:text-white"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {statusMsg && (
        <div className="px-4 py-2.5 text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between">
          <span>{statusMsg}</span>
          <button type="button" onClick={() => setStatusMsg(null)} className="underline">
            Tutup
          </button>
        </div>
      )}

      {/* Row 2 Bento Grid: 2 Balanced Form Bento Tiles (6 + 6 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Bento: Identitas Lembaga & Logo */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Identitas Lembaga &amp; Logo</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nama instansi, sekolah, alamat, serta logo kiri dan kanan pada kop dokumen.
            </p>
          </div>

          <div>
            <label className={labelCls}>Pemerintah Daerah / Kementerian</label>
            <input
              type="text"
              value={school.pemerintahDaerah}
              onChange={(e) => updateField('pemerintahDaerah', e.target.value)}
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Nama Instansi / Yayasan</label>
            <input
              type="text"
              value={school.namaInstansi}
              onChange={(e) => updateField('namaInstansi', e.target.value)}
              className={fieldCls}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nama Sekolah / Madrasah</label>
              <input
                type="text"
                value={school.namaSekolah}
                onChange={(e) => updateField('namaSekolah', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Singkatan Sekolah</label>
              <input
                type="text"
                value={school.singkatanSekolah}
                onChange={(e) => updateField('singkatanSekolah', e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Alamat Lengkap</label>
            <input
              type="text"
              value={school.alamat}
              onChange={(e) => updateField('alamat', e.target.value)}
              className={fieldCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kecamatan</label>
              <input
                type="text"
                value={school.kecamatan}
                onChange={(e) => updateField('kecamatan', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Kabupaten / Kota</label>
              <input
                type="text"
                value={school.kabupaten}
                onChange={(e) => updateField('kabupaten', e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-xs font-semibold text-slate-700 mb-2">
              Logo Kop Surat &amp; Kartu (Opsional)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-slate-200 rounded-xl flex items-center gap-3 bg-slate-50/50">
                <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-white rounded-lg border border-slate-200/80">
                  {school.leftLogoDataUrl ? (
                    <img
                      src={school.leftLogoDataUrl}
                      alt="Logo Kiri"
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <LogoKemenag className="w-10 h-10" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">Logo Kemenag / Kiri</div>
                  <label className="inline-block mt-1 text-xs font-medium text-emerald-700 hover:underline cursor-pointer">
                    Unggah Gambar
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload('leftLogoDataUrl', e)}
                      className="hidden"
                    />
                  </label>
                  {school.leftLogoDataUrl && (
                    <button
                      type="button"
                      onClick={() => updateField('leftLogoDataUrl', undefined)}
                      className="block text-[11px] text-slate-400 hover:text-rose-600"
                    >
                      Reset default
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 border border-slate-200 rounded-xl flex items-center gap-3 bg-slate-50/50">
                <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-white rounded-lg border border-slate-200/80">
                  {school.rightLogoDataUrl ? (
                    <img
                      src={school.rightLogoDataUrl}
                      alt="Logo Sekolah"
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <LogoSekolah className="w-10 h-10" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800">Logo Sekolah / Kanan</div>
                  <label className="inline-block mt-1 text-xs font-medium text-emerald-700 hover:underline cursor-pointer">
                    Unggah Gambar
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleLogoUpload('rightLogoDataUrl', e)}
                      className="hidden"
                    />
                  </label>
                  {school.rightLogoDataUrl && (
                    <button
                      type="button"
                      onClick={() => updateField('rightLogoDataUrl', undefined)}
                      className="block text-[11px] text-slate-400 hover:text-rose-600"
                    >
                      Reset default
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Bento: Pengaturan Ujian & Pengesahan */}
        <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Pelaksanaan Ujian &amp; Pengesahan
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pengaturan periode ujian, penandatangan dokumen, ruang, dan kontak kartu panitia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nama Kegiatan / Jenis Ujian</label>
              <input
                type="text"
                value={school.jenisUjian}
                onChange={(e) => updateField('jenisUjian', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Singkatan Ujian</label>
              <input
                type="text"
                value={school.singkatanUjian}
                onChange={(e) => updateField('singkatanUjian', e.target.value)}
                placeholder="ASAT / PAS"
                className={fieldCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Tahun Pelajaran</label>
              <input
                type="text"
                value={school.tahunPelajaran}
                onChange={(e) => updateField('tahunPelajaran', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Semester</label>
              <select
                value={school.semester}
                onChange={(e) => updateField('semester', e.target.value)}
                className={fieldCls}
              >
                <option value="GANJIL">GANJIL</option>
                <option value="GENAP">GENAP</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Tahun Sampul</label>
              <input
                type="text"
                value={school.tahunSampul}
                onChange={(e) => updateField('tahunSampul', e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Kepala Madrasah / Sekolah</label>
              <input
                type="text"
                value={school.kepalaMadrasah}
                onChange={(e) => updateField('kepalaMadrasah', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>NIP Kepala</label>
              <input
                type="text"
                value={school.nipKepala}
                onChange={(e) => updateField('nipKepala', e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ketua Panitia Ujian</label>
              <input
                type="text"
                value={school.ketuaPanitia}
                onChange={(e) => updateField('ketuaPanitia', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>NIP Ketua</label>
              <input
                type="text"
                value={school.nipKetua}
                onChange={(e) => updateField('nipKetua', e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Tanggal Mulai Ujian (Senin–Jumat)
              </label>
              <input
                type="date"
                value={school.tanggalMulai}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (isWeekendIso(val)) {
                    setStatusMsg(
                      'Hari Sabtu & Minggu otomatis dilewati dan digeser ke hari Senin berikutnya.'
                    );
                  }
                  onUpdateStartDate(val);
                }}
                className={`${fieldCls} font-mono`}
              />
              <div className="text-[11px] text-slate-500 mt-1">
                Mulai:{' '}
                <strong className="text-slate-700">
                  {formatIndonesianDate(school.tanggalMulai).dayName},{' '}
                  {formatIndonesianDate(school.tanggalMulai).fullDate}
                </strong>{' '}
                (Sabtu &amp; Minggu dilewati otomatis)
              </div>
            </div>
            <div>
              <label className={labelCls}>Titimangsa Surat &amp; Kartu</label>
              <input
                type="text"
                value={school.titimangsa}
                onChange={(e) => updateField('titimangsa', e.target.value)}
                placeholder="Malausma, 02 Juni 2026"
                className={fieldCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Awalan No. Peserta</label>
              <input
                type="text"
                value={school.prefixNoPeserta}
                onChange={(e) => updateField('prefixNoPeserta', e.target.value)}
                className={`${fieldCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Max Siswa / Ruang</label>
              <input
                type="number"
                min={1}
                max={60}
                value={school.maxSiswaPerRuang}
                onChange={(e) =>
                  updateField('maxSiswaPerRuang', Math.max(1, parseInt(e.target.value, 10) || 40))
                }
                className={`${fieldCls} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className={labelCls}>Jumlah Ruang</label>
              <input
                type="number"
                min={1}
                max={100}
                value={school.jumlahRuang}
                onChange={(e) =>
                  onUpdateRoomCount(Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className={`${fieldCls} font-mono tabular-nums`}
              />
            </div>
            <div>
              <label className={labelCls}>Jumlah Hari</label>
              <input
                type="number"
                min={1}
                max={30}
                value={state.examDays.length}
                onChange={(e) =>
                  onUpdateDayCount(Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className={`${fieldCls} font-mono tabular-nums`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>IG / TikTok</label>
              <input
                type="text"
                value={school.sosmedIg}
                onChange={(e) => updateField('sosmedIg', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>FB / YouTube</label>
              <input
                type="text"
                value={school.sosmedFb}
                onChange={(e) => updateField('sosmedFb', e.target.value)}
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input
                type="text"
                value={school.sosmedWa}
                onChange={(e) => updateField('sosmedWa', e.target.value)}
                className={fieldCls}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
