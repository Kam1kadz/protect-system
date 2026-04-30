const map: Record<string, { bg: string; color: string; border: string }> = {
    active:    { bg: 'rgba(34,197,94,0.12)',   color: '#4ade80', border: 'rgba(34,197,94,0.25)' },
    expired:   { bg: 'rgba(113,113,122,0.12)', color: '#a1a1aa', border: 'rgba(113,113,122,0.25)' },
    revoked:   { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    banned:    { bg: 'rgba(239,68,68,0.12)',   color: '#f87171', border: 'rgba(239,68,68,0.25)' },
    suspended: { bg: 'rgba(249,115,22,0.12)',  color: '#fb923c', border: 'rgba(249,115,22,0.25)' },
    admin:     { bg: 'rgba(168,85,247,0.12)',  color: '#c084fc', border: 'rgba(168,85,247,0.25)' },
    support:   { bg: 'rgba(59,130,246,0.12)',  color: '#60a5fa', border: 'rgba(59,130,246,0.25)' },
    partner:   { bg: 'rgba(234,179,8,0.12)',   color: '#facc15', border: 'rgba(234,179,8,0.25)' },
    user:      { bg: 'rgba(113,113,122,0.12)', color: '#a1a1aa', border: 'rgba(113,113,122,0.25)' },
}

export function Badge({ value }: { value: string }) {
    const s = map[value?.toLowerCase()] ?? map.user
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            borderRadius: '6px', border: `1px solid ${s.border}`,
            background: s.bg, color: s.color,
            padding: '2px 8px', fontSize: '11px', fontWeight: 500,
        }}>
            {value}
        </span>
    )
}
