'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { AuditLog } from '@/types'

const SEVERITIES = ['all', 'info', 'warn', 'critical'] as const

export default function AdminLogsPage() {
    const [severity, setSeverity] = useState<string>('all')

    const { data } = useQuery<AuditLog[]>({
        queryKey: ['admin-logs'],
        queryFn:  () => adminApi.logs().then(r => r.data.logs ?? []),
        refetchInterval: 15_000,
    })

    const filtered = (data ?? []).filter(l =>
        severity === 'all' || l.severity === severity,
    )

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Audit Logs</h1>

                {/* Severity filter */}
                <div className="flex gap-1 rounded-lg border border-[--border] bg-[--surface] p-1">
                    {SEVERITIES.map(s => (
                        <button
                            key={s}
                            onClick={() => setSeverity(s)}
                            className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                                severity === s
                                    ? 'bg-[--accent] text-white'
                                    : 'text-[--muted] hover:text-white'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <Table>
                <Thead>
                    <Th>User</Th>
                    <Th>Event</Th>
                    <Th>Severity</Th>
                    <Th>IP</Th>
                    <Th>Payload</Th>
                    <Th>Time</Th>
                </Thead>
                <Tbody>
                    {filtered.map(l => (
                        <Tr key={l.id}>
                            <Td className="font-medium text-white">{l.username ?? '—'}</Td>
                            <Td className="font-mono text-xs">{l.event_type}</Td>
                            <Td><Badge value={l.severity} /></Td>
                            <Td className="font-mono text-xs">{l.ip_address ?? '—'}</Td>
                            <Td>
                <span
                    className="block max-w-[200px] truncate font-mono text-xs text-[--muted]"
                    title={l.payload}
                >
                  {l.payload === '{}' ? '—' : l.payload}
                </span>
                            </Td>
                            <Td>{formatDateTime(l.created_at)}</Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    )
}