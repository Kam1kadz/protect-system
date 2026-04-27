'use client'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, timeUntil } from '@/lib/utils'
import { Download, User, Crown, Calendar } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import type { License } from '@/types'

export default function ProfilePage() {
    const { user } = useAuthStore()

    const { data: licData, isLoading } = useQuery({
        queryKey: ['my-profile'],
        queryFn:  () => authApi.me().then(r => r.data),
    })

    const licenses: License[] = licData?.licenses ?? []
    const earnings: number    = licData?.partner_earnings_pending ?? 0

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                <div style={{
                    width: '56px', height: '56px', borderRadius: '16px',
                    background: 'rgba(34,197,94,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <User size={26} color="#22c55e" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '18px' }}>{user?.username}</span>
                        <Badge value={user?.role ?? 'user'} />
                    </div>
                    <span style={{ fontSize: '13px', color: '#71717a' }}>{user?.email}</span>
                </div>
            </div>

            {/* Account info */}
            <Card>
                <CardHeader><CardTitle>Account Details</CardTitle></CardHeader>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {([['Username', user?.username], ['Email', user?.email], ['Role', user?.role]] as [string, string | undefined][]).map(([k, v]) => (
                        <div key={k} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '10px 0', borderBottom: '1px solid #1c1c1f',
                            fontSize: '13px',
                        }}>
                            <span style={{ color: '#71717a' }}>{k}</span>
                            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{v}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Subscriptions */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                    <a href="/public/loader.exe" download style={{ textDecoration: 'none' }}>
                        <Button size="sm" variant="secondary">
                            <Download size={13} /> Download Loader
                        </Button>
                    </a>
                </CardHeader>

                {isLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[1,2].map(i => (
                            <div key={i} style={{ height: '64px', borderRadius: '8px', background: '#1c1c1f' }} />
                        ))}
                    </div>
                ) : licenses.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '32px 0', textAlign: 'center' }}>
                        <Crown size={28} color="#3f3f46" />
                        <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>No active subscriptions</p>
                        <a href="/kmguard/store" style={{ textDecoration: 'none' }}>
                            <Button size="sm" variant="outline">Browse Plans</Button>
                        </a>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {licenses.map(lic => (
                            <div key={lic.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                borderRadius: '8px', border: '1px solid #1c1c1f',
                                background: '#1c1c1f', padding: '12px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: 'rgba(34,197,94,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Crown size={14} color="#22c55e" />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 500 }}>{lic.plan_display_name}</div>
                                        <div style={{ fontSize: '11px', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                            <Calendar size={10} />
                                            Expires {formatDate(lic.expires_at)} · {timeUntil(lic.expires_at)}
                                        </div>
                                    </div>
                                </div>
                                <Badge value={lic.status} />
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Partner */}
            {user?.role === 'partner' && (
                <Card glow>
                    <CardHeader><CardTitle>Partner Earnings</CardTitle><Badge value="partner" /></CardHeader>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{ fontSize: '32px', fontWeight: 700, color: '#22c55e' }}>${earnings.toFixed(2)}</span>
                        <span style={{ fontSize: '13px', color: '#71717a', marginBottom: '4px' }}>pending payout</span>
                    </div>
                </Card>
            )}
        </div>
    )
}
