import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      {/* Deep animated background from index.css */}
      <div className="app-bg" />

      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 5%', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(12, 12, 29, 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{ width: 40, height: 40, fontSize: '1.2rem', flexShrink: 0 }}>V</div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.5px' }}>VU Budget</span>
        </div>
        <div style={{ display: 'flex', gap: '3vw', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 500, display: window.innerWidth < 600 ? 'none' : 'block' }}>Features</a>
          <a href="#pricing" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: 500, display: window.innerWidth < 600 ? 'none' : 'block' }}>Pricing</a>
          <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Get Started</Link>
        </div>
      </nav>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
        
        {/* HERO SECTION */}
        <section style={{ padding: '120px 5%', textAlign: 'center', maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'inline-block', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '6px 16px', borderRadius: 100, fontSize: '0.85rem', fontWeight: 700, marginBottom: 24, letterSpacing: '1px' }}>
            V8.0 IS LIVE — NOW WITH AI VENDORS
          </div>
          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24 }}>
            Stop tracking expenses. <br />
            <span style={{ background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Let AI do it for you.
            </span>
          </h1>
          <p style={{ fontSize: 'clamp(1.1rem, 2vw, 1.3rem)', color: 'rgba(255,255,255,0.7)', maxWidth: 600, marginBottom: 40, lineHeight: 1.6 }}>
            The first fully-automated budget manager that connects directly to your bank's SMS notifications using Gemini AI to instantly categorize every dollar.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>Start for free</Link>
            <a href="#features" className="btn btn-secondary" style={{ padding: '16px 32px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)' }}>See how it works</a>
          </div>
          
          <div style={{ marginTop: 60, width: '100%', maxWidth: 800 }}>
             <img src="/app-demo.png" alt="App interface demo" style={{ width: '100%', maxWidth: 300, borderRadius: 24, border: '4px solid rgba(255,255,255,0.05)', filter: 'drop-shadow(0 0 60px rgba(124, 58, 237, 0.2))' }} />
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" style={{ padding: '80px 5%', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>Everything you need. <span style={{ color: '#a78bfa' }}>Nothing you don't.</span></h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
                We stripped away the clutter of traditional budgeting apps to bring you a razor-sharp, insanely fast tool focused strictly on where your money is going right now.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
              <div className="glass-card-static" style={{ padding: 32 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🤖</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>Zero-Touch Entry</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Connect your bank's SMS alerts to a dedicated Webhook. Our Gemini AI automatically reads the vendor and amount, assigning it to the correct budget instantly.
                </p>
              </div>
              <div className="glass-card-static" style={{ padding: 32 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🤝</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>Partner Syncing</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Budgeting is a team sport. Link your account with your spouse or partner to share a live, unified ledger. 
                </p>
              </div>
              <div className="glass-card-static" style={{ padding: 32 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📊</div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 12 }}>Smart Notifications</h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                  Get automated Weekly Sunday trend summaries, and instant lock-screen alerts if your shared spending velocity exceeds 90% of your pooled limits.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" style={{ padding: '100px 5%' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>Simple, transparent pricing</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto', marginBottom: 60 }}>
              Start managing your money today. Upgrade whenever you need more power.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, textAlign: 'left' }}>
              
              {/* Free Card */}
              <div className="glass-card-static" style={{ padding: 40, border: '2px solid var(--primary-color)' }}>
                <h3 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Starter</h3>
                <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 24 }}>$0<span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400}}>/mo</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 16, color: 'rgba(255,255,255,0.8)' }}>
                  <li>✅ Unlimited Budgets</li>
                  <li>✅ Partner Syncing</li>
                  <li>✅ AI Webhook Limits: 100/mo</li>
                  <li>✅ Push Notifications</li>
                </ul>
                <Link to="/register" className="btn btn-primary" style={{ width: '100%', padding: 16, fontSize: '1.1rem', textAlign: 'center', textDecoration: 'none' }}>Get Started</Link>
              </div>

              {/* Pro Card */}
              <div className="glass-card-static" style={{ padding: 40, opacity: 0.6 }}>
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>Coming Soon</div>
                <h3 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Pro</h3>
                <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: 24 }}>$4.99<span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', fontWeight: 400}}>/mo</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: 16, color: 'rgba(255,255,255,0.6)' }}>
                  <li>✨ Everything in Starter</li>
                  <li>✨ Unlimited AI Webhooks</li>
                  <li>✨ Multi-month Carry-over math</li>
                  <li>✨ Data Exporting</li>
                </ul>
                <button className="btn btn-secondary" style={{ width: '100%', padding: 16, fontSize: '1.1rem', cursor: 'not-allowed' }} disabled>In Development</button>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{ padding: '40px 5%', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          <div className="sidebar-logo-icon" style={{ width: 24, height: 24, fontSize: '0.8rem' }}>V</div>
          <span style={{ fontWeight: 700 }}>VU Budget</span>
        </div>
        © {new Date().getFullYear()} VU Budget. All rights reserved.
      </footer>
    </div>
  );
}
