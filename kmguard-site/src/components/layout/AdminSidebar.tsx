'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { hasPermission } from '@/types'
import type { Permission } from '@/types'
import {
    LayoutDashboard, Users, Key, Tag, ShieldAlert,
    CreditCard, FileText, Settings, Ticket, Activity,
    DollarSign, Cpu, ShoppingBag,
} from 'lucide-react'

interface NavItem {
    href:    string
    label:   string
    icon:    React.ReactNode
    perm?:   Permission
    section?: string
}

const items: NavItem[] = [
    { href: '/admin',              label: 'Dashboard',    icon: <LayoutDashboard size={15}/> },
    { href: '/admin/users',        label: 'Users',        icon: <Users       size={15}/>, perm: 'users.view',          section: 'Management' },
    { href: '/admin/licenses',     label: 'Licenses',     icon: <FileText    size={15}/>, perm: 'licenses.view',       section: 'Management' },
    { href: '/admin/store',        label: 'Store / Plans',icon: <ShoppingBag size={15}/>, perm: 'settings.general',   section: 'Management' },
    { href: '/admin/keys',         label: 'Keys',         icon: <Key         size={15}/>, perm: 'keys.view',           section: 'Management' },
    { href: '/admin/promo',        label: 'Promo Codes',  icon: <Ticket      size={15}/>, perm: 'promo.view',          section: 'Management' },
    { href: '/admin/payload',      label: 'Payload',      icon: <Cpu         size={15}/>, perm: 'payload.upload',      section: 'System' },
    { href: '/admin/events',       label: 'AC Events',    icon: <ShieldAlert size={15}/>, perm: 'events.view',         section: 'System' },
    { href: '/admin/transactions', label: 'Transactions', icon: <CreditCard  size={15}/>, perm: 'transactions.view',   section: 'Finance' },
    { href: '/admin/earnings',     label: 'Earnings',     icon: <DollarSign  size={15}/>, perm: 'transactions.view',   section: 'Finance' },
    { href: '/admin/logs',         label: 'Audit Logs',   icon: <Activity    size={15}/>, perm: 'logs.view',           section: 'System' },
    { href: '/admin/roles',        label: 'Roles',        icon: <Tag         size={15}/>, perm: 'users.role',          section: 'System' },
    { href: '/admin/settings',     label: 'Settings',     icon: <Settings    size={15}/>, perm: 'settings.general',   section: 'System' },
]

export function AdminSidebar() {
    const pathname = usePathname()
    const { user } = useAuthStore()
    const role     = user?.role ?? 'user'

    const visible = items.filter(item =>
        !item.perm || hasPermission(role as any, item.perm)
    )

    // Group by section
    const sections: Record<string, NavItem[]> = {}
    visible.forEach(item => {
        const s = item.section ?? 'Overview'
        if (!sections[s]) sections[s] = []
        sections[s].push(item)
    })

    return (
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(sections).map(([section, sitems]) => (
                <div key={section}>
                    {section !== 'Overview' && (
                        <p style={{ margin: '0 0 4px 12px', fontSize: '10px', fontWeight: 600, color: '#3f3f46', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            {section}
                        </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        {sitems.map(item => {
                            const active = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href} style={{
                                    display: 'flex', alignItems: 'center', gap: '9px',
                                    borderRadius: '7px', padding: '7px 12px',
                                    fontSize: '13px', fontWeight: active ? 500 : 400,
                                    textDecoration: 'none',
                                    background:  active ? 'rgba(34,197,94,0.1)' : 'transparent',
                                    color:       active ? '#22c55e' : '#71717a',
                                    transition:  'all 0.12s',
                                }}>
                                    {item.icon}
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            ))}
        </nav>
    )
}
