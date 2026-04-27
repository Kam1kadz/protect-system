import axios, { AxiosInstance } from 'axios'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

function createClient(): AxiosInstance {
    const client = axios.create({ baseURL: BASE, withCredentials: true })

    client.interceptors.request.use(cfg => {
        if (typeof window !== 'undefined') {
            const token = sessionStorage.getItem('access_token')
            if (token) cfg.headers['Authorization'] = `Bearer ${token}`
        }
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
                        { withCredentials: true },
                    )
                    const token = res.data.access_token
                    sessionStorage.setItem('access_token', token)
                    orig.headers['Authorization'] = `Bearer ${token}`
                    return client(orig)
                } catch {
                    sessionStorage.removeItem('access_token')
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
    login: (email: string, password: string) =>
        api.post('/api/v1/auth/login', { email, password }),

    register: (username: string, email: string, password: string) =>
        api.post('/api/v1/auth/register', { username, email, password }),

    logout: () =>
        api.post('/api/v1/auth/logout'),

    me: () =>
        api.get('/api/v1/auth/me'),

    refresh: () =>
        api.post('/api/v1/auth/refresh'),
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
    // Dashboard
    stats: () =>
        api.get('/api/v1/admin/stats'),

    config: () =>
        api.get('/api/v1/admin/config'),

    // Users
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

    // Licenses
    licenses: (page = 1) =>
        api.get(`/api/v1/admin/licenses?page=${page}`),

    revokeLic: (id: string) =>
        api.delete(`/api/v1/admin/licenses/${id}`),

    // Loader keys
    keys: () =>
        api.get('/api/v1/admin/keys'),

    genKeys: (data: {
        plan_id:  string
        tier_id?: string
        count:    number
    }) => api.post('/api/v1/admin/keys', data),

    deleteKey: (id: string) =>
        api.delete(`/api/v1/admin/keys/${id}`),

    // Promo codes
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

    // JAR Payload
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

    // Anti-cheat events
    events: () =>
        api.get('/api/v1/admin/events'),

    // Transactions
    transactions: () =>
        api.get('/api/v1/admin/transactions'),

    // Partner earnings
    earnings: () =>
        api.get('/api/v1/admin/earnings'),

    markPaid: (id: string) =>
        api.post(`/api/v1/admin/earnings/${id}/pay`),

    // Audit logs
    logs: () =>
        api.get('/api/v1/admin/logs'),

    // Maintenance
    setMaintenance: (enabled: boolean, message: string) =>
        api.post('/api/v1/admin/maintenance', { enabled, message }),

    // Roles
    roles: () =>
        api.get('/api/v1/admin/roles'),

    upsertRole: (data: {
        role_name:   string
        permissions: string
    }) => api.post('/api/v1/admin/roles', data),
}

// ── Store (public) ────────────────────────────────────────────────────────────

export const storeApi = {
    plans: () =>
        api.get('/api/v1/auth/plans'),

    activate: (tierId: string, promoCode?: string) =>
        api.post('/api/v1/store/activate', {
            tier_id:    tierId,
            promo_code: promoCode ?? undefined,
        }),

    validatePromo: (code: string) =>
        api.get(`/api/v1/store/promo/${encodeURIComponent(code)}`),
}

// ── Profile (public) ──────────────────────────────────────────────────────────

export const profileApi = {
    licenses: () =>
        api.get('/api/v1/profile/licenses'),

    earnings: () =>
        api.get('/api/v1/profile/earnings'),
}