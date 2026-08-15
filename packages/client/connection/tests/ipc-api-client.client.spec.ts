/** IpcApiClient over a fake IPC port (no Host fetch handler). */

import { describe, expect, it } from 'vitest'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api'
import { IpcApiClient } from '../src/client/ipc-api-client.ts'
import type { IpcFetchPort, IpcFetchRequest } from '../src/ipc-fetch.ts'

function describeValue() {
  return {
    version: '0.0.0',
    cwd: '/',
    attachedSessions: 0,
    canOpenPath: true,
  }
}

/** Port that answers host.describe as JSON and events.mux as one SSE frame. */
function cannedPort(): IpcFetchPort {
  const chunks = new Map<string, Uint8Array[]>()
  return {
    async start(message: IpcFetchRequest) {
      const url = new URL(message.url)
      if (url.pathname.endsWith('/host.describe')) {
        const body = JSON.parse(message.body ?? '{}') as { rpcId: string }
        return {
          status: 200,
          statusText: '',
          headers: { 'content-type': 'application/json' },
          streaming: false,
          body: JSON.stringify({
            type: 'server-response',
            rpcId: body.rpcId,
            result: { ok: true, value: describeValue() },
          }),
        }
      }
      if (url.pathname.endsWith('/events.mux')) {
        const encoder = new TextEncoder()
        chunks.set(message.requestId, [
          encoder.encode(': connected\n\n'),
          encoder.encode(`data: ${JSON.stringify({
            type: 'server-request',
            rpcId: 'mux-1',
            method: 'session/subscribed',
            payload: { type: 'session/subscribed', sessionId: 's1', lastSeq: 3 },
          })}\n\n`),
        ])
        return {
          status: 200,
          statusText: '',
          headers: { 'content-type': 'text/event-stream' },
          streaming: true,
        }
      }
      return { status: 404, statusText: 'not found', headers: {}, streaming: false, body: 'not found' }
    },
    async pull(requestId) {
      const queue = chunks.get(requestId)
      const chunk = queue?.shift()
      if (chunk === undefined) {
        chunks.delete(requestId)
        return { done: true }
      }
      return { done: false, chunk }
    },
    abort(requestId) {
      chunks.delete(requestId)
    },
  }
}

describe('IpcApiClient', () => {
  it('round-trips a unary call and an SSE mux stream over the IPC port', async () => {
    const client = new IpcApiClient(cannedPort())
    const described = await client.host.describe({})
    expect(described.result).toEqual({
      ok: true,
      value: describeValue(),
    })

    const frames = []
    for await (const frame of client.events.mux({}, new AbortController().signal)) {
      frames.push(frame)
    }
    expect(frames).toEqual([{
      rpcId: 'mux-1',
      payload: { type: 'session/subscribed', sessionId: 's1', lastSeq: 3 },
    }])
  })

  it('mints rpc ids through IpcApiClient', async () => {
    const client = new IpcApiClient(cannedPort(), 1_000)
    const response = await client.host.describe({})
    expect(response.rpcId).toBeDefined()
    expect(RpcId(String(response.rpcId))).toBe(response.rpcId)
  })
})
