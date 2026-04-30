'use client'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'

type Tx = {
    id: string; username: string; amount: number; currency: string
    status: string; created_at: string; completed_at?: string
}

export default function AdminTransactionsPage() {
    const { data, isLoading } = useQuery<Tx[]>({
        queryKey: ['admin-transactions'],
        queryFn: () => adminApi.transactions().then(r => r.data.transactions ?? []),
    })

    const list = data ?? []
    const total    = list.filter(t => t.status === 'completed').reduce((s, t) => s + t.amount, 0)
    const pending  = list.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0)
    const completed = list.filter(t => t.status === 'completed').length

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Transactions</h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>All payment transactions</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    ['Total Revenue', `$${total.toFixed(2)}`, '#22c55e', CheckCircle],
                    ['Pending', `$${pending.toFixed(2)}`, '#f59e0b', Clock],
                    ['Completed', completed, '#3b82f6', TrendingUp],
                ].map(([label, value, color, Icon]: any) => (
                    <div key={label} style={{ background: '#0d0d0f', borderRadius: '10px', border: '1px solid #1c1c1f', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={16} color={color} />
                        </div>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            {isLoading ? <p style={{ color: '#71717a', fontSize: '13px' }}>Loading…</p> : (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1c1c1f' }}>
                                {['User', 'Amount', 'Currency', 'Status', 'Created', 'Completed'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#52525b' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <DollarSign size={28} color="#27272a" />
                                        No transactions yet
                                    </div>
                                </td></tr>
                            )}
                            {list.map((t, i) => (
                                <tr key={t.id} style={{ borderBottom: i < list.length - 1 ? '1px solid #111113' : 'none', transition: 'background 0.1s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#111113')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>{t.username}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>${t.amount.toFixed(2)}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{t.currency}</td>
                                    <td style={{ padding: '12px 14px' }}><Badge value={t.status} /></td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{formatDateTime(t.created_at)}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{t.completed_at ? formatDateTime(t.completed_at) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
