'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
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
    { href: '/admin',              label: 'Dashboard',    icon: <LayoutDashboard size={16}/> },
    { href: '/admin/users',        label: 'Users',        icon: <Users size={16}/>,        perm: 'users.view' },
    { href: '/admin/licenses',     label: 'Licenses',     icon: <FileText size={16}/>,     perm: 'licenses.view' },
    { href: '/admin/keys',         label: 'Keys',         icon: <Key size={16}/>,          perm: 'keys.view' },
    { href: '/admin/promo',        label: 'Promo Codes',  icon: <Ticket size={16}/>,       perm: 'promo.view' },
    { href: '/admin/payload',      label: 'Payload',      icon: <Cpu size={16}/>,          perm: 'payload.upload' },
    { href: '/admin/events',       label: 'AC Events',    icon: <ShieldAlert size={16}/>,  perm: 'events.view' },
    { href: '/admin/transactions', label: 'Transactions', icon: <CreditCard size={16}/>,   perm: 'transactions.view' },
    { href: '/admin/earnings',     label: 'Earnings',     icon: <DollarSign size={16}/>,   perm: 'transactions.view' },
    { href: '/admin/logs',         label: 'Audit Logs',   icon: <Activity size={16}/>,     perm: 'logs.view' },
    { href: '/admin/roles',        label: 'Roles',        icon: <Tag size={16}/>,          perm: 'users.role' },
    { href: '/admin/settings',     label: 'Settings',     icon: <Settings size={16}/>,     perm: 'settings.general' },
]

export function AdminSidebar() {
    const pathname   = usePathname()
    const { user }   = useAuthStore()
    const role       = user?.role ?? 'user'

    const visible = items.filter(item =>
        !item.perm || hasPermission(role as any, item.perm)
    )

    return (
        <aside className="w-56 shrink-0">
            <nav className="flex flex-col gap-1">
                {visible.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                            pathname === item.href
                                ? 'bg-[--accent] text-white'
                                : 'text-[--muted] hover:bg-[--surface] hover:text-white',
                        )}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    )
}