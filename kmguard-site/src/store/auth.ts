import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
    user:       AuthUser | null
    accessToken:string | null
    setUser:    (user: AuthUser) => void
    setToken:   (token: string) => void
    clear:      () => void
    isAdmin:    () => boolean
    isSupport:  () => boolean
    isPartner:  () => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user:        null,
            accessToken: null,

            setUser:  (user)  => set({ user }),
            setToken: (token) => {
                set({ accessToken: token })
                if (typeof window !== 'undefined')
                    sessionStorage.setItem('access_token', token)
            },
            clear: () => {
                set({ user: null, accessToken: null })
                if (typeof window !== 'undefined')
                    sessionStorage.removeItem('access_token')
            },

            isAdmin:   () => get().user?.role === 'admin',
            isSupport: () => ['admin', 'support'].includes(get().user?.role ?? ''),
            isPartner: () => get().user?.role === 'partner',
        }),
        {
            name:    'kmg-auth',
            partialize: (s) => ({ user: s.user }),
        },
    ),
)