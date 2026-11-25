import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      'recharts',
      'tiny-invariant',
      'd3-shape',
      'd3-path',
      'd3-scale',
      'd3-color',
      'd3-format',
      'd3-interpolate',
      'd3-time',
      'd3-time-format',
      'framer-motion',
      'lucide-react',
      'axios',
      'react-router-dom',
      'react-dropzone',
      'react-hot-toast',
      'zustand',
      'clsx',
      'tailwind-merge',
    ],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          router: ['react-router-dom'],
        },
      },
    },
  },
})
