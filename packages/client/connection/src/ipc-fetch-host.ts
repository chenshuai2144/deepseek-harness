/**
 * Host-side IPC fetch dispatcher: turns a structured-clone request into a
 * WHATWG Request, runs the shared Connection fetch handler, and splits the
 * Response into a head plus optional byte stream.
 */

import type { FetchHandler } from './http-bridge.ts'
import type { IpcFetchHead, IpcFetchRequest } from './ipc-fetch.ts'

/** Result of dispatching one IPC fetch against the Host handler. */
export interface IpcFetchDispatch {
  /** Status, headers, and either a complete body or the streaming flag. */
  head: IpcFetchHead
  /** Streaming body, present only when `head.streaming` is true. */
  body?: ReadableStream<Uint8Array>
}

/**
 * Run one IPC request through the Host fetch handler.
 * @param handler - Connection's shared WHATWG fetch face.
 * @param message - structured-clone request from the renderer.
 * @param signal - abort signal tied to the IPC request id.
 * @returns response head and optional stream.
 */
export async function dispatchIpcFetch(
  handler: FetchHandler,
  message: IpcFetchRequest,
  signal: AbortSignal,
): Promise<IpcFetchDispatch> {
  const headers = new Headers(message.headers)
  if (!headers.has('host')) headers.set('host', '127.0.0.1')
  const request = new Request(message.url, {
    method: message.method,
    headers,
    ...message.body === undefined ? {} : { body: message.body },
    signal,
  })
  const response = await handler.fetch(request)
  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => { responseHeaders[key] = value })
  const contentType = response.headers.get('content-type') ?? ''
  const streaming = contentType.includes('text/event-stream') && response.body !== null
  if (streaming) {
    return {
      head: {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        streaming: true,
      },
      body: response.body ?? undefined,
    }
  }
  return {
    head: {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: await response.text(),
      streaming: false,
    },
  }
}
