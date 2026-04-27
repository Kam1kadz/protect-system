'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/types'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function AdminSettingsPage() {
    const { user }   = useAuthStore()
    const role       = user?.role as any
    const qc         = useQueryClient()

    const [maintenance, setMaintenance] = useState(false)
    const [message,     setMessage]     = useState('')

    const { data: cfg } = useQuery({
        queryKey: ['admin-config'],
        queryFn:  () => adminApi.config().then(r => r.data),
    })

    useEffect(() => {
        if (cfg) {
            setMaintenance(cfg.maintenance_mode)
            setMessage(cfg.maintenance_message ?? '')
        }
    }, [cfg])

    const maint = useMutation({
        mutationFn: () => adminApi.setMaintenance(maintenance, message),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-config'] })
            toast.success(`Maintenance ${maintenance ? 'enabled' : 'disabled'}`)
        },
    })

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-bold">Settings</h1>

            {hasPermission(role, 'settings.maintenance') && (
                <Card>
                    <CardHeader>
                        <CardTitle>Maintenance Mode</CardTitle>
                        <span className={`text-xs ${maintenance ? 'text-red-400' : 'text-emerald-400'}`}>
              {maintenance ? 'ACTIVE' : 'OFF'}
            </span>
                    </CardHeader>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-[--muted]">
                            Enabling maintenance mode will block all loader and runtime API requests.
                            The website will continue to work.
                        </p>
                        <Input
                            placeholder="Maintenance message (shown to users)"
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                        />
                        <div className="flex gap-3">
                            <Button
                                variant="danger"
                                onClick={() => { setMaintenance(true); maint.mutate() }}
                                loading={maint.isPending}
                                disabled={maintenance}
                            >
                                Enable Maintenance
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => { setMaintenance(false); maint.mutate() }}
                                loading={maint.isPending}
                                disabled={!maintenance}
                            >
                                Disable Maintenance
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    )
}