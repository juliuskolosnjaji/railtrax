/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // db-hafas and hafas-client are ESM-only — exclude from webpack bundling
    // so they can be loaded natively in the Node.js API route runtime.
    // (Next.js 14 key; renamed to serverExternalPackages in Next.js 15)
    serverComponentsExternalPackages: ['db-vendo-client'],
  },
}

export default nextConfig
