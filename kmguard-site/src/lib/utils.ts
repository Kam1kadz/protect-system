import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
        day:   '2-digit',
        month: 'short',
        year:  'numeric',
    })
}

export function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-GB', {
        day:    '2-digit',
        month:  'short',
        year:   'numeric',
        hour:   '2-digit',
        minute: '2-digit',
    })
}

export function timeUntil(iso: string): string {
    const diff = new Date(iso).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    if (d > 0) return `${d}d ${h}h`
    return `${h}h`
}