interface CardProps {
    children: React.ReactNode
    className?: string
    glow?: boolean
}

export function Card({ children, className = '', glow }: CardProps) {
    return (
        <div className={`rounded-xl border border-[--border] bg-[--surface] p-5 ${glow ? 'glow' : ''} ${className}`}>
            {children}
        </div>
    )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`flex items-center justify-between mb-4 ${className}`}>
            {children}
        </div>
    )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="font-semibold text-base text-[--text]">{children}</h3>
}
