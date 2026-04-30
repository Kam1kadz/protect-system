'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { Activity, AlertTriangle, Shield, Info, Zap } from 'lucide-react'

type RtEvent = {
    id: number; username: string | null; event_type: string
    severity: string; payload: string; ip_address: string | null; created_at: string
}

const SEVERITIES = ['all', 'info', 'warn', 'critical'] as const
const sevIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle size={12} color="#ef4444" />
    if (s === 'warn') return <Zap size={12} color="#f59e0b" />
    return <Info size={12} color="#3b82f6" />
}

export default function AdminEventsPage() {
    const [sev, setSev] = useState<string>('all')
    const [open, setOpen] = useState<number | null>(null)

    const { data, isLoading } = useQuery<RtEvent[]>({
        queryKey: ['admin-events'],
        queryFn: () => adminApi.events().then(r => r.data.events ?? []),
        refetchInterval: 10_000,
    })

    const filtered = (data ?? []).filter(e => sev === 'all' || e.severity === sev)
    const counts = { critical: 0, warn: 0, info: 0, all: (data ?? []).length }
    ;(data ?? []).forEach(e => { if (e.severity in counts) (counts as any)[e.severity]++ })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>AC Events</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>Runtime anti-cheat detections · auto-refresh 10s</p>
                </div>
                <div style={{ display: 'flex', gap: '1px', background: '#111113', borderRadius: '8px', padding: '3px', border: '1px solid #1c1c1f' }}>
                    {SEVERITIES.map(s => (
                        <button key={s} onClick={() => setSev(s)} style={{
                            background: sev === s ? '#1c1c1f' : 'none', border: 'none', cursor: 'pointer',
                            borderRadius: '6px', padding: '5px 12px', fontSize: '12px', fontWeight: 500,
                            color: sev === s ? '#fafafa' : '#71717a',
                            display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s',
                        }}>
                            {s !== 'all' && sevIcon(s)}
                            <span style={{ textTransform: 'capitalize' }}>{s}</span>
                            <span style={{
                                fontSize: '10px', background: '#27272a', borderRadius: '4px',
                                padding: '1px 5px', color: '#a1a1aa',
                            }}>{(counts as any)[s]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats row */}
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
                                {['Severity', 'User', 'Event Type', 'IP Address', 'Payload', 'Time'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#52525b' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <Shield size={28} color="#27272a" />
                                        <span>No events detected</span>
                                    </div>
                                </td></tr>
                            )}
                            {filtered.map((e, i) => (
                                <tr key={e.id}
                                    onClick={() => setOpen(open === e.id ? null : e.id)}
                                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #111113' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                                    onMouseEnter={el => (el.currentTarget.style.background = '#111113')}
                                    onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {sevIcon(e.severity)}
                                            <Badge value={e.severity} />
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>{e.username ?? '—'}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', fontFamily: 'monospace', color: '#a1a1aa' }}>{e.event_type}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', fontFamily: 'monospace', color: '#71717a' }}>{e.ip_address ?? '—'}</td>
                                    <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                                        <span style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            title={e.payload}>
                                            {e.payload === '{}' || !e.payload ? '—' : e.payload}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{formatDateTime(e.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
