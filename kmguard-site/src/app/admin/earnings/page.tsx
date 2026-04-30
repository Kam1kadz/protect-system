'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import { DollarSign, CheckCircle, Clock, Users } from 'lucide-react'

type Earning = {
    id: string; username: string; amount: number; currency: string
    is_paid: boolean; created_at: string; paid_at?: string
}

export default function AdminEarningsPage() {
    const qc = useQueryClient()

    const { data, isLoading } = useQuery<Earning[]>({
        queryKey: ['admin-earnings'],
        queryFn: () => adminApi.earnings().then(r => r.data.earnings ?? []),
    })

    const markPaid = useMutation({
        mutationFn: (id: string) => adminApi.markPaid(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-earnings'] }); toast.success('Marked as paid') },
        onError: () => toast.error('Failed'),
    })

    const list = data ?? []
    const totalPaid    = list.filter(e => e.is_paid).reduce((s, e) => s + e.amount, 0)
    const totalPending = list.filter(e => !e.is_paid).reduce((s, e) => s + e.amount, 0)
    const partners     = new Set(list.map(e => e.username)).size

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Partner Earnings</h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>Manage partner payouts</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[
                    ['Total Paid', `$${totalPaid.toFixed(2)}`, '#22c55e', CheckCircle],
                    ['Pending Payout', `$${totalPending.toFixed(2)}`, '#f59e0b', Clock],
                    ['Partners', partners, '#3b82f6', Users],
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
                                {['Partner', 'Amount', 'Currency', 'Status', 'Created', 'Paid At', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 && (
                                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#52525b' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <DollarSign size={28} color="#27272a" />
                                        No earnings yet
                                    </div>
                                </td></tr>
                            )}
                            {list.map((e, i) => (
                                <tr key={e.id} style={{ borderBottom: i < list.length - 1 ? '1px solid #111113' : 'none', transition: 'background 0.1s' }}
                                    onMouseEnter={el => (el.currentTarget.style.background = '#111113')}
                                    onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>{e.username}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '14px', fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>${e.amount.toFixed(2)}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{e.currency}</td>
                                    <td style={{ padding: '12px 14px' }}><Badge value={e.is_paid ? 'active' : 'pending'} /></td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{formatDateTime(e.created_at)}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{e.paid_at ? formatDateTime(e.paid_at) : '—'}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        {!e.is_paid && (
                                            <button onClick={() => markPaid.mutate(e.id)} style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                                                borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
                                                color: '#22c55e', fontSize: '12px', fontWeight: 500,
                                            }}>
                                                <CheckCircle size={12} /> Mark Paid
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
