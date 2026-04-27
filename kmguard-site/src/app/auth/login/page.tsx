'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

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
            const res  = await authApi.login(email, password)
            setToken(res.data.access_token)
            const me   = await authApi.me()
            setUser(me.data)
            router.push('/kmguard/profile')
        } catch {
            toast.error('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0d0d0f]">
            <div className="w-full max-w-sm rounded-xl border border-[--border] bg-[--surface] p-8">
                <h1 className="mb-6 text-xl font-bold">Sign In</h1>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" loading={loading}>Sign In</Button>
                </form>
                <p className="mt-4 text-center text-sm text-[--muted]">
                    No account?{' '}
                    <Link href="/auth/register" className="text-[--accent] hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    )
}
