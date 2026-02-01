
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
export interface TableExtractionResponse {
    success: boolean;
    data: ExtractedTable[];
    error?: string;
}

/**
 * AI Table Extraction Service
 * Uses vision/text analysis to pull structured data from PDFs.
 */
export const extractTablesFromDocument = async (text?: string, imageBase64?: string): Promise<TableExtractionResponse> => {
    if (!text && !imageBase64) return { success: true, data: [] };

    try {
        const response = await askGemini("Extract tables.", text || "", 'table', imageBase64);

        if (!response.success || !response.data) {
            console.error("Table Extraction AI failed:", response.error);
            return { success: false, data: [], error: response.error };
        }

        // Attempt to parse the JSON response
        try {
            // Clean the response in case Gemini adds markdown blocks
            const cleanJson = response.data.replace(/```json|```/g, '').trim();
            const tables: ExtractedTable[] = JSON.parse(cleanJson);
            return {
                success: true,
                data: Array.isArray(tables) ? tables : []
            };
        } catch (parseErr) {
            console.error("JSON Parse Error in Table Extractor:", parseErr);
            return {
                success: false,
                data: [],
                error: "Failed to parse table data."
            };
        }
    } catch (err: any) {
        console.error("Table Extraction Error:", err);
        return {
            success: false,
            data: [],
            error: err.message || "Unknown extraction error."
        };
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
