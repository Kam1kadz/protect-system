'use client'
import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, Trash2, CheckCircle, Package, AlertCircle, CloudUpload } from 'lucide-react'
import type { Plan } from '@/types'

const MC_VERSIONS = ['1.16.5','1.19.4']

export default function AdminPayloadPage() {
    const qc = useQueryClient()
    const fileRef = useRef<HTMLInputElement>(null)
    const [planId, setPlanId] = useState('')
    const [mcVer, setMcVer] = useState('1.16.5')
    const [dragging, setDragging] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const { data: plans } = useQuery<Plan[]>({
        queryKey: ['admin-plans'],
        queryFn: () => adminApi.plans().then(r => r.data.plans ?? []),
    })

    const { data: statusData, refetch: refetchStatus } = useQuery({
        queryKey: ['payload-status', planId, mcVer],
        queryFn: () => planId ? adminApi.checkPayload(planId, mcVer).then(r => r.data) : null,
        enabled: !!planId,
    })

    const upload = useMutation({
        mutationFn: () => {
            if (!selectedFile || !planId) throw new Error('Select plan and file')
            return adminApi.uploadPayload(planId, selectedFile, mcVer)
        },
        onSuccess: () => {
            refetchStatus()
            setSelectedFile(null)
            toast.success('Payload uploaded successfully')
        },
        onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Upload failed'),
    })

    const del = useMutation({
        mutationFn: () => adminApi.deletePayload(planId, mcVer),
        onSuccess: () => { refetchStatus(); toast.success('Payload deleted') },
        onError: () => toast.error('Failed to delete'),
    })

    const handleFile = (file: File) => {
        if (!file.name.endsWith('.jar')) { toast.error('Only .jar files allowed'); return }
        setSelectedFile(file)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Payload Manager</h1>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#71717a' }}>Upload .jar payloads per plan and Minecraft version</p>
            </div>

            {/* Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscription Plan</label>
                    <select value={planId} onChange={e => setPlanId(e.target.value)} style={{
                        background: '#111113', border: '1px solid #1c1c1f', borderRadius: '8px',
                        color: planId ? '#fafafa' : '#52525b', fontSize: '13px', padding: '10px 12px', outline: 'none',
                    }}>
                        <option value="">Select plan…</option>
                        {(plans ?? []).map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minecraft Version</label>
                    <select value={mcVer} onChange={e => setMcVer(e.target.value)} style={{
                        background: '#111113', border: '1px solid #1c1c1f', borderRadius: '8px',
                        color: '#fafafa', fontSize: '13px', padding: '10px 12px', outline: 'none',
                    }}>
                        {MC_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>
            </div>

            {/* Status card */}
            {planId && (
                <div style={{
                    background: '#0d0d0f', borderRadius: '12px', border: '1px solid #1c1c1f',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: statusData?.exists ? 'rgba(34,197,94,0.1)' : 'rgba(113,113,122,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {statusData?.exists ? <CheckCircle size={18} color="#22c55e" /> : <AlertCircle size={18} color="#52525b" />}
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 600 }}>MC {mcVer} — {plans?.find(p => p.id === planId)?.display_name}</div>
                            <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                                {statusData?.exists
                                    ? `Uploaded · ${(statusData.size_bytes / 1024).toFixed(1)} KB`
                                    : 'No payload uploaded yet'}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Badge value={statusData?.exists ? 'active' : 'pending'} />
                        {statusData?.exists && (
                            <button onClick={() => { if (confirm('Delete this payload?')) del.mutate() }} style={{
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '6px', padding: '6px 10px', cursor: 'pointer',
                                color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px',
                            }}>
                                <Trash2 size={12} /> Delete
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileRef.current?.click()}
                style={{
                    border: `2px dashed ${dragging ? '#22c55e' : selectedFile ? 'rgba(34,197,94,0.4)' : '#27272a'}`,
                    borderRadius: '12px', background: dragging ? 'rgba(34,197,94,0.04)' : '#0d0d0f',
                    padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                    transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                }}
            >
                <input ref={fileRef} type="file" accept=".jar" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                {selectedFile ? (
                    <>
                        <Package size={32} color="#22c55e" />
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>{selectedFile.name}</div>
                        <div style={{ fontSize: '12px', color: '#52525b' }}>{(selectedFile.size / 1024).toFixed(1)} KB · click to change</div>
                    </>
                ) : (
                    <>
                        <CloudUpload size={32} color={dragging ? '#22c55e' : '#3f3f46'} />
                        <div style={{ fontSize: '14px', fontWeight: 500, color: dragging ? '#22c55e' : '#71717a' }}>
                            {dragging ? 'Drop it!' : 'Drag & drop .jar or click to browse'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#3f3f46' }}>Only .jar files supported</div>
                    </>
                )}
            </div>

            <Button
                loading={upload.isPending}
                disabled={!selectedFile || !planId}
                onClick={() => upload.mutate()}
                style={{ gap: '8px', alignSelf: 'flex-start' }}
            >
                <Upload size={14} /> Upload Payload
            </Button>
        </div>
    )
}
