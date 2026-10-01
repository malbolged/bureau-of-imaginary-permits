import './globals.css'

import type {Metadata, Viewport} from 'next'
import {Pixelify_Sans, Silkscreen, VT323} from 'next/font/google'

const pixelify = Pixelify_Sans({subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-pixelify', display: 'swap'})
const vt323 = VT323({subsets: ['latin'], weight: '400', variable: '--font-vt323', display: 'swap'})
const silkscreen = Silkscreen({subsets: ['latin'], weight: ['400', '700'], variable: '--font-silkscreen', display: 'swap'})

export const metadata: Metadata = {
  title: 'Bureau of Imaginary Permits',
  description:
    'Work a shift at the inspection window of the Bureau of Imaginary Permits. The AI clerk passed every file. Find what it missed, and stamp.',
}

export const viewport: Viewport = {themeColor: '#161513'}

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="en" className={`${pixelify.variable} ${vt323.variable} ${silkscreen.variable}`}>
      <body className="min-h-dvh font-pixel antialiased">{children}</body>
    </html>
  )
}
