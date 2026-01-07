
import { askGemini } from './aiService';

export interface ScanFilters {
    brightness: number;
    contrast: number;
    grayscale: number;
    sharpness: number;
    shadowPurge?: boolean;
    reason: string;
}

/**
 * AI Scan Polisher Service
 * Analyzes an image (sampled text or metadata) and recommends corrective filters.
 */
export const getPolisherProtocol = async (sampleText?: string, imageBase64?: string): Promise<ScanFilters> => {
    try {
        const response = await askGemini("Analyze scan quality.", sampleText || "Image scan analysis.", 'polisher', imageBase64);

        try {
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const filters: ScanFilters = JSON.parse(cleanJson);

            // Intelligent fallback: If AI returns neutral values, apply visible enhancements
            // BUT preserve color unless it's clearly a document
            if (filters.brightness === 100 && filters.contrast === 100 && filters.grayscale === 0) {
                console.warn('⚠️ AI returned neutral values, applying intelligent defaults');
                return {
                    brightness: 115,
                    contrast: 140,
                    grayscale: 0, // Keep color by default
                    sharpness: 120,
                    shadowPurge: false,
                    reason: "Auto-enhanced: Professional brightness and contrast boost"
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

const defaultFilters: ScanFilters = {
    brightness: 115,
    contrast: 140,
    grayscale: 0, // Keep color by default
    sharpness: 120,
    shadowPurge: false,
    reason: "Professional enhancement"
};
