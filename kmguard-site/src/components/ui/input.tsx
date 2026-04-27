import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

export const Input = forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        className={cn(
            'w-full rounded-lg border border-[--border] bg-[--surface]',
            'px-3 py-2 text-sm text-white placeholder:text-[--muted]',
            'focus:outline-none focus:ring-2 focus:ring-[--accent]',
            'disabled:opacity-50',
            className,
        )}
        {...props}
    />
))
Input.displayName = 'Input'