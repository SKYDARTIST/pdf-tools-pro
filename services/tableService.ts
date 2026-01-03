
import { askGemini } from './aiService';

export interface ExtractedTable {
    tableName: string;
    headers: string[];
    rows: string[][];
}

/**
 * AI Table Extraction Service
 * Uses vision/text analysis to pull structured data from PDFs.
 */
export const extractTablesFromDocument = async (text?: string, imageBase64?: string): Promise<ExtractedTable[]> => {
    if (!text && !imageBase64) return [];

    try {
        const response = await askGemini("Extract tables.", text || "", 'table', imageBase64);

        // Attempt to parse the JSON response
        try {
            // Clean the response in case Gemini adds markdown blocks
            const cleanJson = response.replace(/```json|```/g, '').trim();
            const tables: ExtractedTable[] = JSON.parse(cleanJson);
            return Array.isArray(tables) ? tables : [];
        } catch (parseErr) {
            console.error("JSON Parse Error in Table Extractor:", parseErr);
            return [];
        }
    } catch (err) {
        console.error("Table Extraction Error:", err);
        return [];
    }
};

/**
 * Converts a table object to CSV format.
 */
export const tableToCSV = (table: ExtractedTable): string => {
    const lines = [
        table.headers.join(','),
        ...table.rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ];
    return lines.join('\n');
};
