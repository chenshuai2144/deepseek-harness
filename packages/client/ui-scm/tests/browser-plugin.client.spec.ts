/**
 * ui-scm plugin halves: dictionary and slot registrations against the real
 * SlotRegistry (fiber teardown proves removal), the inert node entry, and
 * the invariant companion's ownership reservation.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { stubSettingsScope } from '@deepseek-ai/dsh-client-test-runtime'
import { apply as applyLocale, inject as localeInject } from '@deepseek-ai/dsh-client-locale/client'
import { apply, Config, inject } from '../src/client/index.ts'
import { apply as applyNode } from '../src/index.ts'
import * as ScmInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'sidebar.scm': { kind: 'single', scope: 'root' },
      'details.scm': { kind: 'single', scope: 'session' },
      'sidebar.footer.action': { kind: 'list', scope: 'root' },
    },
  } as never, () => null)
  ctx.provide('connection', {
    api: {
      git: {
        status: vi.fn(),
        diff: vi.fn(),
        stage: vi.fn(),
        unstage: vi.fn(),
        commit: vi.fn(),
      },
    },
    isLoopback: true,
  } as never)
  ctx.provide('layout', { openScmDetails: vi.fn(), setSidebarView: vi.fn() })
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply, Config }, { refreshIntervalMs: 2_000 })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-scm browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'layout'])
  })

  it('registers both SCM slots, and fiber teardown removes them', async () => {
    const { ctx, fiber } = await bench()
    expect(ctx.slots.entries('sidebar.scm')).toHaveLength(1)
    expect(ctx.slots.entries('details.scm')).toHaveLength(1)
    expect(ctx.slots.entries('sidebar.footer.action')).toHaveLength(1)
    await fiber.dispose()
    expect(ctx.slots.entries('sidebar.scm')).toHaveLength(0)
    expect(ctx.slots.entries('details.scm')).toHaveLength(0)
    expect(ctx.slots.entries('sidebar.footer.action')).toHaveLength(0)
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

  it('binds git RPC and layout writes through the slot inject faces', async () => {
    const { ctx } = await bench()
    const panel = ctx.slots.entries('sidebar.scm')[0]
    const details = ctx.slots.entries('details.scm')[0]
    const panelFace = panel?.inject?.() as {
      openScmDetails: (selection: { path: string; staged: boolean }) => void
      refreshIntervalMs: number
    }
    const detailsFace = details?.inject?.() as { diff: unknown }
    expect(panelFace.refreshIntervalMs).toBe(2_000)
    expect(typeof detailsFace.diff).toBe('function')
    panelFace.openScmDetails({ path: 'a.ts', staged: false })
    expect(ctx.layout.openScmDetails).toHaveBeenCalledWith({ path: 'a.ts', staged: false })
  })
})

describe('ui-scm node half', () => {
  it('contributes no host behavior', () => {
    expect(applyNode).not.toThrow()
  })
})

describe('ui-scm invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(ScmInvariant)
    await fiber.await()
    expect(ScmInvariant.name).toBe('client-ui-scm-invariant')
    expect(ScmInvariant.inject).toEqual(['invariants'])
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
