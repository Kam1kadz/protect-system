import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
    title: 'Arbuz Client',
    description: 'Premium Minecraft Cheat Client — Undetected, Fast, Feature-rich',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className={`${inter.variable} antialiased`} style={{ background: '#09090b', color: '#fafafa', margin: 0 }}>
        <Providers>
            {children}
        </Providers>
        <Toaster position="bottom-right" theme="dark" richColors />
        </body>
        </html>
    )
}
