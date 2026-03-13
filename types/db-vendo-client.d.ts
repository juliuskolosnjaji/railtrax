// db-vendo-client ships no TypeScript declarations; declare modules as any
// so TypeScript is satisfied while lib/hafas.ts uses them via dynamic import.
declare module 'db-vendo-client' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(profile: any, userAgent: string, opt?: any): any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createBusinessClient(profile: any, userAgent: string, opt?: any): any
}

declare module 'db-vendo-client/retry.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function withRetrying(profile: any, retryOpts?: any): any
}

declare module 'db-vendo-client/p/dbnav/index.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const profile: any
}
