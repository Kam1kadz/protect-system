'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading]   = useState(false)
    const { setUser, setToken }   = useAuthStore()
    const router = useRouter()

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await authApi.login(email, password)
            setToken(res.data.access_token)
            const me = await authApi.me()
            setUser(me.data)
            router.push('/kmguard/profile')
        } catch {
            toast.error('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh', background: '#09090b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
            <div style={{ width: '100%', maxWidth: '360px' }}>

                {/* Logo */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'rgba(34,197,94,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <ShieldCheck size={24} color="#22c55e" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '17px' }}>Welcome back</div>
                        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '3px' }}>Sign in to your Arbuz Client account</div>
                    </div>
                </div>

                <div style={{
                    borderRadius: '16px', border: '1px solid #1c1c1f',
                    background: '#111113', padding: '24px',
                }}>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input label="Email" type="email" placeholder="you@example.com"
                            value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                        <Input label="Password" type="password" placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                        <div style={{ marginTop: '4px' }}>
                            <Button type="submit" loading={loading} style={{ width: '100%' }}>Sign In</Button>
                        </div>
                    </form>
                    <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: '12px', color: '#71717a' }}>
                        No account?{' '}
                        <Link href="/auth/register" style={{ color: '#22c55e', textDecoration: 'none' }}>Create one</Link>
                    </p>
                </div>

                <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px' }}>
                    <Link href="/kmguard" style={{ color: '#52525b', textDecoration: 'none' }}>← Back to home</Link>
                </p>
            </div>
        </div>
    )
}
