/**
 * 서버 전용: Firebase Admin SDK로 Firestore 접근.
 * API 라우트에서 사용하며, 클라이언트 규칙(request.auth) 없이 쓰기가 가능합니다.
 */
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/verifyToken';
import type { Task, Contact, Alert, Template, WorkLog } from '@/types/models';

function getDb() {
  const app = getAdminApp();
  if (!app) {
    throw new Error(
      'Firebase Admin이 초기화되지 않았습니다. FIREBASE_SERVICE_ACCOUNT_JSON 또는 FIREBASE_PROJECT_ID+FIREBASE_CLIENT_EMAIL+FIREBASE_PRIVATE_KEY 환경 변수를 설정하세요.'
    );
  }
  return getFirestore(app);
}

function toTask(id: string, data: DocumentData): Task {
  const dueAt = data.dueAt;
  const receivedAt = data.receivedAt;
  const createdAt = data.createdAt;
  const updatedAt = data.updatedAt;
  return {
    id,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    ownerId: data.ownerId,
    assigneeId: data.assigneeId,
    assigner: data.assigner,
    dueAt: dueAt?.toDate ? dueAt.toDate().toISOString() : dueAt,
    receivedAt: receivedAt?.toDate ? receivedAt.toDate().toISOString() : receivedAt,
    calendarEventId: data.calendarEventId,
    createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
    updatedAt: updatedAt?.toDate ? updatedAt.toDate().toISOString() : updatedAt,
  } as Task;
}

function toFirestoreData(obj: Record<string, unknown>): DocumentData {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
      try {
        out[k] = Timestamp.fromDate(new Date(v));
      } catch {
        out[k] = v;
      }
    } else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = v as DocumentData;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function getTasks(ownerId?: string | null): Promise<Task[]> {
  const db = getDb();
  const col = db.collection('tasks');
  const snapshot = ownerId
    ? await col.where('ownerId', '==', ownerId).get()
    : await col.get();
  return snapshot.docs.map((d) => toTask(d.id, d.data()));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = getDb();
  const ref = db.collection('tasks').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return toTask(snap.id, snap.data()!);
}

export async function createTask(task: Omit<Task, 'id'>): Promise<string> {
  const db = getDb();
  const data = toFirestoreData(task as Record<string, unknown>);
  data.createdAt = Timestamp.now();
  data.updatedAt = Timestamp.now();
  const ref = await db.collection('tasks').add(data);
  return ref.id;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const db = getDb();
  const data = toFirestoreData(updates as Record<string, unknown>);
  data.updatedAt = Timestamp.now();
  await db.collection('tasks').doc(id).update(data);
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  await db.collection('tasks').doc(id).delete();
}

// ===== Contacts =====
export async function getContacts(ownerId?: string | null): Promise<Contact[]> {
  const db = getDb();
  const col = db.collection('contacts');
  const snapshot = ownerId
    ? await col.where('ownerId', '==', ownerId).get()
    : await col.get();
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Contact));
}

export async function getContactById(id: string): Promise<Contact | null> {
  const db = getDb();
  const snap = await db.collection('contacts').doc(id).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as Contact;
}

export async function createContact(contact: Omit<Contact, 'id'>): Promise<string> {
  const db = getDb();
  const data = toFirestoreData(contact as Record<string, unknown>);
  data.createdAt = Timestamp.now();
  const ref = await db.collection('contacts').add(data);
  return ref.id;
}

export async function updateContact(
  id: string,
  updates: Partial<Omit<Contact, 'id'>>
): Promise<void> {
  const db = getDb();
  const data = toFirestoreData(updates as Record<string, unknown>);
  await db.collection('contacts').doc(id).update(data);
}

export async function deleteContact(id: string): Promise<void> {
  const db = getDb();
  await db.collection('contacts').doc(id).delete();
}

export async function getTasksByContact(
  contactId: string,
  ownerId?: string | null
): Promise<Task[]> {
  const tasks = await getTasks(ownerId ?? undefined);
  return tasks.filter((t) => t.assigneeId === contactId);
}

// ===== Alerts =====
function toAlert(id: string, data: DocumentData): Alert {
  const createdAt = data.createdAt;
  return {
    id,
    type: data.type,
    message: data.message,
    taskId: data.taskId,
    isRead: data.isRead,
    ownerId: data.ownerId,
    createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
  } as Alert;
}

