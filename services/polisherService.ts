
import { askGemini } from './aiService';

export interface ScanFilters {
    brightness: number;
    contrast: number;
    grayscale: number;
    sharpness: number;
    shadowPurge?: boolean;
    reason: string;
    // Advanced reconstruction features
    perspectiveCorrection?: boolean;
    autoCrop?: boolean;
    textEnhancement?: boolean;
}

/**
 * AI Scan Polisher Service - Regular Scanner
 * Moderate enhancements for everyday scanning
 */
export const getPolisherProtocol = async (sampleText?: string, imageBase64?: string): Promise<ScanFilters> => {
    try {
        const response = await askGemini("Analyze scan quality.", sampleText || "Image scan analysis.", 'polisher', imageBase64);

        try {
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const filters: ScanFilters = JSON.parse(cleanJson);

            // Force color preservation - NEVER apply grayscale
            filters.grayscale = 0;

            // Intelligent fallback: If AI returns neutral values, apply visible enhancements
            if (filters.brightness === 100 && filters.contrast === 100) {
                console.warn('⚠️ AI returned neutral values, applying intelligent defaults');
                return {
                    brightness: 95,
                    contrast: 140,
                    grayscale: 0,
                    sharpness: 120,
                    shadowPurge: false,
                    reason: "Auto-enhanced: Contrast boost with color preservation"
                };
            }

            return filters;
        } catch (parseErr) {
            console.error("Polisher Parse Error:", parseErr);
            return defaultFilters;
        }
    } catch (err) {
        console.error("Polisher Service Error:", err);
        return defaultFilters;
    }
};

/**
 * Neural Reconstruction Protocol - Premium Scanner
 * AGGRESSIVE enhancements for professional document restoration
 */
export const getReconstructionProtocol = async (sampleText?: string, imageBase64?: string): Promise<ScanFilters> => {
    try {
        const response = await askGemini("Analyze scan quality for aggressive reconstruction.", sampleText || "Image scan analysis.", 'polisher', imageBase64);

        try {
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const filters: ScanFilters = JSON.parse(cleanJson);

            // Force color preservation
            filters.grayscale = 0;

            // AGGRESSIVE enhancements for reconstruction
            // Boost AI suggestions by 10-15% for more dramatic effect
            return {
                brightness: Math.min(120, filters.brightness + 10),
                contrast: Math.min(180, filters.contrast + 20),
                grayscale: 0,
                sharpness: Math.min(150, filters.sharpness + 30),
                shadowPurge: true, // Always enable shadow removal
                perspectiveCorrection: true, // Enable perspective correction
                autoCrop: true, // Enable auto-crop
                textEnhancement: true, // Enable text enhancement
                reason: "Neural Reconstruction: Perspective correction + shadow removal + text enhancement"
            };
        } catch (parseErr) {
            console.error("Reconstruction Parse Error:", parseErr);
            return reconstructionDefaults;
        }
    } catch (err) {
        console.error("Reconstruction Service Error:", err);
        return reconstructionDefaults;
    }
};

const defaultFilters: ScanFilters = {
    brightness: 95,
    contrast: 140,
    grayscale: 0,
    sharpness: 120,
    shadowPurge: false,
    reason: "Professional enhancement with color preservation"
};

const reconstructionDefaults: ScanFilters = {
    brightness: 105,
    contrast: 160,
    grayscale: 0,
    sharpness: 140,
    shadowPurge: true,
    perspectiveCorrection: true,
    autoCrop: true,
    textEnhancement: true,
    reason: "Neural Reconstruction: Professional document restoration with perspective correction"
};
