import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// public/ 파일은 번들에 포함되지 않으므로 favicon만 직접 data URI로 치환한다.
// (build.copyPublicDir=false와 짝을 이뤄 dist에 index.html 하나만 남긴다)
function inlineFavicon(): Plugin {
  return {
    name: 'inline-favicon',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const svg = fs.readFileSync(
          path.resolve(__dirname, 'public/favicon.svg'),
        )
        return html.replace(
          '/favicon.svg',
          `data:image/svg+xml;base64,${svg.toString('base64')}`,
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), inlineFavicon(), viteSingleFile()],
  build: {
    copyPublicDir: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
