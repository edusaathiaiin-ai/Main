import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SaathiExplorer } from '@/components/saathi/SaathiExplorer'
import { RichFeaturesSection } from '@/components/chat/RichFeaturesSection'
import { FourJourneysSection } from '@/components/landing/FourJourneysSection'
import { ContactLink } from '@/components/contact/ContactLink'

/**
 * Root page — authenticated users go to /chat.
 * Unauthenticated users see the hero landing page.
 */
export default async function RootPage() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      redirect('/chat')
    }
  } catch {
    // Auth check failed (missing env vars, network error, etc.)
    // Render the hero page anyway — don't crash production
  }

  return (
    <>
      {/* Global styles inlined so this page works standalone */}
      <style>{`
        :root{--navy:#0B1F3A;--navy-deep:#060F1D;--gold:#C9993A;--gold-light:#E5B86A;--cream:#FAF7F2;--white:#FFFFFF;--gray:rgba(255,255,255,0.5);--gray-dim:rgba(255,255,255,0.25)}
        html,body{margin:0;padding:0;box-sizing:border-box;background:var(--navy-deep);color:var(--white);font-family:'DM Sans',sans-serif;overflow-x:hidden;scroll-behavior:smooth}
        *{box-sizing:border-box}
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        .land-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:20px 48px;display:flex;align-items:center;justify-content:space-between;background:var(--navy-deep);border-bottom:0.5px solid rgba(255,255,255,0.06)}
        .land-logo{font-family:'Playfair Display',serif;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#fff;text-decoration:none}
        .land-logo span{color:var(--gold)}
        .land-nav-links{display:flex;align-items:center;gap:32px;list-style:none;margin:0;padding:0}
        .land-nav-links a{color:rgba(255,255,255,0.7);text-decoration:none;font-size:14px;font-weight:400;transition:color 0.2s}
        .land-nav-links a:hover{color:#fff}
        .land-nav-cta{background:var(--gold);color:var(--navy-deep)!important;font-weight:600!important;padding:10px 24px;border-radius:8px;transition:background 0.2s,transform 0.2s!important}
        .land-nav-cta:hover{background:var(--gold-light)!important;transform:translateY(-1px)}
        .hero{position:relative;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:112px 24px 64px;overflow:hidden}
        .hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(201,153,58,0.12) 0%,transparent 70%),radial-gradient(ellipse 60% 40% at 20% 80%,rgba(11,31,58,0.8) 0%,transparent 60%),linear-gradient(180deg,#060F1D 0%,#0B1F3A 40%,#060F1D 100%)}
        .orb{position:absolute;border-radius:50%;filter:blur(80px)}
        .orb-1{width:400px;height:400px;background:rgba(201,153,58,0.08);top:-100px;left:50%;animation:float1 8s ease-in-out infinite}
        .orb-2{width:300px;height:300px;background:rgba(11,31,58,0.6);bottom:100px;left:-100px;animation:float2 10s ease-in-out infinite}
        .orb-3{width:250px;height:250px;background:rgba(201,153,58,0.06);bottom:50px;right:-50px;animation:float3 7s ease-in-out infinite}
        @keyframes float1{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-30px)}}
        @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-20px)}}
        @keyframes float3{0%,100%{transform:translateY(0)}50%{transform:translateY(15px)}}
        .hero-beam{position:absolute;top:45%;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(201,153,58,0.3),transparent);animation:beam 4s ease-in-out infinite}
        @keyframes beam{0%,100%{opacity:0.3}50%{opacity:0.8}}
        .hero-content{position:relative;z-index:10;max-width:900px}
        .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;background:rgba(201,153,58,0.1);border:0.5px solid rgba(201,153,58,0.3);border-radius:100px;padding:6px 16px;font-size:12px;font-weight:500;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:24px;animation:fadeUp 0.8s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .hero-title,.hero-title-line2,.hero-title-line3{font-family:'Playfair Display',serif;font-size:clamp(44px,6vw,80px);font-weight:900;line-height:1.15;letter-spacing:-1.5px;margin-bottom:6px;padding-top:0.12em;animation:fadeUp 0.8s ease both;color:#fff}
        .hero-title{animation-delay:0.1s}
        .hero-title-line2{font-style:italic;color:var(--gold);animation-delay:0.2s}
        .hero-title-line3{margin-bottom:24px;animation-delay:0.3s}
        .hero-subtitle{font-size:clamp(16px,1.8vw,19px);font-weight:300;color:rgba(255,255,255,0.65);line-height:1.65;max-width:600px;margin:0 auto 36px;animation:fadeUp 0.8s ease 0.4s both}
        .hero-subtitle strong{color:#fff;font-weight:500}
        .hero-ctas{display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;animation:fadeUp 0.8s ease 0.5s both}
        .btn-primary{display:inline-flex;align-items:center;gap:10px;background:var(--gold);color:var(--navy-deep);font-family:'DM Sans',sans-serif;font-size:16px;font-weight:600;padding:16px 36px;border-radius:12px;text-decoration:none;border:none;cursor:pointer;transition:all 0.3s ease}
        .btn-primary:hover{background:var(--gold-light);transform:translateY(-2px);box-shadow:0 20px 60px rgba(201,153,58,0.4)}
        .btn-secondary{display:inline-flex;align-items:center;gap:8px;background:transparent;color:rgba(255,255,255,0.7);font-size:15px;font-weight:400;padding:16px 24px;border-radius:12px;border:0.5px solid rgba(255,255,255,0.15);text-decoration:none;cursor:pointer;transition:all 0.3s ease}
        .btn-secondary:hover{color:#fff;border-color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.05)}
        /* Role cards */
        .role-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;max-width:900px;margin:0 auto 32px;animation:fadeUp 0.8s ease 0.5s both}
        .role-card{border-radius:16px;padding:20px 16px;text-decoration:none;display:flex;flex-direction:column;align-items:center;gap:8px;transition:transform 0.25s ease,box-shadow 0.25s ease,border-color 0.25s ease;cursor:pointer}
        .role-card:hover{transform:translateY(-4px)}
        .role-card-student{background:rgba(201,153,58,0.12);border:0.5px solid rgba(201,153,58,0.4)}
        .role-card-student:hover{border-color:rgba(201,153,58,0.8);box-shadow:0 16px 48px rgba(201,153,58,0.2)}
        .role-card-faculty{background:rgba(22,163,74,0.08);border:0.5px solid rgba(22,163,74,0.3)}
        .role-card-faculty:hover{border-color:rgba(22,163,74,0.7);box-shadow:0 16px 48px rgba(22,163,74,0.15)}
        .role-card-public{background:rgba(234,88,12,0.08);border:0.5px solid rgba(234,88,12,0.3)}
        .role-card-public:hover{border-color:rgba(234,88,12,0.7);box-shadow:0 16px 48px rgba(234,88,12,0.15)}
        .role-card-institution{background:rgba(124,58,237,0.08);border:0.5px solid rgba(124,58,237,0.3)}
        .role-card-institution:hover{border-color:rgba(124,58,237,0.7);box-shadow:0 16px 48px rgba(124,58,237,0.15)}
        /* For-everyone tabs */
        .role-tabs{display:flex;gap:4px;background:rgba(255,255,255,0.04);border-radius:14px;padding:4px;width:fit-content;margin:0 auto 48px}
        .role-tab{padding:10px 24px;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer;border:none;background:transparent;color:rgba(255,255,255,0.45);transition:all 0.2s}
        .role-tab.active{background:rgba(255,255,255,0.08);color:#fff}
        .role-tab-content{display:none}.role-tab-content.active{display:block}
        .role-feature-list{list-style:none;padding:0;margin:24px 0 32px;display:flex;flex-direction:column;gap:12px}
        .role-feature-list li{display:flex;align-items:flex-start;gap:12px;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.6}
        .role-feature-list li::before{content:'✓';color:var(--gold);font-weight:700;flex-shrink:0;margin-top:1px}
        @media(max-width:768px){
          .role-cards{grid-template-columns:repeat(2,1fr)}
          .role-tabs{flex-wrap:wrap;justify-content:center}
        }
        .hero-stats{display:flex;align-items:center;justify-content:center;gap:48px;margin-top:40px;animation:fadeUp 0.8s ease 0.6s both}
        .stat{text-align:center}.stat-num{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;color:var(--gold);line-height:1;margin-bottom:4px}.stat-label{font-size:12px;color:var(--gray);font-weight:400;letter-spacing:0.5px}
        .stat-divider{width:1px;height:40px;background:rgba(255,255,255,0.1)}
        .founding-banner{background:linear-gradient(135deg,rgba(201,153,58,0.15),rgba(201,153,58,0.05));border-top:0.5px solid rgba(201,153,58,0.3);border-bottom:0.5px solid rgba(201,153,58,0.3);padding:20px 48px;display:flex;align-items:center;justify-content:center;gap:16px;text-align:center}
        .founding-badge{background:var(--gold);color:var(--navy-deep);font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;letter-spacing:1px;text-transform:uppercase;flex-shrink:0}
        .founding-text{font-size:14px;color:rgba(255,255,255,0.8)}.founding-text strong{color:var(--gold);font-weight:600}
        .founding-cta{color:var(--gold);font-size:13px;font-weight:600;text-decoration:none;border-bottom:0.5px solid rgba(201,153,58,0.5);padding-bottom:1px;flex-shrink:0}
        .land-section{padding:100px 48px;max-width:1200px;margin:0 auto}
        .section-eyebrow{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:16px;display:flex;align-items:center;gap:10px}
        .section-eyebrow::before{content:'';display:block;width:24px;height:1px;background:var(--gold)}
        .section-title{font-family:'Playfair Display',serif;font-size:clamp(36px,4vw,56px);font-weight:700;line-height:1.25;letter-spacing:-1px;margin-bottom:16px;color:#fff;padding-top:4px}
        .section-title em{font-style:italic;color:var(--gold)}
        .section-subtitle{font-size:18px;font-weight:300;color:rgba(255,255,255,0.55);line-height:1.7;max-width:560px}
        .steps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:rgba(255,255,255,0.05);border-radius:24px;overflow:hidden}
        .step{background:rgba(11,31,58,0.8);padding:48px 40px;position:relative;overflow:hidden;transition:background 0.3s}
        .step:hover{background:rgba(11,31,58,1)}
        .step-num{font-family:'DM Mono',monospace;font-size:11px;color:var(--gold);letter-spacing:2px;margin-bottom:24px;opacity:0.7}
        .step-icon{font-size:40px;margin-bottom:20px;display:block}
        .step-title{font-family:'Playfair Display',serif;font-size:24px;font-weight:700;margin-bottom:12px;line-height:1.2;color:#fff}
        .step-body{font-size:15px;font-weight:300;color:rgba(255,255,255,0.55);line-height:1.7}
        .saathis-header{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:48px;flex-wrap:wrap;gap:24px}
        /* SaathiGrid responsive columns: 4 → 3 → 2 */
        .saathi-grid-responsive{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        @media(max-width:1024px){.saathi-grid-responsive{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:640px){.saathi-grid-responsive{grid-template-columns:repeat(2,1fr)}}
        /* Breathing green dot for all live Saathis */
        @keyframes saathi-pulse{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,0.6)}50%{box-shadow:0 0 0 6px rgba(74,222,128,0)}}
        .comparison-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;border-radius:24px;overflow:hidden;background:rgba(255,255,255,0.05)}
        .comparison-col{padding:48px 40px}
        .comparison-col.them{background:rgba(15,15,15,0.9)}
        .comparison-col.us{background:rgba(11,31,58,0.95);position:relative}
        .comparison-col-header{display:flex;align-items:center;gap:12px;margin-bottom:40px;padding-bottom:24px;border-bottom:0.5px solid rgba(255,255,255,0.08)}
        .comparison-brand{font-family:'Playfair Display',serif;font-size:22px;font-weight:700}
        .comparison-price{font-family:'DM Mono',monospace;font-size:13px;color:var(--gray);margin-left:auto}
        .comparison-item{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:0.5px solid rgba(255,255,255,0.05)}
        .comparison-item:last-child{border-bottom:none}
        .comparison-icon{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:1px}
        .icon-no{background:rgba(239,68,68,0.15);color:#F87171}.icon-yes{background:rgba(201,153,58,0.15);color:var(--gold)}
        .comparison-text{font-size:14px;color:rgba(255,255,255,0.65);line-height:1.5}.comparison-text strong{color:#fff;font-weight:500}
        .land-footer{border-top:0.5px solid rgba(255,255,255,0.07);padding:48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px;max-width:1200px;margin:0 auto}
        .footer-logo{font-family:'Playfair Display',serif;font-size:18px;font-weight:700}.footer-logo span{color:var(--gold)}
        .footer-tagline{font-size:12px;color:var(--gray-dim);margin-top:4px}
        .footer-links{display:flex;align-items:center;gap:32px;list-style:none;margin:0;padding:0}.footer-links a,.footer-links button{color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;line-height:1.5;font-family:inherit;font-weight:inherit;transition:color 0.2s;background:transparent;border:none;padding:0;margin:0;cursor:pointer;vertical-align:baseline;display:inline;box-sizing:border-box}.footer-links a:hover,.footer-links button:hover{color:#fff}
        .footer-copy{font-size:12px;color:rgba(255,255,255,0.2);width:100%;text-align:center;padding-top:24px;border-top:0.5px solid rgba(255,255,255,0.05);margin-top:8px}
        @media(max-width:768px){
          .land-nav{padding:16px 20px}.land-nav-links{display:none}
          .land-section{padding:64px 20px}
          .steps-grid{grid-template-columns:1fr}
          .comparison-grid{grid-template-columns:1fr}
          .hero-stats{gap:24px}.stat-divider{display:none}
          .founding-banner{padding:16px 20px;flex-direction:column;gap:8px}
          .land-footer{padding:32px 20px;flex-direction:column}
          .saathis-grid{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
        }
      `}</style>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="land-nav">
        <Link href="/" className="land-logo">
          EdU<span>saathi</span>AI
        </Link>
        <ul className="land-nav-links">
          <li>
            <a href="#saathis">Saathis</a>
          </li>
          <li>
            <a href="#how">How it works</a>
          </li>
          <li>
            <a href="#for-everyone">For everyone</a>
          </li>
          <li>
            <Link href="/about">About Us</Link>
          </li>
          <li>
            <Link href="/login?role=student" className="land-nav-cta">
              Register →
            </Link>
          </li>
        </ul>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero-bg" />
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="hero-beam" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            Built for India &middot; 30 Subject Companions
          </div>
          <h1 className="hero-title">The AI companion</h1>
          <h1 className="hero-title-line2">that shows you</h1>
          <h1 className="hero-title-line3">who you&apos;re becoming.</h1>
          <p className="hero-subtitle">
            <strong>Your Saathi. Your Vishwaroop.</strong>
            <br />
            For students who sense there is more to them than their syllabus.
            <br />
            For faculty whose knowledge deserves to outlast the classroom.
            <br />
            For institutions that want to shape futures, not just transcripts.
          </p>
          {/* ── 4 Role Cards ── */}
          <div className="role-cards">
            <a
              href="/login?role=student"
              className="role-card role-card-student"
            >
              <span style={{ fontSize: '32px' }}>🎓</span>
              <span
                style={{
                  fontFamily: 'Playfair Display',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#C9993A',
                }}
              >
                I am a Student
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center',
                  lineHeight: '1.5',
                }}
              >
                Learn with a Saathi who knows your name, your semester, your
                dream
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#C9993A',
                  fontWeight: '600',
                  marginTop: '4px',
                }}
              >
                Begin for free →
              </span>
            </a>
            <a
              href="/login?role=faculty"
              className="role-card role-card-faculty"
            >
              <span style={{ fontSize: '32px' }}>👨‍🏫</span>
              <span
                style={{
                  fontFamily: 'Playfair Display',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#4ADE80',
                }}
              >
                I am Faculty
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center',
                  lineHeight: '1.5',
                }}
              >
                Verify student answers, earn your faculty badge, reach learners
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#4ADE80',
                  fontWeight: '600',
                  marginTop: '4px',
                }}
              >
                Join as Faculty →
              </span>
            </a>
            <a href="/login?role=public" className="role-card role-card-public">
              <span style={{ fontSize: '32px' }}>🌐</span>
              <span
                style={{
                  fontFamily: 'Playfair Display',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#FB923C',
                }}
              >
                I am Curious
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center',
                  lineHeight: '1.5',
                }}
              >
                Explore any subject, read today&apos;s research, ask freely
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#FB923C',
                  fontWeight: '600',
                  marginTop: '4px',
                }}
              >
                Explore free →
              </span>
            </a>
            <a
              href="/login?role=institution"
              className="role-card role-card-institution"
            >
              <span style={{ fontSize: '32px' }}>🏢</span>
              <span
                style={{
                  fontFamily: 'Playfair Display',
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#A78BFA',
                }}
              >
                We are an Institution
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center',
                  lineHeight: '1.5',
                }}
              >
                Post internships, find talent, partner with EdUsaathiAI
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: '#A78BFA',
                  fontWeight: '600',
                  marginTop: '4px',
                }}
              >
                Partner with us →
              </span>
            </a>
          </div>
          <a href="#saathis" className="btn-secondary">
            Meet the 30 Saathis ↓
          </a>
          <p
            style={{
              textAlign: 'center',
              marginTop: '16px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            Already have an account?{' '}
            <Link
              href="/login"
              style={{
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Sign in here →
            </Link>
          </p>

          {/* Subtle education-institution entry — sits below the student CTA,
              soft and non-competing. Full pitch lives at /education-institutions. */}
          <p
            style={{
              textAlign: 'center',
              marginTop: '10px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            Are you a college or university?{' '}
            <Link
              href="/education-institutions"
              style={{
                color: 'var(--gold)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                fontWeight: 500,
              }}
            >
              Bring EdUsaathiAI to your institution →
            </Link>
          </p>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-num">30</div>
              <div className="stat-label">Subject Saathis</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-num">₹99</div>
              <div className="stat-label">Per month</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-num">8×</div>
              <div className="stat-label">Cheaper than ChatGPT</div>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <div className="stat-num">∞</div>
              <div className="stat-label">Soul memory</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Founding Banner ────────────────────────────────────────────── */}
      <div className="founding-banner">
        <span className="founding-badge">Founding Student</span>
        <span className="founding-text">
          First 500 students get{' '}
          <strong>60 days full access — completely free.</strong> No card. No
          catch. Just your Saathi.
        </span>
        <Link href="/login?role=student" className="founding-cta">
          Claim your spot →
        </Link>
        <Link
          href="/login"
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
            marginLeft: '8px',
          }}
        >
          Already a Founding Student?{' '}
          <span style={{ color: '#C9993A' }}>Sign in →</span>
        </Link>
      </div>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how" className="land-section">
        <div className="section-eyebrow">How it works</div>
        <h2 className="section-title">
          Three steps to your
          <br />
          <em>Unified Soul Partnership</em>
        </h2>
        <p className="section-subtitle">
          EdUsaathiAI doesn&apos;t just answer questions. It builds a
          relationship with your learning journey.
        </p>
        <div className="steps-grid" style={{ marginTop: '48px' }}>
          <div className="step">
            <div className="step-num">01 — CHOOSE</div>
            <span className="step-icon">🎯</span>
            <h3 className="step-title">Pick your Saathi</h3>
            <p className="step-body">
              Choose from 30 subject companions — Law, Biology, Medicine, CS,
              UPSC, Finance, and more. Your Saathi knows your subject inside out
              and meets you where you are.
            </p>
          </div>
          <div className="step">
            <div className="step-num">02 — CONNECT</div>
            <span className="step-icon">🧠</span>
            <h3 className="step-title">Your soul is matched</h3>
            <p className="step-body">
              Tell your Saathi your name, your exam target, your research dream.
              Every conversation is personal. Your Saathi remembers what you
              struggled with and bridges it to today.
            </p>
          </div>
          <div className="step">
            <div className="step-num">03 — GROW</div>
            <span className="step-icon">🚀</span>
            <h3 className="step-title">Learn. Check in. Rise.</h3>
            <p className="step-body">
              Study with your bot. Take Saathi Check-ins to see how far
              you&apos;ve come. Read today&apos;s research headlines in your
              field. Your Saathi grows smarter about you with every session.
            </p>
          </div>
        </div>
      </section>

      {/* ── Rich features preview ──────────────────────────────────────── */}
      <RichFeaturesSection />

      {/* ── For Everyone — Four Journeys (interactive client component) ── */}
      <FourJourneysSection />

      {/* ── Saathis grid ───────────────────────────────────────────────── */}
      <section id="saathis" className="land-section">
        <SaathiExplorer />
      </section>

      {/* ── ChatGPT comparison ─────────────────────────────────────────── */}
      <section id="compare" className="land-section">
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
            <span
              style={{
                display: 'block',
                width: '24px',
                height: '1px',
                background: 'var(--gold)',
              }}
            />
            Why not ChatGPT?
          </div>
          <h2 className="section-title">
            General intelligence
            <br />
            vs <em>your intelligence.</em>
          </h2>
          <p className="section-subtitle" style={{ margin: '0 auto' }}>
            ChatGPT is built for everyone. EdUsaathiAI is built for you.
          </p>
        </div>
        <div className="comparison-grid">
          <div className="comparison-col them">
            <div className="comparison-col-header">
              <div
                className="comparison-brand"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                ChatGPT Plus
              </div>
              <div className="comparison-price">₹1,650/month</div>
            </div>
            {[
              "Doesn't know your name or remember you between sessions",
              'No subject specialisation — same bot for cooking and chemistry',
              'No awareness of Indian exams — UPSC, NEET, CLAT, GATE',
              'No soul matching — treats every user identically',
              'No community board, no peer learning, no faculty verification',
              'No daily research headlines filtered to your subject',
              '₹1,650/month. 8× more expensive.',
            ].map((t, i) => (
              <div key={i} className="comparison-item">
                <div className="comparison-icon icon-no">✗</div>
                <div className="comparison-text">{t}</div>
              </div>
            ))}
          </div>
          <div className="comparison-col us">
            <div className="comparison-col-header">
              <div
                className="comparison-brand"
                style={{ color: 'var(--gold)' }}
              >
                EdUsaathiAI Plus
              </div>
              <div
                className="comparison-price"
                style={{ color: 'var(--gold)' }}
              >
                ₹99/month
              </div>
            </div>
            {[
              'Knows your name. Remembers your last session, research dream, and struggle topics',
              '30 specialist Saathis — each an expert with subject-specific guardrails',
              'India-first. UPSC current affairs, NEET Biology, CLAT prep, GATE — all built in',
              'Soul matching. Mirrors your tone, adapts to your ambition, bridges to your goals',
              'Community Board with faculty-verified answers and AI auto-responses',
              'Daily headlines from Nature, Cell, Bar & Bench, PRS India — filtered to your Saathi',
              '₹99/month. Less than your weekly pizza. More than a semester of guidance.',
            ].map((t, i) => (
              <div key={i} className="comparison-item">
                <div className="comparison-icon icon-yes">✓</div>
                <div className="comparison-text">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '80px 48px 100px' }}>
        <div className="section-eyebrow" style={{ justifyContent: 'center' }}>
          <span
            style={{
              display: 'block',
              width: '24px',
              height: '1px',
              background: 'var(--gold)',
            }}
          />
          Your journey starts here
        </div>
        <h2 className="section-title" style={{ marginBottom: '16px' }}>
          You are not just a student.
          <br />
          <em>You are shaping a future.</em>
        </h2>
        <p
          style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '48px',
            fontWeight: 300,
          }}
        >
          Your Saathi is waiting. First 500 students get 60 days free.
        </p>
        <Link
          href="/login?role=student"
          className="btn-primary"
          style={{ fontSize: '18px', padding: '20px 48px' }}
        >
          Student Registration →
        </Link>
        <p
          style={{
            marginTop: '20px',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          No credit card. No commitment. Just your Saathi.
        </p>
      </section>

      {/* ── Contact strip ───────────────────────────────────────────── */}
      <div
        style={{
          textAlign: 'center',
          padding: '40px 48px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: '8px',
          }}
        >
          Questions? We&apos;re real people.
        </p>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
          }}
        >
          <a
            href="mailto:support@edusaathiai.in"
            className="hover:underline"
            style={{
              color: '#C9993A',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            support@edusaathiai.in
          </a>
          <span style={{ margin: '0 16px', opacity: 0.3 }}>·</span>
          <a
            href="mailto:info@edusaathiai.in"
            className="hover:underline"
            style={{
              color: 'rgba(255,255,255,0.4)',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            info@edusaathiai.in
          </a>
          <span
            style={{
              marginLeft: '8px',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.25)',
            }}
          >
            (partnerships)
          </span>
        </p>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="land-footer">
        <div>
          <div className="footer-logo">
            EdU<span>saathi</span>AI
          </div>
          <div className="footer-tagline">
            Unified Soul Partnership · Ahmedabad, India
          </div>
        </div>
        <ul className="footer-links">
          <li>
            <Link href="/login?role=student">For Students</Link>
          </li>
          <li>
            <Link href="/login?role=faculty">For Faculty</Link>
          </li>
          <li>
            <Link href="/login?role=institution">For Institutions</Link>
          </li>
          <li>
            <Link href="/privacy">Privacy Policy</Link>
          </li>
          <li>
            <Link href="/terms">Terms of Use</Link>
          </li>
          <li>
            <ContactLink>Contact</ContactLink>
          </li>
          <li>
            <a
              href={
                process.env.NEXT_PUBLIC_ADMIN_URL ||
                'https://admin.edusaathiai.in'
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              Admin Access
            </a>
          </li>
          <li>
            <a
              href="https://x.com/EdUsaathiAI"
              target="_blank"
              rel="noopener noreferrer"
            >
              @EdUsaathiAI
            </a>
          </li>
        </ul>
        <div className="footer-copy">
          © 2026 EdUsaathiAI, Ahmedabad. All rights reserved.
        </div>
      </footer>
    </>
  )
}
