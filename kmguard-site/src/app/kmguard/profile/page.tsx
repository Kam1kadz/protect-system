'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi, profileApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, timeUntil } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import {
    User, Crown, Calendar, Download, Shield, Key,
    Settings, ChevronRight, LogOut, Loader2, Copy,
} from 'lucide-react'
import { toast } from 'sonner'
import type { License } from '@/types'

type Tab = 'account' | 'products' | 'subscriptions'

export default function ProfilePage() {
    const { setUser } = useAuthStore()
    const [tab, setTab] = useState<Tab>('account')

    const { data, isLoading } = useQuery({
        queryKey: ['my-profile'],
        queryFn: async () => {
            const res = await authApi.me()
            setUser(res.data)
            return res.data
        },
        staleTime: 30_000,
    })

    const { data: licData } = useQuery({
        queryKey: ['profile-licenses'],
        queryFn: () => profileApi.licenses().then(r => r.data.licenses ?? []),
        enabled: tab === 'subscriptions' || tab === 'products',
    })

    const username  = data?.username  ?? ''
    const email     = data?.email     ?? ''
    const role      = data?.role      ?? 'user'
    const hwid      = data?.hwid      ?? null
    const licenses: License[] = licData ?? []
    const activeLic = licenses.find(l => l.status === 'active')
    const isLocked  = role === 'banned'

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '10px', color: '#71717a', fontSize: '13px' }}>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} color="#22c55e" />
                Loading...
            </div>
        )
    }

    return (
        <div style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* ── Header ── */}
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
                        <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '6px' }}>
                            Your account is locked. Please contact support for assistance.
                        </div>
                    )}
                    {!isLocked && (
                        <a href="/api/v1/loader/payload" style={{ textDecoration: 'none' }}>
                            <Button size="sm" variant="outline" style={{ fontSize: '12px', gap: '6px' }}>
                                <Download size={13} /> CONTACT US
                            </Button>
                        </a>
                    )}
                </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{
                display: 'flex', gap: '0',
                borderBottom: '1px solid #1c1c1f',
                marginBottom: '20px',
                position: 'relative',
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
                    padding: '10px 16px', fontSize: '13px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    <LogOut size={13} /> Logout
                </button>
            </div>

            {/* ── Tab: My account ── */}
            {tab === 'account' && (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Sign in &amp; security</div>
                    </div>
                    {([
                        ['Username', username, null],
                        ['Email address', email, null],
                        ['Password', '●●●●●●●●●●●', <ChevronRight size={14} color="#52525b" key="pw" />],
                    ] as [string, string, React.ReactNode][]).map(([label, value, icon]) => (
                        <div key={label} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderBottom: '1px solid #1c1c1f', fontSize: '13px',
                        }}>
                            <span style={{ color: '#71717a', minWidth: '120px' }}>{label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fafafa' }}>
                                <span>{value}</span>
                                {icon}
                            </div>
                        </div>
                    ))}

                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f', marginTop: '4px' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Advanced Settings</div>
                    </div>

                    {([
                        ['HWID', hwid ?? '—'],
                        ['IP address', '●●●●●●●●●●'],
                    ] as [string, string][]).map(([label, value]) => (
                        <div key={label} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderBottom: '1px solid #1c1c1f', fontSize: '13px',
                        }}>
                            <span style={{ color: '#71717a' }}>{label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a1a1aa' }}>{value}</span>
                                {label === 'HWID' && hwid && (
                                    <button onClick={() => { navigator.clipboard.writeText(hwid); toast.success('Copied!') }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: '2px' }}>
                                        <Copy size={12} />
                                    </button>
                                )}
                                <ChevronRight size={14} color="#52525b" />
                            </div>
                        </div>
                    ))}

                    {([
                        ['2FA', 'Disabled', 'Enable'],
                        ['Temp Disabled', 'Turned off', 'Enable'],
                        ['Use Beta', 'Turned off', 'Enable'],
                    ] as [string, string, string][]).map(([label, value, action]) => (
                        <div key={label} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderBottom: '1px solid #1c1c1f', fontSize: '13px',
                        }}>
                            <span style={{ color: '#71717a' }}>{label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: '#52525b', fontSize: '12px' }}>{value}</span>
                                <button style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: '#22c55e', fontSize: '12px', fontWeight: 500,
                                }}>{action}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tab: Products ── */}
            {tab === 'products' && (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Product information</div>
                        <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Current status of products on your account.</div>
                    </div>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #1c1c1f', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                        <span style={{ color: '#71717a' }}>Products</span>
                        {isLocked ? (
                            <span style={{ color: '#ef4444', fontSize: '12px' }}>Your account is locked. You can not download from a locked account.</span>
                        ) : activeLic ? (
                            <a href="/public/loader.exe" download style={{ textDecoration: 'none' }}>
                                <Button size="sm" variant="secondary"><Download size={12} /> Download Loader</Button>
                            </a>
                        ) : (
                            <span style={{ color: '#52525b', fontSize: '12px' }}>No active subscription</span>
                        )}
                    </div>

                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #1c1c1f', marginTop: '4px' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Product changelogs</div>
                        <div style={{ fontSize: '12px', color: '#52525b', marginTop: '2px' }}>Changelogs of current products</div>
                    </div>
                    {[['VAPE LITE', '#'], ['VAPE V4', '#']].map(([name, href]) => (
                        <div key={name} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 20px', borderBottom: '1px solid #1c1c1f', fontSize: '13px',
                        }}>
                            <span style={{ fontWeight: 500 }}>{name}</span>
                            <a href={href} style={{ textDecoration: 'none', color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Key size={12} /> View
                            </a>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Tab: Subscriptions ── */}
            {tab === 'subscriptions' && (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    {licenses.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 20px', textAlign: 'center' }}>
                            <Crown size={32} color="#27272a" />
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>You have no active subscriptions</div>
                                <div style={{ fontSize: '12px', color: '#52525b' }}>You do not have any currently active subscriptions or auto renewal activated for any products.</div>
                            </div>
                            <a href="/kmguard/store" style={{ textDecoration: 'none' }}>
                                <Button size="sm" variant="outline">Get Vape</Button>
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
    )
}
