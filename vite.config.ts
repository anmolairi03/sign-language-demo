import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@tensorflow/tfjs']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'tensorflow': ['@tensorflow/tfjs']
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild'
  },
  server: {
    fs: {
      strict: false
    }
  }
})