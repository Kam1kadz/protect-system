'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react'

type Tier = { id?: string; duration_days: number; price: number; currency: string }
type Plan = { id: string; name: string; display_name: string; is_active: boolean; tiers: Tier[] }

const EMPTY_PLAN = { name: '', display_name: '', is_active: true }
const EMPTY_TIER: Tier = { duration_days: 30, price: 9.99, currency: 'USD' }

export default function AdminStorePage() {
    const qc = useQueryClient()
    const [showNewPlan,  setShowNewPlan]  = useState(false)
    const [newPlan,      setNewPlan]      = useState(EMPTY_PLAN)
    const [expandedPlan, setExpandedPlan] = useState<string|null>(null)
    const [newTier,      setNewTier]      = useState<Record<string, Tier>>({})
    const [editingPlan,  setEditingPlan]  = useState<string|null>(null)
    const [editVals,     setEditVals]     = useState<{display_name:string;is_active:boolean}>({}  as any)

    const { data: plans, isLoading } = useQuery<Plan[]>({
        queryKey: ['admin-plans'],
        queryFn:  () => api.get('/api/v1/auth/plans').then(r => r.data.plans ?? []),
    })

    const createPlan = useMutation({
        mutationFn: (body: typeof EMPTY_PLAN) => api.post('/api/v1/admin/plans', body),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); setShowNewPlan(false); setNewPlan(EMPTY_PLAN); toast.success('Plan created') },
        onError:   () => toast.error('Failed to create plan'),
    })

    const updatePlan = useMutation({
        mutationFn: ({ id, body }: { id:string; body: any }) => api.patch(`/api/v1/admin/plans/${id}`, body),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); setEditingPlan(null); toast.success('Plan updated') },
        onError:   () => toast.error('Failed'),
    })

    const deletePlan = useMutation({
        mutationFn: (id:string) => api.delete(`/api/v1/admin/plans/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success('Plan deleted') },
        onError:   () => toast.error('Failed'),
    })

    const addTier = useMutation({
        mutationFn: ({ planId, tier }: { planId:string; tier:Tier }) =>
            api.post(`/api/v1/admin/plans/${planId}/tiers`, tier),
        onSuccess: (_, { planId }) => {
            qc.invalidateQueries({ queryKey: ['admin-plans'] })
            setNewTier(t => ({ ...t, [planId]: EMPTY_TIER }))
            toast.success('Tier added')
        },
        onError: () => toast.error('Failed'),
    })

    const deleteTier = useMutation({
        mutationFn: ({ planId, tierId }: { planId:string; tierId:string }) =>
            api.delete(`/api/v1/admin/plans/${planId}/tiers/${tierId}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success('Tier deleted') },
        onError:   () => toast.error('Failed'),
    })

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Store / Plans</h1>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>Manage subscription plans and pricing tiers</p>
                </div>
                <Button onClick={() => setShowNewPlan(true)}><Plus size={14}/> New Plan</Button>
            </div>

            {/* New Plan Form */}
            {showNewPlan && (
                <div style={cardStyle}>
                    <h3 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600 }}>Create Plan</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={labelStyle}>Internal name (slug)</label>
                            <input value={newPlan.name} onChange={e => setNewPlan(p=>({...p,name:e.target.value}))}
                                placeholder="e.g. premium" style={inputStyle}/>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={labelStyle}>Display name</label>
                            <input value={newPlan.display_name} onChange={e => setNewPlan(p=>({...p,display_name:e.target.value}))}
                                placeholder="e.g. Premium" style={inputStyle}/>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button size="sm" variant="outline" onClick={() => setShowNewPlan(false)}>Cancel</Button>
                        <Button size="sm" loading={createPlan.isPending}
                            disabled={!newPlan.name || !newPlan.display_name}
                            onClick={() => createPlan.mutate(newPlan)}>Create</Button>
                    </div>
                </div>
            )}

            {/* Plans list */}
            {isLoading && <p style={{ color: '#71717a', fontSize: '13px' }}>Loading…</p>}
            {(plans ?? []).map(plan => {
                const expanded = expandedPlan === plan.id
                const tier = newTier[plan.id] ?? EMPTY_TIER
                const editing = editingPlan === plan.id
                return (
                    <div key={plan.id} style={cardStyle}>
                        {/* Plan header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: expanded ? '16px' : 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {editing ? (
                                    <input value={editVals.display_name}
                                        onChange={e => setEditVals(v => ({...v, display_name: e.target.value}))}
                                        style={{ ...inputStyle, width: '160px', padding: '5px 8px' }}
                                    />
                                ) : (
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{plan.display_name}</span>
                                )}
                                <span style={{ fontSize: '11px', color: '#52525b', fontFamily: 'monospace' }}>{plan.name}</span>
                                <Badge value={plan.is_active ? 'active' : 'expired'} />
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {editing ? (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
                                        <Button size="sm" loading={updatePlan.isPending}
                                            onClick={() => updatePlan.mutate({ id: plan.id, body: editVals })}>
                                            Save
                                        </Button>
                                    </>
                                ) : (
                                    <button onClick={() => { setEditingPlan(plan.id); setEditVals({ display_name: plan.display_name, is_active: plan.is_active }) }} style={iconBtn}>
                                        <Edit2 size={13}/>
                                    </button>
                                )}
                                <button onClick={() => { if(confirm(`Delete plan "${plan.display_name}"?`)) deletePlan.mutate(plan.id) }} style={{ ...iconBtn, color: '#ef4444' }}>
                                    <Trash2 size={13}/>
                                </button>
                                <button onClick={() => setExpandedPlan(expanded ? null : plan.id)} style={iconBtn}>
                                    {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                                </button>
                            </div>
                        </div>

                        {/* Tiers */}
                        {expanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <p style={{ margin: 0, fontSize: '11px', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing Tiers</p>

                                {(plan.tiers ?? []).map(t => (
                                    <div key={t.id} style={tierRow}>
                                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{t.duration_days} days</span>
                                        <span style={{ fontSize: '15px', fontWeight: 700, color: '#22c55e' }}>${t.price} <span style={{ fontSize: '11px', color: '#71717a' }}>{t.currency}</span></span>
                                        <span style={{ fontSize: '11px', color: '#52525b', fontFamily: 'monospace' }}>{t.id?.slice(0,8)}…</span>
                                        <button onClick={() => deleteTier.mutate({ planId: plan.id, tierId: t.id! })} style={{ ...iconBtn, marginLeft: 'auto', color: '#ef4444' }}>
                                            <Trash2 size={12}/>
                                        </button>
                                    </div>
                                ))}

                                {/* Add tier */}
                                <div style={{ ...tierRow, borderStyle: 'dashed' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={labelStyle}>Days</label>
                                        <input type="number" value={tier.duration_days}
                                            onChange={e => setNewTier(t=>({...t,[plan.id]:{...tier,duration_days:+e.target.value}}))
                                            } style={{ ...inputStyle, width: '70px', padding: '5px 8px' }}/>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={labelStyle}>Price</label>
                                        <input type="number" step="0.01" value={tier.price}
                                            onChange={e => setNewTier(t=>({...t,[plan.id]:{...tier,price:+e.target.value}}))}
                                            style={{ ...inputStyle, width: '80px', padding: '5px 8px' }}/>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <label style={labelStyle}>Currency</label>
                                        <select value={tier.currency}
                                            onChange={e => setNewTier(t=>({...t,[plan.id]:{...tier,currency:e.target.value}}))}
                                            style={{ ...inputStyle, width: '80px', padding: '5px 8px' }}>
                                            <option>USD</option><option>EUR</option><option>RUB</option>
                                        </select>
                                    </div>
                                    <Button size="sm" style={{ marginTop: '16px' }}
                                        loading={addTier.isPending}
                                        onClick={() => addTier.mutate({ planId: plan.id, tier })}>
                                        <Plus size={12}/> Add Tier
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

const cardStyle: React.CSSProperties = {
    borderRadius: '12px', border: '1px solid #1c1c1f',
    background: '#111113', padding: '18px',
}
const labelStyle: React.CSSProperties = {
    fontSize: '11px', color: '#71717a',
}
const inputStyle: React.CSSProperties = {
    background: '#1c1c1f', border: '1px solid #27272a',
    borderRadius: '8px', color: '#fafafa',
    fontSize: '13px', padding: '8px 10px', outline: 'none', width: '100%',
}
const tierRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '16px',
    borderRadius: '8px', border: '1px solid #1c1c1f',
    background: '#0d0d0f', padding: '10px 14px',
}
const iconBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', borderRadius: '6px',
    background: '#1c1c1f', border: '1px solid #27272a',
    cursor: 'pointer', color: '#a1a1aa',
}
