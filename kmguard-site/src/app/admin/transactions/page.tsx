'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, timeUntil } from '@/lib/utils'
import { toast } from 'sonner'
import type { License } from '@/types'

export default function AdminLicensesPage() {
    const [page, setPage] = useState(1)
    const qc = useQueryClient()

    const { data } = useQuery({
        queryKey: ['admin-licenses', page],
        queryFn:  () => adminApi.licenses(page).then(r => r.data.licenses ?? []),
    })

    const revoke = useMutation({
        mutationFn: (id: string) => adminApi.revokeLic(id),
        onSuccess:  () => {
            qc.invalidateQueries({ queryKey: ['admin-licenses'] })
            toast.success('License revoked')
        },
        onError: () => toast.error('Failed to revoke'),
    })

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Licenses</h1>

            <Table>
                <Thead>
                    <Th>User</Th>
                    <Th>Plan</Th>
                    <Th>Key</Th>
                    <Th>Status</Th>
                    <Th>Expires</Th>
                    <Th>Created</Th>
                    <Th></Th>
                </Thead>
                <Tbody>
                    {(data ?? []).map((l: any) => (
                        <Tr key={l.id}>
                            <Td className="font-medium text-white">{l.username}</Td>
                            <Td>{l.plan_name}</Td>
                            <Td className="font-mono text-xs">{l.license_key}</Td>
                            <Td><Badge value={l.status} /></Td>
                            <Td>
                <span className="text-xs">
                  {formatDate(l.expires_at)}
                    <span className="ml-1 text-[--muted]">({timeUntil(l.expires_at)})</span>
                </span>
                            </Td>
                            <Td>{formatDate(l.created_at)}</Td>
                            <Td>
                                {l.status !== 'banned' && (
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => revoke.mutate(l.id)}
                                        loading={revoke.isPending}
                                    >
                                        Revoke
                                    </Button>
                                )}
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>

            <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Prev
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPage(p => p + 1)}>
                    Next
                </Button>
            </div>
        </div>
    )
}