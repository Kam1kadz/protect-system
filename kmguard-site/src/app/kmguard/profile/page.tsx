'use client'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, timeUntil } from '@/lib/utils'
import { Download, User, Crown, Calendar, Shield } from 'lucide-react'
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
        <div className="flex flex-col gap-6 max-w-2xl mx-auto py-2">

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[--accent]/15 text-[--accent]">
                    <User size={26} />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">{user?.username}</h1>
                        <Badge value={user?.role ?? 'user'} />
                    </div>
                    <p className="text-sm text-[--muted]">{user?.email}</p>
                </div>
            </div>

            {/* Account info */}
            <Card>
                <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                    <Shield size={16} className="text-[--muted]" />
                </CardHeader>
                <div className="grid gap-2 text-sm">
                    {[
                        ['Username', user?.username],
                        ['Email',    user?.email],
                        ['Role',     user?.role],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1.5 border-b border-[--border] last:border-0">
                            <span className="text-[--muted]">{k}</span>
                            <span className="font-medium capitalize">{v}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Subscriptions */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                    <a href="/public/loader.exe" download>
                        <Button size="sm" variant="secondary">
                            <Download size={13} /> Download Loader
                        </Button>
                    </a>
                </CardHeader>

                {isLoading ? (
                    <div className="flex flex-col gap-2">
                        {[1,2].map(i => (
                            <div key={i} className="h-16 rounded-lg bg-[--surface-2] animate-pulse" />
                        ))}
                    </div>
                ) : licenses.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <Crown size={28} className="text-[--muted-2]" />
                        <p className="text-sm text-[--muted]">No active subscriptions</p>
                        <a href="/kmguard/store">
                            <Button size="sm" variant="outline">Browse Plans</Button>
                        </a>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {licenses.map(lic => (
                            <div
                                key={lic.id}
                                className="flex items-center justify-between rounded-lg border border-[--border] bg-[--surface-2] p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[--accent]/10 text-[--accent]">
                                        <Crown size={14} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{lic.plan_display_name}</p>
                                        <p className="text-xs text-[--muted] flex items-center gap-1">
                                            <Calendar size={11} />
                                            Expires {formatDate(lic.expires_at)} · {timeUntil(lic.expires_at)}
                                        </p>
                                    </div>
                                </div>
                                <Badge value={lic.status} />
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Partner earnings */}
            {user?.role === 'partner' && (
                <Card glow>
                    <CardHeader>
                        <CardTitle>Partner Earnings</CardTitle>
                        <Badge value="partner" />
                    </CardHeader>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-[--accent]">${earnings.toFixed(2)}</span>
                        <span className="text-sm text-[--muted] mb-1">pending payout</span>
                    </div>
                </Card>
            )}
        </div>
    )
}
