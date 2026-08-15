/**
 * Electron main entry. Electron treats a bare `--import tsx/esm` as an app
 * path (`apps/desktop/tsx/esm`), so this JS file loads TypeScript through tsx.
 */
import { tsImport } from 'tsx/esm/api'

await tsImport('./src/main.ts', import.meta.url)
