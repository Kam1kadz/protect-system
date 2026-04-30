import { forwardRef, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?:    'sm' | 'md' | 'lg' | 'icon'
    loading?: boolean
}

const styles = {
    base: {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', fontWeight: 500, borderRadius: '8px', border: 'none',
        cursor: 'pointer', transition: 'all 0.15s', outline: 'none',
        fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
    },
    default: { background: '#22c55e', color: '#000' },
    secondary: { background: '#1c1c1f', color: '#fafafa', border: '1px solid #27272a' },
    outline: { background: 'transparent', color: '#fafafa', border: '1px solid #3f3f46' },
    ghost: { background: 'transparent', color: '#a1a1aa', border: 'none' },
    danger: { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' },
    sm: { height: '32px', padding: '0 12px', fontSize: '12px' },
    md: { height: '36px', padding: '0 16px', fontSize: '13px' },
    lg: { height: '44px', padding: '0 24px', fontSize: '14px' },
    icon: { height: '36px', width: '36px', padding: 0 },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((
    { variant = 'default', size = 'md', loading, disabled, children, style, ...props },
    ref
) => (
    <button
        ref={ref}
        disabled={disabled || loading}
        style={{
            ...styles.base,
            ...styles[variant],
            ...styles[size],
            opacity: (disabled || loading) ? 0.4 : 1,
            cursor:  (disabled || loading) ? 'not-allowed' : 'pointer',
            ...style,
        }}
        {...props}
    >
        {loading && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
        {children}
    </button>
))
Button.displayName = 'Button'
