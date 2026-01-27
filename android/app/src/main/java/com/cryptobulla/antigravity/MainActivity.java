package com.cryptobulla.antigravity;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable JavaScript interface for downloads
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new DownloadBridge(), "AndroidDownloadBridge");

        // Handle initial intent if app was opened via Share
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            Uri fileUri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (fileUri != null) {
                try {
                    // Copy shared file to internal cache for guaranteed access
                    String filename = "shared_asset_" + System.currentTimeMillis();
                    if (type.contains("pdf"))
                        filename += ".pdf";
                    else if (type.contains("image"))
                        filename += ".jpg";
                    else
                        filename += ".tmp";

                    File cacheFile = new File(getCacheDir(), filename);
                    try (InputStream is = getContentResolver().openInputStream(fileUri);
                            FileOutputStream fos = new FileOutputStream(cacheFile)) {
                        byte[] buffer = new byte[8192];
                        int read;
                        while ((read = is.read(buffer)) != -1) {
                            fos.write(buffer, 0, read);
                        }
                    }

                    final String localPath = cacheFile.getAbsolutePath();
                    final String mimeType = type;

                    getBridge().getWebView().postDelayed(() -> {
                        String js = "window.dispatchEvent(new CustomEvent('neuralSharedFile', { detail: { path: '"
                                + localPath + "', type: '" + mimeType + "' } }));";
                        getBridge().getWebView().evaluateJavascript(js, null);
                    }, 1000);

                } catch (Exception e) {
                    e.printStackTrace();
                    Toast.makeText(this, "Failed to share file: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        }
    }

    /**
     * JavaScript Bridge for handling file downloads
     * Called from JavaScript: window.AndroidDownloadBridge.downloadFile(base64,
     * filename, mimeType)
     */
    public class DownloadBridge {

        private String sanitizeFilename(String filename) {
            if (filename == null)
                return "download_" + System.currentTimeMillis();
            // Remove path traversal components and restrict to safe chars
            return filename.replaceAll("[^a-zA-Z0-9._-]", "_").replaceAll("\\.\\.+", ".");
        }

        @JavascriptInterface
        public String saveToCache(String base64Data, String filename) {
            try {
                String safeName = sanitizeFilename(filename);
                byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
                File cacheDir = getCacheDir();
                File file = new File(cacheDir, safeName);

                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(fileBytes);
                    fos.flush();
                }

                // Return absolute path for Capacitor to use
                return file.getAbsolutePath();
            } catch (Exception e) {
                e.printStackTrace();
                return "";
            }
        }

        @JavascriptInterface
        public boolean appendToCache(String base64Data, String filename) {
            try {
                String safeName = sanitizeFilename(filename);
                byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
                File cacheDir = getCacheDir();
                File file = new File(cacheDir, safeName);

                // Use true for append mode
                try (FileOutputStream fos = new FileOutputStream(file, true)) {
                    fos.write(fileBytes);
                    fos.flush();
                }
                return true;
            } catch (Exception e) {
                e.printStackTrace();
                return false;
            }
        }

        @JavascriptInterface
        public void downloadFile(String base64Data, String filename, String mimeType) {
            final String safeName = sanitizeFilename(filename);
            runOnUiThread(() -> {
                try {
                    // Decode base64 to bytes
                    byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);

                    // Use DownloadManager for Android 10+
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                        saveFileModern(fileBytes, safeName, mimeType);
                    } else {
                        saveFileLegacy(fileBytes, safeName);
                    }

                    Toast.makeText(MainActivity.this,
                            "Downloaded: " + safeName,
                            Toast.LENGTH_LONG).show();

                } catch (Exception e) {
                    e.printStackTrace();
                    Toast.makeText(MainActivity.this,
                            "Download failed: " + e.getMessage(),
                            Toast.LENGTH_LONG).show();
                }
            });
        }

        /**
         * Modern approach for Android 10+ using scoped storage
         */
        private void saveFileModern(byte[] data, String filename, String mimeType) throws IOException {
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            File file = new File(downloadsDir, filename);

            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(data);
                fos.flush();
            }

            // Notify Download Manager
            DownloadManager downloadManager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (downloadManager != null) {
                downloadManager.addCompletedDownload(
                        filename,
                        "Anti-Gravity PDF",
                        true,
                        mimeType != null ? mimeType : "application/octet-stream",
                        file.getAbsolutePath(),
                        data.length,
                        true);
            }
        }

        /**
         * Legacy approach for older Android versions
         */
        private void saveFileLegacy(byte[] data, String filename) throws IOException {
            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs();
            }

            File file = new File(downloadsDir, filename);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(data);
                fos.flush();
            }
        }
    }
}
