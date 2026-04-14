import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  type DocumentData,
  type QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import type { Task, Contact, Template, Alert, WorkLog } from '@/types/models';

// ===== Tasks (업무) =====
export const tasksCollection = collection(db, 'tasks');

/** ownerId가 있으면 해당 소유자 업무만, 없으면 전체 조회 (비로그인/레거시 호환) */
export async function getTasks(ownerId?: string | null): Promise<Task[]> {
  try {
    const q = ownerId
      ? query(tasksCollection, where('ownerId', '==', ownerId))
      : tasksCollection;
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueAt: data.dueAt?.toDate ? data.dueAt.toDate().toISOString() : data.dueAt,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Task;
    });
  } catch (error) {
    console.warn('Error fetching tasks:', error);
    return [];
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  const docRef = doc(db, 'tasks', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    dueAt: data.dueAt?.toDate ? data.dueAt.toDate().toISOString() : data.dueAt,
    receivedAt: data.receivedAt?.toDate ? data.receivedAt.toDate().toISOString() : data.receivedAt,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
  } as Task;
}

export async function createTask(task: Omit<Task, 'id'>): Promise<string> {
  const docRef = await addDoc(tasksCollection, {
    ...task,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const docRef = doc(db, 'tasks', id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

export async function deleteTask(id: string): Promise<void> {
  const docRef = doc(db, 'tasks', id);
  await deleteDoc(docRef);
}

// ===== Contacts (연락처) =====
export const contactsCollection = collection(db, 'contacts');

/** ownerId가 있으면 해당 소유자 연락처만, 없으면 전체 (비로그인/레거시 호환) */
export async function getContacts(ownerId?: string | null): Promise<Contact[]> {
  try {
    const q = ownerId
      ? query(contactsCollection, where('ownerId', '==', ownerId))
      : contactsCollection;
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contact));
  } catch (error) {
    console.warn('Error fetching contacts:', error);
    return [];
  }
}

export async function getContactById(id: string): Promise<Contact | null> {
  const docRef = doc(db, 'contacts', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Contact;
}

export async function createContact(contact: Omit<Contact, 'id'>): Promise<string> {
  const docRef = await addDoc(contactsCollection, {
    ...contact,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

export async function updateContact(id: string, updates: Partial<Omit<Contact, 'id'>>): Promise<void> {
  const docRef = doc(db, 'contacts', id);
  await updateDoc(docRef, updates);
}

export async function deleteContact(id: string): Promise<void> {
  const docRef = doc(db, 'contacts', id);
  await deleteDoc(docRef);
}

/** 특정 연락처(담당자) 기준 업무 조회. ownerId가 있으면 해당 소유자 업무만 */
export async function getTasksByContact(contactId: string, ownerId?: string | null): Promise<Task[]> {
  const all = await getTasks(ownerId ?? undefined);
  return all.filter((t) => t.assigneeId === contactId);
}

// ===== Templates (템플릿) =====
export const templatesCollection = collection(db, 'templates');

/** ownerId가 있으면 해당 소유자 템플릿만, 없으면 전체 */
export async function getTemplates(ownerId?: string | null): Promise<Template[]> {
  try {
    const q = ownerId
      ? query(templatesCollection, where('ownerId', '==', ownerId))
      : templatesCollection;
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Template));
  } catch (error) {
    console.warn('Error fetching templates:', error);
    return [];
  }
}

export async function createTemplate(template: Omit<Template, 'id'>): Promise<string> {
  const docRef = await addDoc(templatesCollection, {
    ...template,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

// ===== Alerts (알림) =====
export const alertsCollection = collection(db, 'alerts');

/** ownerId가 있으면 해당 소유자 알림만, 없으면 전체 */
export async function getAlerts(ownerId?: string | null): Promise<Alert[]> {
  try {
    const q = ownerId
      ? query(alertsCollection, where('ownerId', '==', ownerId))
      : alertsCollection;
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as Alert;
    }).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.warn('Error fetching alerts:', error);
    return [];
  }
}

export async function createAlert(alert: Omit<Alert, 'id'>): Promise<string> {
  const docRef = await addDoc(alertsCollection, {
    ...alert,
    createdAt: Timestamp.now()
  });
  return docRef.id;
}

// ===== Work logs (Meeting / PDF 등, SmartWork 통합) =====
export const workLogsCollection = collection(db, 'work_logs');

export async function getWorkLogs(
  ownerId: string | null | undefined,
  opts?: { mode?: string; source?: string }
): Promise<WorkLog[]> {
  if (!ownerId) return [];
  try {
    const q = query(workLogsCollection, where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    let list = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        created_at:
          data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
      } as WorkLog;
    });
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
  } catch (error) {
    console.warn('Error fetching work_logs:', error);
    return [];
  }
}

export async function createWorkLog(log: Omit<WorkLog, 'id'>): Promise<string> {
  const docRef = await addDoc(workLogsCollection, {
    ...log,
    created_at: Timestamp.now(),
  });
  return docRef.id;
}

export async function getWorkLogById(id: string, ownerId?: string | null): Promise<WorkLog | null> {
  const docRef = doc(db, 'work_logs', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (ownerId && data.ownerId !== ownerId) return null;
  return {
    id: snap.id,
    ...data,
    created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
  } as WorkLog;
}

export async function updateWorkLog(
  id: string,
  updates: Partial<Pick<WorkLog, 'analysis_json' | 'tags'>>
): Promise<void> {
  const docRef = doc(db, 'work_logs', id);
  await updateDoc(docRef, updates as Record<string, unknown>);
}

export async function deleteWorkLog(id: string): Promise<void> {
  const docRef = doc(db, 'work_logs', id);
  await deleteDoc(docRef);
}

export async function deleteWorkLogsByFilename(
  ownerId: string,
  sourceFilename: string
): Promise<void> {
  const q = query(
    workLogsCollection,
    where('ownerId', '==', ownerId),
    where('source_filename', '==', sourceFilename)
  );
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(d.ref);
  }
}

export async function deleteAllWorkLogs(ownerId: string): Promise<void> {
  const q = query(workLogsCollection, where('ownerId', '==', ownerId));
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await deleteDoc(d.ref);
  }
}
