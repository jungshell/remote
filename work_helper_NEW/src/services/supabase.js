import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.warn('Supabase: VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 없습니다. 지식 파일 업로드(원문 보기)가 동작하지 않습니다.');
}

const KNOWLEDGE_BUCKET = 'knowledge';

/**
 * 지식 문서 파일(PDF 등)을 Supabase Storage에 업로드하고 공개 URL 반환
 * @param {Blob} blob - 업로드할 파일 Blob
 * @param {string} fileName - 파일명 (경로에 사용)
 * @returns {Promise<string|null>} 공개 URL 또는 실패 시 null
 */
export const uploadKnowledgeFile = async (blob, fileName) => {
    if (!supabase) return null;
    try {
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
        const path = `${Date.now()}_${safeName}`;

        const { error } = await supabase.storage
            .from(KNOWLEDGE_BUCKET)
            .upload(path, blob, {
                contentType: blob.type || 'application/pdf',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return null;
        }

        const { data: urlData } = supabase.storage
            .from(KNOWLEDGE_BUCKET)
            .getPublicUrl(path);

        return urlData?.publicUrl || null;
    } catch (e) {
        console.error('Error uploading knowledge file to Supabase:', e);
        return null;
    }
};

export { supabase };
