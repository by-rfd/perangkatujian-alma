import React, { useState } from 'react';
import { Camera, ClipboardPaste, Plus, Trash2, User } from 'lucide-react';
import { CommitteeMember, Supervisor } from '../types/exam';
import { getSupervisorColors } from '../utils/examLogic';

interface CommitteeAndSupervisorsViewProps {
  committee: CommitteeMember[];
  supervisors: Supervisor[];
  onUpdateCommittee: (list: CommitteeMember[]) => void;
  onUpdateSupervisors: (list: Supervisor[]) => void;
}

export const CommitteeAndSupervisorsView: React.FC<CommitteeAndSupervisorsViewProps> = ({
  committee,
  supervisors,
  onUpdateCommittee,
  onUpdateSupervisors,
}) => {
  const [newComName, setNewComName] = useState('');
  const [newComRole, setNewComRole] = useState('Anggota');
  const [newSupName, setNewSupName] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const committeeWithPhotos = committee.filter((c) => Boolean(c.photoDataUrl)).length;

  const handleAddCommittee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComName.trim()) return;
    onUpdateCommittee([
      ...committee,
      {
        id: `com-${Date.now()}`,
        name: newComName.trim(),
        role: newComRole.trim() || 'Anggota',
      },
    ]);
    setNewComName('');
    setNewComRole('Anggota');
  };

  const handleCommitteePhoto = (id: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateCommittee(
          committee.map((c) => (c.id === id ? { ...c, photoDataUrl: reader.result as string } : c))
        );
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSupervisor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    const nextCode = supervisors.length > 0 ? Math.max(...supervisors.map((s) => s.code)) + 1 : 1;
    onUpdateSupervisors([
      ...supervisors,
      {
        id: `sup-${Date.now()}`,
        code: nextCode,
        name: newSupName.trim().toUpperCase(),
        color: getSupervisorColors(nextCode).bg,
      },
    ]);
    setNewSupName('');
  };

  const handleRemoveSupervisor = (id: string) => {
    const filtered = supervisors.filter((s) => s.id !== id);
    const reindexed = filtered.map((s, idx) => ({
      ...s,
      code: idx + 1,
      color: getSupervisorColors(idx + 1).bg,
    }));
    onUpdateSupervisors(reindexed);
  };

  const handleBulkImportSupervisors = (replaceAll: boolean) => {
    const names = bulkText
      .split(/\r?\n/)
      .map((line) => line.replace(/^\d+[\t.\s-]+/, '').trim())
      .filter((line) => line.length > 0);
    if (names.length === 0) return;

    const base = replaceAll ? [] : [...supervisors];
    const startCode = base.length + 1;
    const added: Supervisor[] = names.map((name, i) => ({
      id: `sup-${Date.now()}-${i}`,
      code: startCode + i,
      name: name.toUpperCase(),
      color: getSupervisorColors(startCode + i).bg,
    }));
    onUpdateSupervisors([...base, ...added]);
    setBulkText('');
    setShowBulkPaste(false);
  };

  return (
    <div className="space-y-5">
      {/* Row 1 Bento Summary Strip */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 rounded-2xl bg-gradient-to-br from-[#0A221B] to-[#0E2430] text-white p-5 flex flex-col justify-between">
          <div className="text-xs font-medium text-emerald-300">Tim Pelaksana Ujian</div>
          <div className="text-2xl font-extrabold tabular-nums mt-1">
            {committee.length + supervisors.length} Personel
          </div>
          <div className="text-xs text-slate-300 mt-1 tabular-nums">
            {committee.length} panitia inti · {supervisors.length} guru pengawas
          </div>
        </div>

        <div className="md:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div className="text-xs font-medium text-slate-500">Foto Kartu Panitia</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">
            {committeeWithPhotos} / {committee.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Klik foto di daftar panitia untuk mengganti
          </div>
        </div>

        <div className="md:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <div>
            <div className="text-xs font-medium text-slate-500">Impor Daftar Pengawas</div>
            <div className="text-sm font-bold text-slate-900 mt-1">
              Kode 1 s.d. {supervisors.length} Otomatis
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Salin langsung kolom nama dari Excel
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBulkPaste((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 whitespace-nowrap shrink-0"
          >
            <ClipboardPaste className="w-3.5 h-3.5" /> Paste Nama
          </button>
        </div>
      </section>

      {/* Row 2 Bento Grid: Panitia (5 cols) + Pengawas (7 cols) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Bento: Panitia Ujian */}
        <div className="xl:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Data Panitia Ujian</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Otomatis mengisi Kartu Panitia dan Daftar Hadir Panitia.
            </p>
          </div>

          <form onSubmit={handleAddCommittee} className="mt-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nama Panitia"
              value={newComName}
              onChange={(e) => setNewComName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
            />
            <input
              type="text"
              placeholder="Jabatan"
              value={newComRole}
              onChange={(e) => setNewComRole(e.target.value)}
              className="sm:w-32 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </form>

          <div className="mt-4 divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
            {committee.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Belum ada panitia ditambahkan.
              </div>
            ) : (
              committee.map((member, idx) => (
                <div key={member.id} className="p-3 flex items-center gap-3 hover:bg-slate-50/70">
                  <span className="text-xs font-mono tabular-nums text-slate-400 w-5 shrink-0">
                    {idx + 1}.
                  </span>
                  <label
                    className="relative w-10 h-12 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer shrink-0 group"
                    title="Unggah foto panitia"
                  >
                    {member.photoDataUrl ? (
                      <img
                        src={member.photoDataUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-3.5 h-3.5 text-white" />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleCommitteePhoto(member.id, e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) =>
                        onUpdateCommittee(
                          committee.map((c) => (c.id === member.id ? { ...c, name: e.target.value } : c))
                        )
                      }
                      className="w-full text-sm font-medium text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none py-0.5"
                    />
                    <input
                      type="text"
                      value={member.role}
                      onChange={(e) =>
                        onUpdateCommittee(
                          committee.map((c) => (c.id === member.id ? { ...c, role: e.target.value } : c))
                        )
                      }
                      className="w-full text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none py-0.5"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdateCommittee(committee.filter((c) => c.id !== member.id))}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    aria-label="Hapus panitia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Bento: Daftar Pengawas */}
        <div className="xl:col-span-7 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_1px_3px_rgba(15,23,42,0.03)] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Daftar Pengawas ({supervisors.length} Orang)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Kode nomor otomatis terhubung dengan Jadwal Pengawas, Dashboard Harian, dan Daftar Hadir.
              </p>
            </div>
          </div>

          {showBulkPaste && (
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="text-xs font-medium text-slate-700">
                Tempel daftar nama guru pengawas (satu nama per baris):
              </div>
              <textarea
                rows={5}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'ADI MIFTAH PARID, S.H.\nBUBUN MAKBULLOH, S.Pd.\nRENI WAHYUNI, S.Pd.'}
                className="w-full p-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBulkImportSupervisors(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-xl hover:bg-emerald-800"
                >
                  Tambahkan ke Daftar
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkImportSupervisors(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
                >
                  Ganti Semua Pengawas
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkPaste(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleAddSupervisor} className="mt-4 flex gap-2">
            <input
              type="text"
              placeholder="Tambah nama guru pengawas baru..."
              value={newSupName}
              onChange={(e) => setNewSupName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" /> Tambah Pengawas
            </button>
          </form>

          <div className="mt-4 overflow-x-auto border border-slate-200/80 rounded-xl">
            <table className="w-full text-sm text-left">
              <thead className="bg-white border-b-2 border-slate-200 text-xs text-slate-950 font-bold">
                <tr>
                  <th className="py-2.5 px-3 font-bold w-16 text-center">Kode</th>
                  <th className="py-2.5 px-3 font-bold">Nama Pengawas</th>
                  <th className="py-2.5 px-3 font-bold w-20 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supervisors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs text-slate-500">
                      Belum ada pengawas. Tambahkan manual atau paste daftar nama guru.
                    </td>
                  </tr>
                ) : (
                  supervisors.map((sup) => {
                    const colors = getSupervisorColors(sup.code);
                    return (
                      <tr key={sup.id} className="hover:bg-slate-50/70">
                        <td className="py-1.5 px-3 text-center">
                          <span
                            className="inline-block w-8 py-0.5 rounded-lg text-xs font-mono font-bold tabular-nums"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                            }}
                          >
                            {sup.code}
                          </span>
                        </td>
                        <td className="py-1.5 px-3">
                          <input
                            type="text"
                            value={sup.name}
                            onChange={(e) =>
                              onUpdateSupervisors(
                                supervisors.map((s) =>
                                  s.id === sup.id ? { ...s, name: e.target.value } : s
                                )
                              )
                            }
                            className="w-full text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-emerald-600 focus:outline-none py-0.5"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveSupervisor(sup.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                            aria-label={`Hapus ${sup.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
