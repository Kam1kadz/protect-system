const map: Record<string, string> = {
    active:    'bg-green-500/15 text-green-400 border-green-500/25',
    expired:   'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
    revoked:   'bg-red-500/15 text-red-400 border-red-500/25',
    banned:    'bg-red-500/15 text-red-400 border-red-500/25',
    suspended: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    admin:     'bg-purple-500/15 text-purple-400 border-purple-500/25',
    support:   'bg-blue-500/15 text-blue-400 border-blue-500/25',
    partner:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    user:      'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
}

export function Badge({ value }: { value: string }) {
    const cls = map[value?.toLowerCase()] ?? 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25'
    return (
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>
            {value}
        </span>
    )
}
