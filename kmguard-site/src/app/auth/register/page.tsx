'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

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
        <div className="flex min-h-screen items-center justify-center bg-[#0d0d0f]">
            <div className="w-full max-w-sm rounded-xl border border-[--border] bg-[--surface] p-8">
                <h1 className="mb-6 text-xl font-bold">Create Account</h1>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <Input
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                    <Input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <Input
                        type="password"
                        placeholder="Password (min 8 chars)"
                        value={password}
                        minLength={8}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <Button type="submit" loading={loading}>Register</Button>
                </form>
                <p className="mt-4 text-center text-sm text-[--muted]">
                    Have an account?{' '}
                    <Link href="/auth/login" className="text-[--accent] hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
