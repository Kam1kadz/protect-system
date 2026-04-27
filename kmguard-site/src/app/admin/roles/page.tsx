'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

const ALL_PERMISSIONS = [
    { group: 'Users',        perms: ['users.view','users.ban','users.role','users.hwid_reset','users.give_subscription'] },
    { group: 'Licenses',     perms: ['licenses.view','licenses.revoke'] },
    { group: 'Keys',         perms: ['keys.view','keys.generate','keys.delete'] },
    { group: 'Promo',        perms: ['promo.view','promo.create','promo.delete'] },
    { group: 'Payload',      perms: ['payload.upload'] },
    { group: 'Monitoring',   perms: ['events.view','logs.view'] },
    { group: 'Transactions', perms: ['transactions.view','transactions.mark_paid'] },
    { group: 'Settings',     perms: ['settings.general','settings.maintenance'] },
    { group: 'Partner',      perms: ['partner.earnings'] },
]

export default function AdminRolesPage() {
    const qc = useQueryClient()
    const [selected,    setSelected]    = useState<string | null>(null)
    const [newRoleName, setNewRoleName] = useState('')
    const [checkedPerms, setCheckedPerms] = useState<Set<string>>(new Set())

    const { data } = useQuery({
        queryKey: ['admin-roles'],
        queryFn:  () => adminApi.roles().then(r => r.data.roles ?? []),
    })

    const upsert = useMutation({
        mutationFn: () => adminApi.upsertRole({
            role_name:   newRoleName || selected!,
            permissions: JSON.stringify([...checkedPerms]),
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-roles'] })
            toast.success('Role saved')
            setNewRoleName('')
        },
        onError: () => toast.error('Cannot modify system role'),
    })

    function selectRole(r: any) {
        setSelected(r.role_name)
        setNewRoleName('')
        try {
            const perms: string[] = JSON.parse(r.permissions)
            setCheckedPerms(new Set(perms))
        } catch {
            setCheckedPerms(new Set())
        }
    }

    function togglePerm(perm: string) {
        setCheckedPerms(prev => {
            const next = new Set(prev)
            next.has(perm) ? next.delete(perm) : next.add(perm)
            return next
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Roles & Permissions</h1>

            <div className="grid gap-6 lg:grid-cols-3">

                {/* Role list */}
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[--muted]">Roles</p>
                    {(data ?? []).map((r: any) => (
                        <button
                            key={r.role_name}
                            onClick={() => selectRole(r)}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                                selected === r.role_name
                                    ? 'border-[--accent] bg-[--accent]/10 text-white'
                                    : 'border-[--border] bg-[--surface] text-[--muted] hover:text-white'
                            }`}
                        >
                            <span className="capitalize">{r.role_name}</span>
                            {r.is_system && <Lock size={12} className="text-[--muted]"/>}
                        </button>
                    ))}

                    {/* New role */}
                    <div className="mt-2 flex flex-col gap-2">
                        <Input
                            placeholder="New role name…"
                            value={newRoleName}
                            onChange={e => { setNewRoleName(e.target.value); setSelected(null); setCheckedPerms(new Set()) }}
                        />
                    </div>
                </div>

                {/* Permissions editor */}
                <div className="lg:col-span-2">
                    {(selected || newRoleName) ? (
                        <Card>
                            <p className="mb-4 font-semibold capitalize">
                                {newRoleName || selected}
                                {selected && (data ?? []).find((r: any) => r.role_name === selected)?.is_system && (
                                    <Badge value="system" className="ml-2"/>
                                )}
                            </p>

                            <div className="flex flex-col gap-4">
                                {ALL_PERMISSIONS.map(group => (
                                    <div key={group.group}>
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[--muted]">
                                            {group.group}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {group.perms.map(perm => (
                                                <label
                                                    key={perm}
                                                    className="flex cursor-pointer items-center gap-2 text-sm"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checkedPerms.has(perm)}
                                                        onChange={() => togglePerm(perm)}
                                                        className="accent-[--accent]"
                                                    />
                                                    <span className="font-mono text-xs text-zinc-300">{perm}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button
                                className="mt-6"
                                onClick={() => upsert.mutate()}
                                loading={upsert.isPending}
                            >
                                Save Role
                            </Button>
                        </Card>
                    ) : (
                        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-[--border] text-sm text-[--muted]">
                            Select a role or create a new one
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}