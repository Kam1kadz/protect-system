import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none',
    {
        variants: {
            variant: {
                default:   'bg-[--accent] hover:bg-[--accent-hover] text-white',
                secondary: 'bg-[--surface] hover:bg-[--surface-2] text-white border border-[--border]',
                ghost:     'hover:bg-[--surface] text-[--muted] hover:text-white',
                danger:    'bg-red-600 hover:bg-red-700 text-white',
                outline:   'border border-[--border] hover:bg-[--surface] text-white',
            },
            size: {
                sm:   'h-8  px-3 text-xs',
                md:   'h-9  px-4 text-sm',
                lg:   'h-11 px-6 text-sm',
                icon: 'h-9  w-9',
            },
        },
        defaultVariants: { variant: 'default', size: 'md' },
    },
)

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, loading, children, ...props }, ref) => (
        <button
            ref={ref}
            className={cn(buttonVariants({ variant, size }), className)}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    ),
)
Button.displayName = 'Button'