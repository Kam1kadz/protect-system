'use client'
import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'

export function FeatureCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
    const [hovered, setHovered] = useState(false)
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', flexDirection: 'column', gap: '12px',
                borderRadius: '12px', background: '#111113', padding: '20px',
                border: `1px solid ${hovered ? 'rgba(34,197,94,0.3)' : '#1c1c1f'}`,
                transition: 'border-color 0.2s',
            }}
        >
            <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: 'rgba(34,197,94,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Icon size={17} color="#22c55e" />
            </div>
            <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fafafa' }}>{title}</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#71717a', lineHeight: 1.55 }}>{desc}</div>
            </div>
        </div>
    )
}
