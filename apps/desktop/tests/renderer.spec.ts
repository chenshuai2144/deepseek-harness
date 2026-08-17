/** Desktop renderer ownership and window chrome declarations. */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const desktopFile = (relative: string): string => fileURLToPath(new URL(`../${relative}`, import.meta.url))

describe('desktop-owned renderer', () => {
  it('does not depend on the Web application artifact', async () => {
    const manifest = JSON.parse(await readFile(desktopFile('package.json'), 'utf8')) as {
      dependencies: Record<string, string>
      scripts: Record<string, string>
    }
    expect(manifest.dependencies['@deepseek-ai/dsh-web-frontend']).toBeUndefined()
    expect(manifest.dependencies['@deepseek-ai/dsh-client-web']).toBeDefined()
    expect(manifest.scripts.start).toBe('electron .')
    expect(manifest.scripts['start:rebuild']).toContain('pnpm run build')
  })

  it('declares its own product chrome and mount point', async () => {
    const html = await readFile(desktopFile('renderer/index.html'), 'utf8')
    expect(html).toContain('class="desktop-titlebar"')
    expect(html).toContain('src="/logo.svg"')
    expect(html).toContain('id="root"')
    expect(html).not.toContain('manifest.webmanifest')
  })
})
