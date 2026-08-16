import { describe, expect, it } from 'vitest'
import { resolveBrowserHref } from '../src/client/href.ts'

describe('resolveBrowserHref', () => {
  it('accepts a bare host as https and an explicit http(s) URL', () => {
    expect(resolveBrowserHref('example.com')).toEqual({ ok: true, href: 'https://example.com/' })
    expect(resolveBrowserHref('  https://example.com/path  ')).toEqual({
      ok: true,
      href: 'https://example.com/path',
    })
    expect(resolveBrowserHref('http://example.com')).toEqual({ ok: true, href: 'http://example.com/' })
  })

  it('refuses empty, protocol-relative, unusable, and credentialed input', () => {
    expect(resolveBrowserHref('')).toEqual({ ok: false, reason: 'empty' })
    expect(resolveBrowserHref('   ')).toEqual({ ok: false, reason: 'empty' })
    expect(resolveBrowserHref('//example.com')).toEqual({ ok: false, reason: 'invalid' })
    expect(resolveBrowserHref('https://')).toEqual({ ok: false, reason: 'invalid' })
    expect(resolveBrowserHref('https://user:pass@example.com')).toEqual({ ok: false, reason: 'invalid' })
  })

  it('refuses non-http schemes', () => {
    expect(resolveBrowserHref('javascript:alert(1)')).toEqual({ ok: false, reason: 'protocol' })
    expect(resolveBrowserHref('data:text/html,hi')).toEqual({ ok: false, reason: 'protocol' })
    expect(resolveBrowserHref('file:///etc/passwd')).toEqual({ ok: false, reason: 'protocol' })
    expect(resolveBrowserHref('blob:https://example.com/1')).toEqual({ ok: false, reason: 'protocol' })
    expect(resolveBrowserHref('about:blank')).toEqual({ ok: false, reason: 'protocol' })
  })

  it('refuses loopback, localhost names, and the product origin', () => {
    expect(resolveBrowserHref('localhost')).toEqual({ ok: false, reason: 'loopback' })
    expect(resolveBrowserHref('https://foo.localhost/')).toEqual({ ok: false, reason: 'loopback' })
    expect(resolveBrowserHref('https://127.0.0.1/')).toEqual({ ok: false, reason: 'loopback' })
    expect(resolveBrowserHref('https://0.0.0.0/')).toEqual({ ok: false, reason: 'loopback' })
    expect(resolveBrowserHref('https://[::1]/')).toEqual({ ok: false, reason: 'loopback' })
    expect(resolveBrowserHref('https://[::ffff:127.0.0.1]/')).toEqual({ ok: false, reason: 'loopback' })
    expect(resolveBrowserHref('https://app.example/', 'https://app.example')).toEqual({
      ok: false,
      reason: 'loopback',
    })
    expect(resolveBrowserHref('https://example.com/', 'not a url')).toEqual({
      ok: true,
      href: 'https://example.com/',
    })
    expect(resolveBrowserHref('https://example.com/', '')).toEqual({
      ok: true,
      href: 'https://example.com/',
    })
  })
})
