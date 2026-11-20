import { defineConfig } from 'vite'
import { resolve } from 'path'
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WindMaterial',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['three', 'react', 'react-dom', 'react/jsx-runtime', '@react-three/fiber'],
      output: {
        globals: { three: 'THREE' },
      },
    },
  },
})
