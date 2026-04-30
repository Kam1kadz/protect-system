'use client'
import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShieldCheck, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
    const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request')
    const [email, setEmail] = useState('')
    const [token, setToken] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleRequest(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            await authApi.requestPasswordReset(email)
            toast.success('If this email exists, a reset code was sent')
            setStep('confirm')
        } catch {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    async function handleConfirm(e: React.FormEvent) {
        e.preventDefault()
        if (newPw !== confirm) { toast.error('Passwords do not match'); return }
        if (newPw.length < 8) { toast.error('Min 8 characters'); return }
        setLoading(true)
        try {
            await authApi.confirmPasswordReset(email, token, newPw)
            setStep('done')
        } catch {
            toast.error('Invalid or expired token')
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
                        <div style={{ fontWeight: 700, fontSize: '17px' }}>Reset Password</div>
                        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '3px' }}>
                            {step === 'request' && 'Enter your email to receive a reset code'}
                            {step === 'confirm' && 'Enter the code from your email'}
                            {step === 'done' && 'Your password has been updated'}
                        </div>
                    </div>
                </div>

                <div style={{
                    borderRadius: '16px', border: '1px solid #1c1c1f',
                    background: '#111113', padding: '24px',
                }}>

                    {step === 'request' && (
                        <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Input
                                label="Email address"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                            <Button type="submit" loading={loading} style={{ width: '100%' }}>Send Reset Code</Button>
                        </form>
                    )}

                    {step === 'confirm' && (
                        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <Input
                                label="Reset code"
                                type="text"
                                placeholder="Paste code from email"
                                value={token}
                                onChange={e => setToken(e.target.value.trim())}
                                required
                            />
                            <Input
                                label="New password"
                                type="password"
                                placeholder="••••••••"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                                required
                            />
                            <Input
                                label="Confirm new password"
                                type="password"
                                placeholder="••••••••"
                                value={confirm}
                                onChange={e => setConfirm(e.target.value)}
                                required
                            />
                            <Button type="submit" loading={loading} style={{ width: '100%' }}>Set New Password</Button>
                            <button
                                type="button"
                                onClick={() => setStep('request')}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', margin: '0 auto' }}
                            >
                                <ArrowLeft size={12} /> Back
                            </button>
                        </form>
                    )}

                    {step === 'done' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
                            <CheckCircle size={40} color="#22c55e" />
                            <div style={{ textAlign: 'center', fontSize: '13px', color: '#a1a1aa' }}>Password updated successfully.</div>
                            <Link href="/auth/login" style={{ textDecoration: 'none', width: '100%' }}>
                                <Button style={{ width: '100%' }}>Sign In</Button>
                            </Link>
                        </div>
                    )}
                </div>

                <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px' }}>
                    <Link href="/auth/login" style={{ color: '#52525b', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowLeft size={12} /> Back to login
                    </Link>
                </p>
            </div>
        </div>
    )
}
