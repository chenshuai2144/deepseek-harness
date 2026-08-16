/**
 * Desktop window chrome: product name and the fish icon beside the Electron
 * binary. Paths stay relative to `apps/desktop` so source launch and a later
 * packed tree resolve the same files.
 */

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Window title, app name, and taskbar grouping label. */
export const PRODUCT_NAME = 'DeepSeek Harness'

/** Windows AppUserModelID so the taskbar does not group under Electron. */
export const APP_USER_MODEL_ID = 'ai.deepseek.harness'

/**
 * Directory that holds `icon.png` / `icon.svg` (the desktop app root).
 * @param fromUrl - `import.meta.url` of a file under `apps/desktop/src`.
 * @returns the desktop app root.
 */
export function resolveDesktopRoot(fromUrl: string): string {
  return dirname(dirname(fileURLToPath(fromUrl)))
}

/**
 * Raster window icon. Electron on Windows cannot use SVG for BrowserWindow
 * and prefers ICO for the taskbar; other platforms use the PNG.
 * @param desktopRoot - `apps/desktop`.
 * @returns the icon path when a raster file exists.
 */
export function resolveDesktopIcon(desktopRoot: string): string | undefined {
  const names = process.platform === 'win32' ? ['icon.ico', 'icon.png'] : ['icon.png']
  for (const name of names) {
    const icon = join(desktopRoot, name)
    if (existsSync(icon)) return icon
  }
  return undefined
}
