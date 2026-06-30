import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ── Vitest configuration ────────────────────────────────────────────────
  // Vitest reads test config from the same vite.config.js — no jest.config needed.
  // This is the main advantage over Jest with Vite: zero extra config files.
  test: {
    // environment: 'jsdom' — simulates browser APIs (document, window, localStorage)
    // in Node.js where tests actually run. Without this, document.createElement fails.
    environment: 'jsdom',

    // setupFiles: runs BEFORE every test file.
    // We use it to import @testing-library/jest-dom which adds custom matchers
    // like toBeInTheDocument(), toHaveValue(), toBeDisabled() to expect().
    setupFiles: ['./src/test/setup.js'],

    // globals: true — makes describe, it, expect, vi available without importing.
    // Same API as Jest — test files look identical.
    globals: true,
  },
})
