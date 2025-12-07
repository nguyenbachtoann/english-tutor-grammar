import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: '/english-tutor-grammar/',
  build: {
    outDir: 'build',
    emptyOutDir: true
  }
})