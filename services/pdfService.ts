
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


export const repairPdf = async (file: File): Promise<Uint8Array> => {
  return safeExecute(async () => {
    const arrayBuffer = await file.arrayBuffer();
    // Loading and re-saving reconstructs the XREF table and internal structure
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false
    });
    return await pdfDoc.save();
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
