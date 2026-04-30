'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Check, X } from 'lucide-react'

type Tier = { id?: string; duration_days: number; price: number; currency: string }
type Plan = { id: string; name: string; display_name: string; is_active: boolean; sort_order: number; product_type: string; config_file_key: string; tiers: Tier[] }

const EMPTY_TIER: Tier = { duration_days: 30, price: 9.99, currency: 'USD' }

export default function AdminStorePage() {
    const qc = useQueryClient()
    const [showNewPlan, setShowNewPlan] = useState(false)
    const [newPlan, setNewPlan] = useState({ name: '', display_name: '', sort_order: 0, product_type: 'subscription' })
    const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
    const [newTier, setNewTier] = useState<Record<string, Tier>>({})
    const [editingPlan, setEditingPlan] = useState<string | null>(null)
    const [editVals, setEditVals] = useState<{ display_name: string; is_active: boolean; product_type: string; config_file_key: string }>({ display_name: '', is_active: true, product_type: 'subscription', config_file_key: '' })

    const { data: plans, isLoading } = useQuery<Plan[]>({
        queryKey: ['admin-plans'],
        queryFn: () => adminApi.plans().then(r => r.data.plans ?? []),
    })

    const createPlan = useMutation({
        mutationFn: () => adminApi.createPlan(newPlan),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); setShowNewPlan(false); setNewPlan({ name: '', display_name: '', sort_order: 0 }); toast.success('Plan created') },
        onError: () => toast.error('Failed to create plan'),
    })

    const updatePlan = useMutation({
        mutationFn: ({ id, body }: { id: string; body: any }) => adminApi.updatePlan(id, body),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); setEditingPlan(null); toast.success('Plan updated') },
        onError: () => toast.error('Failed to update plan'),
    })

    const deletePlan = useMutation({
        mutationFn: (id: string) => adminApi.deletePlan(id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success('Plan deleted') },
        onError: () => toast.error('Failed to delete plan'),
    })

    const addTier = useMutation({
        mutationFn: ({ planId, tier }: { planId: string; tier: Tier }) => adminApi.addTier(planId, tier),
        onSuccess: (_, { planId }) => {
            qc.invalidateQueries({ queryKey: ['admin-plans'] })
            setNewTier(t => ({ ...t, [planId]: EMPTY_TIER }))
            toast.success('Tier added')
        },
        onError: () => toast.error('Failed to add tier'),
    })

    const deleteTier = useMutation({
        mutationFn: ({ planId, tierId }: { planId: string; tierId: string }) => adminApi.deleteTier(planId, tierId),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success('Tier deleted') },
        onError: () => toast.error('Failed to delete tier'),
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Store / Plans</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>Manage subscription plans and pricing tiers</p>
                </div>
                <Button onClick={() => setShowNewPlan(true)} disabled={showNewPlan}><Plus size={14} /> New Plan</Button>
            </div>

            {/* New Plan Form */}
            {showNewPlan && (
                <div style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #27272a', padding: '18px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '14px' }}>Create Plan</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a' }}>Internal slug</label>
                            <input value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                placeholder="e.g. premium"
                                style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '8px 10px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a' }}>Display name</label>
                            <input value={newPlan.display_name} onChange={e => setNewPlan(p => ({ ...p, display_name: e.target.value }))}
                                placeholder="e.g. Premium"
                                style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '8px 10px', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a' }}>Type</label>
                            <select value={newPlan.product_type} onChange={e => setNewPlan(p => ({ ...p, product_type: e.target.value }))}
                                style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '8px 10px', outline: 'none' }}>
                                <option value="subscription">Subscription</option>
                                <option value="hwid_reset">HWID Reset</option>
                                <option value="config">Config</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: '#71717a' }}>Sort</label>
                            <input type="number" value={newPlan.sort_order} onChange={e => setNewPlan(p => ({ ...p, sort_order: +e.target.value }))}
                                style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '8px 10px', outline: 'none', width: '50px' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="outline" onClick={() => setShowNewPlan(false)}><X size={13} /> Cancel</Button>
                        <Button size="sm" loading={createPlan.isPending} disabled={!newPlan.name || !newPlan.display_name} onClick={() => createPlan.mutate()}>
                            <Check size={13} /> Create
                        </Button>
                    </div>
                </div>
            )}

            {isLoading && <p style={{ color: '#71717a', fontSize: '13px' }}>Loading…</p>}

            {(plans ?? []).map(plan => {
                const expanded = expandedPlan === plan.id
                const tier = newTier[plan.id] ?? EMPTY_TIER
                const editing = editingPlan === plan.id

                return (
                    <div key={plan.id} style={{ background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f', padding: '16px 20px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: (expanded || editing) ? '16px' : 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {editing ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input value={editVals.display_name}
                                            onChange={e => setEditVals(v => ({ ...v, display_name: e.target.value }))}
                                            placeholder="Display name"
                                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '160px' }} />
                                        <select value={editVals.product_type} onChange={e => setEditVals(v => ({ ...v, product_type: e.target.value }))}
                                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '6px 10px', outline: 'none' }}>
                                            <option value="subscription">Subscription</option>
                                            <option value="hwid_reset">HWID Reset</option>
                                            <option value="config">Config</option>
                                        </select>
                                        {editVals.product_type === 'config' && (
                                            <input value={editVals.config_file_key}
                                                onChange={e => setEditVals(v => ({ ...v, config_file_key: e.target.value }))}
                                                placeholder="Config key/URL"
                                                style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa', fontSize: '13px', padding: '6px 10px', outline: 'none', width: '140px' }} />
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{plan.display_name}</span>
                                        <Badge value={plan.product_type} variant="outline" />
                                    </>
                                )}
                                <span style={{ fontSize: '11px', color: '#3f3f46', fontFamily: 'monospace' }}>{plan.name}</span>
                                <Badge value={plan.is_active ? 'active' : 'expired'} />
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {editing ? (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}><X size={12} /></Button>
                                        <Button size="sm" loading={updatePlan.isPending}
                                            onClick={() => updatePlan.mutate({ id: plan.id, body: editVals })}>
                                            <Check size={12} /> Save
                                        </Button>
                                    </>
                                ) : (
                                    <button onClick={() => { setEditingPlan(plan.id); setEditVals({ display_name: plan.display_name, is_active: plan.is_active, product_type: plan.product_type || 'subscription', config_file_key: plan.config_file_key || '' }) }}
                                        style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#a1a1aa', display: 'flex', alignItems: 'center' }}>
                                        <Edit2 size={13} />
                                    </button>
                                )}
                                <button onClick={() => { if (confirm(`Delete plan "${plan.display_name}"?`)) deletePlan.mutate(plan.id) }}
                                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                    <Trash2 size={13} />
                                </button>
                                <button onClick={() => setExpandedPlan(expanded ? null : plan.id)}
                                    style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#a1a1aa', display: 'flex', alignItems: 'center' }}>
                                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                            </div>
                        </div>

                        {/* Tiers */}
                        {expanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing Tiers ({(plan.tiers ?? []).length})</p>

                                {(plan.tiers ?? []).map(t => (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#111113', borderRadius: '8px', border: '1px solid #1c1c1f', padding: '10px 14px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 500, minWidth: '80px' }}>{t.duration_days} days</span>
                                        <span style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e' }}>${t.price} <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 400 }}>{t.currency}</span></span>
                                        <span style={{ fontSize: '11px', color: '#3f3f46', fontFamily: 'monospace', marginLeft: 'auto' }}>{t.id?.slice(0, 8)}…</span>
                                        <button onClick={() => deleteTier.mutate({ planId: plan.id, tierId: t.id! })}
                                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}

                                {/* Add tier */}
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', background: '#111113', borderRadius: '8px', border: '1px dashed #27272a', padding: '12px 14px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={{ fontSize: '11px', color: '#71717a' }}>Days</label>
                                        <input type="number" value={tier.duration_days}
                                            onChange={e => setNewTier(t => ({ ...t, [plan.id]: { ...tier, duration_days: +e.target.value } }))}
                                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '6px', color: '#fafafa', fontSize: '13px', padding: '6px 8px', outline: 'none', width: '70px' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={{ fontSize: '11px', color: '#71717a' }}>Price</label>
                                        <input type="number" step="0.01" value={tier.price}
                                            onChange={e => setNewTier(t => ({ ...t, [plan.id]: { ...tier, price: +e.target.value } }))}
                                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '6px', color: '#fafafa', fontSize: '13px', padding: '6px 8px', outline: 'none', width: '80px' }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={{ fontSize: '11px', color: '#71717a' }}>Currency</label>
                                        <select value={tier.currency}
                                            onChange={e => setNewTier(t => ({ ...t, [plan.id]: { ...tier, currency: e.target.value } }))}
                                            style={{ background: '#1c1c1f', border: '1px solid #27272a', borderRadius: '6px', color: '#fafafa', fontSize: '13px', padding: '6px 8px', outline: 'none' }}>
                                            <option>USD</option><option>EUR</option><option>RUB</option>
                                        </select>
                                    </div>
                                    <Button size="sm" loading={addTier.isPending}
                                        onClick={() => addTier.mutate({ planId: plan.id, tier })}>
                                        <Plus size={12} /> Add Tier
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
