'use client'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { Transaction } from '@/types'

export default function AdminTransactionsPage() {
    const { data } = useQuery<Transaction[]>({
        queryKey: ['admin-transactions'],
        queryFn:  () => adminApi.transactions().then(r => r.data.transactions ?? []),
    })

    const total = (data ?? [])
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between">
                <h1 className="text-2xl font-bold">Transactions</h1>
                <div className="rounded-lg border border-[--border] bg-[--surface] px-4 py-2 text-sm">
                    Total revenue:{' '}
                    <span className="ml-1 font-bold text-emerald-400">
            ${total.toFixed(2)}
          </span>
                </div>
            </div>

            <Table>
                <Thead>
                    <Th>User</Th>
                    <Th>Amount</Th>
                    <Th>Currency</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Completed</Th>
                </Thead>
                <Tbody>
                    {(data ?? []).map(t => (
                        <Tr key={t.id}>
                            <Td className="font-medium text-white">{t.username}</Td>
                            <Td className="font-mono">{t.amount.toFixed(2)}</Td>
                            <Td>{t.currency}</Td>
                            <Td><Badge value={t.status} /></Td>
                            <Td>{formatDateTime(t.created_at)}</Td>
                            <Td>{t.completed_at ? formatDateTime(t.completed_at) : '—'}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    )
}