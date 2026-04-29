'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { authApi, profileApi, storeApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, timeUntil } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
    User, Crown, Calendar, Download, Shield,
    ChevronRight, LogOut, Loader2, Copy, Lock, X, Key,
} from 'lucide-react'
import { toast } from 'sonner'
import type { License } from '@/types'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'KMGuard'

type Tab = 'account' | 'products' | 'subscriptions'

// ── Password change modal ──────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [oldPw, setOldPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [confirm, setConfirm] = useState('')

    const mut = useMutation({
        mutationFn: () => authApi.changePassword(oldPw, newPw),
        onSuccess: () => { toast.success('Password changed!'); onClose() },
        onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
    })

    function submit(e: React.FormEvent) {
        e.preventDefault()
        if (newPw !== confirm) { toast.error('Passwords do not match'); return }
        if (newPw.length < 8) { toast.error('Min 8 characters'); return }
        mut.mutate()
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={onClose}>
            <div style={{
                background: '#111113', border: '1px solid #1c1c1f', borderRadius: '16px',
                padding: '24px', width: '100%', maxWidth: '380px',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Lock size={16} color="#22c55e" />
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>Change Password</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: '2px' }}>
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Input label="Current password" type="password" placeholder="••••••••" value={oldPw} onChange={e => setOldPw(e.target.value)} required />
                    <Input label="New password" type="password" placeholder="••••••••" value={newPw} onChange={e => setNewPw(e.target.value)} required />
                    <Input label="Confirm new password" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                    <Button type="submit" loading={mut.isPending} style={{ width: '100%', marginTop: '4px' }}>Save Password</Button>
                </form>
            </div>
        </div>
    )
}

