/** Desktop-owned renderer build; no Web application artifact is consumed. */

import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url))

export default defineConfig({
  root: src('./renderer'),
  plugins: [react()],
  build: {
    outDir: src('./dist'),
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: [
      { find: /^node:module$/, replacement: src('./renderer/node-module-stub.ts') },
      { find: /^@deepseek-ai\/dsh-client-web$/, replacement: src('../../packages/client/web/src/boot.tsx') },
      { find: /^@deepseek-ai\/dsh-client-web-react$/, replacement: src('../../packages/client/web-react/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-slots$/, replacement: src('../../packages/client/ui-slots/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-primitives$/, replacement: src('../../packages/client/ui-primitives/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-ui-attachment$/, replacement: src('../../packages/client/ui-attachment/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-schema-form$/, replacement: src('../../packages/client/schema-form/src/index.ts') },
      { find: /^@deepseek-ai\/dsh-client-modules\/client$/, replacement: src('../../packages/client/modules/src/client/index.ts') },
    ],
  },
  define: {
    'process.versions.node': '"0.0.0"',
    'process.execArgv': '[]',
    'process.env.CORDIS_SHARED': 'undefined',
  },
})
