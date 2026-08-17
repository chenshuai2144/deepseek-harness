import { describe, expect, it } from 'vitest'
import { normalizeDesktopNotification } from '../src/notification.ts'

describe('normalizeDesktopNotification', () => {
  it('trims and accepts a notification payload', () => {
    expect(normalizeDesktopNotification({ title: ' Task ', body: ' Finished ' })).toEqual({
      title: 'Task',
      body: 'Finished',
    })
  })

  it.each([
    undefined,
    null,
    {},
    { title: '', body: 'done' },
    { title: 'task', body: 1 },
  ])('rejects invalid renderer input %#', (input) => {
    expect(normalizeDesktopNotification(input)).toBeUndefined()
  })

  it('bounds text sent to the operating system', () => {
    const normalized = normalizeDesktopNotification({ title: 't'.repeat(200), body: 'b'.repeat(600) })
    expect(normalized?.title).toHaveLength(120)
    expect(normalized?.body).toHaveLength(500)
  })
})
