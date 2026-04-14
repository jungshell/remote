import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Cache for embeddings to avoid re-fetching same queries
const embeddingCache = new Map();

// Gemini embedding-001 권장 입력 길이 제한 (초과 시 잘라서 사용)
const EMBEDDING_MAX_CHARS = 6000;

/**
 * Generates an embedding vector for the given text.
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
export const getEmbedding = async (text) => {
    if (!text || !text.trim()) return [];
    const toEmbed = text.length > EMBEDDING_MAX_CHARS ? text.slice(0, EMBEDDING_MAX_CHARS) : text;

    // Check cache first (원문 기준)
    if (embeddingCache.has(text)) {
        return embeddingCache.get(text);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "embedding-001" });
        const result = await model.embedContent(toEmbed);
        const embedding = result.embedding.values;
        
        // Cache result (limit cache size if needed, simple map for now)
        if (embeddingCache.size > 100) {
            const firstKey = embeddingCache.keys().next().value;
            embeddingCache.delete(firstKey);
        }
        embeddingCache.set(text, embedding);

        return Array.isArray(embedding) ? embedding : [...embedding];
    } catch (error) {
        console.error("Embedding Error:", error);
        return [];
    }
};

/**
 * Calculates Cosine Similarity between two vectors.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} -1 to 1
 */
export const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
