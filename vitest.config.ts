import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    // Node 25+ Web Storage otherwise masks jsdom's storage in worker processes.
    poolOptions: {
      threads: {
        execArgv:
          Number(process.versions.node.split('.')[0]) >= 25 ? ['--no-experimental-webstorage'] : [],
      },
      forks: {
        execArgv:
          Number(process.versions.node.split('.')[0]) >= 25 ? ['--no-experimental-webstorage'] : [],
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    clearMocks: true,
  },
});
