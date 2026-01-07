import { canUseAI, recordAIUsage } from './subscriptionService';

export interface VisualResponse {
    imageUrl?: string;
    error?: string;
    status: 'success' | 'error' | 'safety_violation' | 'quota_exceeded';
}

/**
 * Neural Visual Service (Nano Banana Wrapper)
 * Handles persona-based image generation via Gemini 2.5 Flash Image logic
 */
export const generateImage = async (
    prompt: string,
    persona: 'linkedin' | 'business' | 'student' | 'creative' | 'freeform' = 'freeform'
): Promise<VisualResponse> => {
    // 1. Quota Check
    const canGenerate = await canUseAI();
    if (!canGenerate) {
        return { status: 'quota_exceeded', error: 'Neural Credits depleted. Signal cooling down.' };
    }

    try {
        const signature = 'AG_NEURAL_LINK_2026_PROTOTYPE_SECURE';

        // Persona-Specific Style Wrappers & Aspect Ratios
        let finalPrompt = prompt;
        let aspectRatio = '1:1';

        switch (persona) {
            case 'linkedin':
                finalPrompt = `A professional, clean LinkedIn banner style. High-resolution, professional aesthetic. Topic: ${prompt}. [Aspect Ratio: 16:9]`;
                aspectRatio = '16:9';
                break;
            case 'business':
                finalPrompt = `A minimal, corporate abstract background for a slide deck. High-tech, subtle professional colors. Topic: ${prompt}. [Aspect Ratio: 16:9]`;
                aspectRatio = '16:9';
                break;
            case 'student':
                finalPrompt = `A vibrant, clear educational infographic style poster. Clear sections, modern colors. Topic: ${prompt}. [Aspect Ratio: 9:16]`;
                aspectRatio = '9:16';
                break;
            case 'creative':
                finalPrompt = `A highly detailed, cinematic concept art piece capturing the metaphor of: ${prompt}. Professional lighting, 8k render. [Aspect Ratio: 1:1]`;
                aspectRatio = '1:1';
                break;
        }

        const response = await fetch('/api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-ag-signature': signature
            },
            body: JSON.stringify({
                prompt: finalPrompt,
                type: 'visual'
            })
        });

        const data = await response.json();

        if (response.status === 400 && data.error?.includes('Safety')) {
            return { status: 'safety_violation', error: 'Signal rejected: Safety guardrails triggered.' };
        }

        if (response.status === 429) {
            return { status: 'quota_exceeded', error: 'Synapse cooling. Please wait.' };
        }

        if (!response.ok || !data.text) {
            throw new Error(data.error || 'Neural synchronization failed.');
        }

        // record usage
        recordAIUsage();

        // In 2026, the API returns the image data directly or a signed URL
        // For this prototype, we assume the 'text' contains the base64 or URL
        return {
            status: 'success',
            imageUrl: data.text
        };

    } catch (err) {
        console.error("Neural Visual Error:", err);
        return { status: 'error', error: err.message || 'Unknown neural disruption.' };
    }
};
