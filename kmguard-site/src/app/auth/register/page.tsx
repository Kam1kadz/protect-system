'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
    const [username, setUsername] = useState('')
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading]   = useState(false)
    const router = useRouter()

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            await authApi.register(username, email, password)
            toast.success('Account created!')
            router.push('/auth/login')
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Registration failed')
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

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'rgba(34,197,94,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <ShieldCheck size={24} color="#22c55e" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '17px' }}>Create account</div>
                        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '3px' }}>Join Arbuz Client today</div>
                    </div>
                </div>

                <div style={{
                    borderRadius: '16px', border: '1px solid #1c1c1f',
                    background: '#111113', padding: '24px',
                }}>
                    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input label="Username" placeholder="arbuz_player"
                            value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
                        <Input label="Email" type="email" placeholder="you@example.com"
                            value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                        <Input label="Password" type="password" placeholder="Min 8 characters"
                            value={password} minLength={8} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
                        <div style={{ marginTop: '4px' }}>
                            <Button type="submit" loading={loading} style={{ width: '100%' }}>Create Account</Button>
                        </div>
                    </form>
                    <p style={{ margin: '16px 0 0', textAlign: 'center', fontSize: '12px', color: '#71717a' }}>
                        Already have an account?{' '}
                        <Link href="/auth/login" style={{ color: '#22c55e', textDecoration: 'none' }}>Sign in</Link>
                    </p>
                </div>

                <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px' }}>
                    <Link href="/kmguard" style={{ color: '#52525b', textDecoration: 'none' }}>← Back to home</Link>
                </p>
            </div>
        </div>
    )
}
