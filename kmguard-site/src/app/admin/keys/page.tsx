'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, api } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Copy, Trash2 } from 'lucide-react'
import type { LoaderKey, Plan } from '@/types'

export default function AdminKeysPage() {
    const qc = useQueryClient()
    const [planId, setPlanId]       = useState('')
    const [count, setCount]         = useState(1)
    const [duration, setDuration]   = useState(30)

    const { data: keys } = useQuery<LoaderKey[]>({
        queryKey: ['admin-keys'],
        queryFn:  () => adminApi.keys().then(r => r.data.keys ?? []),
    })

    const { data: plans } = useQuery<Plan[]>({
        queryKey: ['plans'],
        queryFn:  () => api.get('/api/v1/auth/plans').then(r => r.data.plans ?? []),
    })

    const gen = useMutation({
        mutationFn: () => adminApi.genKeys({ plan_id: planId, count, duration_days: duration }),
        onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin-keys'] }); toast.success(`${count} keys generated`) },
        onError:    () => toast.error('Failed to generate keys'),
    })

    const del = useMutation({
        mutationFn: (id: string) => adminApi.deleteKey(id),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-keys'] }),
    })

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Loader Keys</h1>

            <Card className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-[--muted]">Plan</label>
                    <select
                        className="rounded-lg border border-[--border] bg-[--surface] px-3 py-2 text-sm text-white"
                        value={planId}
                        onChange={e => setPlanId(e.target.value)}
                    >
                        <option value="">Select plan</option>
                        {(plans ?? []).map(p => (
                            <option key={p.id} value={p.id}>{p.display_name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-[--muted]">Count (max 100)</label>
                    <Input
                        type="number" min={1} max={100}
                        value={count}
                        onChange={e => setCount(Number(e.target.value))}
                        className="w-24"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-[--muted]">Duration (days)</label>
                    <Input
                        type="number" min={1}
                        value={duration}
                        onChange={e => setDuration(Number(e.target.value))}
                        className="w-24"
                    />
                </div>
                <Button onClick={() => gen.mutate()} disabled={!planId} loading={gen.isPending}>
                    Generate
                </Button>
            </Card>

            <Table>
                <Thead>
                    <Th>Key</Th><Th>Plan</Th><Th>Duration</Th><Th>Used</Th><Th>Used By</Th><Th>Created</Th><Th></Th>
                </Thead>
                <Tbody>
                    {(keys ?? []).map(k => (
                        <Tr key={k.id}>
                            <Td className="font-mono text-xs">{k.key_value}</Td>
                            <Td>{k.plan_name}</Td>
                            <Td>{k.duration_days} days</Td>
                            <Td><Badge value={k.is_used ? 'active' : 'pending'} /></Td>
                            <Td>{k.used_by ?? '—'}</Td>
                            <Td>{formatDate(k.created_at)}</Td>
                            <Td>
                                <div className="flex gap-2">
                                    <Button size="icon" variant="ghost" onClick={() => {
                                        navigator.clipboard.writeText(k.key_value)
                                        toast.success('Copied!')
                                    }}>
                                        <Copy size={14}/>
                                    </Button>
                                    {!k.is_used && (
                                        <Button size="icon" variant="ghost" onClick={() => del.mutate(k.id)}>
                                            <Trash2 size={14} className="text-red-400"/>
                                        </Button>
                                    )}
                                </div>
                            </Td>
                        </Tr>
                    ))}
                </Tbody>
            </Table>
        </div>
    )
}