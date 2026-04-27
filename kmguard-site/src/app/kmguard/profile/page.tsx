'use client'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, timeUntil } from '@/lib/utils'
import { Download, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import type { License } from '@/types'

export default function ProfilePage() {
    const { user } = useAuthStore()

    const { data: licData } = useQuery({
        queryKey: ['my-licenses'],
        queryFn:  () => authApi.me().then(r => r.data),
    })

    const licenses: License[] = licData?.licenses ?? []
    const earnings: number    = licData?.partner_earnings_pending ?? 0

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold">Profile</h1>
                <p className="mt-1 text-[--muted]">{user?.email}</p>
            </div>

            {/* Account info */}
            <Card>
                <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <Badge value={user?.role ?? 'user'} />
                </CardHeader>
                <div className="grid gap-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-[--muted]">Username</span>
                        <span>{user?.username}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[--muted]">Role</span>
                        <span className="capitalize">{user?.role}</span>
                    </div>
                </div>
            </Card>

            {/* Subscriptions */}
            <Card>
                <CardHeader>
                    <CardTitle>Subscriptions</CardTitle>
                    <a href="/public/loader.exe" download>
                        <Button size="sm" variant="secondary">
                            <Download size={14}/> Download Loader
                        </Button>
                    </a>
                </CardHeader>

                {licenses.length === 0 ? (
                    <p className="text-sm text-[--muted]">No active subscriptions.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {licenses.map(lic => (
                            <div
                                key={lic.id}
                                className="flex items-center justify-between rounded-lg border border-[--border] p-3"
                            >
                                <div>
                                    <p className="font-medium">{lic.plan_display_name}</p>
                                    <p className="text-xs text-[--muted]">
                                        Expires: {formatDate(lic.expires_at)} ({timeUntil(lic.expires_at)})
                                    </p>
                                </div>
                                <Badge value={lic.status} />
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Partner earnings */}
            {user?.role === 'partner' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Partner Earnings</CardTitle>
                    </CardHeader>
                    <p className="text-2xl font-bold">
                        ${earnings.toFixed(2)}
                        <span className="ml-2 text-sm font-normal text-[--muted]">pending payout</span>
                    </p>
                </Card>
            )}
        </div>
    )
}