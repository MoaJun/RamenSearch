import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      plugins: [
        react(),
        // Bundle analyzer - generates stats.html after build
        visualizer({
          filename: 'dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ],
      build: {
        // Optimize for better performance
        target: 'esnext',
        minify: 'esbuild',
        chunkSizeWarningLimit: 500,
        sourcemap: false,
        // Enable CSS code splitting
        cssCodeSplit: true,
        // Optimize assets
        assetsInlineLimit: 4096, // 4kb
        // Report compressed size
        reportCompressedSize: true,
        rollupOptions: {
          manualChunks: (id) => {
              // Core React libraries
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor';
              }
              
              // Lazy-loaded Gemini service only
              if (id.includes('lazyGeminiService')) {
                return 'ai-lazy';
              }
              
              // Google Maps (keep separate)
              if (id.includes('@googlemaps/js-api-loader') || id.includes('@googlemaps/markerclusterer')) {
                return 'google-maps';
              }
              
              // UI components
              if (id.includes('lucide-react')) {
                return 'ui';
              }
              
              // Our utilities and services (excluding gemini services)
              if ((id.includes('/utils/') || id.includes('/services/')) && 
                  !id.includes('geminiService') && !id.includes('lazyGeminiService')) {
                return 'utils';
              }
              
              // Components chunk
              if (id.includes('/components/')) {
                return 'components';
              }
              
              // Node modules that are not core dependencies
              if (id.includes('node_modules')) {
                return 'vendor';
              }
            },
          // Optimize imports
          treeshake: {
            moduleSideEffects: 'no-external'
          }
        }
      }
    };
});
