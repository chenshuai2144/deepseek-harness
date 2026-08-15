/**
 * git domain zod schemas (names derived from map keys).
 */

import { z } from 'zod'
import type { GitChange } from './git.ts'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'

/** One changed path shared by status lists. */
export const gitChangeSchema = z.object({
  path: z.string(),
  status: z.string(),
  originalPath: z.string().optional(),
}) satisfies z.ZodType<Wire<GitChange>>

/** git.status request payload. */
export const gitStatusRequestSchema = z.object({
  cwd: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'git.status'>>>

/** git.status response value. */
export const gitStatusValueSchema = z.object({
  branch: z.string(),
  ahead: z.number().int(),
  behind: z.number().int(),
  staged: z.array(gitChangeSchema),
  unstaged: z.array(gitChangeSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'git.status'>>>

/** git.diff request payload. */
export const gitDiffRequestSchema = z.object({
  cwd: z.string().min(1),
  path: z.string().min(1),
  staged: z.boolean(),
}) satisfies z.ZodType<Wire<RequestPayload<'git.diff'>>>

/** git.diff response value. */
export const gitDiffValueSchema = z.object({
  path: z.string(),
  oldText: z.string().nullable(),
  newText: z.string(),
}) satisfies z.ZodType<Wire<ResponseValue<'git.diff'>>>

/** git.stage request payload. */
export const gitStageRequestSchema = z.object({
  cwd: z.string().min(1),
  paths: z.array(z.string().min(1)),
}) satisfies z.ZodType<Wire<RequestPayload<'git.stage'>>>

/** git.stage response value. */
export const gitStageValueSchema = z.object({
  ok: z.literal(true),
}) satisfies z.ZodType<Wire<ResponseValue<'git.stage'>>>

/** git.unstage request payload. */
export const gitUnstageRequestSchema = z.object({
  cwd: z.string().min(1),
  paths: z.array(z.string().min(1)),
}) satisfies z.ZodType<Wire<RequestPayload<'git.unstage'>>>

/** git.unstage response value. */
export const gitUnstageValueSchema = z.object({
  ok: z.literal(true),
}) satisfies z.ZodType<Wire<ResponseValue<'git.unstage'>>>

/** git.commit request payload. */
export const gitCommitRequestSchema = z.object({
  cwd: z.string().min(1),
  message: z.string(),
}) satisfies z.ZodType<Wire<RequestPayload<'git.commit'>>>

/** git.commit response value. */
export const gitCommitValueSchema = z.object({
  commit: z.string(),
}) satisfies z.ZodType<Wire<ResponseValue<'git.commit'>>>

/** git.branch request payload. */
export const gitBranchRequestSchema = z.object({
  cwd: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'git.branch'>>>

/** git.branch response value. */
export const gitBranchValueSchema = z.object({
  name: z.string(),
}) satisfies z.ZodType<Wire<ResponseValue<'git.branch'>>>
