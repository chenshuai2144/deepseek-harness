/**
 * Desktop Host process: boots the `desktop` profile and serves fetch / boot
 * graph / client bundles over Node IPC. Analogous to VS Code's extension host.
 */

import { readFile } from 'node:fs/promises'
import { loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import { dispatchIpcFetch } from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-client-modules'
import { runProfile } from '../../cli/src/profile-boot.ts'
import type { HostToMain, MainToHost } from './protocol.ts'

const send = (message: HostToMain): void => {
  process.send?.(message)
}

const patches = JSON.parse(process.env.DSH_DESKTOP_PATCHES ?? '[]') as string[]
const args = JSON.parse(process.env.DSH_DESKTOP_ARGS ?? '[]') as string[]

const { ctx, shutdown } = await runProfile({
  environment: loadLayeredEnv('dsh'),
  profile: 'desktop',
  patchFiles: patches,
  args,
})

const connection = ctx.get('connection')
const modules = ctx.get('clientModules')
if (connection === undefined) {
  throw new Error('desktop host: ctx.connection is missing — the desktop profile did not mount connection')
}

const inflight = new Map<string, AbortController>()

const handle = async (message: MainToHost): Promise<void> => {
  if (message.type === 'shutdown') {
    await shutdown.shutdown(0)
    return
  }
  if (message.type === 'read-bundle') {
    const pathname = new URL(message.url, 'http://dsh.internal').pathname
    const match = /^\/plugins\/(.+)\/client\.js$/.exec(pathname)
    const id = match?.[1]
    const path = id === undefined ? undefined : modules?.clientPath(id)
    if (path === undefined) {
      send({ type: 'bundle', requestId: message.requestId, error: `unknown bundle ${pathname}` })
      return
    }
    try {
      send({ type: 'bundle', requestId: message.requestId, source: await readFile(path, 'utf8') })
    } catch (error) {
      send({ type: 'bundle', requestId: message.requestId, error: String(error) })
    }
    return
  }
  if (message.type === 'fetch-abort') {
    inflight.get(message.requestId)?.abort()
    return
  }
  const abort = new AbortController()
  inflight.set(message.message.requestId, abort)
  try {
    const dispatched = await dispatchIpcFetch(connection, message.message, abort.signal)
    send({ type: 'fetch-head', requestId: message.message.requestId, head: dispatched.head })
    if (dispatched.body === undefined) return
    const reader = dispatched.body.getReader()
    while (true) {
      const next = await reader.read()
      if (next.done) {
        send({ type: 'fetch-end', requestId: message.message.requestId })
        return
      }
      send({ type: 'fetch-chunk', requestId: message.message.requestId, chunk: next.value })
    }
  } catch (error) {
    send({ type: 'fetch-error', requestId: message.message.requestId, message: String(error) })
  } finally {
    inflight.delete(message.message.requestId)
  }
}

process.on('message', (message: MainToHost) => {
  void handle(message)
})
send({ type: 'ready', graph: modules?.graph() ?? { rev: '', entries: [] } })
