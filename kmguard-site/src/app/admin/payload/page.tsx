'use client'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, api } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Upload, Trash2, CheckCircle } from 'lucide-react'
import type { Plan } from '@/types'

const MC_VERSIONS = ['1.16.5', '1.21.4'] as const
type McVersion = typeof MC_VERSIONS[number]

export default function AdminPayloadPage() {
    const qc      = useQueryClient()
    const fileRef = useRef<HTMLInputElement>(null)
    const [selectedVersion, setSelectedVersion] = useState<McVersion>('1.21.4')
    const [uploadingPlan,   setUploadingPlan]   = useState<string | null>(null)

    const { data: plans } = useQuery<Plan[]>({
        queryKey: ['plans'],
        queryFn:  () => api.get('/api/v1/auth/plans').then(r => r.data.plans ?? []),
    })

    const upload = useMutation({
        mutationFn: ({ planId, file }: { planId: string; file: File }) =>
            adminApi.uploadPayload(planId, file, selectedVersion),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payload-status'] })
            toast.success('JAR uploaded and processed')
            setUploadingPlan(null)
        },
        onError: () => toast.error('Upload failed'),
    })

    const del = useMutation({
        mutationFn: ({ planId }: { planId: string }) =>
            adminApi.deletePayload(planId, selectedVersion),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payload-status'] })
            toast.success('Payload deleted')
        },
    })

    function handleFileChange(planId: string, e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.name.endsWith('.jar')) {
            toast.error('Only .jar files allowed')
            return
        }
        upload.mutate({ planId, file })
        e.target.value = ''
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">JAR Payload</h1>

                {/* MC version selector */}
                <div className="flex gap-1 rounded-lg border border-[--border] bg-[--surface] p-1">
                    {MC_VERSIONS.map(v => (
                        <button
                            key={v}
                            onClick={() => setSelectedVersion(v)}
                            className={`rounded-md px-3 py-1 text-xs font-mono font-medium transition-colors ${
                                selectedVersion === v
                                    ? 'bg-[--accent] text-white'
                                    : 'text-[--muted] hover:text-white'
                            }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-sm text-[--muted]">
                Upload an obfuscated JAR for each plan. The file will be encrypted and stored
                as a PSPL payload. One JAR per plan per MC version.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
                {(plans ?? []).map(plan => (
                    <PayloadCard
                        key={plan.id}
                        plan={plan}
                        mcVersion={selectedVersion}
                        uploading={upload.isPending && uploadingPlan === plan.id}
                        deleting={del.isPending}
                        onUploadClick={() => {
                            setUploadingPlan(plan.id)
                            fileRef.current?.click()
                        }}
                        onDelete={() => del.mutate({ planId: plan.id })}
                        onChange={(e) => handleFileChange(plan.id, e)}
                        fileRef={uploadingPlan === plan.id ? fileRef : undefined}
                    />
                ))}
            </div>

            {/* Hidden global file input */}
            <input
                ref={fileRef}
                type="file"
                accept=".jar"
                className="hidden"
                onChange={e => uploadingPlan && handleFileChange(uploadingPlan, e)}
            />
        </div>
    )
}

function PayloadCard({
                         plan, mcVersion, uploading, deleting,
                         onUploadClick, onDelete, onChange, fileRef,
                     }: {
    plan:          Plan
    mcVersion:     string
    uploading:     boolean
    deleting:      boolean
    onUploadClick: () => void
    onDelete:      () => void
    onChange:      (e: React.ChangeEvent<HTMLInputElement>) => void
    fileRef?:      React.RefObject<HTMLInputElement>
}) {
    const { data: status } = useQuery({
        queryKey: ['payload-status', plan.id, mcVersion],
        queryFn:  () => adminApi.checkPayload(plan.id, mcVersion)
            .then(r => r.data)
            .catch(() => null),
        retry: false,
    })

    const hasPayload = status?.exists === true

    return (
        <Card>
            <CardHeader>
                <CardTitle>{plan.display_name}</CardTitle>
                <Badge value={plan.is_active ? 'active' : 'expired'} />
            </CardHeader>

            <div className="flex items-center justify-between rounded-lg border border-[--border] p-3">
                <div className="flex items-center gap-2">
                    {hasPayload
                        ? <CheckCircle size={16} className="text-emerald-400"/>
                        : <div className="h-4 w-4 rounded-full border-2 border-[--muted]"/>
                    }
                    <span className="text-sm">
            {hasPayload
                ? <><span className="text-emerald-400">Payload ready</span>
                    <span className="ml-2 font-mono text-xs text-[--muted]">
                    {status?.hash?.slice(0, 12)}…
                  </span>
                </>
                : <span className="text-[--muted]">No payload</span>
            }
          </span>
                </div>

                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="secondary"
                        loading={uploading}
                        onClick={onUploadClick}
                    >
                        <Upload size={13}/>
                        {hasPayload ? 'Replace' : 'Upload'}
                    </Button>
                    {hasPayload && (
                        <Button
                            size="icon"
                            variant="ghost"
                            loading={deleting}
                            onClick={onDelete}
                        >
                            <Trash2 size={13} className="text-red-400"/>
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}