import * as pdfjs from 'pdfjs-dist';

// Use a specific version for the worker to match package.json
const PDFJS_VERSION = '5.4.530';
// unpkg usually supports the modern .mjs worker for PDF.js v5+
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export const extractTextFromPdf = async (arrayBuffer: ArrayBuffer, startPage?: number, endPage?: number): Promise<string> => {
    try {
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        const start = startPage || 1;
        const end = Math.min(endPage || pdf.numPages, pdf.numPages);

        for (let i = start; i <= end; i++) {
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

export const renderPageToImage = async (arrayBuffer: ArrayBuffer, pageNumber: number = 1): Promise<string> => {
    try {
        console.log("🎬 Initiating Neural Rendering Fallback...");
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageNumber);
        console.log("📄 Page loaded for rendering");

        const viewport = page.getViewport({ scale: 2.0 }); // Increased scale for better visual analysis
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (!context) throw new Error("Canvas context construction failed.");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        console.log(`🎨 Rendering page to canvas: ${canvas.width}x${canvas.height}`);
        await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas
        } as any).promise;

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        console.log("✅ Rendering complete. Base64 snapshot generated.");
        return dataUrl;
    } catch (error) {
        console.error("❌ Neural Rendering Failure:", error);
        return "";
    }
};
export const renderMultiplePagesToImages = async (arrayBuffer: ArrayBuffer, maxPages: number = 3): Promise<string[]> => {
    try {
        console.log(`🎬 Initiating Neural Rendering for up to ${maxPages} pages...`);
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer.slice(0) });
        const pdf = await loadingTask.promise;
        const pagesToRender = Math.min(pdf.numPages, maxPages);
        const images: string[] = [];

        for (let i = 1; i <= pagesToRender; i++) {
            console.log(`📄 Rendering Page ${i}/${pagesToRender}...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (context) {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas
                } as any).promise;
                images.push(canvas.toDataURL('image/jpeg', 0.85));
            }
        }

        console.log(`✅ Multi-page rendering complete. Generated ${images.length} snapshots.`);
        return images;
    } catch (error) {
        console.error("❌ Multi-page Rendering Failure:", error);
        return [];
    }
};
