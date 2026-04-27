'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading]   = useState(false)
    const { setUser, setToken }   = useAuthStore()
    const router = useRouter()

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await authApi.login(email, password)
            setToken(res.data.access_token)
            const me  = await authApi.me()
            setUser(me.data)
            router.push('/kmguard/profile')
        } catch {
            toast.error('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[--bg] px-4">
            <div className="w-full max-w-sm">

                {/* Logo */}
                <div className="flex flex-col items-center gap-3 mb-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[--accent]/15">
                        <ShieldCheck size={24} className="text-[--accent]" />
                    </div>
                    <div className="text-center">
                        <h1 className="font-bold text-lg">Welcome back</h1>
                        <p className="text-xs text-[--muted] mt-0.5">Sign in to your Arbuz Client account</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-[--border] bg-[--surface] p-6">
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                        <Button type="submit" loading={loading} className="mt-1 w-full">Sign In</Button>
                    </form>

                    <p className="mt-4 text-center text-xs text-[--muted]">
                        No account?{' '}
                        <Link href="/auth/register" className="text-[--accent] hover:underline">Create one</Link>
                    </p>
                </div>

                <p className="mt-4 text-center text-xs text-[--muted-2]">
                    <Link href="/kmguard" className="hover:text-[--muted]">← Back to home</Link>
                </p>
            </div>
        </div>
    )
}
