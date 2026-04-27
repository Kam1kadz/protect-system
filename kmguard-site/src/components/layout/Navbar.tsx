'use client'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { authApi } from '@/lib/api'
import { useRouter } from 'next/navigation'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'KMGuard'

export function Navbar() {
    const { user, clear } = useAuthStore()
    const router = useRouter()

    async function logout() {
        await authApi.logout().catch(() => {})
        clear()
        router.push('/auth/login')
    }

    return (
        <nav className="sticky top-0 z-50 border-b border-[--border] bg-[#0d0d0f]/80 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href="/" className="text-lg font-bold text-white">
                    {SITE_NAME}
                </Link>

                <div className="flex items-center gap-2">
                    {user ? (
                        <>
                            <Link href="/store">
                                <Button variant="ghost" size="sm">Store</Button>
                            </Link>
                            <Link href="/profile">
                                <Button variant="ghost" size="sm">{user.username}</Button>
                            </Link>
                            {['admin', 'support'].includes(user.role) && (
                                <Link href="/admin">
                                    <Button variant="secondary" size="sm">Admin</Button>
                                </Link>
                            )}
                            <Button variant="ghost" size="sm" onClick={logout}>Logout</Button>
                        </>
                    ) : (
                        <>
                            <Link href="/store">
                                <Button variant="ghost" size="sm">Store</Button>
                            </Link>
                            <Link href="/auth/login">
                                <Button size="sm">Login</Button>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}