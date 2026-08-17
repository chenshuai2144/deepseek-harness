/**
 * Electron main process: forks the Host, serves the desktop-owned renderer
 * over a privileged custom scheme, and forwards renderer IPC to the Host.
 */

import { dirname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { fork, type ChildProcess } from 'node:child_process'
import { app, BrowserWindow, ipcMain, Notification, protocol } from 'electron'
import { injectBootManifest, type WebBootGraph } from '@deepseek-ai/dsh-client-modules'
import type { IpcFetchHead, IpcFetchPull, IpcFetchRequest } from '@deepseek-ai/dsh-client-connection'
import {
  APP_USER_MODEL_ID,
  PRODUCT_NAME,
  resolveDesktopIcon,
  resolveDesktopRendererIndex,
  resolveDesktopRoot,
} from './brand.ts'
import { normalizeDesktopNotification } from './notification.ts'
import type { HostToMain, MainToHost } from './protocol.ts'
import { createDesktopSplashUrl } from './splash.ts'

app.setName(PRODUCT_NAME)
if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID)
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'dsh-app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
])

/** One pair of ChildProcess listeners; concurrent RPC waiters share it. */
function attachHost(
  child: ChildProcess,
  onMessage: (message: HostToMain) => void,
): {
  send(message: MainToHost): void
  waitFor<T extends HostToMain['type']>(
    type: T,
    match?: (message: Extract<HostToMain, { type: T }>) => boolean,
  ): Promise<Extract<HostToMain, { type: T }>>
} {
  type Waiter = {
    type: HostToMain['type']
    match?: (message: HostToMain) => boolean
    resolve: (message: HostToMain) => void
    reject: (error: Error) => void
  }
  const waiters = new Set<Waiter>()
  let exitError: Error | undefined
  if (child.exitCode !== null || child.signalCode !== null) {
    exitError = new Error(`desktop host exited (${String(child.exitCode)})`)
  }
  child.on('message', (message: HostToMain) => {
    onMessage(message)
    for (const waiter of waiters) {
      if (waiter.type !== message.type) continue
      if (waiter.match !== undefined && !waiter.match(message)) continue
      waiters.delete(waiter)
      waiter.resolve(message)
      return
    }
  })
  child.once('exit', (code) => {
    exitError = new Error(`desktop host exited (${String(code)})`)
    for (const waiter of waiters) {
      waiter.reject(new Error(`${exitError.message} before ${waiter.type}`))
    }
    waiters.clear()
  })
  return {
    send(message) {
      child.send(message)
    },
    waitFor(type, match) {
      if (exitError !== undefined) {
        return Promise.reject(new Error(`${exitError.message} before ${type}`))
      }
      return new Promise((resolve, reject) => {
        waiters.add({
          type,
          ...match === undefined ? {} : { match: match as (message: HostToMain) => boolean },
          resolve: (message) => { resolve(message as never) },
          reject,
        })
      })
    },
  }
}

function resolveNodeExecutable(): string {
  return process.env.npm_node_execpath ?? process.env.NODE ?? 'node'
}

function forkHost(): ChildProcess {
  const hostPath = fileURLToPath(new URL('./host.ts', import.meta.url))
  return fork(hostPath, [], {
    execPath: resolveNodeExecutable(),
    execArgv: ['--import', 'tsx/esm'],
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    env: process.env,
  })
}

const streams = new Map<string, { chunks: Uint8Array[]; wait?: () => void; done: boolean; error?: string }>()

function enqueueChunk(requestId: string, chunk?: Uint8Array, done = false, error?: string): void {
  const state = streams.get(requestId) ?? { chunks: [], done: false }
  if (chunk !== undefined) state.chunks.push(chunk)
  if (done) state.done = true
  if (error !== undefined) state.error = error
  streams.set(requestId, state)
  const wake = state.wait
  delete state.wait
  wake?.()
}

