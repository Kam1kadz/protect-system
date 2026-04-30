'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { ShieldOff, Search, Copy, ChevronLeft, ChevronRight, LockOpen, CalendarClock } from 'lucide-react'

type LicRow = {
    id: string; username: string; plan_name: string; status: string
    expires_at: string; license_key: string; created_at: string
}

export default function AdminLicensesPage() {
    const qc = useQueryClient()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [editing, setEditing] = useState<LicRow | null>(null)
    const [expiresDraft, setExpiresDraft] = useState('')

    const { data, isLoading } = useQuery<LicRow[]>({
        queryKey: ['admin-licenses', page],
        queryFn: () => adminApi.licenses(page).then(r => r.data.licenses ?? []),
    })

    const revoke = useMutation({
        mutationFn: (id: string) => adminApi.revokeLic(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-licenses'] }); toast.success('License revoked') },
        onError: () => toast.error('Failed to revoke'),
    })

    const unlock = useMutation({
        mutationFn: (id: string) => adminApi.unlockLic(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-licenses'] }); toast.success('License unlocked') },
        onError: () => toast.error('Failed to unlock'),
    })

    const setExpiry = useMutation({
        mutationFn: ({ id, expires_at }: { id: string; expires_at: string }) => adminApi.setLicExpiry(id, expires_at),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-licenses'] })
            toast.success('Expiry updated')
            setEditing(null)
            setExpiresDraft('')
        },
        onError: () => toast.error('Failed to update expiry'),
    })

    const filtered = (data ?? []).filter(l =>
        !search || l.username.toLowerCase().includes(search.toLowerCase()) ||
        l.plan_name.toLowerCase().includes(search.toLowerCase()) ||
        l.license_key.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Licenses</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>{(data ?? []).length} total licenses</p>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#52525b' }} />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search user, plan, key…"
                        style={{
                            background: '#111113', border: '1px solid #1c1c1f', borderRadius: '8px',
                            color: '#fafafa', fontSize: '13px', padding: '8px 12px 8px 32px', outline: 'none', width: '240px',
                        }}
                    />
                </div>
            </div>

            {isLoading ? (
                <p style={{ color: '#71717a', fontSize: '13px' }}>Loading…</p>
            ) : (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1c1c1f' }}>
                                {['User', 'Plan', 'Status', 'Expires', 'License Key', 'Created', ''].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#52525b' }}>No licenses found</td></tr>
                            )}
                            {filtered.map((l, i) => (
                                <tr key={l.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #111113' : 'none', transition: 'background 0.1s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#111113')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>{l.username}</td>
                                    <td style={{ padding: '12px 14px', fontSize: '13px', color: '#a1a1aa' }}>{l.plan_name}</td>
                                    <td style={{ padding: '12px 14px' }}><Badge value={l.status} /></td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{formatDate(l.expires_at)}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#52525b' }}>{l.license_key.slice(0, 16)}…</span>
                                            <button onClick={() => { navigator.clipboard.writeText(l.license_key); toast.success('Copied!') }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', padding: '2px' }}>
                                                <Copy size={12} />
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#71717a' }}>{formatDate(l.created_at)}</td>
                                    <td style={{ padding: '12px 14px' }}>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => {
                                                    setEditing(l)
                                                    setExpiresDraft(l.expires_at.slice(0, 16))
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)',
                                                    borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
                                                    color: '#93c5fd', fontSize: '12px', fontWeight: 500,
                                                }}
                                            >
                                                <CalendarClock size={12} /> Expiry
                                            </button>
                                            {l.status === 'banned' ? (
                                                <button
                                                    onClick={() => unlock.mutate(l.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                                                        borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
                                                        color: '#22c55e', fontSize: '12px', fontWeight: 500,
                                                    }}
                                                >
                                                    <LockOpen size={12} /> Unlock
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => { if (confirm(`Revoke license for ${l.username}?`)) revoke.mutate(l.id) }}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                                        borderRadius: '6px', padding: '5px 10px', cursor: 'pointer',
                                                        color: '#ef4444', fontSize: '12px', fontWeight: 500,
                                                    }}
                                                >
                                                    <ShieldOff size={12} /> Revoke
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></Button>
                <span style={{ fontSize: '13px', color: '#71717a', lineHeight: '30px' }}>Page {page}</span>
                <Button size="sm" variant="outline" disabled={(data ?? []).length < 50} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></Button>
            </div>

            {editing && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60,
                    }}
                    onClick={() => setEditing(null)}
                >
                    <div
                        style={{
                            background: '#111113', border: '1px solid #1c1c1f',
                            borderRadius: '16px', padding: '22px', width: '380px',
                            display: 'flex', flexDirection: 'column', gap: '14px',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700 }}>Change expiry</div>
                                <div style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>{editing.username} • {editing.plan_name}</div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Close</Button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a' }}>Expires at</label>
                            <input
                                type="datetime-local"
                                value={expiresDraft}
                                onChange={e => setExpiresDraft(e.target.value)}
                                style={{
                                    background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '10px',
                                    color: '#fafafa', fontSize: '13px', padding: '10px 12px', outline: 'none',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                            <Button
                                size="sm"
                                loading={setExpiry.isPending}
                                disabled={!expiresDraft}
                                onClick={() => setExpiry.mutate({ id: editing.id, expires_at: new Date(expiresDraft).toISOString() })}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
