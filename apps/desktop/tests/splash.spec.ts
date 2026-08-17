/** Immediate desktop loading document. */

import { describe, expect, it } from 'vitest'
import { createDesktopSplashUrl } from '../src/splash.ts'

describe('desktop splash', () => {
  it('contains product chrome and a loading status without external assets', () => {
    const url = createDesktopSplashUrl('DeepSeek Harness <desktop>', '<svg data-logo="fish"></svg>')
    expect(url).toMatch(/^data:text\/html/)
    const html = decodeURIComponent(url.slice(url.indexOf(',') + 1))
    expect(html).toContain('DeepSeek Harness &lt;desktop&gt;')
    expect(html).toContain('data-logo="fish"')
    expect(html).toContain('正在启动工作区…')
    expect(html).toContain('__DSH_DESKTOP_CHROME__')
    expect(html).not.toMatch(/src=["']https?:/)
  })
})
