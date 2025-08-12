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
        rollupOptions: {
          output: {
            manualChunks: {
              // Vendor chunk for large external dependencies
              vendor: ['react', 'react-dom'],
              // Google services chunk
              google: ['@google/genai', '@googlemaps/js-api-loader', '@googlemaps/markerclusterer'],
              // UI components chunk  
              ui: ['lucide-react']
            }
          }
        },
        // Optimize chunk size warnings
        chunkSizeWarningLimit: 500,
        // Enable source maps for production debugging
        sourcemap: false
      }
    };
});
