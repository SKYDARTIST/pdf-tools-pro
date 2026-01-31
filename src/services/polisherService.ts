
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
                    brightness: 100,
                    contrast: 130, // Healthy boost for photos
                    grayscale: 0,
                    sharpness: 115,
                    shadowPurge: false,
                    reason: "Photo Boost: Clarified details with color preservation"
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

            // HIGH-FIDELITY Color Enhancement
            // Boost contrast and sharpness while preserving natural colors
            return {
                brightness: Math.min(115, filters.brightness + 5),
                contrast: 165, // Max contrast boost for pro-clarity
                grayscale: 0,
                sharpness: 180, // High-fidelity text sharpening
                shadowPurge: true, // Enable back for document restoration
                perspectiveCorrection: false,
                autoCrop: false,
                textEnhancement: true,
                reason: "Neural Enhancement: High-Fidelity Color Restoration"
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
    contrast: 165,
    grayscale: 0,
    sharpness: 180,
    shadowPurge: true,
    perspectiveCorrection: false, // Disabled for now
    autoCrop: false, // Disabled for now
    textEnhancement: true, // Keep enabled
    reason: "Neural Reconstruction: Optimized contrast + pro text sharpening"
};
