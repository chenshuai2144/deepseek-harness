/**
 * fs domain zod schemas (names derived from map keys).
 */

import { z } from 'zod'
import type { FsDirEntryView } from './fs.ts'
import type { RequestPayload, ResponseValue } from './rpc-map.ts'
import type { Wire } from './rpc.schema.ts'

/** One listed child shared by directory listings. */
export const fsDirEntryViewSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(['file', 'directory', 'other']),
}) satisfies z.ZodType<Wire<FsDirEntryView>>

/** fs.listDir request payload. */
export const fsListDirRequestSchema = z.object({
  cwd: z.string().min(1),
  path: z.string().optional(),
}) satisfies z.ZodType<Wire<RequestPayload<'fs.listDir'>>>

/** fs.listDir response value. */
export const fsListDirValueSchema = z.object({
  path: z.string(),
  entries: z.array(fsDirEntryViewSchema),
}) satisfies z.ZodType<Wire<ResponseValue<'fs.listDir'>>>

/** fs.readText request payload. */
export const fsReadTextRequestSchema = z.object({
  cwd: z.string().min(1),
  path: z.string().min(1),
}) satisfies z.ZodType<Wire<RequestPayload<'fs.readText'>>>

/** fs.readText response value. */
export const fsReadTextValueSchema = z.object({
  path: z.string(),
  text: z.string(),
  truncated: z.boolean(),
}) satisfies z.ZodType<Wire<ResponseValue<'fs.readText'>>>
