/**
 * fs domain contract. Privileged loopback-only methods that list and read
 * workspace files for the File pane. The client submits the session workspace
 * root as `cwd`; the host never resolves a relative path against process.cwd.
 */

import type { RpcRequest, RpcResponse } from './rpc.ts'

/** One direct child of a listed workspace directory. */
export interface FsDirEntryView {
  /** Basename inside the listed directory. */
  name: string
  /** Path relative to the workspace root, using `/`. */
  path: string
  /** Resolved child kind. */
  type: 'file' | 'directory' | 'other'
}

/** fs.listDir response value. */
export interface FsDirListing {
  /** Listed directory relative to the workspace root, or `''` for the root. */
  path: string
  /** Direct children in the backend's stable name order, excluding escapes. */
  entries: FsDirEntryView[]
}

/** fs.readText response value. */
export interface FsFileText {
  /** Path relative to the workspace root, using `/`. */
  path: string
  /** Decoded UTF-8 text, possibly a leading prefix when truncated. */
  text: string
  /** True when the complete file exceeded the preview byte cap. */
  truncated: boolean
}

/** Filesystem-domain unary methods (the map key fs.* of RpcMethodMap). */
export interface FsApi {
  /** List one workspace directory, including files. */
  listDir(
    request: RpcRequest<{ cwd: string; path?: string }>,
    signal: AbortSignal,
  ): Promise<RpcResponse<FsDirListing>>

  /** Read one workspace text file for an in-pane preview. */
  readText(
    request: RpcRequest<{ cwd: string; path: string }>,
    signal: AbortSignal,
  ): Promise<RpcResponse<FsFileText>>
}
