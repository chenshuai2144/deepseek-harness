/** Package-owned invariant companion for the Git seam. @module @deepseek-ai/dsh-git/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-git'

/** Cordis companion plugin name. */
export const name = 'git-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this stateless Service Definition owns the capability
 * vocabulary, while the local provider and the RPC consumer own observations.
 */
const install: InvariantInstaller = () => {}

/**
 * Register the Git invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
