package com.cryptobulla.antigravity;

import android.app.DownloadManager;
import android.content.Context;
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

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable JavaScript interface for downloads
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new DownloadBridge(), "AndroidDownloadBridge");
    }
    
    /**
     * JavaScript Bridge for handling file downloads
     * Called from JavaScript: window.AndroidDownloadBridge.downloadFile(base64, filename, mimeType)
     */
    public class DownloadBridge {
        
        @JavascriptInterface
        public void downloadFile(String base64Data, String filename, String mimeType) {
            runOnUiThread(() -> {
                try {
                    // Decode base64 to bytes
                    byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
                    
                    // Use DownloadManager for Android 10+
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                        saveFileModern(fileBytes, filename, mimeType);
                    } else {
                        saveFileLegacy(fileBytes, filename);
                    }
                    
                    Toast.makeText(MainActivity.this, 
                        "Downloaded: " + filename, 
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
                    true
                );
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
