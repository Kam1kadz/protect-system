import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title:       process.env.NEXT_PUBLIC_SITE_NAME ?? 'KMGuard',
    description: 'Premium Minecraft Client',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
        <body className={`${inter.className} bg-[#0d0d0f] text-white antialiased`}>
        <Providers>
            {children}
        </Providers>
        <Toaster position="bottom-right" theme="dark" richColors />
        </body>
        </html>
    )
}