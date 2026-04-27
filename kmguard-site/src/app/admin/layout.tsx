'use client'
import { useAuthStore } from 'kmguard-site/src/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AdminSidebar } from 'kmguard-site/src/components/layout/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user } = useAuthStore()
    const router   = useRouter()

    useEffect(() => {
        if (!user || !['admin', 'support'].includes(user.role)) {
            router.push('/')
        }
    }, [user, router])

    if (!user || !['admin', 'support'].includes(user.role)) return null

    return (
        <div className="flex min-h-screen">
            <div className="w-56 shrink-0 border-r border-[--border] bg-[--surface] p-4">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[--muted]">
                    Admin Panel
                </p>
                <AdminSidebar />
            </div>
            <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
    )
}