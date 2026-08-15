/** Desktop launcher resolution: sibling checkout and Electron binary. */

import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveDesktopApp, resolveElectronBinary, resolveElectronMain } from '../src/desktop.ts'

describe('desktop launcher resolution', () => {
  let root: string | undefined

  afterEach(() => {
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
    root = undefined
  })

  it('resolves the checkout desktop app and its electron binary', () => {
    const cliRoot = fileURLToPath(new URL('..', import.meta.url))
    const desktopRoot = resolveDesktopApp(cliRoot)
    expect(desktopRoot).toBeDefined()
    expect(desktopRoot).toMatch(/desktop$/)
    expect(resolveElectronBinary(desktopRoot!)).toMatch(/electron/i)
    expect(resolveElectronMain(desktopRoot!)).toMatch(/electron-main\.mjs$/)
  })

  it('returns undefined when the sibling desktop app is absent', () => {
    root = mkdtempSync(join(tmpdir(), 'dsh-desktop-'))
    mkdirSync(join(root, 'cli'))
    expect(resolveDesktopApp(join(root, 'cli'))).toBeUndefined()
  })
})
