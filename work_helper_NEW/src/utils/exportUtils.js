/**
 * Utility to download text content as a file
 * @param {string} text - The content to export
 * @param {string} filename - Desired filename (default: draft.txt)
 */
export const downloadAsFile = (text, filename = 'draft.txt') => {
    try {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = filename;

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up memory
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to download file:", error);
    }
};

/**
 * Generates a clean filename based on a snippet of text
 * @param {string} text - The first part of the message
 * @returns {string} - Formatted filename
 */
export const suggestFilename = (text) => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const summary = text.slice(0, 15).replace(/[^\w\s가-힣]/gi, '').trim();
    return `충콘지니_${summary || '문서초안'}_${timestamp}.txt`;
};
