/**
 * ui-file plugin halves: dictionary and slot registrations against the real
 * SlotRegistry (fiber teardown proves removal), the inert node entry, and
 * the invariant companion's ownership reservation.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import { apply, inject } from '../src/client/index.ts'
import { apply as applyNode } from '../src/index.ts'
import * as FileInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'details.files': { kind: 'single', scope: 'session' },
      'details.file': { kind: 'single', scope: 'session' },
    },
  } as never, () => null)
  ctx.provide('connection', {
    api: {
      fs: {
        listDir: vi.fn(),
        readText: vi.fn(),
      },
    },
    isLoopback: true,
  } as never)
  ctx.provide('layout', {
    openFileDetails: vi.fn(), openWorkspaceHome: vi.fn(), openFiles: vi.fn(), closeDetails: vi.fn(),
  })
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-file browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'layout'])
  })

  it('registers both File slots, and fiber teardown removes them', async () => {
    const { ctx, fiber } = await bench()
    expect(ctx.slots.entries('details.files')).toHaveLength(1)
    expect(ctx.slots.entries('details.file')).toHaveLength(1)
    await fiber.dispose()
    expect(ctx.slots.entries('details.files')).toHaveLength(0)
    expect(ctx.slots.entries('details.file')).toHaveLength(0)
  })

  it('registers both dictionaries under its own namespace and releases them with the fiber', async () => {
    const { ctx, fiber } = await bench()
    const translate = ctx.locale.bind(NS)
    expect(translate('title')).toBe(zh.title)
    ctx.locale.setLocale('en')
    expect(translate('title')).toBe(en.title)
    await fiber.dispose()
    expect(translate('title')).not.toBe(en.title)
  })

  it('keeps the English dictionary key-identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('binds fs RPC and layout writes through the slot inject faces', async () => {
    const { ctx } = await bench()
    const panel = ctx.slots.entries('details.files')[0]
    const preview = ctx.slots.entries('details.file')[0]
    const panelFace = panel?.inject?.() as {
      listDir: unknown
      openFileDetails: (selection: { path: string }) => void
      showHome: () => void
      closeDetails: () => void
    }
    const previewFace = preview?.inject?.() as {
      readText: unknown
      showFiles: () => void
      showHome: () => void
      closeDetails: () => void
    }
    expect(typeof panelFace.listDir).toBe('function')
    expect(typeof previewFace.readText).toBe('function')
    panelFace.openFileDetails({ path: 'src/a.ts' })
    panelFace.showHome()
    panelFace.closeDetails()
    previewFace.showFiles()
    previewFace.showHome()
    previewFace.closeDetails()
    expect(ctx.layout.openFileDetails).toHaveBeenCalledWith({ path: 'src/a.ts' })
    expect(ctx.layout.openWorkspaceHome).toHaveBeenCalledTimes(2)
    expect(ctx.layout.openFiles).toHaveBeenCalledTimes(1)
    expect(ctx.layout.closeDetails).toHaveBeenCalledTimes(2)
  })

})

describe('ui-file node half', () => {
  it('contributes no host behavior', () => {
    expect(applyNode).not.toThrow()
  })
})

describe('ui-file invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(FileInvariant)
    await fiber.await()
    expect(FileInvariant.name).toBe('client-ui-file-invariant')
    expect(FileInvariant.inject).toEqual(['invariants'])
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
