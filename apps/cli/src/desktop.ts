/**
 * Launch the Electron desktop shell from a repository checkout.
 * @module @deepseek-ai/dsh/desktop
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Options forwarded into the Host process environment. */
export interface RunDesktopOptions {
  /** Extra patch overlays after the desktop profile layer. */
  patches: readonly string[]
  /** Inner arguments for the booted desktop host. */
  args: readonly string[]
}

/**
 * Resolve the desktop app directory beside this CLI package.
 * @param cliRoot - `apps/cli` (the directory that contains this file's package.json).
 * @returns the desktop app root, or undefined when the sibling is absent.
 */
export function resolveDesktopApp(cliRoot: string): string | undefined {
  const desktopRoot = join(cliRoot, '..', 'desktop')
  return existsSync(join(desktopRoot, 'package.json')) ? desktopRoot : undefined
}

/**
 * Resolve the Electron binary from the desktop app's dependencies.
 * @param desktopRoot - `apps/desktop`.
 * @returns the executable path.
 */
export function resolveElectronBinary(desktopRoot: string): string {
  const require = createRequire(join(desktopRoot, 'package.json'))
  return require('electron') as string
}

/**
 * Resolve the JS bootstrap Electron loads (tsx registers inside that file).
 * @param desktopRoot - `apps/desktop`.
 * @returns the bootstrap path.
 */
export function resolveElectronMain(desktopRoot: string): string {
  return join(desktopRoot, 'electron-main.mjs')
}

/**
 * Spawn Electron against the desktop main entry and wait for it to exit.
 * @param options - patches and host arguments.
 */
export async function runDesktop(options: RunDesktopOptions): Promise<void> {
  const cliRoot = fileURLToPath(new URL('..', import.meta.url))
  const desktopRoot = resolveDesktopApp(cliRoot)
  if (desktopRoot === undefined) {
    console.error('dsh desktop: the Electron shell is only available from a repository checkout')
    process.exitCode = 1
    return
  }
  let electron: string
  try {
    electron = resolveElectronBinary(desktopRoot)
  } catch {
    console.error('dsh desktop: electron is not installed; run pnpm install from the repository root')
    process.exitCode = 1
    return
  }
  const child = spawn(electron, [resolveElectronMain(desktopRoot)], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DSH_DESKTOP_PATCHES: JSON.stringify(options.patches),
      DSH_DESKTOP_ARGS: JSON.stringify(options.args),
    },
    cwd: desktopRoot,
  })
  const code = await new Promise<number>((resolve) => {
    child.on('exit', (exitCode) => {
      resolve(exitCode ?? 1)
    })
    child.on('error', () => { resolve(1) })
  })
  process.exitCode = code
}
