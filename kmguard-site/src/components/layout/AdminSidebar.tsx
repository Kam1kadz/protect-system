'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/types'
import type { Permission } from '@/types'
import {
    LayoutDashboard, Users, Key, Tag, ShieldAlert,
    CreditCard, FileText, Settings, Ticket, Activity,
    DollarSign, Cpu,
} from 'lucide-react'

interface NavItem {
    href:  string
    label: string
    icon:  React.ReactNode
    perm?: Permission
}

const items: NavItem[] = [
    { href: '/admin',              label: 'Dashboard',    icon: <LayoutDashboard size={15}/> },
    { href: '/admin/users',        label: 'Users',        icon: <Users       size={15}/>, perm: 'users.view' },
    { href: '/admin/licenses',     label: 'Licenses',     icon: <FileText    size={15}/>, perm: 'licenses.view' },
    { href: '/admin/keys',         label: 'Keys',         icon: <Key         size={15}/>, perm: 'keys.view' },
    { href: '/admin/promo',        label: 'Promo Codes',  icon: <Ticket      size={15}/>, perm: 'promo.view' },
    { href: '/admin/payload',      label: 'Payload',      icon: <Cpu         size={15}/>, perm: 'payload.upload' },
    { href: '/admin/events',       label: 'AC Events',    icon: <ShieldAlert size={15}/>, perm: 'events.view' },
    { href: '/admin/transactions', label: 'Transactions', icon: <CreditCard  size={15}/>, perm: 'transactions.view' },
    { href: '/admin/earnings',     label: 'Earnings',     icon: <DollarSign  size={15}/>, perm: 'transactions.view' },
    { href: '/admin/logs',         label: 'Audit Logs',   icon: <Activity    size={15}/>, perm: 'logs.view' },
    { href: '/admin/roles',        label: 'Roles',        icon: <Tag         size={15}/>, perm: 'users.role' },
    { href: '/admin/settings',     label: 'Settings',     icon: <Settings    size={15}/>, perm: 'settings.general' },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { user } = useAuthStore()
    const role     = user?.role ?? 'user'

    const visible = items.filter(item =>
        !item.perm || hasPermission(role as any, item.perm)
    )

    return (
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {visible.map(item => {
                const active = pathname === item.href
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            borderRadius: '8px', padding: '7px 12px',
                            fontSize: '13px', fontWeight: active ? 500 : 400,
                            textDecoration: 'none',
                            background:  active ? 'rgba(34,197,94,0.12)' : 'transparent',
                            color:       active ? '#22c55e' : '#71717a',
                            transition:  'background 0.15s, color 0.15s',
                        }}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
