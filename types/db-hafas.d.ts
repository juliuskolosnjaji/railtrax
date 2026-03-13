// db-hafas is ESM-only with no bundled TypeScript types.
// We use dynamic import with 'as string' to bypass webpack bundling (server-side only).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'db-hafas' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createHafas: (userAgent: string) => any
  export default createHafas
}
