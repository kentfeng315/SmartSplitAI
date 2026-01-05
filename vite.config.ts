import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    // Define global constants replacement
    define: {
      // Pass specific environment variables to the browser
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.FIREBASE_CONFIG': JSON.stringify(env.FIREBASE_CONFIG),
      // Polyfill process.env for safety to avoid "process is not defined" errors
      'process.env': {} 
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'lucide-react', '@google/genai', 'firebase/app', 'firebase/database']
          }
        }
      }
    },
    server: {
      port: 3000
    }
  };
});