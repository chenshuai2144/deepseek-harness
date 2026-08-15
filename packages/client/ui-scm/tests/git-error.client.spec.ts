import { describe, expect, it } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { gitFailureCopy } from '../src/client/git-error.ts'
import { zh } from '../src/client/locales.ts'

const t = makeTranslate(zh)

describe('gitFailureCopy', () => {
  it('maps each privileged git error code to product copy', () => {
    expect(gitFailureCopy('git-not-a-repository', t)).toBe(zh['error.notRepo'])
    expect(gitFailureCopy('git-not-found', t)).toBe(zh['error.notFound'])
    expect(gitFailureCopy('git-unavailable', t)).toBe(zh['error.unavailable'])
    expect(gitFailureCopy('git-empty-message', t)).toBe(zh['error.emptyMessage'])
    expect(gitFailureCopy('git-failed', t)).toBe(zh['error.failed'])
  })
})
