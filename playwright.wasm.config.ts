import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
    ...base,
    testMatch: 'wasmDelivery.e2e.ts',
    use: { ...base.use, baseURL: 'http://127.0.0.1:4174/rust-check/' },
    webServer: {
        command: 'npm run preview -- --base=/rust-check/ --host 127.0.0.1 --port 4174 --strictPort',
        url: 'http://127.0.0.1:4174/rust-check/',
        reuseExistingServer: false,
        timeout: 30000,
    },
})
