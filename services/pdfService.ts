import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

/**
 * Downsize a File or Blob image if it exceeds max dimensions.
 * Uses a canvas to resize while maintaining aspect ratio.
 */
const downsizeImage = async (file: File, maxSize: number = 4000): Promise<ArrayBuffer> => {
  const arrayBuffer = await file.arrayBuffer();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // OPTIMIZATION: If image is already within bounds and it's a JPEG, avoid re-encoding
      // This preserves 100% of the contrast and sharpening from the scanner.
      if (width <= maxSize && height <= maxSize && file.type === 'image/jpeg') {
        console.log('💎 Preserving original pixel-perfect asset (No re-encode)');
        resolve(arrayBuffer);
        return;
      }

      const canvas = document.createElement('canvas');
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Blob conversion failed"));
          return;
        }
        blob.arrayBuffer().then(resolve).catch(reject);
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => reject(new Error("Failed to load image for downsizing"));
    img.src = URL.createObjectURL(file);
  });
};

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
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const margin = 50;
    const maxWidth = width - margin * 2;
    let y = height - margin;

    // Draw Title
    page.drawText(title, {
      x: margin,
      y: y,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    y -= 40;

    const fontSize = 10;
    const lineHeight = fontSize * 1.5;
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim()) {
        y -= lineHeight;
        if (y < margin) {
          page = pdfDoc.addPage([600, 800]);
          y = height - margin;
        }
        continue;
      }

      const words = line.split(' ');
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine + word + " ";
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth) {
          page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
          currentLine = word + " ";

          if (y < margin) {
            page = pdfDoc.addPage([600, 800]);
            y = height - margin;
          }
        } else {
          currentLine = testLine;
        }
      }

      // Draw the remaining part of the line
      if (currentLine) {
        page.drawText(currentLine, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
        if (y < margin) {
          page = pdfDoc.addPage([600, 800]);
          y = height - margin;
        }
      }
    }

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
      console.log(`Processing image: ${image.name}, type: ${image.type}, size: ${Math.round(image.size / 1024)} KB`);

      // Step: Downsize image to prevent OOM on mobile
      let arrayBuffer: ArrayBuffer;
      try {
        console.log(`📉 Downsizing/Optimizing ${image.name}...`);
        arrayBuffer = await downsizeImage(image);
        console.log(`✅ ${image.name} optimized: ${Math.round(arrayBuffer.byteLength / 1024)} KB`);
      } catch (err) {
        console.warn(`Downsizing failed for ${image.name}, using original:`, err);
        arrayBuffer = await image.arrayBuffer();
      }

      let embeddedImage;

      try {
        // Since downsizeImage converts to JPEG, we mainly use embedJpg
        try {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        } catch (e) {
          console.warn(`JPG embedding failed for ${image.name}, trying PNG fallback...`);
          embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        }
      } catch (err) {
        console.error(`Failed to embed image ${image.name} even with fallback:`, err);
        continue;
      }

      if (embeddedImage) {
        console.log(`📄 Adding page for ${image.name} (${embeddedImage.width}x${embeddedImage.height})`);
        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });
      }
    }

    console.log(`✅ All images embedded. Total pages: ${pdfDoc.getPageCount()}`);
    console.log('💾 Saving PDF document...');
    const result = await pdfDoc.save();
    console.log(`✅ Save complete. Bytes: ${result.length}`);
    return result;
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



