
import { askGemini } from './aiService';

export interface ScanFilters {
    brightness: number;
    contrast: number;
    grayscale: number;
    sharpness: number;
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
    brightness: 105,
    contrast: 110,
    grayscale: 100,
    sharpness: 100,
    reason: "Standard optimization"
};
