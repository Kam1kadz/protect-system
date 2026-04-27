import { Navbar } from '@/components/layout/Navbar'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[--bg]">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
            <footer className="border-t border-[--border] mt-16">
                <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[--muted-2]">
                    <span>© 2026 Arbuz Client. All rights reserved.</span>
                    <div className="flex gap-4">
                        <a href="/kmguard/documents/terms" className="hover:text-[--muted]">Terms</a>
                        <a href="/kmguard/documents/privacy" className="hover:text-[--muted]">Privacy</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
