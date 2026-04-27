import { Navbar } from '@/components/layout/Navbar'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        </>
    )
}