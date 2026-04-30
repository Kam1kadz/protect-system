interface CardProps {
    children: React.ReactNode
    style?: React.CSSProperties
    glow?: boolean
}

export function Card({ children, style, glow }: CardProps) {
    return (
        <div
            className={glow ? 'glow-card' : ''}
            style={{
                borderRadius: '12px', border: '1px solid #27272a',
                background: '#111113', padding: '20px', ...style,
            }}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', ...style }}>
            {children}
        </div>
    )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
    return <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fafafa' }}>{children}</h3>
}
