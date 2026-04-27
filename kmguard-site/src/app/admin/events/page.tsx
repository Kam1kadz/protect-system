'use client'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { RuntimeEvent } from '@/types'

export default function AdminEventsPage() {
    const { data } = useQuery<RuntimeEvent[]>({
        queryKey: ['admin-events'],
        queryFn:  () => adminApi.events().then(r => r.data.events ?? []),
        refetchInterval: 10_000,
    })

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Anti-Cheat Events</h1>
            <Table>
                <Thead>
                    <Th>User</Th><Th>Event</Th><Th>Severity</Th>
                    <Th>IP</Th><Th>Time</Th>
                </Thead>
                <Tbody>
                    {(data ?? []).map(e => (
                        <Tr key={e.id}>
                            <Td className="font-medium text-white">{e.username ?? '—'}</Td>
                            <Td className="font-mono text-xs">{e.event_type}</Td>
                            <Td><Badge value={e.severity} /></Td>
                            <Td className="font-mono text-xs">{e.ip_address ?? '—'}</Td>
                            <Td>{formatDateTime(e.created_at)}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    )
}