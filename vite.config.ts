import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      plugins: [
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
          output: {
            manualChunks: (id) => {
              // Core React libraries
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor';
              }
              
              // Google services - lazy loaded
              if (id.includes('@google/genai')) {
                return 'ai';
              }
              if (id.includes('@googlemaps/js-api-loader') || id.includes('@googlemaps/markerclusterer')) {
                return 'google-maps';
              }
              
              // UI components
              if (id.includes('lucide-react')) {
                return 'ui';
              }
              
              // Our utilities and services
              if (id.includes('/utils/') || id.includes('/services/')) {
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
            // Optimize file names for caching
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]'
          },
          // Optimize imports
          treeshake: {
            moduleSideEffects: false,
            propertyReadSideEffects: false,
            unknownGlobalSideEffects: false
          }
        }
      }
    };
});
