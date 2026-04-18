import type { ReactNode } from 'react'

import './globals.css'

export const metadata = {
  title: 'KG Marketplace',
  description: 'Unified digital marketplace for Kyrgyzstan',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
