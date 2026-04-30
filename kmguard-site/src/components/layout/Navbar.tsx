'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { authApi } from '@/lib/api'
import { ShieldCheck, Store, User, LayoutDashboard, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
    const { user, clear } = useAuthStore()
    const router  = useRouter()
    const path    = usePathname()
    const [open, setOpen] = useState(false)

    async function logout() {
        await authApi.logout().catch(() => {})
        clear()
        router.push('/auth/login')
    }

    const navLinks = [
        { href: '/kmguard/store', label: 'Store', icon: <Store size={14} /> },
        ...(user ? [{ href: '/kmguard/profile', label: user.username, icon: <User size={14} /> }] : []),
        ...(user && ['admin','support'].includes(user.role)
            ? [{ href: '/admin', label: 'Admin', icon: <LayoutDashboard size={14} /> }]
            : []),
    ]

    return (
        <nav style={{
            position: 'sticky', top: 0, zIndex: 50,
            borderBottom: '1px solid #1c1c1f',
            background: 'rgba(9,9,11,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
        }}>
            <div style={{
                maxWidth: '1152px', margin: '0 auto',
                padding: '0 16px', height: '56px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Logo */}
                <Link href="/kmguard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(34,197,94,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <ShieldCheck size={15} color="#22c55e" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#fafafa', letterSpacing: '0.02em' }}>
                        Arbuz Client
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {navLinks.map(l => (
                        <Link key={l.href} href={l.href} style={{
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '13px', fontWeight: 500,
                            color: path === l.href ? '#fafafa' : '#71717a',
                            transition: 'color 0.15s',
                        }}>
                            {l.icon}{l.label}
                        </Link>
                    ))}
                </div>

                {/* Auth */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    {user ? (
                        <Button variant="ghost" size="sm" onClick={logout}>
                            <LogOut size={13} /> Logout
                        </Button>
                    ) : (
                        <>
                            <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                                <Button variant="ghost" size="sm">Login</Button>
                            </Link>
                            <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                                <Button size="sm">Sign Up</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}
