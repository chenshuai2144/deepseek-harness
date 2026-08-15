/** Desktop IPC API carrier: unary and SSE both travel through one doFetch. */

import { AbstractApiClient } from './api.ts'
import { createIpcFetch, type IpcFetchPort } from '../ipc-fetch.ts'

/**
 * Browser platform subclass for the Electron renderer: doFetch is the IPC
 * port; mux/host keep the base-class SSE reader.
 */
export class IpcApiClient extends AbstractApiClient {
  private readonly ipcFetch: (input: URL, init?: RequestInit) => Promise<Response>

  /**
   * @param port - preload `window.__DSH_DESKTOP__` (or a test fake).
   * @param timeoutMs - optional unary timeout forwarded to the base class.
   */
  constructor(port: IpcFetchPort, timeoutMs?: number) {
    super(timeoutMs)
    this.ipcFetch = createIpcFetch(port)
  }

  protected doFetch(input: URL, init?: RequestInit): Promise<Response> {
    return this.ipcFetch(input, init)
  }
}
