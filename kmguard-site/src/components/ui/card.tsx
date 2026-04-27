import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={cn('rounded-xl border border-[--border] bg-[--surface] p-5', className)}>
            {children}
        </div>
    )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mb-4 flex items-center justify-between', className)}>{children}</div>
}

export function CardTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="font-semibold text-white">{children}</h3>
}