import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // visualizer: generates dist/stats.html after `npm run build:analyze`
    // Shows an interactive treemap of every module and its contribution to bundle size.
    // Helps answer: "What's making my bundle large? Should I lazy-load X?"
    // Only active when ANALYZE env var is set — not in normal builds.
    process.env.ANALYZE && visualizer({
      open:     true,      // auto-opens browser after build
      filename: 'dist/stats.html',
      gzipSize: true,      // show gzip sizes (what users actually download)
      template: 'treemap', // treemap | sunburst | network
    }),
  ].filter(Boolean),

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
