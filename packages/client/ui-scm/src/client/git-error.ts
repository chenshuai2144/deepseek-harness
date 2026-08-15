import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'

/**
 * Map a privileged git.* RPC error code to SCM product copy.
 * @param code - wire error code from the unary result.
 * @param t - scm-namespace translator.
 * @returns the operator-facing sentence for that code.
 */
export function gitFailureCopy(code: string, t: TranslateNS<typeof NS>): string {
  switch (code) {
    case 'git-not-a-repository': return t('error.notRepo')
    case 'git-not-found': return t('error.notFound')
    case 'git-unavailable': return t('error.unavailable')
    case 'git-empty-message': return t('error.emptyMessage')
    default: return t('error.failed')
  }
}
