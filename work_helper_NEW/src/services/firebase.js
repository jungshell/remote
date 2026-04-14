import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, getDocs, doc, writeBatch, serverTimestamp, setDoc, where, limit, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase (실패 시 auth/db 등이 null이 되어 앱이 흰 화면으로 크래시하지 않음)
let app = null;
let db = null;
let storage = null;
let auth = null;
let googleProvider = null;

if (!firebaseConfig.apiKey) {
    console.warn("Firebase API Key is missing. .env에 VITE_FIREBASE_API_KEY를 설정해 주세요.");
}

try {
    if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        googleProvider = new GoogleAuthProvider();
    }
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

export { db, storage, auth, googleProvider };

export const sendMessageToFirestore = async (message, sessionId = 'default') => {
    if (!db) return;
    try {
        await addDoc(collection(db, 'sessions', sessionId, 'messages'), {
            ...message,
            timestamp: serverTimestamp()
        });

        // Update session last updated time
        await setDoc(doc(db, 'sessions', sessionId), {
            lastUpdated: serverTimestamp(),
            lastMessage: message.text.substring(0, 30) + (message.text.length > 30 ? '...' : '')
        }, { merge: true });
    } catch (e) {
        console.error("Error adding document: ", e);
    }
};

export const subscribeToMessages = (sessionId, callback) => {
    if (!db) return () => { };
    const q = query(
        collection(db, 'sessions', sessionId, 'messages'),
        orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    }, (error) => {
        console.error("Firestore Listener Error:", error);
    });
};

export const createSession = async (title = '새 대화', category = 'general', userId = null) => {
    if (!db) return null;
    try {
        const sessionRef = doc(collection(db, 'sessions'));
        const sessionData = {
            title,
            category,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
        };
        if (userId) {
            sessionData.userId = userId;
        }
        await setDoc(sessionRef, sessionData);
        return sessionRef.id;
    } catch (e) {
        console.error("Error creating session:", e);
        return null;
    }
};

export const subscribeToSessions = (callback, userId = null) => {
    if (!db) return () => { };
    
    let q;
    if (userId) {
        // To avoid composite index requirement immediately, filter by userId only
        // and sort client-side, OR use simple query if no sort
        q = query(collection(db, 'sessions'), where('userId', '==', userId));
    } else {
        // Fallback for backward compatibility or admin view (all sessions)
        q = query(collection(db, 'sessions'), orderBy('lastUpdated', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort client-side to ensure correct order
        sessions.sort((a, b) => {
            const dateA = a.lastUpdated?.toDate ? a.lastUpdated.toDate() : new Date(0);
            const dateB = b.lastUpdated?.toDate ? b.lastUpdated.toDate() : new Date(0);
            return dateB - dateA;
        });
        callback(sessions);
    });
};

export const clearAllMessages = async (sessionId) => {
    if (!db || !sessionId) return;
    try {
        const q = query(collection(db, 'sessions', sessionId, 'messages'));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
            batch.delete(d.ref);
        });
        await batch.commit();
    } catch (e) {
        console.error("Error clearing messages: ", e);
    }
};

export const updateMessageFeedback = async (sessionId, messageId, feedback) => {
    if (!db || !sessionId || !messageId) return;
    try {
        await setDoc(doc(db, 'sessions', sessionId, 'messages', messageId), {
            feedback: feedback // 'helpful' or 'unhelpful'
        }, { merge: true });
    } catch (e) {
        console.error("Error updating feedback:", e);
    }
};

