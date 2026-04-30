'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { AlertTriangle, Info, Zap, ClipboardList, Search } from 'lucide-react'

type AuditLog = {
    id: number; username: string | null; event_type: string; severity: string
    ip_address: string | null; payload: string; created_at: string
}

const SEVERITIES = ['all', 'info', 'warn', 'critical'] as const

export default function AdminLogsPage() {
    const [severity, setSeverity] = useState<string>('all')
    const [search, setSearch] = useState('')

    const { data, isLoading } = useQuery<AuditLog[]>({
        queryKey: ['admin-logs'],
        queryFn: () => adminApi.logs().then(r => r.data.logs ?? []),
        refetchInterval: 15_000,
    })

    const filtered = (data ?? []).filter(l =>
        (severity === 'all' || l.severity === severity) &&
        (!search || (l.username ?? '').toLowerCase().includes(search.toLowerCase()) || l.event_type.toLowerCase().includes(search.toLowerCase()))
    )

    const counts = { critical: 0, warn: 0, info: 0 }
    ;(data ?? []).forEach(l => { if (l.severity in counts) (counts as any)[l.severity]++ })

    const sevColor = (s: string) => s === 'critical' ? '#ef4444' : s === 'warn' ? '#f59e0b' : '#3b82f6'
    const sevIcon = (s: string) => {
        if (s === 'critical') return <AlertTriangle size={12} />
        if (s === 'warn') return <Zap size={12} />
        return <Info size={12} />
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Audit Logs</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>Security & access audit trail · auto-refresh 15s</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user, event…"
                            style={{ background: '#111113', border: '1px solid #1c1c1f', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '7px 12px 7px 32px', outline: 'none', width: '200px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '1px', background: '#111113', borderRadius: '8px', padding: '3px', border: '1px solid #1c1c1f' }}>
                        {SEVERITIES.map(s => (
                            <button key={s} onClick={() => setSeverity(s)} style={{
                                background: severity === s ? '#1c1c1f' : 'none', border: 'none', cursor: 'pointer',
                                borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 500,
                                color: severity === s ? '#fafafa' : '#71717a', textTransform: 'capitalize', transition: 'all 0.15s',
                            }}>{s}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {[['Critical', counts.critical, '#ef4444', AlertTriangle], ['Warnings', counts.warn, '#f59e0b', Zap], ['Info', counts.info, '#3b82f6', Info]].map(([label, count, color, Icon]: any) => (
                    <div key={label} style={{ background: '#0d0d0f', borderRadius: '10px', border: '1px solid #1c1c1f', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={16} color={color} />
                        </div>
                        <div>
                            <div style={{ fontSize: '20px', fontWeight: 700 }}>{count}</div>
                            <div style={{ fontSize: '11px', color: '#71717a' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            {isLoading ? (
                <p style={{ color: '#71717a', fontSize: '13px' }}>Loading…</p>
            ) : (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1c1c1f' }}>
                                {['Severity', 'User', 'Event', 'IP', 'Payload', 'Time'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#52525b' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <ClipboardList size={28} color="#27272a" />
                                        <span>No logs found</span>
                                    </div>
                                </td></tr>
                            )}
                            {filtered.map((l, i) => (
                                <tr key={l.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #111113' : 'none', transition: 'background 0.1s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#111113')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: sevColor(l.severity) }}>
                                            {sevIcon(l.severity)}
                                            <Badge value={l.severity} />
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>{l.username ?? '—'}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', fontFamily: 'monospace', color: '#a1a1aa' }}>{l.event_type}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', fontFamily: 'monospace', color: '#71717a' }}>{l.ip_address ?? '—'}</td>
                                    <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                                        <span title={l.payload} style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {!l.payload || l.payload === '{}' ? '—' : l.payload}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a', whiteSpace: 'nowrap' }}>{formatDateTime(l.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
