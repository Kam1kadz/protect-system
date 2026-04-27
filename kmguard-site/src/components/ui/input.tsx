import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>((
    { label, error, className = '', ...props }, ref
) => (
    <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-xs font-medium text-[--text-2]">{label}</label>}
        <input
            ref={ref}
            className={`w-full h-10 rounded-lg border bg-[--surface-2] px-3 text-sm text-[--text] placeholder:text-[--muted-2] transition-colors
                focus:outline-none focus:border-[--accent] focus:ring-1 focus:ring-[--accent]/30
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? 'border-red-500/60' : 'border-[--border]'} ${className}`}
            {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
))

Input.displayName = 'Input'