// ── Activate key modal ─────────────────────────────────────────────────────
function ActivateKeyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [key, setKey] = useState('')

    const mut = useMutation({
        mutationFn: () => storeApi.activateKey(key),
        onSuccess: () => { toast.success('Key activated!'); onSuccess(); onClose() },
        onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Invalid key'),
    })

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={onClose}>
            <div style={{
                background: '#111113', border: '1px solid #1c1c1f', borderRadius: '16px',
                padding: '24px', width: '100%', maxWidth: '380px',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Key size={16} color="#22c55e" />
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>Activate Key</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: '2px' }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <Input
                        label="Subscription key"
                        type="text"
                        placeholder="KMG-XXXX-XXXX-XXXX-XXXX"
                        value={key}
                        onChange={e => setKey(e.target.value.trim())}
                    />
                    <Button
                        loading={mut.isPending}
                        disabled={!key}
                        onClick={() => mut.mutate()}
                        style={{ width: '100%' }}
                    >Activate</Button>
                </div>
            </div>
        </div>
    )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
    const { user: storeUser, setUser } = useAuthStore()
    const [tab, setTab] = useState<Tab>('account')
    const [showPwModal, setShowPwModal] = useState(false)
    const [showKeyModal, setShowKeyModal] = useState(false)
    const [selectedVersion, setSelectedVersion] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['my-profile'],
        queryFn: async () => {
            const res = await authApi.me()
            setUser(res.data)
            return res.data
        },
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        initialData: storeUser ?? undefined,
    })

    const { data: licData, refetch: refetchLic } = useQuery({
        queryKey: ['profile-licenses'],
        queryFn: () => profileApi.licenses().then(r => r.data.licenses ?? []),
        enabled: tab === 'subscriptions' || tab === 'products',
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
    })

    const username  = data?.username  ?? ''
    const email     = data?.email     ?? ''
    const role      = data?.role      ?? 'user'
    const hwid      = data?.hwid      ?? null
    const licenses: License[] = licData ?? []
    const activeLic = licenses.find(l => l.status === 'active')
    const isLocked  = role === 'banned'

    if (isLoading && !storeUser) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: '#71717a', fontSize: '13px' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} color="#22c55e" />
                Loading...
            </div>
        )
    }

    return (
        <>
            {showPwModal && <ChangePasswordModal onClose={() => setShowPwModal(false)} />}
            {showKeyModal && <ActivateKeyModal onClose={() => setShowKeyModal(false)} onSuccess={() => refetchLic()} />}

            <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', paddingBottom: '24px' }}>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1c1c1f 0%, #27272a 100%)',
                        border: '2px solid #27272a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                    }}>
                        <User size={32} color="#a1a1aa" />
                        {isLocked && (
                            <div style={{
                                position: 'absolute', bottom: -2, right: -2,
                                width: '20px', height: '20px', borderRadius: '50%',
                                background: '#ef4444', border: '2px solid #09090b',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Shield size={10} color="white" />
                            </div>
                        )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>{username || '—'}</div>
                        {isLocked && (
                            <div style={{ fontSize: '12px', color: '#ef4444' }}>
                                Your account is locked. Please contact support.
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: '0',
                    borderBottom: '1px solid #1c1c1f',
                    marginBottom: '20px',
                }}>
                    {(['account', 'products', 'subscriptions'] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                padding: '10px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 400,
                                color: tab === t ? '#fff' : '#71717a',
                                position: 'relative', textTransform: 'capitalize',
                                transition: 'color 0.15s',
                            }}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                            {tab === t && (
                                <div style={{
                                    position: 'absolute', bottom: -1, left: 0, right: 0,
                                    height: '2px', background: '#22c55e', borderRadius: '2px 2px 0 0',
                                }} />
                            )}
                        </button>
                    ))}
                    <button onClick={() => {
                        if (typeof window !== 'undefined') window.location.href = '/api/v1/auth/logout'
                    }} style={{
                        marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                        padding: '10px 16px', fontSize: '13px', color: '#71717a',
                        display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                        <LogOut size={13} /> Logout
                    </button>
                </div>

                {/* ── Account tab ── */}
                {tab === 'account' && (
                    <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>Sign in &amp; security</div>
                        </div>

                        {/* Username */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1c1c1f', fontSize: '13px' }}>
                            <span style={{ color: '#71717a', minWidth: '120px' }}>Username</span>
                            <span style={{ color: '#fafafa' }}>{username}</span>
                        </div>

                        {/* Email */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1c1c1f', fontSize: '13px' }}>
                            <span style={{ color: '#71717a', minWidth: '120px' }}>Email address</span>
                            <span style={{ color: '#fafafa' }}>{email}</span>
                        </div>

                        {/* Password — opens modal */}
                        <div
                            onClick={() => setShowPwModal(true)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 20px', borderBottom: '1px solid #1c1c1f',
                                fontSize: '13px', cursor: 'pointer', transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#111113')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <span style={{ color: '#71717a', minWidth: '120px' }}>Password</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fafafa' }}>
                                <span>●●●●●●●●●●●</span>
                                <ChevronRight size={14} color="#52525b" />
                            </div>
                        </div>

                        {/* HWID */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f', marginTop: '4px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>Advanced Settings</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', fontSize: '13px' }}>
                            <span style={{ color: '#71717a' }}>HWID</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a1a1aa' }}>{hwid ?? '—'}</span>
                                {hwid && (
                                    <button onClick={() => { navigator.clipboard.writeText(hwid); toast.success('Copied!') }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: '2px' }}>
                                        <Copy size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Products tab ── */}
                {tab === 'products' && (
                    <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>Product information</div>
                            <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Current status of products on your account.</div>
                        </div>

                        {/* Download */}
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1c1c1f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                            <span style={{ color: '#71717a' }}>Products</span>
                            {isLocked ? (
                                <span style={{ color: '#ef4444', fontSize: '12px' }}>Account locked</span>
                            ) : activeLic ? (
                                <a href="/public/loader.exe" download style={{ textDecoration: 'none' }}>
                                    <Button size="sm" variant="secondary"><Download size={12} /> Download Loader</Button>
                                </a>
                            ) : (
                                <span style={{ color: '#52525b', fontSize: '12px' }}>No active subscription</span>
                            )}
                        </div>

                        {/* Version selector */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f', marginTop: '4px' }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>Launch Version</div>
                            <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Select which version to use when launching</div>
                        </div>
                        <div style={{ padding: '14px 20px' }}>
                            {licenses.length === 0 ? (
                                <span style={{ fontSize: '12px', color: '#52525b' }}>No active subscriptions available</span>
                            ) : (
                                <select
                                    value={selectedVersion}
                                    onChange={e => setSelectedVersion(e.target.value)}
                                    style={{
                                        background: '#111113', border: '1px solid #1c1c1f', borderRadius: '8px',
                                        color: selectedVersion ? '#fafafa' : '#52525b',
                                        fontSize: '13px', padding: '10px 12px', outline: 'none', width: '100%',
                                    }}
                                >
                                    <option value="">Select version…</option>
                                    {licenses.map(l => (
                                        <option key={l.id} value={l.plan_name}>
                                            {l.plan_display_name ?? l.plan_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Subscriptions tab ── */}
                {tab === 'subscriptions' && (
                    <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                        {/* Activate key button always visible at top */}
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1c1c1f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', color: '#71717a' }}>Have a key?</div>
                            <Button size="sm" variant="outline" onClick={() => setShowKeyModal(true)} style={{ gap: '6px', fontSize: '12px' }}>
                                <Key size={12} /> Activate Key
                            </Button>
                        </div>

                        {licenses.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
                                <Crown size={32} color="#27272a" />
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>You have no active subscriptions</div>
                                    <div style={{ fontSize: '12px', color: '#52525b' }}>You do not have any currently active subscriptions.</div>
                                </div>
                                <a href="/kmguard/store" style={{ textDecoration: 'none' }}>
                                    <Button size="sm" variant="outline">Get {APP_NAME}</Button>
                                </a>
                            </div>
                        ) : (
                            licenses.map((lic, i) => (
                                <div key={lic.id} style={{
                                    padding: '14px 20px',
                                    borderBottom: i < licenses.length - 1 ? '1px solid #1c1c1f' : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: 'rgba(34,197,94,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Crown size={16} color="#22c55e" />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{lic.plan_display_name ?? lic.plan_name}</div>
                                            <div style={{ fontSize: '11px', color: '#52525b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                <Calendar size={10} />
                                                Expires {formatDate(lic.expires_at)}{' '}·{' '}{timeUntil(lic.expires_at)}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge value={lic.status} />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
