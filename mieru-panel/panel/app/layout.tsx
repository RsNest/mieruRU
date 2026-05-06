import type { Metadata } from 'next'
import {
  Montserrat,
  Unbounded,
  Fira_Mono,
  Noto_Sans_JP,
  Sacramento,
} from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'

const montserrat = Montserrat({
  variable: '--font-mont',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})
const unbounded = Unbounded({
  variable: '--font-unbounded',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700'],
  display: 'swap',
})
const firaMono = Fira_Mono({
  variable: '--font-fira',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  display: 'swap',
})
const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-jp',
  subsets: ['latin'],
  weight: ['300', '400'],
  display: 'swap',
})
const sacramento = Sacramento({
  variable: '--font-sacramento',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
})

const fontVars = [
  montserrat.variable,
  unbounded.variable,
  firaMono.variable,
  notoSansJP.variable,
  sacramento.variable,
].join(' ')

export const metadata: Metadata = {
  title: 'Mieru Panel',
  description: 'Mieru Panel',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${fontVars} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
