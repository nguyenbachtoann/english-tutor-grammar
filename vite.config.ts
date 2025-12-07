// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: '/english-tutor-grammar/',        // <<< RẤT QUAN TRỌNG!!!
  build: {
    outDir: 'build', // mặc định của Vite + React mới là "dist", bạn đang dùng "build"
  }
})