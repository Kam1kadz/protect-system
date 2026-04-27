'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { toast } from 'sonner'
import { Tag, Zap, Check } from 'lucide-react'
import type { Plan } from '@/types'

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
                tier_id:    tierId,
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
        <div className="flex flex-col gap-10 max-w-4xl mx-auto py-2">

            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold">Choose Your Plan</h1>
                <p className="mt-2 text-[--muted] text-sm">Unlock the full power of Arbuz Client</p>
            </div>

            {/* Promo code */}
            <div className="flex max-w-xs mx-auto w-full gap-2">
                <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                />
                <Button variant="secondary" size="md">
                    <Tag size={13} /> Apply
                </Button>
            </div>

            {/* Plans */}
            {isLoading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-64 rounded-xl bg-[--surface] animate-pulse border border-[--border]" />
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <div className="text-center py-16 text-[--muted] text-sm">No plans available yet.</div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan, idx) => {
                        const popular = idx === 1
                        return (
                            <div
                                key={plan.id}
                                className={`relative flex flex-col rounded-xl border bg-[--surface] overflow-hidden transition-all hover:-translate-y-0.5 ${
                                    popular
                                        ? 'border-[--accent]/50 shadow-lg shadow-[--accent]/10'
                                        : 'border-[--border]'
                                }`}
                            >
                                {popular && (
                                    <div className="flex items-center justify-center gap-1.5 bg-[--accent] py-1.5 text-xs font-semibold text-black">
                                        <Zap size={11} fill="currentColor" /> Most Popular
                                    </div>
                                )}
                                <div className="flex flex-col gap-5 p-5">
                                    <div>
                                        <h3 className="font-bold text-base">{plan.display_name}</h3>
                                        <p className="text-xs text-[--muted] mt-0.5">Full access to all features</p>
                                    </div>

                                    <ul className="flex flex-col gap-1.5 text-xs text-[--text-2]">
                                        {['Anti-cheat bypass', 'All visual modules', 'Auto updates', 'Priority support'].map(f => (
                                            <li key={f} className="flex items-center gap-2">
                                                <Check size={12} className="text-[--accent] shrink-0" />{f}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="flex flex-col gap-2">
                                        {plan.tiers.map(tier => (
                                            <div
                                                key={tier.id}
                                                className="flex items-center justify-between rounded-lg border border-[--border] bg-[--surface-2] px-3 py-2"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {tier.currency} {tier.price.toFixed(2)}
                                                    </p>
                                                    <p className="text-xs text-[--muted]">{tier.duration_days} days</p>
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
