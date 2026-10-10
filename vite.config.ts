import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    optimizeDeps: { entries: ['index.html'] },
    base:
        process.env.BASE_PATH ||
        (() => {
            const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]
            return repository && !repository.endsWith('.github.io') ? '/' + repository + '/' : '/'
        })(),
    test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom' },
})