// 오답 신고 (정확도 향상: 피드백 수집)
export const submitAnswerReport = async ({ sessionId, messageId, question, answerSnippet, comment = '' }) => {
    if (!db) return;
    try {
        await addDoc(collection(db, 'answer_reports'), {
            sessionId,
            messageId,
            question: question?.substring(0, 500) || '',
            answerSnippet: answerSnippet?.substring(0, 2000) || '',
            comment: comment?.substring(0, 500) || '',
            status: 'pending',
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error submitting answer report:", e);
    }
};

// Submit a wiki edit suggestion
export const submitWikiEdit = async ({ sessionId, messageId, originalText, suggestedText, metadata, category = 'all' }) => {
    if (!db) return;
    try {
        await addDoc(collection(db, 'wiki_edits'), {
            sessionId,
            messageId,
            originalText,
            suggestedText,
            metadata: metadata || null,
            category,
            status: 'pending',
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error submitting wiki edit:", e);
    }
};

// Fetch approved wiki edits (to overlay KB)
export const fetchApprovedWikiEdits = async (category = 'all') => {
    if (!db) return [];
    try {
        const baseQuery = query(collection(db, 'wiki_edits'), where('status', '==', 'approved'));
        const snapshot = await getDocs(baseQuery);
        const edits = snapshot.docs.map(d => d.data());
        return category === 'all' ? edits : edits.filter(e => e.category === category);
    } catch (e) {
        console.error("Error fetching approved wiki edits:", e);
        return [];
    }
};

// --- Admin Features ---

export const subscribeToAnswerReports = (callback, onError) => {
    if (!db) return () => {};
    const q = query(
        collection(db, 'answer_reports'),
        where('status', '==', 'pending')
    );
    return onSnapshot(q, (snapshot) => {
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        reports.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        callback(reports);
    }, (error) => {
        if (onError) onError(error);
    });
};

export const updateAnswerReportStatus = async (reportId, status) => {
    if (!db || !reportId) return;
    try {
        await updateDoc(doc(db, 'answer_reports', reportId), {
            status, // 'reviewed' | 'dismissed'
            reviewedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Error updating answer report status:", e);
    }
};

export const subscribeToPendingEdits = (callback, onError) => {
    if (!db) return () => {};
    // Note: To avoid "Missing Index" error on dev environment, 
    // we fetch all pending items and sort client-side.
    // Ideally, create a composite index on status + createdAt in Firebase Console.
    const q = query(
        collection(db, 'wiki_edits'),
        where('status', '==', 'pending')
        // orderBy('createdAt', 'desc') // Removed to prevent index error
    );
    return onSnapshot(q, (snapshot) => {
        const edits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory
        edits.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        callback(edits);
    }, (error) => {
        console.error("Admin Listener Error:", error);
        if (onError) onError(error);
    });
};

export const updateEditStatus = async (editId, status, editData = null) => {
    if (!db || !editId) return;
    try {
        const batch = writeBatch(db);
        
        // 1. Update status in wiki_edits
        const editRef = doc(db, 'wiki_edits', editId);
        batch.set(editRef, {
            status, // 'approved' or 'rejected'
            reviewedAt: serverTimestamp()
        }, { merge: true });

        // 2. If approved and data provided, add to knowledge base
        if (status === 'approved' && editData) {
            const knowledgeRef = doc(collection(db, 'knowledge'));
            batch.set(knowledgeRef, {
                id: knowledgeRef.id,
                source: editData.metadata?.source || 'wiki_contribution',
                category: editData.category || 'general',
                page: editData.metadata?.page || 0,
                content: editData.suggestedText,
                createdAt: serverTimestamp(),
                originEditId: editId
            });
        }

        await batch.commit();
    } catch (e) {
        console.error("Error updating edit status:", e);
    }
};

const FIRESTORE_BATCH_SIZE = 450; // Firestore writeBatch 한도 500건 이하로

export const addKnowledgeItems = async (items) => {
    if (!db) return { success: false, error: "Database not initialized" };
    if (!items || items.length === 0) return { success: false, error: "저장할 항목이 없습니다." };

    try {
        const collectionRef = collection(db, 'knowledge');
        let committed = 0;
        for (let i = 0; i < items.length; i += FIRESTORE_BATCH_SIZE) {
            const chunk = items.slice(i, i + FIRESTORE_BATCH_SIZE);
            const batch = writeBatch(db);
            chunk.forEach(item => {
                const docRef = doc(collectionRef);
                batch.set(docRef, {
                    ...item,
                    createdAt: serverTimestamp(),
                    source: item.source || 'manual_upload',
                    category: item.category || 'general'
                });
            });
            await batch.commit();
            committed += chunk.length;
        }
        return { success: true, count: committed };
    } catch (e) {
        console.error("Error adding knowledge items:", e);
        return { success: false, error: e.message };
    }
};

export const deleteKnowledgeItem = async (id) => {
    if (!db || !id) return { success: false, error: "Invalid ID" };
    try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'knowledge', id));
        await batch.commit();
        return { success: true };
    } catch (e) {
        console.error("Error deleting knowledge item:", e);
        return { success: false, error: e.message };
    }
};

export const updateKnowledgeItem = async (id, data) => {
    if (!db || !id) return { success: false, error: "Invalid ID" };
    try {
        const docRef = doc(db, 'knowledge', id);
        
        // Filter out undefined values to prevent Firestore errors
        const updateData = Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== undefined) acc[key] = value;
            return acc;
        }, {});

        await updateDoc(docRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
        return { success: true };
    } catch (e) {
        console.error("Error updating knowledge item:", e);
        return { success: false, error: e.message };
    }
};

export const subscribeToKnowledge = (callback) => {
    if (!db) return () => {};
    const q = query(collection(db, 'knowledge'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(items);
    }, (error) => {
        console.error("Knowledge Listener Error:", error);
    });
};

export const getQuestionLogs = async (limitCount = 50) => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, 'question_logs'),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching question logs:", e);
        // Fallback if index is missing or other error
        return [];
    }
};
