import {
  Unsubscribe,
  collection,
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { createDefaultProposal } from '../data/initialData';
import {
  CommitteeMember,
  ExamAppState,
  ExamDay,
  ExamProposal,
  ExamRule,
  SchoolIdentity,
  Student,
  Supervisor,
  SupervisorScheduleMap,
} from '../types/exam';

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_ID_LEN = 128;
const MAX_LOGO_CHARS = 250000;
const MAX_STUDENT_PHOTO_CHARS = 350000;

export function sanitizeFirestoreId(rawId: string, fallbackPrefix = 'item', idx = 0): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  if (cleaned.length >= 1 && cleaned.length <= MAX_ID_LEN && VALID_ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}_${idx + 1}`.slice(0, MAX_ID_LEN);
}

function stripUndefinedDeep<T>(val: T): T {
  if (Array.isArray(val)) {
    return val.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (val && typeof val === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return val;
}

function sanitizeSchoolForFirestore(school: SchoolIdentity): SchoolIdentity {
  const copy = stripUndefinedDeep({ ...school });
  copy.namaSekolah = String(copy.namaSekolah || '').trim().slice(0, 200) || 'MADRASAH / SEKOLAH';
  copy.jumlahRuang = Math.min(200, Math.max(1, Math.round(Number(copy.jumlahRuang) || 1)));
  copy.maxSiswaPerRuang = Math.min(200, Math.max(1, Math.round(Number(copy.maxSiswaPerRuang) || 36)));

  if (!copy.leftLogoDataUrl || copy.leftLogoDataUrl.length > MAX_LOGO_CHARS) {
    delete copy.leftLogoDataUrl;
  }
  if (!copy.rightLogoDataUrl || copy.rightLogoDataUrl.length > MAX_LOGO_CHARS) {
    delete copy.rightLogoDataUrl;
  }
  return copy;
}

function sanitizeTracksForFirestore(tracks: string[]): string[] {
  const cleaned = (Array.isArray(tracks) ? tracks : [])
    .map((t) => String(t || '').trim().slice(0, 40))
    .filter((t) => t.length >= 1)
    .slice(0, 20);
  return cleaned.length > 0 ? cleaned : ['UMUM'];
}

function sanitizeProposalForFirestore(proposal?: ExamProposal): ExamProposal {
  const base = createDefaultProposal();
  const src = proposal ? stripUndefinedDeep(proposal) : base;
  return {
    nomorSurat: String(src.nomorSurat ?? base.nomorSurat).slice(0, 120),
    lampiran: String(src.lampiran ?? base.lampiran).slice(0, 120),
    perihal: String(src.perihal ?? base.perihal).slice(0, 240),
    latarBelakang: String(src.latarBelakang ?? base.latarBelakang).slice(0, 4000),
    dasarHukum: (Array.isArray(src.dasarHukum) ? src.dasarHukum : base.dasarHukum)
      .map((s) => String(s || '').slice(0, 500))
      .slice(0, 30),
    tujuanKegiatan: (Array.isArray(src.tujuanKegiatan) ? src.tujuanKegiatan : base.tujuanKegiatan)
      .map((s) => String(s || '').slice(0, 500))
      .slice(0, 30),
    tempatPelaksanaan: String(src.tempatPelaksanaan ?? base.tempatPelaksanaan).slice(0, 240),
    penutup: String(src.penutup ?? base.penutup).slice(0, 2000),
    budgetItems: (Array.isArray(src.budgetItems) ? src.budgetItems : base.budgetItems)
      .slice(0, 100)
      .map((item, idx) => ({
        id: String(item.id || `rab-${idx + 1}`).slice(0, 64),
        uraian: String(item.uraian || '').slice(0, 240),
        volume: Math.max(0, Number(item.volume) || 0),
        satuan: String(item.satuan || '').slice(0, 40),
        hargaSatuan: Math.max(0, Math.round(Number(item.hargaSatuan) || 0)),
      })),
  };
}

export function buildWorkspaceFields(state: ExamAppState): {
  school: SchoolIdentity;
  committee: CommitteeMember[];
  supervisors: Supervisor[];
  tracks: string[];
  examDays: ExamDay[];
  supervisorSchedule: SupervisorScheduleMap;
  rules: ExamRule[];
  proposal: ExamProposal;
} {
  return {
    school: sanitizeSchoolForFirestore(state.school),
    committee: stripUndefinedDeep((state.committee || []).slice(0, 100)),
    supervisors: stripUndefinedDeep((state.supervisors || []).slice(0, 100)),
    tracks: sanitizeTracksForFirestore(state.tracks),
    examDays: stripUndefinedDeep((state.examDays || []).slice(0, 30)),
    supervisorSchedule: stripUndefinedDeep(state.supervisorSchedule || {}),
    rules: stripUndefinedDeep((state.rules || []).slice(0, 50)),
    proposal: sanitizeProposalForFirestore(state.proposal),
  };
}

export function normalizeStudentForFirestore(
  student: Student,
  uid: string,
  orderIndex: number
): {
  id: string;
  data: {
    ownerId: string;
    noPeserta: string;
    name: string;
    nisn: string;
    kelas: string;
    ruang: number;
    orderIndex: number;
    photoDataUrl?: string;
  };
} {
  const safeId = sanitizeFirestoreId(student.id, 'st', orderIndex);
  const base: {
    ownerId: string;
    noPeserta: string;
    name: string;
    nisn: string;
    kelas: string;
    ruang: number;
    orderIndex: number;
    photoDataUrl?: string;
  } = {
    ownerId: uid,
    noPeserta: String(student.noPeserta ?? '').slice(0, 64),
    name: String(student.name ?? '').trim().slice(0, 120) || 'Peserta',
    nisn: String(student.nisn ?? '').slice(0, 32),
    kelas: String(student.kelas ?? '').slice(0, 32),
    ruang: Math.min(200, Math.max(1, Math.round(Number(student.ruang) || 1))),
    orderIndex: Math.min(10000, Math.max(0, Math.round(orderIndex))),
  };

  if (
    typeof student.photoDataUrl === 'string' &&
    student.photoDataUrl.length > 0 &&
    student.photoDataUrl.length <= MAX_STUDENT_PHOTO_CHARS
  ) {
    base.photoDataUrl = student.photoDataUrl;
  }

  return { id: safeId, data: base };
}

export function workspaceSignature(state: ExamAppState): string {
  return JSON.stringify(buildWorkspaceFields(state));
}

export function studentsSignature(students: Student[], uid: string): string {
  return JSON.stringify(
    students.map((st, idx) => normalizeStudentForFirestore(st, uid, idx))
  );
}

export interface WorkspaceSnapshotPayload {
  exists: boolean;
  hasPendingWrites: boolean;
  workspaceFields?: ReturnType<typeof buildWorkspaceFields>;
}

export interface StudentsSnapshotPayload {
  hasPendingWrites: boolean;
  students: Student[];
  existingIds: Set<string>;
}

export function subscribeWorkspace(
  uid: string,
  onUpdate: (payload: WorkspaceSnapshotPayload) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `workspaces/${uid}`;
  const workspaceRef = doc(db, 'workspaces', uid);

  return onSnapshot(
    workspaceRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate({
          exists: false,
          hasPendingWrites: snap.metadata.hasPendingWrites,
        });
        return;
      }

      const raw = snap.data();
      onUpdate({
        exists: true,
        hasPendingWrites: snap.metadata.hasPendingWrites,
        workspaceFields: {
          school: raw.school as SchoolIdentity,
          committee: (raw.committee as CommitteeMember[]) || [],
          supervisors: (raw.supervisors as Supervisor[]) || [],
          tracks: (raw.tracks as string[]) || ['UMUM'],
          examDays: (raw.examDays as ExamDay[]) || [],
          supervisorSchedule: (raw.supervisorSchedule as SupervisorScheduleMap) || {},
          rules: (raw.rules as ExamRule[]) || [],
          proposal: sanitizeProposalForFirestore(raw.proposal as ExamProposal | undefined),
        },
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export function subscribeStudents(
  uid: string,
  onUpdate: (payload: StudentsSnapshotPayload) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const path = `workspaces/${uid}/students`;
  const q = query(collection(db, 'workspaces', uid, 'students'), where('ownerId', '==', uid));

  return onSnapshot(
    q,
    (snap) => {
      const existingIds = new Set<string>();
      const rows: { orderIndex: number; student: Student }[] = [];

      snap.forEach((docSnap) => {
        const d = docSnap.data();
        existingIds.add(docSnap.id);
        rows.push({
          orderIndex: typeof d.orderIndex === 'number' ? d.orderIndex : 0,
          student: {
            id: docSnap.id,
            noPeserta: String(d.noPeserta ?? ''),
            name: String(d.name ?? ''),
            nisn: String(d.nisn ?? ''),
            kelas: String(d.kelas ?? ''),
            ruang: Number(d.ruang) || 1,
            ...(typeof d.photoDataUrl === 'string' && d.photoDataUrl.length > 0
              ? { photoDataUrl: d.photoDataUrl }
              : {}),
          },
        });
      });

      rows.sort((a, b) => a.orderIndex - b.orderIndex || a.student.id.localeCompare(b.student.id));

      onUpdate({
        hasPendingWrites: snap.metadata.hasPendingWrites,
        students: rows.map((r) => r.student),
        existingIds,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function ensureWorkspaceCreated(uid: string, state: ExamAppState): Promise<void> {
  const path = `workspaces/${uid}`;
  const workspaceRef = doc(db, 'workspaces', uid);

  try {
    const existing = await getDoc(workspaceRef);
    if (existing.exists()) return;

    const fields = buildWorkspaceFields(state);
    await setDoc(workspaceRef, {
      ownerId: uid,
      ...fields,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveWorkspaceFields(uid: string, state: ExamAppState): Promise<void> {
  const path = `workspaces/${uid}`;
  const workspaceRef = doc(db, 'workspaces', uid);
  const fields = buildWorkspaceFields(state);

  try {
    await updateDoc(workspaceRef, {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncStudentsCollection(
  uid: string,
  nextStudents: Student[],
  knownExistingIds: Set<string>,
  prevStudents: Student[]
): Promise<Set<string>> {
  const basePath = `workspaces/${uid}/students`;
  const normalizedList = nextStudents.map((st, idx) =>
    normalizeStudentForFirestore(st, uid, idx)
  );
  const nextIdSet = new Set(normalizedList.map((item) => item.id));

  const prevNormalizedMap = new Map<
    string,
    { raw: Student; data: ReturnType<typeof normalizeStudentForFirestore>['data'] }
  >();
  prevStudents.forEach((st, idx) => {
    const norm = normalizeStudentForFirestore(st, uid, idx);
    prevNormalizedMap.set(norm.id, { raw: st, data: norm.data });
  });

  type BatchOp =
    | { type: 'create'; id: string; data: ReturnType<typeof normalizeStudentForFirestore>['data'] }
    | {
        type: 'update';
        id: string;
        data: ReturnType<typeof normalizeStudentForFirestore>['data'];
        removePhoto: boolean;
      }
    | { type: 'delete'; id: string };

  const ops: BatchOp[] = [];

  for (const item of normalizedList) {
    const existsInCloud = knownExistingIds.has(item.id);
    if (!existsInCloud) {
      ops.push({ type: 'create', id: item.id, data: item.data });
      continue;
    }

    const prevEntry = prevNormalizedMap.get(item.id);

    if (!prevEntry || JSON.stringify(prevEntry.data) !== JSON.stringify(item.data)) {
      const hadPhoto = Boolean(prevEntry?.raw.photoDataUrl);
      const hasPhotoNow = Boolean(item.data.photoDataUrl);
      ops.push({
        type: 'update',
        id: item.id,
        data: item.data,
        removePhoto: hadPhoto && !hasPhotoNow,
      });
    }
  }

  for (const oldId of knownExistingIds) {
    if (!nextIdSet.has(oldId)) {
      ops.push({ type: 'delete', id: oldId });
    }
  }

  if (ops.length === 0) return nextIdSet;

  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const op of chunk) {
      const ref = doc(db, 'workspaces', uid, 'students', op.id);
      if (op.type === 'create') {
        batch.set(ref, {
          ...op.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else if (op.type === 'update') {
        const updatePayload: Record<string, unknown> = {
          noPeserta: op.data.noPeserta,
          name: op.data.name,
          nisn: op.data.nisn,
          kelas: op.data.kelas,
          ruang: op.data.ruang,
          orderIndex: op.data.orderIndex,
          updatedAt: serverTimestamp(),
        };
        if (op.data.photoDataUrl) {
          updatePayload.photoDataUrl = op.data.photoDataUrl;
        } else if (op.removePhoto) {
          updatePayload.photoDataUrl = deleteField();
        }
        batch.update(ref, updatePayload);
      } else {
        batch.delete(ref);
      }
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, basePath);
    }
  }

  return nextIdSet;
}
