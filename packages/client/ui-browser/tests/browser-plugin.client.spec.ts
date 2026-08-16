/**
 * ui-browser plugin halves: dictionary and slot registrations against the real
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
import * as BrowserInvariant from '../src/invariant.ts'
import { en, NS, zh } from '../src/client/locales.ts'

async function bench(): Promise<{ ctx: Context; fiber: ReturnType<Context['plugin']> }> {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.slots.register({
    name: 'root',
    children: {
      'details.browser': { kind: 'single', scope: 'session' },
    },
  } as never, () => null)
  ctx.provide('connection', { api: {}, isLoopback: true } as never)
  ctx.provide('layout', {
    openBrowserPage: vi.fn(), openWorkspaceHome: vi.fn(), closeDetails: vi.fn(),
  })
  ctx.provide('remote', { $on: () => () => {} } as never)
  ctx.provide('settingsScope', { bind: () => stubSettingsScope().scope } as never)
  await ctx.plugin({ inject: localeInject, apply: applyLocale }).await()
  const fiber = ctx.plugin({ inject: [...inject], apply })
  await fiber.await()
  return { ctx, fiber }
}

describe('ui-browser browser half', () => {
  it('declares the services it binds', () => {
    expect(inject).toEqual(['slots', 'locale', 'layout'])
  })

  it('registers the Browser slot, and fiber teardown removes it', async () => {
    const { ctx, fiber } = await bench()
    expect(ctx.slots.entries('details.browser')).toHaveLength(1)
    await fiber.dispose()
    expect(ctx.slots.entries('details.browser')).toHaveLength(0)
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

  it('binds layout writes through the slot inject face', async () => {
    const { ctx } = await bench()
    const entry = ctx.slots.entries('details.browser')[0]
    const face = entry?.inject?.() as {
      openPage: (href: string) => void
      showHome: () => void
      closeDetails: () => void
      productOrigin?: string
    }
    face.openPage('https://example.com/')
    face.showHome()
    face.closeDetails()
    expect(ctx.layout.openBrowserPage).toHaveBeenCalledWith('https://example.com/')
    expect(ctx.layout.openWorkspaceHome).toHaveBeenCalledTimes(1)
    expect(ctx.layout.closeDetails).toHaveBeenCalledTimes(1)
  })
})

describe('ui-browser node half', () => {
  it('contributes no host behavior', () => {
    expect(applyNode).not.toThrow()
  })
})

describe('ui-browser invariant companion', () => {
  it('reserves package ownership under its declared companion name', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    const fiber = ctx.plugin(BrowserInvariant)
    await fiber.await()
    expect(BrowserInvariant.name).toBe('client-ui-browser-invariant')
    expect(BrowserInvariant.inject).toEqual(['invariants'])
    expect(() => { (ctx.emit as (event: string) => void)('slots/changed') }).not.toThrow()
    await fiber.dispose()
  })
})
