import * as pdfjs from 'pdfjs-dist';

// Use a specific version for the worker to avoid version mismatch issues
const PDFJS_VERSION = '4.0.379';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = (textContent.items as any[])
                .map((item) => item.str)
                .join(' ');

            if (pageText.trim()) {
                fullText += `[PAGE ${i}]\n${pageText}\n\n`;
            }
        }

        return fullText.trim();
    } catch (error) {
        console.error("Neural Extraction Failure:", error);
        return "";
    }
};
