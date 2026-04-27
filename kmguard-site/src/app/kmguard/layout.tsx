import { Navbar } from '@/components/layout/Navbar'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: '100vh', background: '#09090b' }}>
            <Navbar />
            <main style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 16px' }}>
                {children}
            </main>
            <footer style={{ borderTop: '1px solid #1c1c1f', marginTop: '80px' }}>
                <div style={{
                    maxWidth: '1152px', margin: '0 auto', padding: '24px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: '8px',
                }}>
                    <span style={{ fontSize: '12px', color: '#52525b' }}>© 2026 Arbuz Client. All rights reserved.</span>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <a href="/kmguard/documents/terms"   style={{ fontSize: '12px', color: '#52525b', textDecoration: 'none' }}>Terms</a>
                        <a href="/kmguard/documents/privacy" style={{ fontSize: '12px', color: '#52525b', textDecoration: 'none' }}>Privacy</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
