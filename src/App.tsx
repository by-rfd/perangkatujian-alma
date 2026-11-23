/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  ArrowRight,
  Cloud,
  CloudCheck,
  Download,
  Loader2,
  LogIn,
  LogOut,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { AdminCoversView } from './components/AdminCoversView';
import {
  StudentAttendanceView,
  SupervisorAttendanceView,
} from './components/AttendanceSheetsView';
import { CommitteeAndSupervisorsView } from './components/CommitteeAndSupervisorsView';
import { DashboardView } from './components/DashboardView';
import { CommitteeCardsView, StudentCardsView } from './components/ExamCardsView';
import { ExamScheduleView } from './components/ExamScheduleView';
import { DoorSignsView, ExamRulesView } from './components/RulesAndDoorsView';
import { SchoolSettingsView } from './components/SchoolSettingsView';
import { SeatingPlanView } from './components/SeatingPlanView';
import { Sidebar } from './components/Sidebar';
import { StudentsDatabaseView } from './components/StudentsDatabaseView';
import { SupervisorScheduleView } from './components/SupervisorScheduleView';
import { EMPTY_EXAM_STATE, INITIAL_EXAM_STATE } from './data/initialData';
import { auth, googleProvider } from './firebase';
import {
  buildWorkspaceFields,
  ensureWorkspaceCreated,
  saveWorkspaceFields,
  studentsSignature,
  subscribeStudents,
  subscribeWorkspace,
  syncStudentsCollection,
  workspaceSignature,
} from './services/firestoreSync';
import { ExamAppState, Student, TabId } from './types/exam';
import {
  downloadStateBackup,
  getActiveSessionsList,
  getEffectiveRoomCount,
} from './utils/examLogic';

const STORAGE_KEY = 'perangkat_ujian_state_v1';

const TAB_LABELS: Record<TabId, string> = {
  dashboard: 'Dashboard',
  'data-sekolah': 'Data Sekolah',
  panitia: 'Panitia & Pengawas',
  database: 'Database Peserta',
  'jadwal-ujian': 'Jadwal Ujian',
  'jadwal-pengawas': 'Jadwal Pengawas',
  denah: 'Denah Tempat Duduk',
  'no-pintu': 'Nomor Pintu & Poster',
  'kartu-ujian': 'Kartu Peserta Ujian',
  'kartu-panitia': 'Kartu Panitia',
  'daftar-hadir-peserta': 'Daftar Hadir Peserta',
  'daftar-hadir-pengawas': 'Daftar Hadir Pengawas & Panitia',
  'tata-tertib': 'Tata Tertib Peserta',
  administrasi: 'Administrasi & Sampul',
};

function loadInitialState(): ExamAppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_EXAM_STATE;
    const parsed = JSON.parse(raw) as ExamAppState;
    if (!parsed || !parsed.school || !Array.isArray(parsed.students)) {
      return INITIAL_EXAM_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_EXAM_STATE;
  }
}

type CloudStatus = 'local' | 'loading' | 'syncing' | 'synced';

