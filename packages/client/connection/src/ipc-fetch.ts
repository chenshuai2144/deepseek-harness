/**
 * Structured-clone IPC fetch protocol. Subclasses of AbstractApiClient supply
 * only doFetch; this module is the serialization aspect shared by the desktop
 * shell and the in-process fake used by tests.
 */

/** One unary or streaming fetch started over the desktop IPC port. */
export interface IpcFetchRequest {
  /** Correlation id minted by the renderer; abort and pull reuse it. */
  requestId: string
  /** Absolute URL, including the fake `http://dsh.internal` authority. */
  url: string
  /** HTTP method. */
  method: string
  /** Lower-cased header map. */
  headers: Record<string, string>
  /** UTF-8 body for JSON POSTs; omitted for GET streams. */
  body?: string
}

/** Response head returned before any stream chunk. */
export interface IpcFetchHead {
  /** HTTP status. */
  status: number
  /** Reason phrase; may be empty. */
  statusText: string
  /** Lower-cased response header map. */
  headers: Record<string, string>
  /** Complete body when the response is not a stream. */
  body?: string
  /** True when further `pull` calls deliver body bytes. */
  streaming: boolean
}

/** One pull from a streaming IPC body. */
export interface IpcFetchPull {
  /** True when the stream has ended (successfully or after abort). */
  done: boolean
  /** Next body chunk; omitted on the terminal pull. */
  chunk?: Uint8Array
}

/** Renderer-side port the IpcApiClient uses as its doFetch transport. */
export interface IpcFetchPort {
  /** Start one request and return its response head. */
  start(message: IpcFetchRequest): Promise<IpcFetchHead>
  /** Read the next stream chunk; unused for non-streaming responses. */
  pull(requestId: string): Promise<IpcFetchPull>
  /** Cancel an in-flight request and its stream. */
  abort(requestId: string): void
}

/** Renderer request for one operating-system notification. */
export interface DesktopNotification {
  /** Notification heading. */
  title: string
  /** Short status description. */
  body: string
}

/** Preload bridge installed as `window.__DSH_DESKTOP__`. */
export interface DshDesktopBridge extends IpcFetchPort {
  /** Host-composed `window.__DSH_BOOT__` graph. */
  bootGraph(): Promise<unknown>
  /** Client-bundle source for one graph URL (`/plugins/<id>/client.js`). */
  readBundle(url: string): Promise<string>
  /** Ask the desktop shell to show one native notification. */
  notify(message: DesktopNotification): Promise<boolean>
}

/**
 * Build a WHATWG fetch function over an IPC port. GET requests default to
 * `Accept: text/event-stream` and `Host: 127.0.0.1` so the Host handler
 * serves SSE and treats the renderer as loopback.
 * @param port - structured-clone transport.
 * @returns doFetch-compatible fetch.
 */
export function createIpcFetch(port: IpcFetchPort): (input: URL, init?: RequestInit) => Promise<Response> {
  return async (input, init) => {
    const requestId = crypto.randomUUID()
    const headers = new Headers(init?.headers)
    const method = init?.method ?? 'GET'
    if (method === 'GET' && !headers.has('accept')) headers.set('accept', 'text/event-stream')
    if (!headers.has('host')) headers.set('host', '127.0.0.1')
    const headerMap: Record<string, string> = {}
    headers.forEach((value, key) => { headerMap[key] = value })
    const body = typeof init?.body === 'string' ? init.body : undefined
    const signal = init?.signal
    if (signal?.aborted) throw abortReason(signal)
    const onAbort = (): void => { port.abort(requestId) }
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      const head = await port.start({
        requestId,
        url: input.href,
        method,
        headers: headerMap,
        ...body === undefined ? {} : { body },
      })
      if (!head.streaming) {
        return new Response(head.body ?? '', {
          status: head.status,
          statusText: head.statusText,
          headers: head.headers,
        })
      }
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          const next = await port.pull(requestId)
          if (next.done) {
            controller.close()
            return
          }
          if (next.chunk !== undefined) controller.enqueue(next.chunk)
        },
        cancel() { port.abort(requestId) },
      })
      return new Response(stream, {
        status: head.status,
        statusText: head.statusText,
        headers: head.headers,
      })
    } catch (error) {
      if (signal?.aborted) throw abortReason(signal)
      throw error
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }
  }
}

/** Mirror fetch's abort rejection. */
function abortReason(signal: AbortSignal): Error {
  const reason: unknown = signal.reason
  if (reason instanceof Error) return reason
  if (typeof reason === 'string') return new Error(reason)
  return new Error('This operation was aborted')
}
