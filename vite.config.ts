import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      // SECURITY (V4): Enable obfuscation for production builds
      // obfuscator({ ...options })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      chunkSizeWarningLimit: 2000,
      minify: 'esbuild',
      esbuild: {
        drop: mode === 'production' ? ['console', 'debugger'] : [],
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('lucide-react') || id.includes('framer-motion')) {
                return 'ui-vendors';
              }
              if (id.includes('pdf-lib') || id.includes('pdfjs-dist') || id.includes('jszip')) {
                return 'pdf-engine';
              }
              if (id.includes('@supabase') || id.includes('@google')) {
                return 'backend-vendors';
              }
              // Default to standard chunking for other vendors to avoid circles
            }
          }
        }
      }
    }
  };
});
