'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { authApi, profileApi, api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, timeUntil } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
    User, Crown, Calendar, Download, Shield,
    LogOut, Loader2, ChevronRight, X, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import type { License } from '@/types'

type Tab = 'account' | 'products' | 'subscriptions'

const MC_VERSIONS = ['1.8.9','1.12.2','1.16.5','1.17.1','1.18.2','1.19.4','1.20.1','1.20.4','1.21']

export default function ProfilePage() {
    const { user: storeUser, setUser } = useAuthStore()
    const [tab, setTab]               = useState<Tab>('account')
    const [pwModal, setPwModal]       = useState(false)
    const [oldPw, setOldPw]           = useState('')
    const [newPw, setNewPw]           = useState('')
    const [confirmPw, setConfirmPw]   = useState('')
    const [showOld, setShowOld]       = useState(false)
    const [showNew, setShowNew]       = useState(false)
    const [mcVer, setMcVer]           = useState(MC_VERSIONS[0])

    // Используем storeUser как initialData — загрузка не нужна при каждом переходе
    const { data, isLoading } = useQuery({
        queryKey: ['my-profile'],
        queryFn: async () => {
            const res = await authApi.me()
            setUser(res.data)
            return res.data
        },
        initialData: storeUser ?? undefined,
        staleTime: 5 * 60 * 1000, // 5 минут — не рефетчить при каждом переходе
        gcTime: 10 * 60 * 1000,
    })

    const { data: licData } = useQuery({
        queryKey: ['profile-licenses'],
        queryFn: () => profileApi.licenses().then(r => r.data.licenses ?? []),
        enabled: tab === 'subscriptions' || tab === 'products',
        staleTime: 60_000,
    })

    const changePw = useMutation({
        mutationFn: () => api.post('/api/v1/auth/change-password', { old_password: oldPw, new_password: newPw }),
        onSuccess: () => {
            toast.success('Password changed!')
            setPwModal(false)
            setOldPw(''); setNewPw(''); setConfirmPw('')
        },
        onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed'),
    })

    const username = data?.username ?? ''
    const email    = data?.email    ?? ''
    const role     = data?.role     ?? 'user'
    const hwid     = data?.hwid     ?? null
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
                    <Badge value={role} />
                    {isLocked && (
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>
                            Your account is locked. Please contact support for assistance.
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
                    <button key={t} onClick={() => setTab(t)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '10px 16px', fontSize: '13px', fontWeight: tab === t ? 600 : 400,
                        color: tab === t ? '#fff' : '#71717a',
                        position: 'relative', textTransform: 'capitalize', transition: 'color 0.15s',
                    }}>
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
                    useAuthStore.getState().clear()
                    window.location.href = '/auth/login'
                }} style={{
                    marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '10px 16px', fontSize: '13px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    <LogOut size={13} /> Logout
                </button>
            </div>

            {/* Tab: Account */}
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
                    <button onClick={() => setPwModal(true)} style={{
                        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 20px', borderBottom: '1px solid #1c1c1f', fontSize: '13px',
                    }}>
                        <span style={{ color: '#71717a', minWidth: '120px' }}>Password</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fafafa' }}>
                            <span>●●●●●●●●●●</span>
                            <ChevronRight size={14} color="#52525b" />
                        </div>
                    </button>
                    {/* HWID */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', fontSize: '13px' }}>
                        <span style={{ color: '#71717a' }}>HWID</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a1a1aa' }}>
                            {hwid ? hwid.slice(0,20)+'…' : '—'}
                        </span>
                    </div>
                </div>
            )}

            {/* Tab: Products */}
            {tab === 'products' && (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Product information</div>
                        <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Current status of products on your account.</div>
                    </div>
                    {/* Download */}
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #1c1c1f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: '#71717a' }}>Client</span>
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
                    {/* MC Version select */}
                    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: '#71717a' }}>Launch version</span>
                        <select
                            value={mcVer}
                            onChange={e => setMcVer(e.target.value)}
                            disabled={!activeLic}
                            style={{
                                background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px',
                                color: activeLic ? '#fafafa' : '#52525b', fontSize: '12px', padding: '6px 10px',
                                cursor: activeLic ? 'pointer' : 'not-allowed', outline: 'none',
                            }}
                        >
                            {MC_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* Tab: Subscriptions */}
            {tab === 'subscriptions' && (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    {licenses.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
                            <Crown size={32} color="#27272a" />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>No active subscriptions</div>
                                <div style={{ fontSize: '12px', color: '#52525b' }}>You do not have any currently active subscriptions.</div>
                            </div>
                            <a href="/kmguard/store" style={{ textDecoration: 'none' }}>
                                <Button size="sm" variant="outline">Get Arbuz Client</Button>
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
                                            Expires {formatDate(lic.expires_at)} · {timeUntil(lic.expires_at)}
                                        </div>
                                    </div>
                                </div>
                                <Badge value={lic.status} />
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Change Password Modal */}
            {pwModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                }} onClick={() => setPwModal(false)}>
                    <div style={{
                        background: '#111113', border: '1px solid #1c1c1f',
                        borderRadius: '16px', padding: '24px', width: '360px',
                        display: 'flex', flexDirection: 'column', gap: '16px',
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 600, fontSize: '15px' }}>Change Password</div>
                            <button onClick={() => setPwModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: '2px' }}>
                                <X size={16} />
                            </button>
                        </div>
                        {/* Old password */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showOld ? 'text' : 'password'}
                                    value={oldPw} onChange={e => setOldPw(e.target.value)}
                                    placeholder="••••••••"
                                    style={{ width: '100%', background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '9px 36px 9px 12px', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <button onClick={() => setShowOld(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 0 }}>
                                    {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                        {/* New password */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>New password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showNew ? 'text' : 'password'}
                                    value={newPw} onChange={e => setNewPw(e.target.value)}
                                    placeholder="Min 8 characters"
                                    style={{ width: '100%', background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '9px 36px 9px 12px', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <button onClick={() => setShowNew(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: 0 }}>
                                    {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                        {/* Confirm */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm new password</label>
                            <input
                                type="password"
                                value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                                placeholder="Repeat new password"
                                style={{ background: '#1c1c1f', border: `1px solid ${confirmPw && confirmPw !== newPw ? '#ef4444' : '#27272a'}`, borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '9px 12px', outline: 'none' }}
                            />
                            {confirmPw && confirmPw !== newPw && (
                                <span style={{ fontSize: '11px', color: '#ef4444' }}>Passwords do not match</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button size="sm" variant="outline" onClick={() => setPwModal(false)}>Cancel</Button>
                            <Button
                                size="sm"
                                loading={changePw.isPending}
                                disabled={!oldPw || newPw.length < 8 || newPw !== confirmPw}
                                onClick={() => changePw.mutate()}
                            >Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
