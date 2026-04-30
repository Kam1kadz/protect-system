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
        <div className="flex flex-col gap-8 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Settings</h1>
                    <p className="text-gray-400 mt-1">Configure global platform behavior and maintenance.</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full border text-xs font-bold ${maintenance ? 'bg-red-500/10 border-red-500/50 text-red-500' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'}`}>
                    {maintenance ? 'MAINTENANCE ACTIVE' : 'SYSTEM OPERATIONAL'}
                </div>
            </div>

            {hasPermission(role, 'settings.maintenance') && (
                <Card className="border-[--border] bg-[#0d0d0f] overflow-hidden">
                    <CardHeader className="bg-[#111113] border-b border-[--border] pb-6">
                        <CardTitle className="text-lg font-bold text-white">Maintenance Mode</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">
                            Enabling maintenance mode will block all loader and runtime API requests.
                            The website will continue to work.
                        </p>
                    </CardHeader>
                    <div className="p-6 flex flex-col gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Public Notice</label>
                            <Input
                                placeholder="e.g., We are performing scheduled maintenance. Please check back in 1 hour."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                className="bg-[#111113] border-[--border] focus:ring-emerald-500/20"
                            />
                        </div>
                        <div className="flex gap-4 pt-2">
                            <Button
                                variant={maintenance ? "secondary" : "danger"}
                                className={`flex-1 font-bold h-11 transition-all ${maintenance ? 'opacity-50 grayscale' : 'shadow-lg shadow-red-500/10'}`}
                                onClick={() => { setMaintenance(true); maint.mutate() }}
                                loading={maint.isPending}
                                disabled={maintenance}
                            >
                                Activate Maintenance
                            </Button>
                            <Button
                                variant={!maintenance ? "secondary" : "default"}
                                className={`flex-1 font-bold h-11 transition-all ${!maintenance ? 'opacity-50 grayscale' : 'shadow-lg shadow-emerald-500/10'}`}
                                onClick={() => { setMaintenance(false); maint.mutate() }}
                                loading={maint.isPending}
                                disabled={!maintenance}
                            >
                                Resume Operations
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-[--border] bg-[#0d0d0f] p-6 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500">?</div>
                         <h3 className="font-bold text-white">General Config</h3>
                    </div>
                    <p className="text-xs text-gray-500">More settings coming soon: Discord integration, Auto-updates, and more.</p>
                </Card>
                <Card className="border-[--border] bg-[#0d0d0f] p-6 opacity-50 cursor-not-allowed">
                    <div className="flex items-center gap-3 mb-2">
                         <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500">?</div>
                         <h3 className="font-bold text-white">Appearance</h3>
                    </div>
                    <p className="text-xs text-gray-500">Customize your site's branding, colors, and logos.</p>
                </Card>
            </div>
        </div>
    )
}