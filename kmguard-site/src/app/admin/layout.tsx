'use client'
import { useAuthStore } from '@/store/auth'
import { useRouter }    from 'next/navigation'
import { useEffect, useState } from 'react'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { authApi }      from '@/lib/api'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, setUser } = useAuthStore()
    const router = useRouter()
    const [ready, setReady] = useState(false)

    useEffect(() => {
        // Сначала подтягиваем свежие данные, потом проверяем права
        authApi.me()
            .then(res => {
                setUser(res.data)
                const role = res.data?.role
                if (!role || !['admin', 'support'].includes(role)) {
                    router.push('/')
                } else {
                    setReady(true)
                }
            })
            .catch(() => {
                router.push('/auth/login')
            })
    }, [])

    if (!ready) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', color: '#71717a', fontSize: '13px', gap: '10px',
            }}>
                <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    border: '2px solid #22c55e', borderTopColor: 'transparent',
                    animation: 'spin 0.7s linear infinite',
                }} />
                Loading admin panel...
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <div style={{
                width: '220px', flexShrink: 0,
                borderRight: '1px solid #1c1c1f',
                background: '#0a0a0b',
                padding: '20px 12px',
                display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', marginBottom: '8px',
                }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: 'rgba(34,197,94,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <span style={{ fontSize: '12px' }}>⚙</span>
                    </div>
                    <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#fafafa' }}>Admin Panel</div>
                        <div style={{ fontSize: '10px', color: '#71717a', textTransform: 'capitalize' }}>{user?.role}</div>
                    </div>
                </div>
                <AdminSidebar />
            </div>
            <main style={{ flex: 1, padding: '32px', overflow: 'auto', maxWidth: '100%' }}>
                {children}
            </main>
        </div>
    )
}
