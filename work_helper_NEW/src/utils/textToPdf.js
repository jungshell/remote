/**
 * 텍스트를 PDF로 변환하여 Blob 반환 (HWP 등 추출 텍스트 → PDF 저장/열기용)
 * jspdf 기본 폰트는 한글 지원이 제한적일 수 있음. 필요 시 addFont로 한글 폰트 추가 가능.
 */
import { jsPDF } from 'jspdf';

const MARGIN = 20;
const LINE_HEIGHT = 7;
const FONT_SIZE = 10;

export async function textToPdfBlob(fullText, title = '문서') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - MARGIN * 2;
    let y = MARGIN;

    doc.setFontSize(FONT_SIZE);

    const lines = fullText.split(/\n/).filter((l) => l.trim().length > 0);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const wrapped = doc.splitTextToSize(line || '', maxWidth);
        for (const part of wrapped) {
            if (y + LINE_HEIGHT > pageHeight - MARGIN) {
                doc.addPage();
                y = MARGIN;
            }
            doc.text(part, MARGIN, y);
            y += LINE_HEIGHT;
        }
        if (y + LINE_HEIGHT > pageHeight - MARGIN) {
            doc.addPage();
            y = MARGIN;
        }
    }

    return doc.output('blob');
}
