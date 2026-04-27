import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Zap, Eye, Cpu } from 'lucide-react'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'KMGuard'

const features = [
    { icon: <ShieldCheck size={24}/>, title: 'Anti-Detection',   desc: 'Advanced bypass techniques updated regularly.' },
    { icon: <Zap         size={24}/>, title: 'High Performance', desc: 'Optimized for minimal FPS impact.' },
    { icon: <Eye         size={24}/>, title: 'ESP & Aimbot',     desc: 'Highly customizable visual modules.' },
    { icon: <Cpu         size={24}/>, title: 'Secure Loader',    desc: 'Encrypted delivery, no files on disk.' },
]

export default function HomePage() {
    return (
        <div className="flex flex-col items-center gap-20 py-10">

            {/* Hero */}
            <section className="flex flex-col items-center gap-6 text-center">
        <span className="rounded-full border border-[--accent]/30 bg-[--accent]/10 px-3 py-1 text-xs text-[--accent]">
          Premium Minecraft Client
        </span>
                <h1 className="text-5xl font-bold tracking-tight">
                    {SITE_NAME}
                </h1>
                <p className="max-w-md text-[--muted]">
                    The most advanced and secure Minecraft cheat client.
                    Undetected, fast, and feature-rich.
                </p>
                <div className="flex gap-3">
                    <Link href="/store">
                        <Button size="lg">Get Started</Button>
                    </Link>
                    <Link href="/documents/terms">
                        <Button variant="outline" size="lg">Terms of Service</Button>
                    </Link>
                </div>
            </section>

            {/* Features */}
            <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {features.map(f => (
                    <div
                        key={f.title}
                        className="flex flex-col gap-3 rounded-xl border border-[--border] bg-[--surface] p-5"
                    >
                        <div className="text-[--accent]">{f.icon}</div>
                        <h3 className="font-semibold">{f.title}</h3>
                        <p className="text-sm text-[--muted]">{f.desc}</p>
                    </div>
                ))}
            </section>
        </div>
    )
}