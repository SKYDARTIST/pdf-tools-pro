
import { askGemini } from './aiService';

/**
 * Anti-Gravity Smart Naming Engine
 * Analyzes document text and suggests a professional filename.
 */
export const suggestDocumentName = async (text: string): Promise<string> => {
    if (!text || text.length < 10) return "unnamed_document";

    try {
        const response = await askGemini("Extract a professional filename.", text, 'naming');

        // Check if response is an error message
        if (!response || response.startsWith("BACKEND_ERROR") || response.startsWith("AI_ERROR")) {
            return "unnamed_document";
        }

        // Clean up the name
        let cleanName = response.trim()
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