export default function App() {
  const [state, setState] = useState<ExamAppState>(loadInitialState);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('local');
  const [fatalError, setFatalError] = useState<Error | null>(null);

  if (fatalError) {
    throw fatalError;
  }

  const stateRef = useRef<ExamAppState>(state);
  stateRef.current = state;

  const cloudReadyRef = useRef(false);
  const isSeedingRef = useRef(false);
  const lastSyncedWorkspaceSigRef = useRef('');
  const lastSyncedStudentsSigRef = useRef('');
  const cloudExistingStudentIdsRef = useRef<Set<string>>(new Set());
  const lastSyncedStudentsArrRef = useRef<Student[]>([]);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors when very large photos are attached
    }
  }, [state]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      setAuthErrorMsg(null);
      if (!nextUser) {
        cloudReadyRef.current = false;
        isSeedingRef.current = false;
        cloudExistingStudentIdsRef.current = new Set();
        lastSyncedStudentsArrRef.current = [];
        lastSyncedWorkspaceSigRef.current = '';
        lastSyncedStudentsSigRef.current = '';
        setCloudStatus('local');
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    if (!user.emailVerified) {
      setAuthErrorMsg('Akun Google perlu email terverifikasi untuk akses Firestore.');
      setCloudStatus('local');
      return;
    }

    let cancelled = false;
    cloudReadyRef.current = false;
    isSeedingRef.current = false;
    setCloudStatus('loading');

    let gotWorkspace = false;
    let gotStudents = false;
    let workspaceExists = false;
    let latestWorkspaceFields: ReturnType<typeof buildWorkspaceFields> | null = null;
    let latestStudents: Student[] = [];

    const applyCombinedSnapshotIfReady = () => {
      if (cancelled || isSeedingRef.current) return;
      if (!gotWorkspace || !gotStudents || !workspaceExists || !latestWorkspaceFields) return;

      const merged: ExamAppState = {
        ...latestWorkspaceFields,
        students: latestStudents,
      };
      lastSyncedWorkspaceSigRef.current = workspaceSignature(merged);
      lastSyncedStudentsSigRef.current = studentsSignature(latestStudents, user.uid);
      cloudReadyRef.current = true;
      setState(merged);
      setCloudStatus('synced');
    };

    const unsubWorkspace = subscribeWorkspace(
      user.uid,
      (payload) => {
        if (cancelled) return;
        if (payload.hasPendingWrites) return;

        if (!payload.exists) {
          workspaceExists = false;
          gotWorkspace = true;
          if (!isSeedingRef.current) {
            isSeedingRef.current = true;
            void (async () => {
              try {
                const seedSnapshot = stateRef.current;
                await ensureWorkspaceCreated(user.uid, seedSnapshot);
                const seededIds = await syncStudentsCollection(
                  user.uid,
                  seedSnapshot.students,
                  cloudExistingStudentIdsRef.current,
                  []
                );
                if (cancelled) return;
                cloudExistingStudentIdsRef.current = seededIds;
                lastSyncedStudentsArrRef.current = seedSnapshot.students;
                lastSyncedWorkspaceSigRef.current = workspaceSignature(seedSnapshot);
                lastSyncedStudentsSigRef.current = studentsSignature(
                  seedSnapshot.students,
                  user.uid
                );
                workspaceExists = true;
                cloudReadyRef.current = true;
                isSeedingRef.current = false;
                setCloudStatus('synced');
              } catch (err) {
                if (!cancelled) {
                  isSeedingRef.current = false;
                  setFatalError(err instanceof Error ? err : new Error(String(err)));
                }
              }
            })();
          }
          return;
        }

        workspaceExists = true;
        gotWorkspace = true;
        latestWorkspaceFields = payload.workspaceFields ?? null;

        if (cloudReadyRef.current && latestWorkspaceFields) {
          const nextWsSig = JSON.stringify(latestWorkspaceFields);
          if (nextWsSig !== lastSyncedWorkspaceSigRef.current) {
            lastSyncedWorkspaceSigRef.current = nextWsSig;
            setState((prev) => ({
              ...prev,
              ...latestWorkspaceFields!,
            }));
          }
          setCloudStatus('synced');
        } else {
          applyCombinedSnapshotIfReady();
        }
      },
      (err) => {
        if (!cancelled) setFatalError(err);
      }
    );

    const unsubStudents = subscribeStudents(
      user.uid,
      (payload) => {
        if (cancelled) return;
        cloudExistingStudentIdsRef.current = payload.existingIds;

        if (payload.hasPendingWrites || isSeedingRef.current) return;

        gotStudents = true;
        latestStudents = payload.students;
        lastSyncedStudentsArrRef.current = payload.students;

        if (cloudReadyRef.current) {
          const nextStSig = studentsSignature(payload.students, user.uid);
          if (nextStSig !== lastSyncedStudentsSigRef.current) {
            lastSyncedStudentsSigRef.current = nextStSig;
            setState((prev) => ({
              ...prev,
              students: payload.students,
            }));
          }
          setCloudStatus('synced');
        } else {
          applyCombinedSnapshotIfReady();
        }
      },
      (err) => {
        if (!cancelled) setFatalError(err);
      }
    );

    return () => {
      cancelled = true;
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      unsubWorkspace();
      unsubStudents();
    };
  }, [authReady, user]);

  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) return;
    if (!cloudReadyRef.current || isSeedingRef.current) return;

    const nextWsSig = workspaceSignature(state);
    const nextStSig = studentsSignature(state.students, user.uid);
    const wsChanged = nextWsSig !== lastSyncedWorkspaceSigRef.current;
    const stChanged = nextStSig !== lastSyncedStudentsSigRef.current;

    if (!wsChanged && !stChanged) return;

    setCloudStatus('syncing');

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }

    const uid = user.uid;
    saveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const latest = stateRef.current;
          const wsSigNow = workspaceSignature(latest);
          const stSigNow = studentsSignature(latest.students, uid);

          if (wsSigNow !== lastSyncedWorkspaceSigRef.current) {
            lastSyncedWorkspaceSigRef.current = wsSigNow;
            await saveWorkspaceFields(uid, latest);
          }

          if (stSigNow !== lastSyncedStudentsSigRef.current) {
            lastSyncedStudentsSigRef.current = stSigNow;
            const updatedIds = await syncStudentsCollection(
              uid,
              latest.students,
              cloudExistingStudentIdsRef.current,
              lastSyncedStudentsArrRef.current
            );
            cloudExistingStudentIdsRef.current = updatedIds;
            lastSyncedStudentsArrRef.current = latest.students;
          }

          setCloudStatus('synced');
        } catch (err) {
          setFatalError(err instanceof Error ? err : new Error(String(err)));
        }
      })();
    }, 650);

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state, authReady, user]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setQuickOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAuthErrorMsg('Gagal masuk dengan Google. Pastikan popup diizinkan browser.');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOut(auth);
    } finally {
      setAuthBusy(false);
    }
  };

  const roomCount = useMemo(
    () => getEffectiveRoomCount(state.students, state.school.jumlahRuang),
    [state.students, state.school.jumlahRuang]
  );

  const readinessPct = useMemo(() => {
    let score = 0;
    if (state.school.namaSekolah && state.school.ketuaPanitia) score += 25;
    if (state.committee.length > 0 && state.supervisors.length > 0) score += 25;
    if (state.students.length > 0) score += 25;
    if (getActiveSessionsList(state.examDays).length > 0) score += 25;
    return score;
  }, [state]);

  const quickTabs = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    const entries = (Object.keys(TAB_LABELS) as TabId[]).map((id) => ({
      id,
      label: TAB_LABELS[id],
    }));
    if (!q) return entries;
    return entries.filter((item) => item.label.toLowerCase().includes(q));
  }, [quickQuery]);

  const quickStudents = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return state.students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.noPeserta.toLowerCase().includes(q) ||
          s.nisn.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [quickQuery, state.students]);

  const handleSwapStudents = (idA: string, idB: string) => {
    setState((prev) => {
      const idxA = prev.students.findIndex((s) => s.id === idA);
      const idxB = prev.students.findIndex((s) => s.id === idB);
      if (idxA === -1 || idxB === -1) return prev;
      const next = [...prev.students];
      const temp = next[idxA];
      next[idxA] = { ...next[idxB], ruang: temp.ruang };
      next[idxB] = { ...temp, ruang: next[idxB].ruang };
      return { ...prev, students: next };
    });
  };

  return (
    <div className="min-h-screen flex bg-[#F6F8FA] text-slate-900 print:block print:min-h-0 print:bg-white">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        schoolShortName={state.school.singkatanSekolah}
        examAbbr={state.school.singkatanUjian}
        logoDataUrl={state.school.rightLogoDataUrl}
        studentCount={state.students.length}
        supervisorCount={state.supervisors.length}
        roomCount={roomCount}
        readinessPct={readinessPct}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col print:block">
        {/* Sticky Glassy Top Navigation Bar */}
        <header className="no-print h-16 sticky top-0 z-40 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/65 border-b border-slate-200/70 shadow-[0_1px_12px_-4px_rgba(15,23,42,0.06)] px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100/80"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                Perangkat Ujian
              </span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="font-bold text-slate-900 truncate">
                {TAB_LABELS[activeTab]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setQuickQuery('');
                setQuickOpen(true);
              }}
              className="hidden md:inline-flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 bg-slate-100/70 hover:bg-slate-200/70 border border-slate-200/70 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Cari menu atau peserta...</span>
              <kbd className="text-[10px] font-semibold text-slate-500 bg-white/90 px-1.5 py-0.5 rounded border border-slate-200">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => downloadStateBackup(state)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white/90 border border-slate-200/80 hover:bg-slate-50 rounded-xl whitespace-nowrap shrink-0 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup JSON</span>
            </button>

            {authReady && !user && (
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void handleGoogleSignIn()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-xl whitespace-nowrap shrink-0 shadow-sm transition-colors"
              >
                {authBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Masuk Google</span>
              </button>
            )}

            {authReady && user && (
              <div className="flex items-center gap-1.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl pl-2.5 pr-1.5 py-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 whitespace-nowrap">
                  {cloudStatus === 'loading' || cloudStatus === 'syncing' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                      <span className="hidden sm:inline">
                        {cloudStatus === 'loading' ? 'Memuat Cloud...' : 'Menyimpan...'}
                      </span>
                    </>
                  ) : cloudStatus === 'synced' ? (
                    <>
                      <CloudCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Firestore Tersimpan</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Lokal</span>
                    </>
                  )}
                </div>

                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Akun Google'}
                    referrerPolicy="no-referrer"
                    className="w-6 h-6 rounded-lg object-cover border border-emerald-200"
                  />
                )}

                <button
                  type="button"
                  disabled={authBusy}
                  onClick={() => void handleGoogleSignOut()}
                  title={`Keluar (${user.email || 'Google'})`}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-white/80 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </header>

        {authErrorMsg && (
          <div className="no-print mx-4 lg:mx-8 mt-3 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
            <span>{authErrorMsg}</span>
            <button
              type="button"
              onClick={() => setAuthErrorMsg(null)}
              className="p-1 text-amber-700 hover:text-amber-950"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-8 max-w-[1440px] w-full mx-auto print:p-0 print:max-w-none print:block">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="print:!transform-none print:!opacity-100"
          >
            {activeTab === 'dashboard' && (
              <DashboardView state={state} onNavigate={setActiveTab} />
            )}

            {activeTab === 'data-sekolah' && (
              <SchoolSettingsView
                state={state}
                onUpdateSchool={(updater) =>
                  setState((prev) => ({
                    ...prev,
                    school: typeof updater === 'function' ? updater(prev.school) : updater,
                  }))
                }
                onLoadSampleData={() => setState(INITIAL_EXAM_STATE)}
                onResetEmpty={() => setState(EMPTY_EXAM_STATE)}
                onImportStateJson={(newState) => setState(newState)}
              />
            )}

            {activeTab === 'panitia' && (
              <CommitteeAndSupervisorsView
                committee={state.committee}
                supervisors={state.supervisors}
                onUpdateCommittee={(committee) => setState((prev) => ({ ...prev, committee }))}
                onUpdateSupervisors={(supervisors) =>
                  setState((prev) => ({ ...prev, supervisors }))
                }
              />
            )}

            {activeTab === 'database' && (
              <StudentsDatabaseView
                students={state.students}
                school={state.school}
                onUpdateStudents={(students) => setState((prev) => ({ ...prev, students }))}
                onUpdateRoomCount={(jumlahRuang) =>
                  setState((prev) => ({
                    ...prev,
                    school: { ...prev.school, jumlahRuang },
                  }))
                }
              />
            )}

            {activeTab === 'jadwal-ujian' && (
              <ExamScheduleView
                school={state.school}
                tracks={state.tracks}
                examDays={state.examDays}
                onUpdateTracks={(tracks) => setState((prev) => ({ ...prev, tracks }))}
                onUpdateExamDays={(examDays) => setState((prev) => ({ ...prev, examDays }))}
              />
            )}

            {activeTab === 'jadwal-pengawas' && (
              <SupervisorScheduleView
                school={state.school}
                examDays={state.examDays}
                supervisors={state.supervisors}
                roomCount={roomCount}
                schedule={state.supervisorSchedule}
                onUpdateSchedule={(supervisorSchedule) =>
                  setState((prev) => ({ ...prev, supervisorSchedule }))
                }
              />
            )}

            {activeTab === 'denah' && (
              <SeatingPlanView
                school={state.school}
                students={state.students}
                roomCount={roomCount}
                onSwapStudents={handleSwapStudents}
              />
            )}

            {activeTab === 'no-pintu' && (
              <DoorSignsView school={state.school} roomCount={roomCount} />
            )}

            {activeTab === 'kartu-ujian' && (
              <StudentCardsView
                school={state.school}
                students={state.students}
                roomCount={roomCount}
              />
            )}

            {activeTab === 'kartu-panitia' && (
              <CommitteeCardsView school={state.school} committee={state.committee} />
            )}

            {activeTab === 'daftar-hadir-peserta' && (
              <StudentAttendanceView
                school={state.school}
                students={state.students}
                examDays={state.examDays}
                roomCount={roomCount}
              />
            )}

            {activeTab === 'daftar-hadir-pengawas' && (
              <SupervisorAttendanceView
                school={state.school}
                examDays={state.examDays}
                supervisors={state.supervisors}
                committee={state.committee}
                roomCount={roomCount}
                schedule={state.supervisorSchedule}
              />
            )}

            {activeTab === 'tata-tertib' && (
              <ExamRulesView
                school={state.school}
                rules={state.rules}
                onUpdateRules={(rules) => setState((prev) => ({ ...prev, rules }))}
              />
            )}

            {activeTab === 'administrasi' && (
              <AdminCoversView
                school={state.school}
                onUpdateSchool={(updater) =>
                  setState((prev) => ({
                    ...prev,
                    school: typeof updater === 'function' ? updater(prev.school) : updater,
                  }))
                }
              />
            )}
          </motion.div>
        </main>
      </div>

      {/* Quick Jump Command Palette (Ctrl+K) */}
      {quickOpen && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[2px] flex items-start justify-center pt-[12vh] p-4"
          onClick={() => setQuickOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Ketik nama menu atau nama peserta..."
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setQuickOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {quickStudents.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                    Peserta Ditemukan
                  </div>
                  <div className="space-y-0.5">
                    {quickStudents.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('database');
                          setQuickOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50/70 text-left text-xs"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{st.name}</div>
                          <div className="text-slate-500 tabular-nums">
                            {st.noPeserta} · Kelas {st.kelas} · Ruang {st.ruang}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                  Pindah Cepat ke Menu
                </div>
                <div className="space-y-0.5">
                  {quickTabs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setQuickOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-100 text-left text-xs font-medium text-slate-700"
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                  {quickTabs.length === 0 && quickStudents.length === 0 && (
                    <div className="py-6 text-center text-xs text-slate-400">
                      Tidak ditemukan hasil untuk &quot;{quickQuery}&quot;
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
