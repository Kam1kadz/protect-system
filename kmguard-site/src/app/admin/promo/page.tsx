'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Table, Thead, Th, Tbody, Tr, Td } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import type { PromoCode } from '@/types'

export default function AdminPromoPage() {
    const qc = useQueryClient()
    const [code,        setCode]        = useState('')
    const [partnerId,   setPartnerId]   = useState('')
    const [discountPct, setDiscountPct] = useState(0)
    const [partnerPct,  setPartnerPct]  = useState(0)
    const [usesMax,     setUsesMax]     = useState('')
    const [expiresAt,   setExpiresAt]   = useState('')

    const { data: promos } = useQuery<PromoCode[]>({
        queryKey: ['admin-promos'],
        queryFn:  () => adminApi.promos().then(r => r.data.promos ?? []),
    })

    const create = useMutation({
        mutationFn: () => adminApi.createPromo({
            code, partner_id: partnerId || undefined,
            discount_pct: discountPct, partner_pct: partnerPct,
            uses_max:  usesMax ? Number(usesMax) : undefined,
            expires_at: expiresAt || undefined,
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-promos'] })
            toast.success('Promo code created')
            setCode('')
        },
        onError: () => toast.error('Code already exists or invalid'),
    })

    const del = useMutation({
        mutationFn: (id: string) => adminApi.deletePromo(id),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin-promos'] }),
    })

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Promo Codes</h1>
                <Badge value={(promos ?? []).length + " Active"} variant="outline" />
            </div>

            <Card className="border-[--border] bg-[#0d0d0f]">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--muted]">Code *</label>
                        <Input value={code} onChange={e => setCode(e.target.value)} placeholder="SUMMER25" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--muted]">Partner User ID</label>
                        <Input value={partnerId} onChange={e => setPartnerId(e.target.value)} placeholder="uuid…" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--muted]">Discount %</label>
                        <Input type="number" min={0} max={100} value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--muted]">Partner % (of sale)</label>
                        <Input type="number" min={0} max={100} value={partnerPct} onChange={e => setPartnerPct(Number(e.target.value))} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--muted]">Max uses (empty = unlimited)</label>
                        <Input type="number" value={usesMax} onChange={e => setUsesMax(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--muted]">Expires at</label>
                        <Input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
                    </div>
                </div>
                <Button className="mt-4" onClick={() => create.mutate()} disabled={!code} loading={create.isPending}>
                    Create
                </Button>
            </Card>

            <div className="rounded-xl border border-[--border] bg-[#0d0d0f] overflow-hidden">
                <Table>
                    <Thead>
                        <Th>Code</Th><Th>Partner</Th><Th>Discount</Th><Th>Partner%</Th>
                        <Th>Uses</Th><Th>Active</Th><Th>Expires</Th><Th></Th>
                    </Thead>
                    <Tbody>
                        {(promos ?? []).map(p => (
                            <Tr key={p.id} className="hover:bg-[#111113] transition-colors">
                                <Td className="font-mono font-bold text-emerald-400">{p.code}</Td>
                                <Td className="text-sm text-gray-400">{p.partner ?? '—'}</Td>
                                <Td className="text-sm font-semibold">{p.discount_pct}%</Td>
                                <Td className="text-sm text-gray-500">{p.partner_pct}%</Td>
                                <Td className="text-sm">{p.uses_total}{p.uses_max ? ` / ${p.uses_max}` : ''}</Td>
                                <Td><Badge value={p.is_active ? 'active' : 'expired'} /></Td>
                                <Td className="text-xs text-gray-500">{p.expires_at ? formatDate(p.expires_at) : '∞'}</Td>
                                <Td>
                                    <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)} className="hover:bg-red-500/10">
                                        <Trash2 size={14} className="text-red-500/70 hover:text-red-500"/>
                                    </Button>
                                </Td>
                            </Tr>
                        ))}
                    </Tbody>
                </Table>
            </div>
        </div>
    )
}