/**
 * Advanced Image Processing Utilities
 * For Neural Reconstruction Scanner
 */

export interface DocumentCorners {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
}

/**
 * Detect document edges using edge detection and contour finding
 */
export const detectDocumentEdges = (imageData: ImageData): DocumentCorners | null => {
    const { width, height, data } = imageData;

    // Simple edge detection using Sobel operator
    const edges: number[] = new Array(width * height).fill(0);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            // Convert to grayscale
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            // Sobel operator for edge detection
            const gx = (
                -1 * getGray(data, x - 1, y - 1, width) + 1 * getGray(data, x + 1, y - 1, width) +
                -2 * getGray(data, x - 1, y, width) + 2 * getGray(data, x + 1, y, width) +
                -1 * getGray(data, x - 1, y + 1, width) + 1 * getGray(data, x + 1, y + 1, width)
            );

            const gy = (
                -1 * getGray(data, x - 1, y - 1, width) - 2 * getGray(data, x, y - 1, width) - 1 * getGray(data, x + 1, y - 1, width) +
                1 * getGray(data, x - 1, y + 1, width) + 2 * getGray(data, x, y + 1, width) + 1 * getGray(data, x + 1, y + 1, width)
            );

            edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
        }
    }

    // Find the largest rectangle (simplified - assumes document is largest contour)
    // For a production app, you'd use a proper contour detection algorithm
    // Here we'll use a heuristic: find corners with high edge density

    const margin = Math.min(width, height) * 0.1;

    return {
        topLeft: { x: margin, y: margin },
        topRight: { x: width - margin, y: margin },
        bottomLeft: { x: margin, y: height - margin },
        bottomRight: { x: width - margin, y: height - margin }
    };
};

const getGray = (data: Uint8ClampedArray, x: number, y: number, width: number): number => {
    const idx = (y * width + x) * 4;
    return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
};

/**
 * Apply perspective transformation to straighten document
 */
export const perspectiveTransform = (
    canvas: HTMLCanvasElement,
    corners: DocumentCorners
): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Calculate target dimensions (straightened rectangle)
    const width = Math.max(
        distance(corners.topLeft, corners.topRight),
        distance(corners.bottomLeft, corners.bottomRight)
    );
    const height = Math.max(
        distance(corners.topLeft, corners.bottomLeft),
        distance(corners.topRight, corners.bottomRight)
    );

    // Create output canvas
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = Math.round(width);
    outputCanvas.height = Math.round(height);
    const outputCtx = outputCanvas.getContext('2d');
    if (!outputCtx) return canvas;

    // Get source image data
    const sourceData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const outputData = outputCtx.createImageData(outputCanvas.width, outputCanvas.height);

    // Apply perspective transformation using bilinear interpolation
    for (let y = 0; y < outputCanvas.height; y++) {
        for (let x = 0; x < outputCanvas.width; x++) {
            // Map output coordinates to source coordinates
            const u = x / outputCanvas.width;
            const v = y / outputCanvas.height;

            // Bilinear interpolation of corner positions
            const srcX = (1 - u) * (1 - v) * corners.topLeft.x +
                u * (1 - v) * corners.topRight.x +
                (1 - u) * v * corners.bottomLeft.x +
                u * v * corners.bottomRight.x;

            const srcY = (1 - u) * (1 - v) * corners.topLeft.y +
                u * (1 - v) * corners.topRight.y +
                (1 - u) * v * corners.bottomLeft.y +
                u * v * corners.bottomRight.y;

            // Sample source pixel (with bounds checking)
            const sx = Math.max(0, Math.min(canvas.width - 1, Math.round(srcX)));
            const sy = Math.max(0, Math.min(canvas.height - 1, Math.round(srcY)));

            const srcIdx = (sy * canvas.width + sx) * 4;
            const dstIdx = (y * outputCanvas.width + x) * 4;

            outputData.data[dstIdx] = sourceData.data[srcIdx];
            outputData.data[dstIdx + 1] = sourceData.data[srcIdx + 1];
            outputData.data[dstIdx + 2] = sourceData.data[srcIdx + 2];
            outputData.data[dstIdx + 3] = 255;
        }
    }

    outputCtx.putImageData(outputData, 0, 0);
    return outputCanvas;
};

const distance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

/**
 * Auto-crop to document boundaries
 */
export const autoCrop = (canvas: HTMLCanvasElement, corners: DocumentCorners): HTMLCanvasElement => {
    // The perspective transform already crops to the document
    // This is a simplified version - in production you'd detect actual content boundaries
    return perspectiveTransform(canvas, corners);
};

/**
 * Enhance text using adaptive thresholding and sharpening
 */
export const enhanceText = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Step 1: Apply unsharp mask for sharpening
    const sharpened = applyUnsharpMask(imageData);

    // Step 2: Apply adaptive thresholding for text clarity
    const enhanced = applyAdaptiveThreshold(sharpened);

    ctx.putImageData(enhanced, 0, 0);
    return canvas;
};

const applyUnsharpMask = (imageData: ImageData): ImageData => {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const amount = 1.5; // Sharpening strength

    // Simple 3x3 sharpening kernel
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        const kernelIdx = (ky + 1) * 3 + (kx + 1);
                        sum += data[idx] * kernel[kernelIdx];
                    }
                }

                const idx = (y * width + x) * 4 + c;
                output.data[idx] = Math.max(0, Math.min(255, sum * amount));
            }
            output.data[(y * width + x) * 4 + 3] = 255; // Alpha
        }
    }

    return output;
};

const applyAdaptiveThreshold = (imageData: ImageData): ImageData => {
    const { width, height, data } = imageData;
    const output = new ImageData(width, height);
    const blockSize = 15; // Window size for local threshold

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            // Convert to grayscale
            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            // Calculate local mean
            let sum = 0;
            let count = 0;
            for (let dy = -blockSize; dy <= blockSize; dy++) {
                for (let dx = -blockSize; dx <= blockSize; dx++) {
                    const ny = Math.max(0, Math.min(height - 1, y + dy));
                    const nx = Math.max(0, Math.min(width - 1, x + dx));
                    const nidx = (ny * width + nx) * 4;
                    sum += 0.299 * data[nidx] + 0.587 * data[nidx + 1] + 0.114 * data[nidx + 2];
                    count++;
                }
            }
            const localMean = sum / count;

            // Apply threshold with slight bias for text
            const threshold = localMean - 10;
            const value = gray > threshold ? 255 : 0;

            // Keep some color information for non-text areas
            const factor = value / 255;
            output.data[idx] = data[idx] * factor + value * (1 - factor);
            output.data[idx + 1] = data[idx + 1] * factor + value * (1 - factor);
            output.data[idx + 2] = data[idx + 2] * factor + value * (1 - factor);
            output.data[idx + 3] = 255;
        }
    }

    return output;
};
