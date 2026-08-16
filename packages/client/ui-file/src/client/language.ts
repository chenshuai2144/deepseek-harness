/**
 * Grammar hint for the file preview CodeBlock from a workspace-relative path.
 * @param path - workspace-relative path using `/`.
 * @returns the final extension, or undefined when the path has none.
 */
export function languageOf(path: string): string | undefined {
  const slash = path.lastIndexOf('/')
  const base = slash === -1 ? path : path.slice(slash + 1)
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return undefined
  return base.slice(dot + 1).toLowerCase()
}
