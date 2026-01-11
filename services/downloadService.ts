import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const saveBase64ToCache = async (base64Data: string, filename: string): Promise<string> => {
    // If we're on Android and the direct bridge is available, use it for large payloads
    if (Capacitor.getPlatform() === 'android' && (window as any).AndroidDownloadBridge?.saveToCache) {
        console.log("🌁 Using Native saveToCache for stability...");
        try {
            const nativePath = (window as any).AndroidDownloadBridge.saveToCache(base64Data, filename);
            if (nativePath) {
                // Ensure it's a file:// URI for Capacitor.convertFileSrc
                return nativePath.startsWith('file://') ? nativePath : `file://${nativePath}`;
            }
        } catch (e) {
            console.error("Bridge saveToCache failed, falling back to Filesystem:", e);
        }
    }

    const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
    });
    return result.uri;
};

/**
 * ANTI-GRAVITY DOWNLOAD SERVICE
 * Cross-platform file download handler for web and mobile
 */

export const downloadFile = async (
    blob: Blob,
    filename: string,
    showSuccessModal?: () => void
): Promise<void> => {
    const platform = Capacitor.getPlatform();
    console.log('💾 Download initiated:', filename, 'Platform:', platform, 'Mime:', blob.type, 'Size:', blob.size);

    if (platform === 'web') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (showSuccessModal) showSuccessModal();
    } else {
        // Android/Mobile - Use "Native Share" flow for 100% stability + flexibility
        try {
            // Convert blob to base64
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const result = reader.result as string;
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            console.log('📱 Preparing mobile asset via Native Cache...');
            // Centralize caching via our optimized bridge-enabled helper
            const uri = await saveBase64ToCache(base64Data, filename);

            console.log('📡 Triggering Native Share Sheet:', uri);
            await Share.share({
                title: filename,
                url: uri,
                dialogTitle: 'Save / Share Asset',
            });

            if (showSuccessModal) showSuccessModal();
        } catch (error) {
            console.error('❌ Share-to-Save failed:', error);
            alert(`Share failed: ${error instanceof Error ? error.message : 'System resource limit'}`);
        }
    }
};

/**
 * Download multiple files (for Extract Images, etc.)
 */
export const downloadMultipleFiles = async (
    files: { blob: Blob; filename: string }[],
    showSuccessModal?: () => void
): Promise<void> => {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
        for (const file of files) {
            await downloadFile(file.blob, file.filename);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (showSuccessModal) showSuccessModal();
    } else {
        // Mobile: Prioritize Native Bridge for stability
        try {
            for (const file of files) {
                await downloadFile(file.blob, file.filename);
                // Large delay between bridge calls to prevent buffer congestion
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (showSuccessModal) showSuccessModal();
        } catch (error) {
            console.error('❌ Multi-download failed:', error);
            alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};
