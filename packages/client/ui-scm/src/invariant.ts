/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-scm`.
 * @module @deepseek-ai/dsh-client-ui-scm/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-scm'

/** Cordis companion plugin name. */
export const name = 'client-ui-scm-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this package is a read-only projection of privileged
 * git.* RPC onto sidebar and details slots. It emits no cordis events and
 * owns no cross-plugin mutable state beyond the layout viewing-state writes
 * the SCM file click already makes through ctx.layout.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
