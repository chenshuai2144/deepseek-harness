'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('__DSH_DESKTOP__', {
  start: (message) => ipcRenderer.invoke('dsh:fetch-start', message),
  pull: (requestId) => ipcRenderer.invoke('dsh:fetch-pull', requestId),
  abort: (requestId) => { ipcRenderer.send('dsh:fetch-abort', requestId) },
  bootGraph: () => ipcRenderer.invoke('dsh:boot-graph'),
  readBundle: (url) => ipcRenderer.invoke('dsh:read-bundle', url),
})
