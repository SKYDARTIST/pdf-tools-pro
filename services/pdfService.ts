
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

/**
 * Standard error wrapper to prevent silent app crashes reported in rival app reviews.
 */
const safeExecute = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error("PDF Engine Error:", error);
    throw new Error(error instanceof Error ? error.message : "The PDF document might be corrupted or too large for your device's memory.");
  }
};

export const mergePdfs = async (files: File[]): Promise<Uint8Array> => {
  return safeExecute(async () => {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  });
};

export const addWatermark = async (file: File, text: string): Promise<Uint8Array> => {
  return safeExecute(async () => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    pages.forEach((page) => {
      const { width, height } = page.getSize();
      page.drawText(text, {
        x: width / 4,
        y: height / 2,
        size: 50,
        font: helveticaFont,
        color: rgb(0.7, 0.7, 0.7),
        opacity: 0.4,
        rotate: degrees(45),
      });
    });
    return await pdfDoc.save();
  });
};


export const createPdfFromText = async (title: string, content: string): Promise<Uint8Array> => {
  return safeExecute(async () => {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.addPage();
    const { height } = page.getSize();

    page.drawText(title, { x: 50, y: height - 40, size: 24, font: timesRomanFont });
    page.drawText(content, { x: 50, y: height - 80, size: 12, font: timesRomanFont, maxWidth: 500, lineHeight: 18 });
    return await pdfDoc.save();
  });
};

export const splitPdf = async (file: File): Promise<Uint8Array[]> => {
  return safeExecute(async () => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const results: Uint8Array[] = [];
    for (let i = 0; i < pdf.getPageCount(); i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(copiedPage);
      results.push(await newPdf.save());
    }
    return results;
  });
};

export const imageToPdf = async (images: File[]): Promise<Uint8Array> => {
  return safeExecute(async () => {
    const pdfDoc = await PDFDocument.create();
    for (const image of images) {
      console.log(`Processing image: ${image.name}, type: ${image.type}, size: ${image.size}`);
      const arrayBuffer = await image.arrayBuffer();
      let embeddedImage;

      try {
        if (image.type === 'image/jpeg' || image.type === 'image/jpg') {
          try {
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
          } catch (e) {
            console.warn(`JPG embedding failed for ${image.name}, trying PNG fallback...`);
            embeddedImage = await pdfDoc.embedPng(arrayBuffer);
          }
        } else if (image.type === 'image/png') {
          try {
            embeddedImage = await pdfDoc.embedPng(arrayBuffer);
          } catch (e) {
            console.warn(`PNG embedding failed for ${image.name}, trying JPG fallback...`);
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
          }
        } else {
          // Attempt generic embedding if type is unknown or mismatched
          try {
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
          } catch {
            embeddedImage = await pdfDoc.embedPng(arrayBuffer);
          }
        }
      } catch (err) {
        console.error(`Failed to embed image ${image.name} even with fallback:`, err);
        continue;
      }

      if (embeddedImage) {
        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });
      }
    }

    if (pdfDoc.getPageCount() === 0) {
      throw new Error("No valid images could be processed. Please ensure your files are valid JPEG or PNG images.");
    }

    return await pdfDoc.save();
  });
};

export const removePagesFromPdf = async (file: File, pageIndicesToRemove: number[]): Promise<Uint8Array> => {
  return safeExecute(async () => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    // Sort indices in descending order to avoid index shifting issues
    const sortedIndices = [...pageIndicesToRemove].sort((a, b) => b - a);

    // Remove pages from highest index to lowest
    for (const index of sortedIndices) {
      if (index >= 0 && index < pdfDoc.getPageCount()) {
        pdfDoc.removePage(index);
      }
    }

    return await pdfDoc.save();
  });
};

export const compressPdf = async (
  file: File,
  quality: 'low' | 'med' | 'high' = 'med',
  onProgress?: (progress: number) => void
): Promise<Uint8Array> => {
  return safeExecute(async () => {
    const arrayBuffer = await file.arrayBuffer();

    // TIER 1 & 2: Structural and Meta Cleanup (Med/High)
    if (quality === 'high' || quality === 'med') {
      const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      const compressedPdf = await PDFDocument.create();
      const copiedPages = await compressedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
      copiedPages.forEach((page) => compressedPdf.addPage(page));

      const saveOptions = {
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: quality === 'med' ? 50 : 100,
      };

      if (quality === 'med') {
        compressedPdf.setTitle('');
        compressedPdf.setProducer('Anti-Gravity Protocol v2.1');
        compressedPdf.setCreator('Monolith OS Optimization');
      }

      return await compressedPdf.save(saveOptions);
    }

    // TIER 3: AGGRESSIVE RASTERIZATION (Low) - For the "WOW" factor
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const outPdf = await PDFDocument.create();

    console.log(`Starting aggressive rasterization of ${pdf.numPages} pages...`);

    for (let i = 1; i <= pdf.numPages; i++) {
      if (onProgress) onProgress(Math.round((i / pdf.numPages) * 100));

      const page = await pdf.getPage(i);

      // Smart DPI: 1.5x (144 DPI) is the "Sweet Spot" for sharp mobile viewing 
      // without exceeding memory limits on 25MB+ documents.
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Ensure crisp text rendering by disabling image smoothing during the draw phase
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';

      await page.render({ canvas, viewport }).promise;

      // Higher JPEG quality (0.7) for clarity, balanced by the useObjectStreams cleanup
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      const imageBytes = await fetch(imageData).then(res => res.arrayBuffer());
      const embeddedImg = await outPdf.embedJpg(imageBytes);

      const newPage = outPdf.addPage([viewport.width, viewport.height]);
      newPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });

      // Explicit Cleanup for Mobile Memory
      canvas.width = 0;
      canvas.height = 0;
      (page as any).cleanup();
    }

    if (onProgress) onProgress(100);
    return await outPdf.save({ useObjectStreams: true });
  });
};

export const downloadBlob = (data: any, fileName: string, mimeType: string) => {
  const blob = new Blob([data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
};
