'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/types'
import { toast } from 'sonner'
import { Search, RefreshCw, ShieldOff, Shield, RotateCcw, Crown } from 'lucide-react'

export default function AdminUsersPage() {
    const [search, setSearch]     = useState('')
    const [page, setPage]         = useState(1)
    const [giving, setGiving]     = useState<string|null>(null)
    const [giveForm, setGiveForm] = useState({ plan_id: '', expires_at: '' })
    const { user }                = useAuthStore()
    const qc                      = useQueryClient()
    const role                    = user?.role as any

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-users', page, search],
        queryFn:  () => adminApi.users(page, search).then(r => r.data),
    })

    const { data: rolesData } = useQuery({
        queryKey: ['admin-roles'],
        queryFn:  () => adminApi.roles().then(r => r.data),
    })
    const ROLES = (rolesData ?? []).map((r: any) => r.role_name)

    const { data: plans } = useQuery({
        queryKey: ['plans'],
        queryFn:  () => api.get('/api/v1/auth/plans').then(r => r.data.plans ?? []),
    })

    const users = data?.users ?? []
    const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] })

    const ban    = useMutation({ mutationFn: (id:string) => adminApi.banUser(id),    onSuccess: () => { invalidate(); toast.success('Banned') } })
    const unban  = useMutation({ mutationFn: (id:string) => adminApi.unbanUser(id),  onSuccess: () => { invalidate(); toast.success('Unbanned') } })
    const hwid   = useMutation({ mutationFn: (id:string) => adminApi.resetHWID(id), onSuccess: () => toast.success('HWID reset') })
    const setRoleMut = useMutation({
        mutationFn: ({ id, r }: { id:string; r:string }) => adminApi.setRole(id, r),
        onSuccess: () => { invalidate(); toast.success('Role updated') },
    })
    const giveSub = useMutation({
        mutationFn: (id:string) => adminApi.giveSub(id, {
            plan_id:    giveForm.plan_id,
            expires_at: new Date(giveForm.expires_at).toISOString(),
        }),
        onSuccess: () => { setGiving(null); toast.success('Subscription given') },
        onError:   () => toast.error('Failed'),
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Users</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        borderRadius: '8px', border: '1px solid #1c1c1f',
                        background: '#111113', padding: '7px 12px',
                    }}>
                        <Search size={13} color="#71717a"/>
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            placeholder="Search username or email…"
                            style={{ background: 'none', border: 'none', outline: 'none', color: '#fafafa', fontSize: '13px', width: '220px' }}
                        />
                    </div>
                    <Button size="sm" variant="outline" onClick={invalidate}><RefreshCw size={13}/></Button>
                </div>
            </div>

            {/* Table */}
            <div style={{ borderRadius: '12px', border: '1px solid #1c1c1f', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1c1c1f', background: '#0d0d0f' }}>
                            {['UID', 'Username','Email','Role','HWID','Registered','Actions'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>Loading…</td></tr>
                        )}
                        {isError && (
                            <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#ef4444', fontSize: '13px' }}>Failed to load users. Check backend.</td></tr>
                        )}
                        {!isLoading && users.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#52525b', fontSize: '13px' }}>No users found</td></tr>
                        )}
                        {users.map((u: any, i: number) => (
                            <tr key={u.id} style={{ borderBottom: i < users.length-1 ? '1px solid #1c1c1f' : 'none', background: i % 2 === 0 ? '#111113' : '#0d0d0f' }}>
                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#52525b' }}>#{u.uid}</td>
                                <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 500, color: '#fafafa' }}>{u.username}</td>
                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#71717a' }}>{u.email}</td>
                                <td style={{ padding: '10px 14px' }}>
                                    {hasPermission(role, 'users.role') ? (
                                        <select
                                            value={u.role}
                                            onChange={e => setRoleMut.mutate({ id: u.id, r: e.target.value })}
                                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '6px', color: '#fafafa', fontSize: '12px', padding: '3px 6px', cursor: 'pointer' }}
                                        >
                                            {ROLES.map((r: string) => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    ) : <Badge value={u.role} />}
                                </td>
                                <td style={{ padding: '10px 14px', fontSize: '11px', fontFamily: 'monospace', color: '#52525b' }}>
                                    {u.hwid ? u.hwid.slice(0,14)+'…' : '—'}
                                </td>
                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#71717a' }}>{formatDate(u.created_at)}</td>
                                <td style={{ padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {hasPermission(role, 'users.hwid_reset') && (
                                            <button title="Reset HWID" onClick={() => hwid.mutate(u.id)} style={btnStyle('#1c1c1f')}>
                                                <RotateCcw size={12}/>
                                            </button>
                                        )}
                                        {hasPermission(role, 'users.give_subscription') && (
                                            <button title="Give subscription" onClick={() => setGiving(u.id)} style={btnStyle('#1c1c1f')}>
                                                <Crown size={12} color="#22c55e"/>
                                            </button>
                                        )}
                                        {hasPermission(role, 'users.ban') && (
                                            u.role === 'banned'
                                                ? <button title="Unban" onClick={() => unban.mutate(u.id)} style={btnStyle('#16a34a20')}><Shield size={12} color="#22c55e"/></button>
                                                : <button title="Ban" onClick={() => ban.mutate(u.id)} style={btnStyle('#ef444420')}><ShieldOff size={12} color="#ef4444"/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button size="sm" variant="outline" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</Button>
                <span style={{ fontSize: '12px', color: '#71717a' }}>Page {page}</span>
                <Button size="sm" variant="outline" disabled={users.length < 50} onClick={() => setPage(p=>p+1)}>Next →</Button>
            </div>

            {/* Give Sub Modal */}
            {giving && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
                }} onClick={() => setGiving(null)}>
                    <div style={{
                        background: '#111113', border: '1px solid #1c1c1f',
                        borderRadius: '16px', padding: '24px', width: '360px',
                        display: 'flex', flexDirection: 'column', gap: '16px',
                    }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Give Subscription</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a' }}>Plan</label>
                            <select
                                value={giveForm.plan_id}
                                onChange={e => setGiveForm(f => ({ ...f, plan_id: e.target.value }))}
                                style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '8px 10px' }}
                            >
                                <option value="">Select plan…</option>
                                {(plans ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a' }}>Expires at</label>
                            <input
                                type="datetime-local"
                                value={giveForm.expires_at}
                                onChange={e => setGiveForm(f => ({ ...f, expires_at: e.target.value }))}
                                style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '8px 10px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <Button size="sm" variant="outline" onClick={() => setGiving(null)}>Cancel</Button>
                            <Button size="sm" loading={giveSub.isPending} disabled={!giveForm.plan_id || !giveForm.expires_at} onClick={() => giveSub.mutate(giving)}>Give</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function btnStyle(bg: string): React.CSSProperties {
    return {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px', borderRadius: '6px',
        background: bg, border: '1px solid #27272a',
        cursor: 'pointer', color: '#a1a1aa',
    }
}
