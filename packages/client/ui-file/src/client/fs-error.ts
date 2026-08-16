/** Map privileged fs.* wire codes onto File-pane copy. */

import type { FileKey } from './locales.ts'

/**
 * Localized empty-state copy for one fs.* failure.
 * @param code - wire error code from the RPC result.
 * @param t - file-namespace translator.
 * @returns the matching sentence, or the generic failure line.
 */
export function fsFailureCopy(code: string, t: (key: FileKey) => string): string {
  switch (code) {
    case 'fs-unavailable': return t('error.unavailable')
    case 'fs-not-found': return t('error.notFound')
    case 'fs-not-directory': return t('error.notDirectory')
    case 'fs-not-text': return t('error.notText')
    case 'fs-not-regular-file': return t('error.notFile')
    case 'fs-too-large': return t('error.tooLarge')
    case 'fs-permission-denied': return t('error.denied')
    default: return t('error.failed')
  }
}
