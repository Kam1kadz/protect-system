'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
    const [username, setUsername] = useState('')
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading]   = useState(false)
    const router = useRouter()

    async function submit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        try {
            await authApi.register(username, email, password)
            toast.success('Account created! Please sign in.')
            router.push('/auth/login')
        } catch (err: any) {
            toast.error(err?.response?.data?.error ?? 'Registration failed')
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
                        <h1 className="font-bold text-lg">Create account</h1>
                        <p className="text-xs text-[--muted] mt-0.5">Join Arbuz Client today</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-[--border] bg-[--surface] p-6">
                    <form onSubmit={submit} className="flex flex-col gap-4">
                        <Input
                            label="Username"
                            placeholder="arbuz_player"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                        />
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
                            placeholder="Min 8 characters"
                            value={password}
                            minLength={8}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoComplete="new-password"
                        />
                        <Button type="submit" loading={loading} className="mt-1 w-full">Create Account</Button>
                    </form>

                    <p className="mt-4 text-center text-xs text-[--muted]">
                        Already have an account?{' '}
                        <Link href="/auth/login" className="text-[--accent] hover:underline">Sign in</Link>
                    </p>
                </div>

                <p className="mt-4 text-center text-xs text-[--muted-2]">
                    <Link href="/kmguard" className="hover:text-[--muted]">← Back to home</Link>
                </p>
            </div>
        </div>
    )
}
