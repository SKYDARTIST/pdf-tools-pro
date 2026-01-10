import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

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
        // Web browser download
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
        // Android - Use JavaScript Bridge to native Android code
        try {
            console.log('📱 Mobile download - using JavaScript Bridge...');

            // Check if Android bridge is available
            if (!(window as any).AndroidDownloadBridge) {
                throw new Error('Download bridge not available');
            }

            // Convert blob to base64
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const result = reader.result as string;
                    // Remove data URL prefix (e.g., "data:image/png;base64,")
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            console.log('✅ Base64 encoded, length:', base64Data.length);
            console.log('📤 Passing to Android bridge via window.AndroidDownloadBridge.downloadFile...');
            // Call native Android download method
            (window as any).AndroidDownloadBridge.downloadFile(
                base64Data,
                filename,
                blob.type || 'application/octet-stream'
            );

            console.log('✅ Bridge call executed for:', filename);
            if (showSuccessModal) showSuccessModal();
        } catch (error) {
            console.error('❌ Download failed:', error);
            alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        // Web: Download each file sequentially
        for (const file of files) {
            await downloadFile(file.blob, file.filename);
            // Small delay to prevent browser blocking multiple downloads
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (showSuccessModal) showSuccessModal();
    } else {
        // Mobile: Save all files and show share dialog for the folder
        try {
            const savedFiles: string[] = [];

            for (const file of files) {
                const reader = new FileReader();
                const base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file.blob);
                });

                const result = await Filesystem.writeFile({
                    path: file.filename,
                    data: base64Data,
                    directory: Directory.Documents,
                });

                savedFiles.push(result.uri);
            }

            console.log(`✅ ${savedFiles.length} files saved`);

            // Share notification
            await Share.share({
                title: 'Anti-Gravity PDF',
                text: `${savedFiles.length} files saved to Documents`,
                dialogTitle: 'Files Ready',
            });

            if (showSuccessModal) showSuccessModal();
        } catch (error) {
            console.error('❌ Multi-download failed:', error);
            alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
};