export async function getAlerts(ownerId?: string | null): Promise<Alert[]> {
  const db = getDb();
  const col = db.collection('alerts');
  const snapshot = ownerId
    ? await col.where('ownerId', '==', ownerId).get()
    : await col.get();
  const list = snapshot.docs.map((d) => toAlert(d.id, d.data()));
  list.sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
  return list;
}

export async function createAlert(alert: Omit<Alert, 'id'>): Promise<string> {
  const db = getDb();
  const data = toFirestoreData(alert as Record<string, unknown>);
  data.createdAt = Timestamp.now();
  const ref = await db.collection('alerts').add(data);
  return ref.id;
}

// ===== Templates =====
export async function getTemplates(ownerId?: string | null): Promise<Template[]> {
  const db = getDb();
  const col = db.collection('templates');
  const snapshot = ownerId
    ? await col.where('ownerId', '==', ownerId).get()
    : await col.get();
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    } as Template;
  });
}

export async function createTemplate(template: Omit<Template, 'id'>): Promise<string> {
  const db = getDb();
  const data = toFirestoreData(template as Record<string, unknown>);
  data.createdAt = Timestamp.now();
  const ref = await db.collection('templates').add(data);
  return ref.id;
}

// ===== Work logs =====
function toWorkLog(id: string, data: DocumentData): WorkLog {
  const created_at = data.created_at;
  return {
    id,
    ownerId: data.ownerId,
    content_text: data.content_text,
    analysis_json: (data.analysis_json as Record<string, unknown>) ?? {},
    tags: data.tags,
    importance: data.importance,
    version: data.version,
    mode: data.mode,
    source_type: data.source_type,
    source_filename: data.source_filename,
    created_at: created_at?.toDate ? created_at.toDate().toISOString() : created_at,
  } as WorkLog;
}

export async function getWorkLogs(
  ownerId: string | null | undefined,
  opts?: { mode?: string; source?: string }
): Promise<WorkLog[]> {
  if (!ownerId) return [];
  const db = getDb();
  const snapshot = await db.collection('work_logs').where('ownerId', '==', ownerId).get();
  let list = snapshot.docs.map((d) => toWorkLog(d.id, d.data()));
  list.sort((a, b) => {
    const at = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bt - at;
  });
  if (opts?.mode) {
    list = list.filter((l) => (l.analysis_json as Record<string, string>)?.['mode'] === opts.mode);
  }
  if (opts?.source) {
    list = list.filter(
      (l) => (l.analysis_json as Record<string, string>)?.['source_type'] === opts.source
    );
  }
  return list;
}

export async function getWorkLogById(
  id: string,
  ownerId?: string | null
): Promise<WorkLog | null> {
  const db = getDb();
  const snap = await db.collection('work_logs').doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (ownerId && data.ownerId !== ownerId) return null;
  return toWorkLog(snap.id, data);
}

export async function createWorkLog(log: Omit<WorkLog, 'id'>): Promise<string> {
  const db = getDb();
  const data = toFirestoreData(log as Record<string, unknown>);
  data.created_at = Timestamp.now();
  const ref = await db.collection('work_logs').add(data);
  return ref.id;
}

export async function updateWorkLog(
  id: string,
  updates: Partial<Pick<WorkLog, 'analysis_json' | 'tags'>>
): Promise<void> {
  const db = getDb();
  const data = toFirestoreData(updates as Record<string, unknown>);
  await db.collection('work_logs').doc(id).update(data);
}

export async function deleteWorkLog(id: string): Promise<void> {
  const db = getDb();
  await db.collection('work_logs').doc(id).delete();
}

export async function deleteWorkLogsByFilename(
  ownerId: string,
  sourceFilename: string
): Promise<void> {
  const db = getDb();
  const snapshot = await db
    .collection('work_logs')
    .where('ownerId', '==', ownerId)
    .where('source_filename', '==', sourceFilename)
    .get();
  for (const d of snapshot.docs) {
    await d.ref.delete();
  }
}

export async function deleteAllWorkLogs(ownerId: string): Promise<void> {
  const db = getDb();
  const snapshot = await db.collection('work_logs').where('ownerId', '==', ownerId).get();
  for (const d of snapshot.docs) {
    await d.ref.delete();
  }
}
