'use client'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import type { Stats } from '@/types'
import { Users, ShieldCheck, Activity, TrendingUp, DollarSign } from 'lucide-react'

const S = {
    page: { display: 'flex', flexDirection: 'column', gap: '24px' } as React.CSSProperties,
    heading: { margin: 0, fontSize: '20px', fontWeight: 700, color: '#fafafa' } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' } as React.CSSProperties,
    card: { borderRadius: '12px', border: '1px solid #1c1c1f', background: '#111113', padding: '18px' } as React.CSSProperties,
    cardIcon: { width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' } as React.CSSProperties,
    cardVal: { margin: 0, fontSize: '26px', fontWeight: 700, color: '#fafafa' } as React.CSSProperties,
    cardLbl: { margin: '4px 0 0', fontSize: '11px', color: '#71717a' } as React.CSSProperties,
}

export default function AdminDashboard() {
    const { data, isLoading } = useQuery<Stats>({
        queryKey: ['admin-stats'],
        queryFn:  () => adminApi.stats().then(r => r.data),
        refetchInterval: 30_000,
    })

    const cards = [
        { label: 'Total Users',     value: data?.total_users          ?? '—', icon: <Users      size={16} color="#22c55e"/> },
        { label: 'Active Licenses', value: data?.active_licenses      ?? '—', icon: <ShieldCheck size={16} color="#22c55e"/> },
        { label: 'Active Sessions', value: data?.active_sessions      ?? '—', icon: <Activity    size={16} color="#22c55e"/> },
        { label: 'New Users (7d)',  value: data?.recent_registrations ?? '—', icon: <TrendingUp  size={16} color="#22c55e"/> },
        { label: 'Revenue',         value: isLoading ? '—' : `$${(data?.total_revenue ?? 0).toFixed(2)}`, icon: <DollarSign size={16} color="#22c55e"/> },
    ]

    return (
        <div style={S.page}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={S.heading}>Dashboard</h1>
                <span style={{ fontSize: '11px', color: '#52525b' }}>Auto-refresh every 30s</span>
            </div>
            <div style={S.grid}>
                {cards.map(c => (
                    <div key={c.label} style={S.card}>
                        <div style={S.cardIcon}>{c.icon}</div>
                        <p style={S.cardVal}>{c.value}</p>
                        <p style={S.cardLbl}>{c.label}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
