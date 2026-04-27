import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Zap, Eye, Cpu, Lock, RefreshCw, Users, Star } from 'lucide-react'

const features = [
    { icon: ShieldCheck, title: 'Anti-Detection',   desc: 'Bypass techniques updated within 24h of any patch.' },
    { icon: Zap,         title: 'High Performance', desc: 'Less than 2% FPS impact. Optimized native core.' },
    { icon: Eye,         title: 'Visual Modules',   desc: 'ESP, Tracers, Chams — fully customizable.' },
    { icon: Cpu,         title: 'Secure Loader',    desc: 'Encrypted delivery. Zero files left on disk.' },
    { icon: Lock,        title: 'HWID Lock',        desc: 'Your license is bound to your hardware.' },
    { icon: RefreshCw,   title: 'Auto Updates',     desc: 'Silent background updates, always latest.' },
]

const stats = [
    { value: '10K+',  label: 'Active Users' },
    { value: '99.9%', label: 'Uptime' },
    { value: '< 2h',  label: 'Avg. Update Time' },
    { value: '4.9★',  label: 'User Rating' },
]

export default function HomePage() {
    return (
        <div className="flex flex-col gap-24 py-12">

            {/* Hero */}
            <section className="flex flex-col items-center gap-8 text-center animate-fade-up">
                <div className="inline-flex items-center gap-2 rounded-full border border-[--accent]/25 bg-[--accent-dim] px-4 py-1.5 text-xs font-medium text-[--accent]">
                    <Star size={11} fill="currentColor" /> Premium Minecraft Client
                </div>

                <div className="flex flex-col gap-3">
                    <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
                        Arbuz Client
                    </h1>
                    <p className="text-lg text-[--muted] max-w-lg mx-auto leading-relaxed">
                        The most advanced and undetected Minecraft cheat client.
                        Powerful features. Clean interface. Always updated.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Link href="/kmguard/store">
                        <Button size="lg">Get Started</Button>
                    </Link>
                    <Link href="/auth/register">
                        <Button variant="outline" size="lg">Create Account</Button>
                    </Link>
                </div>

                {/* Glow orb */}
                <div className="absolute left-1/2 top-32 -translate-x-1/2 h-64 w-64 rounded-full bg-[--accent]/5 blur-3xl pointer-events-none" />
            </section>

            {/* Stats */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.map(s => (
                    <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl border border-[--border] bg-[--surface] py-5">
                        <span className="text-2xl font-bold text-[--accent]">{s.value}</span>
                        <span className="text-xs text-[--muted]">{s.label}</span>
                    </div>
                ))}
            </section>

            {/* Features */}
            <section className="flex flex-col gap-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Everything you need</h2>
                    <p className="mt-1 text-sm text-[--muted]">Built for competitive players who demand reliability</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map(({ icon: Icon, title, desc }) => (
                        <div key={title} className="group flex flex-col gap-3 rounded-xl border border-[--border] bg-[--surface] p-5 hover:border-[--accent]/30 transition-colors">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[--accent]/10 text-[--accent] group-hover:bg-[--accent]/20 transition-colors">
                                <Icon size={18} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">{title}</h3>
                                <p className="mt-0.5 text-xs text-[--muted] leading-relaxed">{desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="relative overflow-hidden rounded-2xl border border-[--accent]/20 bg-[--accent-dim] p-10 text-center">
                <h2 className="text-2xl font-bold">Ready to play smarter?</h2>
                <p className="mt-2 text-sm text-[--muted] max-w-md mx-auto">Join thousands of players. Cancel anytime.</p>
                <div className="mt-6">
                    <Link href="/kmguard/store">
                        <Button size="lg">View Plans</Button>
                    </Link>
                </div>
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[--accent]/10 blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[--accent]/5 blur-2xl pointer-events-none" />
            </section>

        </div>
    )
}
