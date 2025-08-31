// @ts-ignore - Vitest types will be available after npm install
/// <reference types="vitest" />
// @ts-ignore - Vitest imports will be available after npm install
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    target: 'es2020',
  },
})