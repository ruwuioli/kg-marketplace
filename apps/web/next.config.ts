import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kgm/types', '@kgm/utils', '@kgm/ui'],
  experimental: {
    typedRoutes: true,
  },
}

export default config
