/** Host IPC fetch dispatcher and the shared createIpcFetch serializer. */

import { describe, expect, it } from 'vitest'
import { createIpcFetch, type IpcFetchPort, type IpcFetchRequest } from '../src/ipc-fetch.ts'
import { dispatchIpcFetch } from '../src/ipc-fetch-host.ts'
import type { FetchHandler } from '../src/http-bridge.ts'

/** In-process IPC port that talks to a FetchHandler through the real serializer. */
function loopbackPort(handler: FetchHandler): IpcFetchPort {
  const streams = new Map<string, ReadableStreamDefaultReader<Uint8Array>>()
  const aborts = new Map<string, AbortController>()
  return {
    async start(message: IpcFetchRequest) {
      const abort = new AbortController()
      aborts.set(message.requestId, abort)
      const dispatched = await new Promise<Awaited<ReturnType<typeof dispatchIpcFetch>>>((resolve, reject) => {
        const onAbort = (): void => {
          const reason: unknown = abort.signal.reason
          reject(reason instanceof Error ? reason : new Error(typeof reason === 'string' ? reason : 'aborted'))
        }
        if (abort.signal.aborted) {
          onAbort()
          return
        }
        abort.signal.addEventListener('abort', onAbort, { once: true })
        void dispatchIpcFetch(handler, message, abort.signal).then(resolve, reject)
      })
      if (dispatched.body !== undefined) streams.set(message.requestId, dispatched.body.getReader())
      return dispatched.head
    },
    async pull(requestId) {
      const reader = streams.get(requestId)
      if (reader === undefined) return { done: true }
      const next = await reader.read()
      if (next.done) {
        streams.delete(requestId)
        return { done: true }
      }
      return { done: false, chunk: next.value }
    },
    abort(requestId) {
      aborts.get(requestId)?.abort()
      const reader = streams.get(requestId)
      streams.delete(requestId)
      void reader?.cancel()
    },
  }
}

/** Handler that answers one unary JSON POST and one SSE GET. */
function fixtureHandler(): FetchHandler {
  return {
    async fetch(request) {
      const pathname = new URL(request.url).pathname
      if (pathname.endsWith('/host.describe') && request.method === 'POST') {
        const body = await request.json() as { rpcId: string }
        return Response.json({
          type: 'server-response',
          rpcId: body.rpcId,
          result: {
            ok: true,
            value: {
              version: '0.0.0',
              cwd: '/',
              attachedSessions: 0,
              canOpenPath: true,
            },
          },
        })
      }
      if (pathname.endsWith('/events.mux') && request.method === 'GET') {
        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(': connected\n\n'))
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'server-request',
              rpcId: 'mux-1',
              method: 'session/subscribed',
              payload: { type: 'session/subscribed', sessionId: 's1', lastSeq: 3 },
            })}\n\n`))
            controller.close()
          },
        })
        return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
      }
      return new Response('not found', { status: 404 })
    },
  }
}

describe('dispatchIpcFetch', () => {
  it('rejects an already-aborted signal and accepts string or empty abort reasons', async () => {
    const port = loopbackPort(fixtureHandler())
    const fetchImpl = createIpcFetch(port)
    const aborted = new AbortController()
    aborted.abort('stopped')
    await expect(fetchImpl(new URL('http://dsh.internal/api/host.describe'), {
      method: 'POST',
      body: '{}',
      signal: aborted.signal,
    })).rejects.toThrow('stopped')

    const empty = new AbortController()
    empty.abort()
    await expect(fetchImpl(new URL('http://dsh.internal/api/host.describe'), {
      method: 'POST',
      body: '{}',
      signal: empty.signal,
    })).rejects.toThrow('This operation was aborted')
  })

  it('aborts an in-flight stream and keeps caller-supplied Host and Accept', async () => {
    const seen: IpcFetchRequest[] = []
    const hanging: FetchHandler = {
      fetch: () => new Promise(() => undefined),
    }
    const inner = loopbackPort(hanging)
    const port: IpcFetchPort = {
      start(message) {
        seen.push(message)
        return inner.start(message)
      },
      pull: requestId => inner.pull(requestId),
      abort: requestId => inner.abort(requestId),
    }
    const fetchImpl = createIpcFetch(port)
    const abort = new AbortController()
    const pending = fetchImpl(new URL('http://dsh.internal/api/events.host'), {
      headers: { accept: 'text/event-stream', host: '127.0.0.1:9' },
      signal: abort.signal,
    })
    abort.abort(new Error('cancel stream'))
    await expect(pending).rejects.toThrow('cancel stream')
    expect(seen[0]?.headers.accept).toBe('text/event-stream')
    expect(seen[0]?.headers.host).toBe('127.0.0.1:9')
  })

  it('cancels a streaming body and treats a missing pull reader as done', async () => {
    const encoder = new TextEncoder()
    const handler: FetchHandler = {
      fetch: async () => new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {}\n\n'))
        },
      }), { headers: { 'content-type': 'text/event-stream' } }),
    }
    const port = loopbackPort(handler)
    const response = await createIpcFetch(port)(new URL('http://dsh.internal/api/events.host'))
    await response.body?.cancel()
    expect(await port.pull('missing-reader')).toEqual({ done: true })
  })

  it('adds default Host on the Host dispatcher when the renderer omitted it', async () => {
    let host: string | null = null
    const handler: FetchHandler = {
      async fetch(request) {
        host = request.headers.get('host')
        return new Response('ok', { status: 200 })
      },
    }
    const dispatched = await dispatchIpcFetch(handler, {
      requestId: 'no-host',
      url: 'http://dsh.internal/api/respond',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }, new AbortController().signal)
    expect(host).toBe('127.0.0.1')
    expect(dispatched.head.streaming).toBe(false)
    expect(dispatched.head.status).toBe(200)
    expect(dispatched.head.body).toBe('ok')
  })

  it('rethrows a start failure when the caller did not abort', async () => {
    const port: IpcFetchPort = {
      start: async () => { throw new Error('host down') },
      pull: async () => ({ done: true }),
      abort: () => undefined,
    }
    await expect(createIpcFetch(port)(new URL('http://dsh.internal/api/host.describe'), {
      method: 'POST',
      body: '{}',
    })).rejects.toThrow('host down')
  })

  it('skips an empty stream pull and still closes', async () => {
    let pulls = 0
    const port: IpcFetchPort = {
      start: async () => ({
        status: 200,
        statusText: '',
        headers: { 'content-type': 'text/event-stream' },
        streaming: true,
      }),
      pull: async () => {
        pulls += 1
        return pulls === 1 ? { done: false } : { done: true }
      },
      abort: () => undefined,
    }
    const response = await createIpcFetch(port)(new URL('http://dsh.internal/api/events.host'))
    expect(await response.text()).toBe('')
  })
})
