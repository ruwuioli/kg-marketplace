import type { Config } from 'tailwindcss'

import { baseConfig } from '@kgm/config/tailwind.base'

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  ...baseConfig,
}

export default config
