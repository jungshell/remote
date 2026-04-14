import * as pdfjsLib from 'pdfjs-dist';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const extractTextFromPdf = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        const pageTexts = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            
            // Clean up whitespace
            const cleanedText = pageText.replace(/\s+/g, ' ').trim();
            
            if (cleanedText.length > 0) {
                pageTexts.push({
                    page: i,
                    text: cleanedText
                });
                fullText += cleanedText + '\n\n';
            }
        }

        return {
            fullText,
            pages: pageTexts,
            pageCount: pdf.numPages
        };
    } catch (error) {
        console.error("PDF Parsing Error:", error);
        throw new Error("PDF 파일을 읽는 중 오류가 발생했습니다.");
    }
};

/**
 * 규정·지침 문서를 조문(제○조) 단위로 분할합니다.
 * 한 청크 = 한 조문이 되어 검색 시 해당 조문 전체가 검색되도록 합니다.
 * @param {string} fullText
 * @returns {{ content: string, articleLabel?: string }[]}
 */
export const splitByArticle = (fullText) => {
    if (!fullText || !fullText.trim()) return [];
    const text = fullText.trim();
    // 제1조, 제 1 조, 제1조의2 등
    const pattern = /(?=제\s*\d+\s*조(?:\의\s*\d+)?)/g;
    const parts = text.split(pattern);
    const chunks = [];
    for (let i = 0; i < parts.length; i++) {
        const content = parts[i].trim();
        if (content.length < 5) continue;
        const match = content.match(/^(제\s*\d+\s*조(?:\의\s*\d+)?)/);
        chunks.push({
            content,
            articleLabel: match ? match[1].replace(/\s/g, '') : null
        });
    }
    return chunks.length > 0 ? chunks : [{ content: text, articleLabel: null }];
};

/** 문서가 조문 형식(제○조)을 포함하는지 여부 */
export const hasArticleStructure = (text) => /제\s*\d+\s*조/.test(text || '');

export const chunkText = (text, chunkSize = 500, overlap = 100) => {
    const chunks = [];
    let currentChunk = '';
    
    // Split by sentences (rough approximation)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize) {
            chunks.push(currentChunk.trim());
            // Start new chunk with overlap
            currentChunk = currentChunk.slice(-overlap) + sentence;
        } else {
            currentChunk += sentence;
        }
    }
    
    if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
};
