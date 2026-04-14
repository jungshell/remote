import { parse } from 'hwp.js';

/**
 * Extracts text from an HWP file.
 * @param {File} file 
 * @returns {Promise<{fullText: string}>}
 */
export const extractTextFromHwp = async (file) => {
    try {
        console.log("Starting HWP parsing...", file.name);
        const buffer = await file.arrayBuffer();
        const hwpDoc = parse(buffer);

        if (!hwpDoc) {
            throw new Error("HWP parsing returned empty result");
        }

        let fullText = '';

        // hwp.js: HWPDocument.sections[] -> Section.content[] (Paragraph[]) -> Paragraph.content[] (HWPChar[]) -> char.value
        if (hwpDoc.sections) {
            hwpDoc.sections.forEach(section => {
                const paragraphs = section.content || section.paragraphs || [];
                paragraphs.forEach(paragraph => {
                    const chars = paragraph.content || paragraph.text || [];
                    (Array.isArray(chars) ? chars : []).forEach(charItem => {
                        const v = charItem?.value ?? charItem?.content;
                        if (typeof v === 'string') fullText += v;
                    });
                    fullText += '\n';
                });
            });
        }

        // Cleanup whitespace
        fullText = fullText.replace(/\n\s*\n/g, '\n\n').trim();

        if (!fullText) {
            return { fullText: "HWP 파일에서 텍스트를 추출하지 못했습니다. (이미지 위주의 문서이거나 암호화된 문서일 수 있습니다)" };
        }

        return { fullText };
    } catch (error) {
        console.error("HWP Parsing Error:", error);
        // Fallback message so the UI doesn't break
        return { fullText: `HWP 변환 실패: ${error.message}. (PDF로 변환하여 업로드해주세요)` };
    }
};
