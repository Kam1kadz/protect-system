'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { toast } from 'sonner'
import type { Plan } from '@/types'

export default function StorePage() {
    const [promoCode, setPromoCode] = useState('')
    const [activePlan, setActivePlan] = useState<string | null>(null)

    const { data } = useQuery({
        queryKey: ['plans'],
        queryFn:  () => api.get('/api/v1/auth/plans').then(r => r.data.plans as Plan[]),
    })

    async function activate(tierId: string) {
        try {
            await api.post('/api/v1/store/activate', {
                tier_id:    tierId,
                promo_code: promoCode || undefined,
            })
            toast.success('Subscription activated!')
        } catch {
            toast.error('Activation failed. Check your promo code.')
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold">Store</h1>
                <p className="mt-1 text-[--muted]">Choose a subscription plan</p>
            </div>

            {/* Promo code */}
            <div className="flex max-w-sm gap-2">
                <Input
                    placeholder="Promo code (optional)"
                    value={promoCode}
                    onChange={e => setPromoCode(e.target.value)}
                />
            </div>

            {/* Plans */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {(data ?? []).map(plan => (
                    <Card key={plan.id} className="flex flex-col gap-4">
                        <CardHeader>
                            <CardTitle>{plan.display_name}</CardTitle>
                        </CardHeader>
                        <div className="flex flex-col gap-2">
                            {plan.tiers.map(tier => (
                                <div
                                    key={tier.id}
                                    className="flex items-center justify-between rounded-lg border border-[--border] p-3"
                                >
                                    <div>
                                        <p className="text-sm font-medium">{tier.duration_days} days</p>
                                        <p className="text-xs text-[--muted]">
                                            {tier.currency} {tier.price.toFixed(2)}
                                        </p>
                                    </div>
                                    <Button size="sm" onClick={() => activate(tier.id)}>
                                        Buy
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}