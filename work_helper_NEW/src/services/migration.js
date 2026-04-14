import { db } from './firebase';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import knowledgeData from '../data/knowledge.json';

export const migrateKnowledgeBase = async () => {
    if (!db) {
        console.error("Database not initialized");
        return { success: false, message: "Database not initialized" };
    }

    try {
        // 1. Check if data already exists to prevent duplicate migration (optional, but good safety)
        const knowledgeCollection = collection(db, 'knowledge');
        const snapshot = await getDocs(knowledgeCollection);
        
        if (!snapshot.empty) {
            const confirm = window.confirm(`이미 ${snapshot.size}개의 데이터가 존재합니다. 덮어쓰거나 추가하시겠습니까?`);
            if (!confirm) return { success: false, message: "Migration cancelled by user" };
        }

        console.log(`Starting migration of ${knowledgeData.length} items...`);
        
        // 2. Process in batches
        const BATCH_SIZE = 400;
        let batchCount = 0;
        let totalProcessed = 0;
        
        for (let i = 0; i < knowledgeData.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = knowledgeData.slice(i, i + BATCH_SIZE);
            
            chunk.forEach((item) => {
                // Use item.id as the document ID if unique, otherwise let Firestore generate one or generate a deterministic one
                // The current knowledge.json has 'id' field like "eNaRaDoUm.pdf-p1-0" which seems unique enough.
                const docRef = doc(knowledgeCollection, item.id); 
                batch.set(docRef, {
                    ...item,
                    migratedAt: new Date().toISOString()
                });
            });

            await batch.commit();
            batchCount++;
            totalProcessed += chunk.length;
            console.log(`Batch ${batchCount} committed. Processed ${totalProcessed}/${knowledgeData.length}`);
        }

        return { success: true, count: totalProcessed, message: "Migration completed successfully" };

    } catch (error) {
        console.error("Migration failed:", error);
        return { success: false, error: error.message };
    }
};
