/** Package-owned invariant companion for the local Git provider. @module @deepseek-ai/dsh-git-local/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-git-local'

/** Cordis companion plugin name. */
export const name = 'git-local-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this provider talks to the host `git` binary; the
 * relationship it would check is the workspace tree, which the SCM consumer
 * observes through `status` rather than a cordis event stream.
 */
const install: InvariantInstaller = () => {}

/**
 * Register the local Git invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
