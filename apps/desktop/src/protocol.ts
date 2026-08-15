/**
 * Structured messages between the Electron main process and the Host child.
 */

import type { IpcFetchHead, IpcFetchRequest } from '@deepseek-ai/dsh-client-connection'

/** Main → Host. */
export type MainToHost =
  | { type: 'fetch'; message: IpcFetchRequest }
  | { type: 'fetch-abort'; requestId: string }
  | { type: 'boot-graph' }
  | { type: 'read-bundle'; requestId: string; url: string }
  | { type: 'shutdown' }

/** Host → Main. */
export type HostToMain =
  | { type: 'ready' }
  | { type: 'fetch-head'; requestId: string; head: IpcFetchHead }
  | { type: 'fetch-chunk'; requestId: string; chunk: Uint8Array }
  | { type: 'fetch-end'; requestId: string }
  | { type: 'fetch-error'; requestId: string; message: string }
  | { type: 'boot-graph'; graph: unknown }
  | { type: 'bundle'; requestId: string; source?: string; error?: string }
