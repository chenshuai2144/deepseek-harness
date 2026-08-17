/** Native-notification validation at the Electron renderer IPC entry point. */
import type { DesktopNotification } from '@deepseek-ai/dsh-client-connection'

const MAX_TITLE_LENGTH = 120
const MAX_BODY_LENGTH = 500

/**
 * Validate and bound a structured-clone value before passing it to Electron.
 * @param input - untrusted renderer IPC payload.
 * @returns a normalized notification, or undefined for an invalid payload.
 */
export function normalizeDesktopNotification(input: unknown): DesktopNotification | undefined {
  if (typeof input !== 'object' || input === null) return undefined
  const candidate = input as Record<string, unknown>
  if (typeof candidate.title !== 'string' || typeof candidate.body !== 'string') return undefined
  const title = candidate.title.trim()
  const body = candidate.body.trim()
  if (title === '' || body === '') return undefined
  return {
    title: title.slice(0, MAX_TITLE_LENGTH),
    body: body.slice(0, MAX_BODY_LENGTH),
  }
}
