import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      '@pm/contracts': resolve(import.meta.dirname, '../../packages/contracts/src'),
      'server-only': resolve(import.meta.dirname, 'src/test/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.test.{ts,tsx}',
        'src/app/**/{layout,page,loading,error,not-found,global-error,default}.tsx',
      ],
      reporter: ['text-summary', 'html'],
      // UI shells without logic are covered by Playwright instead.
      thresholds: { statements: 70, branches: 80, functions: 60, lines: 70 },
    },
  },
});
