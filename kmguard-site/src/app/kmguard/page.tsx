import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FeatureCard } from '@/components/ui/feature-card'

const features = [
    { icon: 'ShieldCheck', title: 'Anti-Detection',   desc: 'Bypass updated within 24h of any AC patch.' },
    { icon: 'Zap',         title: 'High Performance', desc: 'Under 2% FPS impact. Native optimized core.' },
    { icon: 'Eye',         title: 'Visual Modules',   desc: 'ESP, Tracers, Chams — fully customizable.' },
    { icon: 'Cpu',         title: 'Secure Loader',    desc: 'Encrypted delivery. Zero files left on disk.' },
    { icon: 'Lock',        title: 'HWID Lock',        desc: 'License is bound to your hardware ID.' },
    { icon: 'RefreshCw',   title: 'Auto Updates',     desc: 'Silent background updates, always latest.' },
]

const stats = [
    { value: '10K+',  label: 'Active Users' },
    { value: '99.9%', label: 'Uptime' },
    { value: '< 2h',  label: 'Avg. Update Time' },
    { value: '4.9★',  label: 'User Rating' },
]

export default function HomePage() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '80px', paddingTop: '20px' }} className="animate-fade-up">

            {/* Hero */}
            <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', textAlign: 'center', position: 'relative' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    borderRadius: '999px', border: '1px solid rgba(34,197,94,0.25)',
                    background: 'rgba(34,197,94,0.08)', padding: '5px 14px',
                    fontSize: '11px', fontWeight: 500, color: '#22c55e',
                }}>
                    ★ Premium Minecraft Client
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h1 style={{
                        margin: 0, fontSize: 'clamp(40px, 8vw, 72px)', fontWeight: 800,
                        letterSpacing: '-0.03em', lineHeight: 1.05,
                        background: 'linear-gradient(180deg, #ffffff 0%, #71717a 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        Arbuz Client
                    </h1>
                    <p style={{ margin: 0, fontSize: '16px', color: '#71717a', maxWidth: '480px', lineHeight: 1.65 }}>
                        The most advanced and undetected Minecraft cheat client.
                        Powerful features. Clean interface. Always updated.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link href="/kmguard/store" style={{ textDecoration: 'none' }}>
                        <Button size="lg">Get Started</Button>
                    </Link>
                    <Link href="/auth/register" style={{ textDecoration: 'none' }}>
                        <Button variant="outline" size="lg">Create Account</Button>
                    </Link>
                </div>

                <div style={{
                    position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)',
                    width: '400px', height: '400px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(34,197,94,0.07) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: -1,
                }} />
            </section>

            {/* Stats */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {stats.map(s => (
                    <div key={s.label} style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        borderRadius: '12px', border: '1px solid #1c1c1f', background: '#111113',
                        padding: '20px 12px',
                    }}>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: '#22c55e' }}>{s.value}</span>
                        <span style={{ fontSize: '11px', color: '#71717a' }}>{s.label}</span>
                    </div>
                ))}
            </section>

            {/* Features */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Everything you need</h2>
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#71717a' }}>Built for competitive players who demand reliability</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {features.map(f => (
                        <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{
                position: 'relative', overflow: 'hidden',
                borderRadius: '16px', border: '1px solid rgba(34,197,94,0.2)',
                background: 'rgba(34,197,94,0.06)', padding: '56px 32px',
                textAlign: 'center',
            }}>
                <h2 style={{ margin: 0, fontSize: '26px', fontWeight: 700 }}>Ready to play smarter?</h2>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#71717a' }}>Join thousands of players. Cancel anytime.</p>
                <div style={{ marginTop: '24px' }}>
                    <Link href="/kmguard/store" style={{ textDecoration: 'none' }}>
                        <Button size="lg">View Plans</Button>
                    </Link>
                </div>
                <div style={{
                    position: 'absolute', right: '-40px', top: '-40px',
                    width: '160px', height: '160px', borderRadius: '50%',
                    background: 'rgba(34,197,94,0.08)', filter: 'blur(30px)',
                    pointerEvents: 'none',
                }} />
            </section>

        </div>
    )
}
