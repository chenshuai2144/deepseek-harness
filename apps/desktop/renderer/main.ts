/** Desktop renderer entry and native-window chrome wiring. */

import { AppWebEntry } from '@deepseek-ai/dsh-client-web'
import './desktop.css'

interface DesktopChromeBridge {
  minimize(): void
  toggleMaximize(): void
  close(): void
}

declare global {
  interface Window {
    __DSH_DESKTOP_CHROME__?: DesktopChromeBridge
  }
}

const chrome = window.__DSH_DESKTOP_CHROME__
if (chrome === undefined) throw new Error('desktop renderer: chrome bridge missing')

document.querySelector<HTMLElement>('.desktop-window-controls')?.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-window-action]')
  switch (button?.dataset.windowAction) {
    case 'minimize':
      chrome.minimize()
      break
    case 'maximize':
      chrome.toggleMaximize()
      break
    case 'close':
      chrome.close()
      break
    default:
      break
  }
})

const root = document.getElementById('root')
if (root === null) throw new Error('desktop renderer: missing #root')
void new AppWebEntry(root).run()
