
/**
 * Image Processing Utility for Anti-Gravity
 * Handles high-fidelity compression to bypass backend payload limits (413 errors).
 */

export const compressImage = async (base64: string, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64;
        img.crossOrigin = "anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Maintain aspect ratio while respecting maxWidth
            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64); // Fallback to original if canvas fails
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // JPEG compression is much better for reducing payload size than PNG
            const compressed = canvas.toDataURL('image/jpeg', quality);
            console.log(`🖼️ Image compressed: ${Math.round(base64.length / 1024)}KB -> ${Math.round(compressed.length / 1024)}KB`);
            resolve(compressed);
        };

        img.onerror = (err) => {
            console.error("Image compression failure:", err);
            reject(err);
        };
    });
};
