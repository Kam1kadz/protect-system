'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/types'
import { toast } from 'sonner'

export default function AdminUsersPage() {
    const [search, setSearch] = useState('')
    const [page, setPage]     = useState(1)
    const { user }            = useAuthStore()
    const qc                  = useQueryClient()
    const role                = user?.role as any

    const { data } = useQuery({
        queryKey: ['admin-users', page, search],
        queryFn:  () => adminApi.users(page, search).then(r => r.data.users ?? []),
    })

    const ban = useMutation({
        mutationFn: (id: string) => adminApi.banUser(id),
        onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User banned') },
    })

    const unban = useMutation({
        mutationFn: (id: string) => adminApi.unbanUser(id),
        onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User unbanned') },
    })

    const hwid = useMutation({
        mutationFn: (id: string) => adminApi.resetHWID(id),
        onSuccess:  () => toast.success('HWID reset'),
    })

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Users</h1>
                <Input
                    placeholder="Search username or email…"
                    className="w-64"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
            </div>

            <Table>
                <Thead>
                    <Th>Username</Th><Th>Email</Th><Th>Role</Th>
                    <Th>HWID</Th><Th>Registered</Th><Th></Th>
                </Thead>
                <Tbody>
                    {(data ?? []).map((u: any) => (
                        <Tr key={u.id}>
                            <Td className="font-medium text-white">{u.username}</Td>
                            <Td>{u.email}</Td>
                            <Td><Badge value={u.role} /></Td>
                            <Td className="font-mono text-xs">{u.hwid ? u.hwid.slice(0, 12) + '…' : '—'}</Td>
                            <Td>{formatDate(u.created_at)}</Td>
                            <Td>
                                <div className="flex gap-2">
                                    {hasPermission(role, 'users.hwid_reset') && (
                                        <Button size="sm" variant="outline" onClick={() => hwid.mutate(u.id)}>
                                            HWID
                                        </Button>
                                    )}
                                    {hasPermission(role, 'users.ban') && (
                                        u.role === 'banned'
                                            ? <Button size="sm" variant="secondary" onClick={() => unban.mutate(u.id)}>Unban</Button>
                                            : <Button size="sm" variant="danger"    onClick={() => ban.mutate(u.id)}>Ban</Button>
                                    )}
                                </div>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
        </div>
    )
}