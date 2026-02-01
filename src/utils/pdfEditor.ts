import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker - pinned versioned local file
pdfjs.GlobalWorkerOptions.workerSrc = window.location.origin + '/pdf.worker.v5.4.296.min.mjs';

export const replaceTextInPdf = async (
    arrayBuffer: ArrayBuffer,
    searchText: string,
    replacementText: string
): Promise<Uint8Array | null> => {
    try {
        // Create a copy of the buffer to avoid detachment issues
        const bufferCopy = arrayBuffer.slice(0);

        const pdfDoc = await PDFDocument.load(bufferCopy);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Initialize PDF.js for coordinate finding
        const loadingTask = pdfjs.getDocument({ data: bufferCopy });
        const pdf = await loadingTask.promise;

        let totalReplacements = 0;

        // Iterate through every page in the document
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const pdfPage = await pdf.getPage(i + 1);
            const textContent = await pdfPage.getTextContent();

            // Search for ALL items that contain the search text on this page
            const matchingItems = textContent.items.filter((item: any) => {
                const str = (item.str || "").toLowerCase().trim();
                const search = searchText.toLowerCase().trim();
                return str.includes(search);
            });

            for (const item of matchingItems) {
                const textItem = item as any;
                const [x, y] = [textItem.transform[4], textItem.transform[5]];

                // 2. Redact
                page.drawRectangle({
                    x: x,
                    y: y,
                    width: textItem.width,
                    height: textItem.height || 14, // Slightly larger for better coverage
                    color: rgb(1, 1, 1), // White
                });

                // 3. Draw new text
                page.drawText(replacementText, {
                    x: x,
                    y: y,
                    size: textItem.transform[0] || 12,
                    font: font,
                    color: rgb(0, 0, 0), // Black
                });
                totalReplacements++;
            }
        }

        if (totalReplacements === 0) {
            console.warn("No occurrences found for replacement:", searchText);
            return null;
        }

        console.log(`Neural Injection Complete: ${totalReplacements} occurrences synchronized.`);
        return await pdfDoc.save();
    } catch (error) {
        console.error("Neural Universal Replace Failure:", error);
        return null;
    }
};
