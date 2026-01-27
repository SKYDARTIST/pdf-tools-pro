import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker - using local bundle for Capacitor stability
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const extractTextFromPdf = async (arrayBuffer: ArrayBuffer, startPage?: number, endPage?: number, onProgress?: (percent: number) => void): Promise<string> => {
    try {
        const data = new Uint8Array(arrayBuffer.slice(0));
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        let fullText = '';

        const start = startPage || 1;
        const end = Math.min(endPage || pdf.numPages, pdf.numPages);
        const totalToProcess = end - start + 1;

        for (let i = start; i <= end; i++) {
            if (onProgress) {
                // Calculate percentage (0-100)
                const percent = Math.round(((i - start) / totalToProcess) * 100);
                onProgress(percent);
            }

            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            let lastY: number | null = null;
            let pageText = '';

            // Sorted by transform[5] (Y coordinate) descending, then transform[4] (X)
            const items = textContent.items as any[];

            for (const item of items) {
                const currentY = item.transform[5];

                if (lastY !== null && Math.abs(currentY - lastY) > 2) {
                    pageText += '\n';
                } else if (lastY !== null) {
                    pageText += ' ';
                }

                pageText += item.str;
                lastY = currentY;
            }

            if (pageText.trim()) {
                fullText += `[PAGE ${i}]\n${pageText}\n\n`;
            }
        }

        if (onProgress) onProgress(100);
        return fullText.trim();
    } catch (error) {
        console.error("Neural Extraction Failure:", error);
        return "";
    }
};

export const renderPageToImage = async (arrayBuffer: ArrayBuffer, pageNumber: number = 1): Promise<string> => {
    try {
        console.log("🎬 Initiating Neural Rendering Fallback...");
        const data = new Uint8Array(arrayBuffer.slice(0));
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageNumber);
        console.log("📄 Page loaded for rendering");

        const viewport = page.getViewport({ scale: 0.8 }); // Further reduced for maximum split speed
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

        const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // Reduced quality for 40% smaller size and faster export
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
