'use client'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from 'kmguard-site/src/lib/api'
import { Card, CardHeader, CardTitle } from 'kmguard-site/src/components/ui/card'
import type { Stats } from 'kmguard-site/src/types'
import { Users, ShieldCheck, Activity, TrendingUp, DollarSign } from 'lucide-react'

export default function AdminDashboard() {
    const { data } = useQuery<Stats>({
        queryKey: ['admin-stats'],
        queryFn:  () => adminApi.stats().then(r => r.data),
    })

    const cards = [
        { label: 'Total Users',      value: data?.total_users          ?? 0, icon: <Users      size={18}/> },
        { label: 'Active Licenses',  value: data?.active_licenses      ?? 0, icon: <ShieldCheck size={18}/> },
        { label: 'Active Sessions',  value: data?.active_sessions      ?? 0, icon: <Activity    size={18}/> },
        { label: 'New (7d)',         value: data?.recent_registrations ?? 0, icon: <TrendingUp  size={18}/> },
        { label: 'Total Revenue',    value: `$${(data?.total_revenue ?? 0).toFixed(2)}`, icon: <DollarSign size={18}/> },
    ]

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                {cards.map(c => (
                    <Card key={c.label}>
                        <CardHeader className="mb-2">
                            <span className="text-[--muted]">{c.icon}</span>
                        </CardHeader>
                        <p className="text-2xl font-bold">{c.value}</p>
                        <p className="mt-1 text-xs text-[--muted]">{c.label}</p>
                    </Card>
                ))}
            </div>
        </div>
    )
}