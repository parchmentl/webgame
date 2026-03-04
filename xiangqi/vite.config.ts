import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2015',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
});