async function startDesktop(): Promise<void> {
  const desktopRoot = resolveDesktopRoot(import.meta.url)
  const distIndex = resolveDesktopRendererIndex(desktopRoot)
  if (!existsSync(distIndex)) {
    throw new Error('dsh desktop: renderer not built; run pnpm --dir apps/desktop build')
  }
  const distRoot = dirname(distIndex)
  let desktopWindow: BrowserWindow | undefined
  const host = attachHost(forkHost(), (message) => {
    if (message.type === 'fetch-chunk') enqueueChunk(message.requestId, message.chunk)
    if (message.type === 'fetch-end') enqueueChunk(message.requestId, undefined, true)
    if (message.type === 'fetch-error') enqueueChunk(message.requestId, undefined, true, message.message)
  })
  const icon = resolveDesktopIcon(desktopRoot)
  if (process.platform === 'darwin' && icon !== undefined) {
    app.dock?.setIcon(icon)
  }
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    title: PRODUCT_NAME,
    frame: false,
    backgroundColor: '#171717',
    ...icon === undefined ? {} : { icon },
    autoHideMenuBar: true,
    webPreferences: {
      preload: fileURLToPath(new URL('../preload.cjs', import.meta.url)),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  desktopWindow = window
  window.on('closed', () => {
    desktopWindow = undefined
    host.send({ type: 'shutdown' })
  })
  ipcMain.on('dsh:window-minimize', () => { desktopWindow?.minimize() })
  ipcMain.on('dsh:window-toggle-maximize', () => {
    if (desktopWindow?.isMaximized()) desktopWindow.unmaximize()
    else desktopWindow?.maximize()
  })
  ipcMain.on('dsh:window-close', () => { desktopWindow?.close() })

  const splashUrl = createDesktopSplashUrl(PRODUCT_NAME, readFileSync(join(desktopRoot, 'icon.svg'), 'utf8'))
  const [ready] = await Promise.all([host.waitFor('ready'), window.loadURL(splashUrl)])
  const graph = ready.graph as WebBootGraph
  if (window.isDestroyed()) return

  ipcMain.handle('dsh:fetch-start', async (_event, message: IpcFetchRequest): Promise<IpcFetchHead> => {
    streams.set(message.requestId, { chunks: [], done: false })
    host.send({ type: 'fetch', message })
    const head = await host.waitFor('fetch-head', candidate => candidate.requestId === message.requestId)
    return head.head
  })
  ipcMain.handle('dsh:fetch-pull', async (_event, requestId: string): Promise<IpcFetchPull> => {
    const state = streams.get(requestId) ?? { chunks: [], done: false }
    while (state.chunks.length === 0 && !state.done) {
      await new Promise<void>((resolve) => { state.wait = resolve })
    }
    if (state.error !== undefined) throw new Error(state.error)
    const chunk = state.chunks.shift()
    if (chunk !== undefined) return { done: false, chunk }
    streams.delete(requestId)
    return { done: true }
  })
  ipcMain.on('dsh:fetch-abort', (_event, requestId: string) => {
    host.send({ type: 'fetch-abort', requestId })
    enqueueChunk(requestId, undefined, true)
  })
  ipcMain.handle('dsh:boot-graph', () => graph)
  ipcMain.handle('dsh:read-bundle', async (_event, url: string): Promise<string> => {
    const requestId = crypto.randomUUID()
    host.send({ type: 'read-bundle', requestId, url })
    const reply = await host.waitFor('bundle', candidate => candidate.requestId === requestId)
    if (reply.error !== undefined || reply.source === undefined) {
      throw new Error(reply.error ?? `bundle missing for ${url}`)
    }
    return reply.source
  })
  ipcMain.handle('dsh:notify', (_event, input: unknown): boolean => {
    const message = normalizeDesktopNotification(input)
    if (message === undefined) throw new Error('desktop notification payload is invalid')
    if (!Notification.isSupported()) return false
    const notification = new Notification(message)
    notification.on('click', () => {
      desktopWindow?.show()
      desktopWindow?.focus()
    })
    notification.show()
    return true
  })

  protocol.handle('dsh-app', async (request) => {
    const url = new URL(request.url)
    const pathname = decodeURIComponent(url.pathname)
    if (pathname === '/' || pathname === '/index.html') {
      const html = await import('node:fs/promises').then(fs => fs.readFile(distIndex, 'utf8'))
      return new Response(injectBootManifest(html, graph), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }
    if (pathname.startsWith('/plugins/')) {
      const requestId = crypto.randomUUID()
      host.send({ type: 'read-bundle', requestId, url: pathname })
      const reply = await host.waitFor('bundle', candidate => candidate.requestId === requestId)
      if (reply.source === undefined) return new Response(reply.error ?? 'not found', { status: 404 })
      return new Response(reply.source, { headers: { 'content-type': 'text/javascript; charset=utf-8' } })
    }
    const relative = pathname.startsWith('/') ? pathname.slice(1) : pathname
    const target = normalize(join(distRoot, relative))
    const root = normalize(distRoot) + sep
    if (!target.startsWith(root) && target !== normalize(distRoot)) {
      return new Response('forbidden', { status: 403 })
    }
    const { pathToFileURL } = await import('node:url')
    const { net } = await import('electron')
    return net.fetch(pathToFileURL(target).href)
  })

  await window.loadURL('dsh-app://app/index.html')
}

app.whenReady().then(() => startDesktop()).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  app.exit(1)
})
