/** Desktop runtime glue and the overlay patch that drops HTTP. */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { apply, Config, desktopSurfacePrompt } from '../src/index.ts'
import * as DesktopAppInvariant from '../src/invariant.ts'

interface BashContribution {
  name: string
  variables: Record<string, { description: string }>
  resolve: () => Record<string, string>
}

describe('desktop-app overlay patch', () => {
  it('disables the HTTP carriage and pins the native directory picker', () => {
    const patch = readFileSync(fileURLToPath(new URL('../cordis.patch.yml', import.meta.url)), 'utf8')
    expect(patch).toMatch(/id: webserver\s+disabled: true/)
    expect(patch).toMatch(/id: web-startup\s+disabled: true/)
    expect(patch).toMatch(/id: web-runtime\s+disabled: true/)
    expect(patch).toMatch(/id: client-hmr\s+disabled: true/)
    expect(patch).toContain('id: connection')
    expect(patch).toContain("name: '@deepseek-ai/dsh-client-connection'")
    expect(patch).not.toContain('inject: [webRuntime]')
    expect(patch).toMatch(/id: connection[\s\S]*inject: \[\]/)
    expect(patch).toMatch(/id: directory-picker\s+disabled: true/)
    expect(patch).toContain('id: directory-picker-native')
    expect(patch).toContain("name: '@deepseek-ai/dsh-host-directory-picker-native'")
    expect(patch).toContain('id: desktop-runtime')
  })
})

describe('desktop-app runtime glue', () => {
  it('defaults surfaceContext to true', () => {
    expect(new Config({} as never).surfaceContext).toBe(true)
  })

  it('registers the desktop surface prompt and DSH_DESKTOP marker', async () => {
    const ctx = new Context()
    const contributions: BashContribution[] = []
    ctx.provide('shellEnv', {
      register: (contribution: BashContribution) => {
        contributions.push(contribution)
        return () => {}
      },
    } as never)
    apply(ctx, new Config({ surfaceContext: true }))
    await ctx.plugin(SystemPrompt, { persona: '' })
    await new Promise(resolve => setTimeout(resolve, 0))
    const assembly = await ctx.systemPrompt.assemble()
    expect(assembly.sections.find(entry => entry.name === 'harness:source')?.text)
      .toContain('DeepSeek Harness implementation checkout')
    expect(assembly.sections.find(entry => entry.name === 'app:desktop-surface')?.text)
      .toBe(desktopSurfacePrompt())
    expect(desktopSurfacePrompt()).toContain('desktop app')
    expect(desktopSurfacePrompt()).toContain('Do not start a replacement server')
    const marker = contributions.find(contribution => contribution.name === 'desktop-runtime')
    expect(marker?.resolve()).toEqual({ DSH_DESKTOP: '1' })
    await ctx.fiber.dispose()
  })

  it('skips the surface context when disabled', async () => {
    const ctx = new Context()
    const contributions: BashContribution[] = []
    ctx.provide('shellEnv', {
      register: (contribution: BashContribution) => {
        contributions.push(contribution)
        return () => {}
      },
    } as never)
    apply(ctx, new Config({ surfaceContext: false }))
    await ctx.plugin(SystemPrompt, { persona: '' })
    await new Promise(resolve => setTimeout(resolve, 0))
    const assembly = await ctx.systemPrompt.assemble()
    expect(assembly.sections.some(entry => entry.name === 'app:desktop-surface')).toBe(false)
    expect(assembly.sections.some(entry => entry.name === 'harness:source')).toBe(false)
    expect(contributions).toEqual([])
    await ctx.fiber.dispose()
  })
})

describe('desktop-app invariant companion', () => {
  it('registers its explained empty runtime invariant', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry)
    const fiber = await ctx.plugin(DesktopAppInvariant)
    expect(() => {
      ctx.invariants.register('@deepseek-ai/dsh-desktop-app', () => {})
    }).toThrow(/already registered/)
    await fiber.dispose()
    await ctx.fiber.dispose()
  })
})
