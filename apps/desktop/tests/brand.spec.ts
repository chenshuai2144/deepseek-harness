/** Desktop product name and icon path. */

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  APP_USER_MODEL_ID,
  PRODUCT_NAME,
  resolveDesktopIcon,
  resolveDesktopRoot,
} from '../src/brand.ts'

describe('desktop brand chrome', () => {
  it('names the window DeepSeek Harness and points at the fish PNG', () => {
    const root = resolveDesktopRoot(new URL('../src/brand.ts', import.meta.url).href)
    expect(PRODUCT_NAME).toBe('DeepSeek Harness')
    expect(APP_USER_MODEL_ID).toBe('ai.deepseek.harness')
    expect(root).toMatch(/desktop$/)
    expect(existsSync(fileURLToPath(new URL('../icon.svg', import.meta.url)))).toBe(true)
    const icon = resolveDesktopIcon(root)
    expect(icon).toBeDefined()
    expect(icon).toMatch(process.platform === 'win32' ? /icon\.ico$/ : /icon\.png$/)
    expect(resolveDesktopIcon(fileURLToPath(new URL('.', import.meta.url)))).toBeUndefined()
  })
})
