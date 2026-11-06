import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const runtimeEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> }
}).process?.env ?? {}
const repositoryName = runtimeEnv.GITHUB_REPOSITORY?.split('/')[1]
const base = runtimeEnv.GITHUB_ACTIONS === 'true' && repositoryName ? `/${repositoryName}/` : '/'

export default defineConfig({
  base,
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5173 },
})
