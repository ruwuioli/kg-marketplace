import type { Config } from 'tailwindcss'

export const baseConfig: Pick<Config, 'theme' | 'plugins'> = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
