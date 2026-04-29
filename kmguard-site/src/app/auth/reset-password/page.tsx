'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
    const [step, setStep]           = useState<'request' | 'confirm'>('request')
    const [email, setEmail]         = useState('')
    const [token, setToken]         = useState('')
    const [newPw, setNewPw]         = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [loading, setLoading]     = useState(false)
    const [done, setDone]           = useState(false)

    async function requestReset(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            await api.post('/api/v1/auth/reset-password/request', { email })
            toast.success('If this email exists, a reset code was sent')
            setStep('confirm')
        } catch {
            // Не показываем ошибку — security best practice
            toast.success('If this email exists, a reset code was sent')
            setStep('confirm')
        } finally {
            setLoading(false)
        }
    }

    async function confirmReset(e: React.FormEvent) {
        e.preventDefault()
        if (newPw !== confirmPw) { toast.error('Passwords do not match'); return }
        setLoading(true)
        try {
            await api.post('/api/v1/auth/reset-password/confirm', { email, token, new_password: newPw })
            setDone(true)
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Invalid or expired token')
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
                        <div style={{ fontWeight: 700, fontSize: '17px' }}>Reset password</div>
                        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '3px' }}>Enter your email to receive a reset code</div>
                    </div>
                </div>

                <div style={{ borderRadius: '16px', border: '1px solid #1c1c1f', background: '#111113', padding: '24px' }}>
                    {done ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
                            <CheckCircle2 size={40} color="#22c55e" />
                            <div style={{ fontWeight: 600, fontSize: '15px' }}>Password updated!</div>
                            <div style={{ fontSize: '12px', color: '#71717a' }}>You can now sign in with your new password.</div>
                            <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                                <Button size="sm">Back to login</Button>
                            </Link>
                        </div>
                    ) : step === 'request' ? (
                        <form onSubmit={requestReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Input
                                label="Email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                            <Button type="submit" loading={loading} style={{ width: '100%' }}>Send reset code</Button>
                        </form>
                    ) : (
                        <form onSubmit={confirmReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#71717a', padding: '10px 12px', background: '#0d0d0f', borderRadius: '8px', border: '1px solid #1c1c1f' }}>
                                Code sent to <span style={{ color: '#fafafa' }}>{email}</span>
                            </div>
                            <Input
                                label="Reset code"
                                type="text"
                                placeholder="Enter code from email"
                                value={token}
                                onChange={e => setToken(e.target.value)}
                                required
                            />
                            <Input
                                label="New password"
                                type="password"
                                placeholder="Min 8 characters"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                                required
                            />
                            <Input
                                label="Confirm password"
                                type="password"
                                placeholder="Repeat new password"
                                value={confirmPw}
                                onChange={e => setConfirmPw(e.target.value)}
                                required
                            />
                            <Button type="submit" loading={loading} style={{ width: '100%' }}>Reset password</Button>
                            <button type="button" onClick={() => setStep('request')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', fontSize: '12px' }}>← Back</button>
                        </form>
                    )}
                </div>

                <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px' }}>
                    <Link href="/auth/login" style={{ color: '#52525b', textDecoration: 'none' }}>← Back to login</Link>
                </p>
            </div>
        </div>
    )
}
