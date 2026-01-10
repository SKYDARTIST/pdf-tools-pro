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
        // Android/iOS download using Capacitor Filesystem
        try {
            // Convert blob to base64
            const reader = new FileReader();
            const base64Data = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // Write file to device storage
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64Data,
                directory: Directory.Documents,
            });

            console.log('✅ File saved:', result.uri);

            // Share the file (this triggers Android's "Download complete" notification)
            await Share.share({
                title: 'Anti-Gravity PDF',
                text: `${filename} is ready`,
                url: result.uri,
                dialogTitle: 'Save or Share PDF',
            });

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
