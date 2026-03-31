import { Link } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Dynamic Background Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Navigation */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon" style={{ width: 40, height: 40, fontSize: '1.2rem', flexShrink: 0 }}>V</div>
          <span style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.5px' }}>VU Budget</span>
        </div>
        <div style={{ display: 'flex', gap: '3vw', alignItems: 'center' }}>
          <a href="#features" style={{ display: window.innerWidth < 600 ? 'none' : 'block' }}>Features</a>
          <a href="#pricing" style={{ display: window.innerWidth < 600 ? 'none' : 'block' }}>Pricing</a>
          <Link to="/login" style={{ color: 'white' }}>Sign In</Link>
          <Link to="/register" className="btn-premium" style={{ padding: '8px 20px', fontSize: '0.95rem', borderRadius: '10px' }}>Get Started</Link>
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="badge">
            <span style={{ display: 'block', width: 6, height: 6, background: '#38bdf8', borderRadius: '50%', boxShadow: '0 0 10px #38bdf8' }} />
            V8.0 IS LIVE — NOW WITH AI VENDORS
          </div>
          <h1 className="landing-title">
            Stop tracking expenses. <br />
            <span className="gradient-text">Let AI do it for you.</span>
          </h1>
          <p className="landing-subtitle">
            The first fully-automated budget manager that connects directly to your bank's SMS notifications using Gemini AI to instantly categorize every dollar.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link to="/register" className="btn-premium">Start for free</Link>
            <a href="#features" className="btn-outline">See how it works</a>
          </div>
          
          <img src="/app-demo.png" alt="VU Budget App Interface" className="hero-mockup" />
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="section" style={{ background: 'linear-gradient(to bottom, transparent, rgba(124,58,237,0.05), transparent)' }}>
          <h2 className="section-title">Everything you need. <span className="gradient-text">Nothing you don't.</span></h2>
          <p className="section-subtitle">
            We stripped away the clutter of traditional budgeting apps to bring you a razor-sharp, insanely fast tool focused strictly on where your money is going right now.
          </p>

          <div className="feature-grid">
            <div className="glass-card">
              <div className="feature-icon">🤖</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>Zero-Touch Entry</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Connect your bank's SMS alerts to a dedicated Webhook. Our Gemini AI automatically reads the vendor and amount, assigning it to the correct budget instantly.
              </p>
            </div>
            <div className="glass-card">
              <div className="feature-icon">🤝</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>Partner Syncing</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Budgeting is a team sport. Link your account with your spouse or partner to share a live, unified ledger in real time.
              </p>
            </div>
            <div className="glass-card">
              <div className="feature-icon">📊</div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 12 }}>Smart Notifications</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                Get automated Weekly Sunday trend summaries, and instant lock-screen alerts if your shared spending velocity exceeds 90% of your pooled limits.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="section">
          <h2 className="section-title">Simple, transparent pricing</h2>
          <p className="section-subtitle">
            Start managing your money today. Upgrade whenever you need more power.
          </p>

          <div className="feature-grid" style={{ maxWidth: 900 }}>
            {/* Free Card */}
            <div className="glass-card pricing-card starter">
              <h3 style={{ fontSize: '1.8rem' }}>Starter</h3>
              <div className="pricing-price">$0<span>/mo</span></div>
              <ul className="pricing-features">
                <li><span style={{ color: '#38bdf8' }}>✓</span> Unlimited Budgets & Transactions</li>
                <li><span style={{ color: '#38bdf8' }}>✓</span> Real-time Partner Syncing</li>
                <li><span style={{ color: '#38bdf8' }}>✓</span> AI Webhook Limits: 100/mo</li>
                <li><span style={{ color: '#38bdf8' }}>✓</span> Lock-screen Push Notifications</li>
              </ul>
              <Link to="/register" className="btn-premium" style={{ textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>Get Started</Link>
            </div>

            {/* Pro Card */}
            <div className="glass-card pricing-card pro">
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16, width: 'fit-content' }}>Coming Soon</div>
              <h3 style={{ fontSize: '1.8rem' }}>Pro</h3>
              <div className="pricing-price">$4.99<span>/mo</span></div>
              <ul className="pricing-features">
                <li><span style={{ color: '#a78bfa' }}>✨</span> Everything in Starter</li>
                <li><span style={{ color: '#a78bfa' }}>✨</span> Unlimited AI Webhooks</li>
                <li><span style={{ color: '#a78bfa' }}>✨</span> Multi-month Carry-over math</li>
                <li><span style={{ color: '#a78bfa' }}>✨</span> Data CSV Exporting</li>
              </ul>
              <button className="btn-outline" style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%', boxSizing: 'border-box' }} disabled>In Development</button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ padding: '60px 5% 40px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div className="sidebar-logo-icon" style={{ width: 24, height: 24, fontSize: '0.8rem' }}>V</div>
          <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>VU Budget</span>
        </div>
        © {new Date().getFullYear()} VU Budget App. All rights reserved.
      </footer>
    </div>
  );
}
