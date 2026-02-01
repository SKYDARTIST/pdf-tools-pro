
import { askGemini } from './aiService';

/**
 * Anti-Gravity Smart Naming Engine
 * Analyzes document text and suggests a professional filename.
 */
export const suggestDocumentName = async (text: string): Promise<string> => {
    if (!text || text.length < 10) return "unnamed_document";

    try {
        const response = await askGemini("Extract a professional filename.", text, 'naming');

        // Check if response is successful
        if (!response.success || !response.data) {
            return "unnamed_document";
        }

        // Clean up the name
        let cleanName = response.data.trim()
            .replace(/\.[^/.]+$/, "") // Remove extensions
            .replace(/[^a-z0-9_]/gi, "_") // Replace non-alphanumeric with underscores
            .replace(/_+/g, "_") // Consolidate underscores
            .substring(0, 60); // Limit length

        // Remove leading/trailing underscores
        cleanName = cleanName.replace(/^_+|_+$/g, '');

        return cleanName || "unnamed_document";
    } catch (err) {
        console.error("Smart Naming Error:", err);
        return "unnamed_document";
    }
};
