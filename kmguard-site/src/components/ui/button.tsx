import { forwardRef, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?:    'sm' | 'md' | 'lg' | 'icon'
    loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((
    { variant = 'default', size = 'md', loading, disabled, children, className = '', ...props },
    ref
) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[--accent]/50 disabled:opacity-40 disabled:cursor-not-allowed select-none'

    const variants = {
        default:   'bg-[--accent] text-black hover:bg-[--accent-hover] active:scale-[0.98]',
        secondary: 'bg-[--surface-2] text-[--text] border border-[--border] hover:bg-[--surface-3] hover:border-[--border-light]',
        outline:   'bg-transparent text-[--text] border border-[--border] hover:border-[--accent] hover:text-[--accent]',
        ghost:     'bg-transparent text-[--text-2] hover:text-[--text] hover:bg-[--surface-2]',
        danger:    'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
    }

    const sizes = {
        sm:   'h-8 px-3 text-xs',
        md:   'h-9 px-4 text-sm',
        lg:   'h-11 px-6 text-sm',
        icon: 'h-9 w-9',
    }

    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {children}
        </button>
    )
})

Button.displayName = 'Button'
