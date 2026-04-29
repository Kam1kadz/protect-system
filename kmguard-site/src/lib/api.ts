import axios, { AxiosInstance } from 'axios'

const BASE      = process.env.NEXT_PUBLIC_API_URL   ?? 'http://localhost:8080'
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? ''

function getToken(): string | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem('kmg-auth')
        if (!raw) return null
        return JSON.parse(raw)?.state?.accessToken ?? null
    } catch {
        return null
    }
}

function setToken(token: string) {
    if (typeof window === 'undefined') return
    try {
        const raw = localStorage.getItem('kmg-auth')
        const parsed = raw ? JSON.parse(raw) : { state: {} }
        parsed.state.accessToken = token
        localStorage.setItem('kmg-auth', JSON.stringify(parsed))
    } catch {}
}

function clearToken() {
    if (typeof window === 'undefined') return
    try {
        const raw = localStorage.getItem('kmg-auth')
        const parsed = raw ? JSON.parse(raw) : { state: {} }
        delete parsed.state.accessToken
        localStorage.setItem('kmg-auth', JSON.stringify(parsed))
    } catch {}
}

function createClient(): AxiosInstance {
    const client = axios.create({ baseURL: BASE, withCredentials: true })

    client.interceptors.request.use(cfg => {
        if (TENANT_ID) cfg.headers['X-Tenant-ID'] = TENANT_ID
        const token = getToken()
        if (token) cfg.headers['Authorization'] = `Bearer ${token}`
        return cfg
    })

    client.interceptors.response.use(
        r => r,
        async err => {
            const orig = err.config
            if (err.response?.status === 401 && !orig._retry) {
                orig._retry = true
                try {
                    const res = await axios.post(
                        `${BASE}/api/v1/auth/refresh`,
                        {},
                        {
                            withCredentials: true,
                            headers: TENANT_ID ? { 'X-Tenant-ID': TENANT_ID } : {},
                        },
                    )
                    const token = res.data.access_token
                    setToken(token)
                    orig.headers['Authorization'] = `Bearer ${token}`
                    return client(orig)
                } catch {
                    clearToken()
                    if (typeof window !== 'undefined') {
                        window.location.href = '/auth/login'
                    }
                }
            }
            return Promise.reject(err)
        },
    )

    return client
}

export const api = createClient()

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
    login: (identifier: string, password: string) =>
        api.post('/api/v1/auth/login', { email: identifier, password }),

    register: (username: string, email: string, password: string) =>
        api.post('/api/v1/auth/register', { username, email, password }),

    logout: () =>
        api.post('/api/v1/auth/logout'),

    me: () =>
        api.get('/api/v1/auth/me'),

    refresh: () =>
        api.post('/api/v1/auth/refresh'),

    changePassword: (oldPassword: string, newPassword: string) =>
        api.post('/api/v1/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
    stats: () =>
        api.get('/api/v1/admin/stats'),

    config: () =>
        api.get('/api/v1/admin/config'),

    users: (page = 1, q = '') =>
        api.get(`/api/v1/admin/users?page=${page}&q=${encodeURIComponent(q)}`),

    banUser: (id: string) =>
        api.post(`/api/v1/admin/users/${id}/ban`),

    unbanUser: (id: string) =>
        api.post(`/api/v1/admin/users/${id}/unban`),

    setRole: (id: string, role: string) =>
        api.post(`/api/v1/admin/users/${id}/role`, { role }),

    resetHWID: (id: string) =>
        api.post(`/api/v1/admin/users/${id}/hwid-reset`),

    giveSub: (id: string, data: {
        plan_id:    string
        tier_id?:   string
        expires_at: string
    }) => api.post(`/api/v1/admin/users/${id}/subscription`, data),

    licenses: (page = 1) =>
        api.get(`/api/v1/admin/licenses?page=${page}`),

    revokeLic: (id: string) =>
        api.delete(`/api/v1/admin/licenses/${id}`),

    plans: () =>
        api.get('/api/v1/admin/plans'),

    createPlan: (data: { name: string; display_name: string; sort_order?: number }) =>
        api.post('/api/v1/admin/plans', data),

    updatePlan: (id: string, data: { display_name?: string; is_active?: boolean; sort_order?: number }) =>
        api.patch(`/api/v1/admin/plans/${id}`, data),

    deletePlan: (id: string) =>
        api.delete(`/api/v1/admin/plans/${id}`),

    addTier: (planId: string, data: { duration_days: number; price: number; currency: string }) =>
        api.post(`/api/v1/admin/plans/${planId}/tiers`, data),

    deleteTier: (planId: string, tierId: string) =>
        api.delete(`/api/v1/admin/plans/${planId}/tiers/${tierId}`),

    keys: () =>
        api.get('/api/v1/admin/keys'),

    genKeys: (data: { plan_id: string; tier_id?: string; count: number }) =>
        api.post('/api/v1/admin/keys', data),

    deleteKey: (id: string) =>
        api.delete(`/api/v1/admin/keys/${id}`),

    promos: () =>
        api.get('/api/v1/admin/promo'),

    createPromo: (data: {
        code:          string
        partner_id?:   string
        discount_pct:  number
        partner_pct:   number
        uses_max?:     number
        expires_at?:   string
    }) => api.post('/api/v1/admin/promo', data),

    deletePromo: (id: string) =>
        api.delete(`/api/v1/admin/promo/${id}`),

    uploadPayload: (planId: string, file: File, mcVersion: string) => {
        const form = new FormData()
        form.append('jar', file)
        return api.post(
            `/api/v1/admin/payload/${planId}?mc_version=${mcVersion}`,
            form,
            { headers: { 'Content-Type': 'multipart/form-data' } },
        )
    },

    checkPayload: (planId: string, mcVersion: string) =>
        api.get(`/api/v1/admin/payload/${planId}?mc_version=${mcVersion}`),

    deletePayload: (planId: string, mcVersion: string) =>
        api.delete(`/api/v1/admin/payload/${planId}?mc_version=${mcVersion}`),

    events: () =>
        api.get('/api/v1/admin/events'),

    transactions: () =>
        api.get('/api/v1/admin/transactions'),

    earnings: () =>
        api.get('/api/v1/admin/earnings'),

    markPaid: (id: string) =>
        api.post(`/api/v1/admin/earnings/${id}/pay`),

    logs: () =>
        api.get('/api/v1/admin/logs'),

    setMaintenance: (enabled: boolean, message: string) =>
        api.post('/api/v1/admin/maintenance', { enabled, message }),

    roles: () =>
        api.get('/api/v1/admin/roles'),

    upsertRole: (data: { role_name: string; permissions: string }) =>
        api.post('/api/v1/admin/roles', data),
}

// ── Store (public) ────────────────────────────────────────────────────────────

export const storeApi = {
    plans: () =>
        api.get('/api/v1/auth/plans'),

    activate: (tierId: string, promoCode?: string) =>
        api.post('/api/v1/store/activate', {
            tier_id:    tierId,
            promo_code: promoCode || undefined,
        }),

    activateKey: (key: string, promoCode?: string) =>
        api.post('/api/v1/store/activate', {
            key,
            promo_code: promoCode || undefined,
        }),

    validatePromo: (code: string) =>
        api.get(`/api/v1/store/promo/${encodeURIComponent(code)}`),
}

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
    licenses: () =>
        api.get('/api/v1/profile/licenses'),

    earnings: () =>
        api.get('/api/v1/profile/earnings'),
}
