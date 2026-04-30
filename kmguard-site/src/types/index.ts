export type UserRole = 'user' | 'partner' | 'support' | 'admin' | 'banned'

export type Permission =
    | 'users.view' | 'users.ban' | 'users.role'
    | 'users.hwid_reset' | 'users.give_subscription'
    | 'licenses.view' | 'licenses.revoke'
    | 'keys.view' | 'keys.generate' | 'keys.delete'
    | 'promo.view' | 'promo.create' | 'promo.delete'
    | 'payload.upload'
    | 'events.view'
    | 'transactions.view' | 'transactions.mark_paid'
    | 'logs.view'
    | 'settings.maintenance' | 'settings.general'
    | 'partner.earnings'

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: [
        'users.view','users.ban','users.role','users.hwid_reset','users.give_subscription',
        'licenses.view','licenses.revoke',
        'keys.view','keys.generate','keys.delete',
        'promo.view','promo.create','promo.delete',
        'payload.upload',
        'events.view',
        'transactions.view','transactions.mark_paid',
        'logs.view',
        'settings.maintenance','settings.general',
    ],
    support: [
        'users.view','users.ban','users.hwid_reset',
        'licenses.view','licenses.revoke',
        'keys.view',
        'promo.view',
        'events.view',
        'transactions.view',
        'logs.view',
        'settings.general',
    ],
    partner: ['partner.earnings'],
    user: [],
}

export function hasPermission(role: UserRole, perm: Permission): boolean {
    if (role === 'admin') return true
    return (ROLE_PERMISSIONS[role] ?? []).includes(perm)
}

export interface AuthUser {
    id:       string
    username: string
    email:    string
    role:     UserRole
}

export interface License {
    id:               string
    plan_name:        string
    plan_display_name:string
    status:           'active' | 'paused' | 'expired' | 'banned'
    expires_at:       string
    license_key:      string
}

export interface Plan {
    id:           string
    name:         string
    display_name: string
    is_active:    boolean
    tiers:        PlanTier[]
}

export interface PlanTier {
    id:           string
    duration_days:number
    price:        number
    currency:     string
}

export interface PromoCode {
    id:          string
    code:        string
    partner:     string | null
    discount_pct:number
    partner_pct: number
    uses_total:  number
    uses_max:    number | null
    is_active:   boolean
    expires_at:  string | null
    created_at:  string
}

export interface LoaderKey {
    id:        string
    key_value: string
    plan_name: string
    is_used:   boolean
    used_by:   string | null
    used_at:   string | null
    created_at:string
}

export interface RuntimeEvent {
    id:         number
    username:   string | null
    event_type: string
    severity:   'info' | 'warn' | 'critical'
    payload:    string
    ip_address: string | null
    created_at: string
}

export interface Transaction {
    id:           string
    username:     string
    amount:       number
    currency:     string
    status:       string
    created_at:   string
    completed_at: string | null
}

export interface Earning {
    id:         string
    username:   string
    amount:     number
    currency:   string
    is_paid:    boolean
    paid_at:    string | null
    created_at: string
}

export interface AuditLog {
    id:         number
    username:   string | null
    event_type: string
    severity:   string
    ip_address: string | null
    payload:    string
    created_at: string
}

export interface Stats {
    total_users:          number
    active_licenses:      number
    active_sessions:      number
    recent_registrations: number
    total_revenue:        number
}