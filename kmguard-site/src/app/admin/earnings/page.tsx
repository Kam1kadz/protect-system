'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import type { Earning } from '@/types'

export default function AdminEarningsPage() {
    const qc = useQueryClient()

    const { data } = useQuery<Earning[]>({
        queryKey: ['admin-earnings'],
        queryFn:  () => adminApi.earnings().then(r => r.data.earnings ?? []),
    })

    const markPaid = useMutation({
        mutationFn: (id: string) => adminApi.markPaid(id),
        onSuccess:  () => {
            qc.invalidateQueries({ queryKey: ['admin-earnings'] })
            toast.success('Marked as paid')
        },
    })

    const pending = (data ?? [])
        .filter(e => !e.is_paid)
        .reduce((sum, e) => sum + e.amount, 0)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between">
                <h1 className="text-2xl font-bold">Partner Earnings</h1>
                <div className="rounded-lg border border-[--border] bg-[--surface] px-4 py-2 text-sm">
                    Pending payout:{' '}
                    <span className="ml-1 font-bold text-amber-400">
            ${pending.toFixed(2)}
          </span>
                </div>
            </div>

            <Table>
                <Thead>
                    <Th>Partner</Th>
                    <Th>Amount</Th>
                    <Th>Currency</Th>
                    <Th>Status</Th>
                    <Th>Earned</Th>
                    <Th>Paid at</Th>
                    <Th></Th>
                </Thead>
                <Tbody>
                    {(data ?? []).map(e => (
                        <Tr key={e.id}>
                            <Td className="font-medium text-white">{e.username}</Td>
                            <Td className="font-mono">{e.amount.toFixed(2)}</Td>
                            <Td>{e.currency}</Td>
                            <Td><Badge value={e.is_paid ? 'active' : 'pending'} /></Td>
                            <Td>{formatDateTime(e.created_at)}</Td>
                            <Td>{e.paid_at ? formatDateTime(e.paid_at) : '—'}</Td>
                            <Td>
                                {!e.is_paid && (
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        loading={markPaid.isPending}
                                        onClick={() => markPaid.mutate(e.id)}
                                    >
                                        Mark Paid
                                    </Button>
                                )}
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    )
}