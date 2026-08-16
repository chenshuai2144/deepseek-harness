import { describe, expect, it } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { fsFailureCopy } from '../src/client/fs-error.ts'
import { zh } from '../src/client/locales.ts'

const t = makeTranslate(zh)

describe('fsFailureCopy', () => {
  it('maps each fs.* wire code onto File-pane copy', () => {
    expect(fsFailureCopy('fs-unavailable', t)).toBe(zh['error.unavailable'])
    expect(fsFailureCopy('fs-not-found', t)).toBe(zh['error.notFound'])
    expect(fsFailureCopy('fs-not-directory', t)).toBe(zh['error.notDirectory'])
    expect(fsFailureCopy('fs-not-text', t)).toBe(zh['error.notText'])
    expect(fsFailureCopy('fs-not-regular-file', t)).toBe(zh['error.notFile'])
    expect(fsFailureCopy('fs-too-large', t)).toBe(zh['error.tooLarge'])
    expect(fsFailureCopy('fs-permission-denied', t)).toBe(zh['error.denied'])
    expect(fsFailureCopy('fs-failed', t)).toBe(zh['error.failed'])
    expect(fsFailureCopy('cancelled', t)).toBe(zh['error.failed'])
  })
})
