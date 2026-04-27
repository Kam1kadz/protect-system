'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Zap, Tag } from 'lucide-react'
import type { Plan } from '@/types'

const PLAN_FEATURES = ['Anti-cheat bypass', 'All visual modules', 'Auto updates', 'Priority support', 'Discord access']

export default function StorePage() {
    const [promoCode, setPromoCode] = useState('')
    const [loading, setLoading]     = useState<string | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['plans'],
        queryFn:  () => api.get('/api/v1/auth/plans').then(r => r.data.plans as Plan[]),
    })

    async function activate(tierId: string) {
        setLoading(tierId)
        try {
            await api.post('/api/v1/store/activate', {
                tier_id: tierId,
                promo_code: promoCode || undefined,
            })
            toast.success('Subscription activated! Check your profile.')
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Activation failed. Check your promo code.')
        } finally {
            setLoading(null)
        }
    }

    const plans = data ?? []

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '960px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>Choose Your Plan</h1>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#71717a' }}>Unlock the full power of Arbuz Client</p>
            </div>

            {/* Promo */}
            <div style={{ display: 'flex', maxWidth: '320px', margin: '0 auto', width: '100%', gap: '8px' }}>
                <Input placeholder="Promo code" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
                <Button variant="secondary" size="md" style={{ flexShrink: 0 }}>
                    <Tag size={12} /> Apply
                </Button>
            </div>

            {/* Plans */}
            {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {[1,2,3].map(i => (
                        <div key={i} style={{ height: '300px', borderRadius: '12px', background: '#111113', border: '1px solid #1c1c1f' }} />
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', fontSize: '13px', color: '#71717a' }}>
                    No plans available yet. Check back soon.
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: '16px' }}>
                    {plans.map((plan, idx) => {
                        const popular = idx === Math.floor(plans.length / 2)
                        return (
                            <div key={plan.id} style={{
                                position: 'relative', display: 'flex', flexDirection: 'column',
                                borderRadius: '12px', overflow: 'hidden',
                                border: `1px solid ${popular ? 'rgba(34,197,94,0.4)' : '#1c1c1f'}`,
                                background: '#111113',
                                boxShadow: popular ? '0 0 32px rgba(34,197,94,0.08)' : 'none',
                                transform: popular ? 'scale(1.02)' : 'none',
                                transition: 'transform 0.2s',
                            }}>
                                {popular && (
                                    <div style={{
                                        background: '#22c55e', color: '#000',
                                        padding: '6px', textAlign: 'center',
                                        fontSize: '11px', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                                    }}>
                                        <Zap size={10} fill="#000" /> Most Popular
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 700 }}>{plan.display_name}</div>
                                        <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>Full access · All features</div>
                                    </div>

                                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {PLAN_FEATURES.map(f => (
                                            <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#a1a1aa' }}>
                                                <Check size={12} color="#22c55e" style={{ flexShrink: 0 }} />{f}
                                            </li>
                                        ))}
                                    </ul>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {plan.tiers.map(tier => (
                                            <div key={tier.id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                borderRadius: '8px', border: '1px solid #27272a',
                                                background: '#1c1c1f', padding: '10px 12px',
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 700 }}>
                                                        {tier.currency} {tier.price.toFixed(2)}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#71717a' }}>{tier.duration_days} days</div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={popular ? 'default' : 'secondary'}
                                                    loading={loading === tier.id}
                                                    onClick={() => activate(tier.id)}
                                                >
                                                    Buy
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
