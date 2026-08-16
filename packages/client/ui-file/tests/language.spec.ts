import { describe, expect, it } from 'vitest'
import { languageOf } from '../src/client/language.ts'

describe('languageOf', () => {
  it('returns the final extension and ignores dotfiles without one', () => {
    expect(languageOf('src/a.ts')).toBe('ts')
    expect(languageOf('README')).toBeUndefined()
    expect(languageOf('.env')).toBeUndefined()
    expect(languageOf('notes.')).toBeUndefined()
    expect(languageOf('dir/')).toBeUndefined()
  })
})
