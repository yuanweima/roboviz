import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    viteStaticCopy({
      targets: [
        {
          src: '../../packages/core/test/fixtures/*',
          dest: 'fixtures'
        }
      ]
    })
  ],
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.urdf', '**/*.STL', '**/*.stl', '**/*.pcd', '**/*.wasm'],
  optimizeDeps: {
    exclude: ['trajx-wasm'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      // Don't bundle trajx-wasm, let it load its own WASM
      external: [],
    },
  },
  // Don't let esbuild transform WASM loader code
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
});
