'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { authApi } from '@/lib/api'
import { ShieldCheck, Store, User, LayoutDashboard, LogOut } from 'lucide-react'

export function Navbar() {
    const { user, clear } = useAuthStore()
    const router  = useRouter()
    const path    = usePathname()

    async function logout() {
        await authApi.logout().catch(() => {})
        clear()
        router.push('/auth/login')
    }

    const link = (href: string, label: string, icon: React.ReactNode) => (
        <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
                path === href ? 'text-[--text]' : 'text-[--muted] hover:text-[--text]'
            }`}
        >
            {icon}{label}
        </Link>
    )

    return (
        <nav className="sticky top-0 z-50 border-b border-[--border] bg-[--bg]/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">

                {/* Logo */}
                <Link href="/kmguard" className="flex items-center gap-2 group">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[--accent]/15 group-hover:bg-[--accent]/25 transition-colors">
                        <ShieldCheck size={15} className="text-[--accent]" />
                    </div>
                    <span className="font-bold text-sm tracking-wide">Arbuz Client</span>
                </Link>

                {/* Nav links */}
                <div className="hidden sm:flex items-center gap-5">
                    {link('/kmguard/store', 'Store', <Store size={14}/>)}
                    {user && link('/kmguard/profile', user.username, <User size={14}/>)}
                    {user && ['admin','support'].includes(user.role) && link('/admin', 'Admin', <LayoutDashboard size={14}/>)}
                </div>

                {/* Auth */}
                <div className="flex items-center gap-2">
                    {user ? (
                        <Button variant="ghost" size="sm" onClick={logout}>
                            <LogOut size={14}/> Logout
                        </Button>
                    ) : (
                        <>
                            <Link href="/auth/login">
                                <Button variant="ghost" size="sm">Login</Button>
                            </Link>
                            <Link href="/auth/register">
                                <Button size="sm">Sign Up</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
