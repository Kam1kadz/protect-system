import { forwardRef, InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>((
    { label, error, style, ...props }, ref
) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#a1a1aa' }}>{label}</label>
        )}
        <input
            ref={ref}
            style={{
                width: '100%', height: '40px', borderRadius: '8px',
                border: `1px solid ${error ? '#ef4444' : '#27272a'}`,
                background: '#1c1c1f', padding: '0 12px',
                fontSize: '13px', color: '#fafafa', outline: 'none',
                fontFamily: 'inherit', transition: 'border-color 0.15s',
                ...style,
            }}
            onFocus={e => { e.target.style.borderColor = '#22c55e' }}
            onBlur={e => { e.target.style.borderColor = error ? '#ef4444' : '#27272a' }}
            {...props}
        />
        {error && <p style={{ fontSize: '11px', color: '#f87171', margin: 0 }}>{error}</p>}
    </div>
))
Input.displayName = 'Input'
