'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Plus, Shield, Lock, Edit2, Check, X } from 'lucide-react'

type Role = { role_name: string; permissions: string; is_system: boolean }

const PERMISSION_PRESETS: Record<string, string[]> = {
    'admin':   ['users.read','users.write','licenses.read','licenses.write','keys.generate','promo.write','roles.write','settings.write','payload.write'],
    'support': ['users.read','licenses.read','keys.generate'],
    'partner': ['earnings.read'],
    'user':    [],
}

export default function AdminRolesPage() {
    const qc = useQueryClient()
    const [showNew, setShowNew] = useState(false)
    const [newName, setNewName] = useState('')
    const [newPerms, setNewPerms] = useState<string[]>([])
    const [editingRole, setEditingRole] = useState<string | null>(null)
    const [editPerms, setEditPerms] = useState<string[]>([])

    const ALL_PERMS = [
        'users.read','users.write','licenses.read','licenses.write',
        'keys.generate','promo.write','roles.write','settings.write',
        'payload.write','earnings.read',
    ]

    const { data, isLoading } = useQuery<Role[]>({
        queryKey: ['admin-roles'],
        queryFn: () => adminApi.roles().then(r => r.data.roles ?? []),
    })

    const upsert = useMutation({
        mutationFn: (d: { role_name: string; permissions: string }) => adminApi.upsertRole(d),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-roles'] })
            toast.success('Role saved')
            setShowNew(false); setNewName(''); setNewPerms([]); setEditingRole(null)
        },
        onError: () => toast.error('Failed — cannot modify system role'),
    })

    const permsToJson = (perms: string[]) => JSON.stringify(
        Object.fromEntries(perms.map(p => [p, true]))
    )
    const jsonToPerms = (json: string): string[] => {
        try { return Object.entries(JSON.parse(json)).filter(([,v]) => v).map(([k]) => k) }
        catch { return [] }
    }

    const togglePerm = (perm: string, list: string[], setList: (l: string[]) => void) => {
        setList(list.includes(perm) ? list.filter(p => p !== perm) : [...list, perm])
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Roles & Permissions</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>Custom roles are usable in Users → Set Role</p>
                </div>
                <Button onClick={() => setShowNew(true)} disabled={showNew}><Plus size={14} /> New Role</Button>
            </div>

            {/* New role form */}
            {showNew && (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #27272a', padding: '18px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>Create Role</div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <input value={newName} onChange={e => setNewName(e.target.value.toLowerCase().replace(/\s/g,'_'))}
                            placeholder="role_name (e.g. moderator)"
                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '8px 12px', outline: 'none', flex: 1, minWidth: '200px' }} />
                        <select onChange={e => { if (e.target.value) setNewPerms(PERMISSION_PRESETS[e.target.value] ?? []) }}
                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#a1a1aa', fontSize: '13px', padding: '8px 12px', outline: 'none' }}>
                            <option value="">Copy from preset…</option>
                            {Object.keys(PERMISSION_PRESETS).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                        {ALL_PERMS.map(p => (
                            <button key={p} onClick={() => togglePerm(p, newPerms, setNewPerms)} style={{
                                background: newPerms.includes(p) ? 'rgba(34,197,94,0.12)' : '#1c1c1f',
                                border: `1px solid ${newPerms.includes(p) ? 'rgba(34,197,94,0.3)' : '#27272a'}`,
                                borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                                color: newPerms.includes(p) ? '#22c55e' : '#71717a', fontSize: '12px',
                                display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                                {newPerms.includes(p) && <Check size={10} />} {p}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="outline" onClick={() => { setShowNew(false); setNewName(''); setNewPerms([]) }}><X size={13} /> Cancel</Button>
                        <Button size="sm" loading={upsert.isPending} disabled={!newName}
                            onClick={() => upsert.mutate({ role_name: newName, permissions: permsToJson(newPerms) })}>
                            <Check size={13} /> Create
                        </Button>
                    </div>
                </div>
            )}

            {/* Roles list */}
            {isLoading && <p style={{ color: '#71717a', fontSize: '13px' }}>Loading…</p>}
            {(data ?? []).map(role => {
                const perms = jsonToPerms(role.permissions)
                const editing = editingRole === role.role_name
                return (
                    <div key={role.role_name} style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: role.is_system ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {role.is_system ? <Lock size={14} color="#3b82f6" /> : <Shield size={14} color="#22c55e" />}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {role.role_name}
                                        {role.is_system && <Badge value="active" />}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                                        {role.is_system ? 'System role — cannot be modified' : `${perms.length} permission${perms.length !== 1 ? 's' : ''}`}
                                    </div>
                                </div>
                            </div>
                            {!role.is_system && !editing && (
                                <button onClick={() => { setEditingRole(role.role_name); setEditPerms(perms) }} style={{
                                    background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '6px',
                                    padding: '5px 10px', cursor: 'pointer', color: '#a1a1aa', fontSize: '12px',
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                }}>
                                    <Edit2 size={12} /> Edit
                                </button>
                            )}
                            {editing && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <Button size="sm" variant="outline" onClick={() => setEditingRole(null)}><X size={12} /></Button>
                                    <Button size="sm" loading={upsert.isPending}
                                        onClick={() => upsert.mutate({ role_name: role.role_name, permissions: permsToJson(editPerms) })}>
                                        <Check size={12} /> Save
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {ALL_PERMS.map(p => {
                                const has = editing ? editPerms.includes(p) : perms.includes(p)
                                return (
                                    <button key={p}
                                        onClick={() => editing && togglePerm(p, editPerms, setEditPerms)}
                                        style={{
                                            background: has ? 'rgba(34,197,94,0.1)' : '#1c1c1f',
                                            border: `1px solid ${has ? 'rgba(34,197,94,0.25)' : '#1c1c1f'}`,
                                            borderRadius: '5px', padding: '3px 8px',
                                            color: has ? '#22c55e' : '#3f3f46', fontSize: '11px',
                                            cursor: editing ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', gap: '3px',
                                        }}>
                                        {has && <Check size={9} />} {p}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
