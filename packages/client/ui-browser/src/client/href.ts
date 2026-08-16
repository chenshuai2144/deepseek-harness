/** Accepted or rejected Simple Browser address. */

/** Why `resolveBrowserHref` refused the input. */
export type BrowserHrefReason = 'empty' | 'invalid' | 'protocol' | 'loopback'

/** Successful parse: an absolute http(s) URL. */
export interface BrowserHrefOk {
  /** Discriminant. */
  ok: true
  /** WHATWG serialization. */
  href: string
}

/** Failed parse. */
export interface BrowserHrefErr {
  /** Discriminant. */
  ok: false
  /** Failure class the pane maps onto copy. */
  reason: BrowserHrefReason
}

/** Result of resolving an address-bar string. */
export type BrowserHrefResult = BrowserHrefOk | BrowserHrefErr

const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/

/**
 * True when the host is loopback or a localhost name.
 * @param hostname - URL.hostname (IPv6 without brackets).
 * @returns whether the pane must refuse the host.
 */
function isLoopbackHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === '::1' || host === '0.0.0.0') return true
  if (host.startsWith('::ffff:127.') || host.startsWith('::ffff:7f')) return true
  return /^127(?:\.\d{1,3}){3}$/.test(host)
}

/**
 * Parse an address-bar string into an http(s) URL the iframe may load.
 * Bare hosts receive an `https://` prefix. javascript/data/file/blob/about,
 * credentials, loopback, and the product origin are refused.
 * @param input - raw address-bar text.
 * @param productOrigin - `window.location.origin` of the workbench, when known.
 * @returns the serialized href or a failure reason.
 */
export function resolveBrowserHref(input: string, productOrigin?: string): BrowserHrefResult {
  const trimmed = input.trim()
  if (trimmed === '') return { ok: false, reason: 'empty' }
  if (trimmed.startsWith('//')) return { ok: false, reason: 'invalid' }
  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`
  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    // `new URL` throws only for a syntactically unusable candidate.
    return { ok: false, reason: 'invalid' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'protocol' }
  }
  if (parsed.username !== '' || parsed.password !== '') {
    return { ok: false, reason: 'invalid' }
  }
  if (isLoopbackHost(parsed.hostname)) return { ok: false, reason: 'loopback' }
  if (productOrigin !== undefined && productOrigin !== '') {
    try {
      if (parsed.origin === new URL(productOrigin).origin) {
        return { ok: false, reason: 'loopback' }
      }
    } catch {
      // Callers pass `window.location.origin`. A malformed override cannot
      // match a parsed http(s) URL, so the same-origin check is skipped.
    }
  }
  return { ok: true, href: parsed.href }
}
