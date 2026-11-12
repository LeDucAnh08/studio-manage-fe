import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { realpathSync } from 'fs';
function canonicalDirectory(directory: string): string {
  try {
    return realpathSync(directory);
  } catch {
    const parent = path.dirname(directory);
    return parent === directory
      ? directory
      : path.join(canonicalDirectory(parent), path.basename(directory));
  }
}

export default defineConfig(({ mode }) => {
  const proxyTarget =
    process.env.DEV_API_PROXY_TARGET ||
    loadEnv(mode, __dirname, 'DEV_API_PROXY_TARGET').DEV_API_PROXY_TARGET ||
    'http://127.0.0.1:5002';
  const deliveryRoot = path.resolve(
    __dirname,
    '../backend',
    process.env.PRIVATE_DELIVERY_DIR ||
      loadEnv(mode, path.resolve(__dirname, '../backend'), 'PRIVATE_DELIVERY_DIR')
        .PRIVATE_DELIVERY_DIR ||
      '../.data/private-delivery',
  );
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      fs: {
        deny: [
          '**/.env',
          '**/.env.*',
          '**/*.{crt,pem}',
          '**/.git/**',
          '**/.workflow-tools/**',
          '**/.data/**',
          ...[deliveryRoot, canonicalDirectory(deliveryRoot)].map(
            (directory) => `${directory.replaceAll('\\', '/')}/**`,
          ),
        ],
      },
      port: 4001,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            // React core - phải gồm react-is & scheduler để tránh lỗi
            // "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-is', 'scheduler'],
            // Redux
            'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
            // Chart - tách riêng dependencies nặng
            'vendor-charts': ['recharts'],
            // Excel export
            'vendor-exceljs': ['exceljs'],
            // Utilities
            'vendor-utils': ['axios', 'date-fns', 'react-hook-form', 'react-toastify'],
          },
        },
      },
    },
  };
});
