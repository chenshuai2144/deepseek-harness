/** Browser stand-in for the vendored loader's unreachable `node:module` import. */

/** Throw when a browser boot unexpectedly reaches Node module loading. */
export const createRequire = (): never => {
  throw new Error('node:module is not available in the desktop renderer')
}

/** Erased type peer for the loader's type-only import. */
export type LoadHookContext = never
