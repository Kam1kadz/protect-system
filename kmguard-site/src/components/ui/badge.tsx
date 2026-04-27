import { cn } from '@/lib/utils'

const colors: Record<string, string> = {
    active:   'bg-emerald-500/15 text-emerald-400',
    expired:  'bg-zinc-500/15    text-zinc-400',
    banned:   'bg-red-500/15     text-red-400',
    paused:   'bg-yellow-500/15  text-yellow-400',
    admin:    'bg-violet-500/15  text-violet-400',
    support:  'bg-blue-500/15    text-blue-400',
    partner:  'bg-amber-500/15   text-amber-400',
    user:     'bg-zinc-500/15    text-zinc-400',
    critical: 'bg-red-500/15     text-red-400',
    warn:     'bg-yellow-500/15  text-yellow-400',
    info:     'bg-blue-500/15    text-blue-400',
    completed:'bg-emerald-500/15 text-emerald-400',
    pending:  'bg-yellow-500/15  text-yellow-400',
    failed:   'bg-red-500/15     text-red-400',
}

export function Badge({
                          value,
                          className,
                      }: {
    value: string
    className?: string
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                colors[value] ?? 'bg-zinc-500/15 text-zinc-400',
                className,
            )}
        >
      {value}
    </span>
    )
}