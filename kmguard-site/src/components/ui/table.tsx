import { cn } from '@/lib/utils'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn('w-full overflow-x-auto', className)}>
            <table className="w-full text-sm">{children}</table>
        </div>
    )
}

export function Thead({ children }: { children: React.ReactNode }) {
    return (
        <thead>
        <tr className="border-b border-[--border] text-left text-xs text-[--muted]">
            {children}
        </tr>
        </thead>
    )
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <th className={cn('pb-3 pr-4 font-medium', className)}>{children}</th>
}

export function Tbody({ children }: { children: React.ReactNode }) {
    return <tbody className="divide-y divide-[--border]">{children}</tbody>
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
    return <tr className={cn('hover:bg-white/[.02]', className)}>{children}</tr>
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <td className={cn('py-3 pr-4 text-zinc-300', className)}>{children}</td>
}