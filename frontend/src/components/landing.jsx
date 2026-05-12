// Landing Page v4 — VT Campus panorama · scroll-pan · light/dark
import { useState, useEffect, useRef } from "react";

// ── Styles ────────────────────────────────────────────────────────────────────
const LP_CSS = `
/* Smooth theme transition. Applies to every element that doesn't already
   declare its own transition — inline transitions (cards, buttons, nav)
   override this, so hover snappiness stays intact. */
body, body * {
  transition:
    background-color 0.5s ease,
    color 0.5s ease,
    border-color 0.5s ease,
    fill 0.5s ease,
    stroke 0.5s ease;
}
@keyframes lp-ticker {
  from { transform: translateX(0) }
  to   { transform: translateX(-50%) }
}
@keyframes lp-breathe {
  0%, 100% { transform: scale(1);    opacity: 0.5 }
  50%       { transform: scale(1.08); opacity: 0.7 }
}
@keyframes lp-rise {
  from { transform: translateY(108%); }
  to   { transform: translateY(0); }
}
@keyframes lp-appear {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.lp-hero-clip { overflow: hidden; display: block; }
.lp-hero-line {
  display: block;
  animation: lp-rise 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.lp-hero-fade { animation: lp-appear 0.9s ease both; }
.lp-clip  { overflow: hidden; display: block; }
.lp-line  { display: block; transform: translateY(108%); transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1); }
.lp-line.in  { transform: translateY(0); }
.lp-fade  { opacity: 0; transform: translateY(28px); transition: opacity 0.9s ease, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1); }
.lp-fade.in  { opacity: 1; transform: translateY(0); }
.lp-grow  { width: 0 !important; transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1); }
.lp-grow.in  { width: 100% !important; }
.d1 { transition-delay: 0.08s !important; animation-delay: 0.08s !important; }
.d2 { transition-delay: 0.16s !important; animation-delay: 0.16s !important; }
.d3 { transition-delay: 0.24s !important; animation-delay: 0.24s !important; }
.d4 { transition-delay: 0.32s !important; animation-delay: 0.32s !important; }
.d5 { transition-delay: 0.40s !important; animation-delay: 0.40s !important; }
.d6 { transition-delay: 0.48s !important; animation-delay: 0.48s !important; }
.d7 { transition-delay: 0.56s !important; animation-delay: 0.56s !important; }
.d8 { transition-delay: 0.64s !important; animation-delay: 0.64s !important; }
`;

function injectStyles(id, css) {
  if (!document.getElementById(id)) {
    const el = document.createElement('style');
    el.id = id; el.textContent = css;
    document.head.appendChild(el);
  }
}

// ── Campus photo background ──────────────────────────────────────────────────
// Fixed-position layer with the day photo, night photo, and matching overlays.
// Both photos and both overlays are always mounted; opacity crossfades on
// darkMode. Used by the landing page AND any other page that wants the same
// backdrop (e.g. Browse Courses).
export function CampusBackground({ darkMode }) {
  // Make sure the global theme-transition CSS is present even if the landing
  // page hasn't rendered yet (e.g. user lands directly on Browse Courses).
  injectStyles('lp-v4', LP_CSS);
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      zIndex: 0, overflow: 'hidden', pointerEvents: 'none',
      background: darkMode ? '#080808' : '#f5f1ec',
    }}>
      <img
        src="images/campus_day.jpg"
        alt=""
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: darkMode ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}
      />
      <img
        src="images/campus_night.jpg"
        alt=""
        style={{
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: darkMode ? 1 : 0,
          transition: 'opacity 0.5s ease',
        }}
      />
      {/* Light overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.74) 100%)',
        opacity: darkMode ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }} />
      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(10,10,12,0.66) 0%, rgba(6,6,8,0.78) 100%)',
        opacity: darkMode ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }} />
    </div>
  );
}

function useReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); }),
      { threshold: 0.12 }
    );
    ['.lp-line', '.lp-fade', '.lp-grow'].forEach(sel =>
      document.querySelectorAll(sel).forEach(el => obs.observe(el))
    );
    return () => obs.disconnect();
  });
}

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimCounter({ target, suffix = '', duration = 1600, active }) {
  const [val, setVal] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!active) return;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, target, duration]);
  return <span>{val.toLocaleString()}{suffix}</span>;
}

// ── Course ticker ─────────────────────────────────────────────────────────────
function Ticker({ darkMode }) {
  const items = [
    'CS 2114 · Software Design', 'MATH 2224 · Multivariable Calc',
    'PHYS 2305 · Foundations of Physics', 'ECE 2504 · Intro Computer Engineering',
    'CS 3114 · Data Structures', 'BIOL 2104 · Biology Principles',
    'HIST 1015 · World History to 1500', 'CS 4664 · Machine Learning',
    'PSYC 1004 · Intro Psychology', 'MATH 2114 · Linear Algebra',
    'CS 4234 · Algorithms & Data Structures', 'ECE 3544 · Digital Design',
  ];
  const doubled = [...items, ...items];
  const tickerBg     = darkMode ? 'rgba(8,8,8,0.78)'         : 'rgba(255,250,243,0.85)';
  const tickerBorder = darkMode ? 'rgba(255,255,255,0.05)'   : 'rgba(0,0,0,0.08)';
  const tickerSub    = darkMode ? 'rgba(255,255,255,0.18)'   : 'rgba(20,16,12,0.45)';
  return (
    <div style={{
      overflow: 'hidden',
      borderTop: `1px solid ${tickerBorder}`,
      borderBottom: `1px solid ${tickerBorder}`,
      padding: '14px 0', background: tickerBg,
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{ display: 'flex', animation: 'lp-ticker 42s linear infinite', width: 'max-content' }}>
        {doubled.map((item, i) => (
          <span key={i} style={{
            padding: '0 36px', fontSize: 11, fontWeight: 700,
            letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap',
            color: i % 5 === 0 ? '#861F41' : tickerSub,
          }}>
            {i % 2 === 0 ? '◆' : '·'} &nbsp;{item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Grade showcase (scroll-triggered bars) ────────────────────────────────────
function GradeShowcase({ darkMode }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const bars = [
    { grade: 'A',  pct: 28, color: '#4ade80' },
    { grade: 'A−', pct: 15, color: '#86efac' },
    { grade: 'B+', pct: 14, color: '#60a5fa' },
    { grade: 'B',  pct: 13, color: '#93c5fd' },
    { grade: 'B−', pct:  8, color: '#a5b4fc' },
    { grade: 'C+', pct:  7, color: '#fbbf24' },
    { grade: 'C',  pct:  6, color: '#fde68a' },
    { grade: 'F',  pct:  2, color: '#f87171' },
  ];

  const surface       = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.92)';
  const surfaceBorder = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(20,16,12,0.10)';
  const titleText     = darkMode ? 'white'                  : '#1a1210';
  const subtitleText  = darkMode ? 'rgba(255,255,255,0.28)' : 'rgba(20,16,12,0.45)';
  const labelText     = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(20,16,12,0.55)';
  const trackBg       = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(20,16,12,0.06)';
  const pctText       = darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(20,16,12,0.40)';

  return (
    <div ref={ref} style={{
      background: surface,
      border: `1px solid ${surfaceBorder}`,
      borderRadius: 16, padding: '28px 24px',
      boxShadow: darkMode ? 'none' : '0 4px 24px rgba(20,16,12,0.06)',
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{ marginBottom: 22 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#861F41', letterSpacing: '1.5px', textTransform: 'uppercase' }}>CS 2114</span>
        <div style={{ fontSize: 16, fontWeight: 800, color: titleText, marginTop: 6 }}>Software Design &amp; Data Structures</div>
        <div style={{ fontSize: 12, color: subtitleText, marginTop: 4 }}>Avg GPA 3.01 · All sections · 2001–2026</div>
      </div>
      {bars.map((b, i) => (
        <div key={b.grade} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
          <span style={{ width: 22, fontSize: 10, fontWeight: 800, color: labelText, textAlign: 'right', flexShrink: 0 }}>{b.grade}</span>
          <div style={{ flex: 1, height: 16, background: trackBg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: active ? `${Math.min(b.pct * 3, 100)}%` : '0%',
              background: b.color, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
              transition: `width 0.95s cubic-bezier(0.34, 1.1, 0.64, 1) ${i * 0.07}s`,
            }}>
              {b.pct >= 8 && <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(0,0,0,0.55)', whiteSpace: 'nowrap' }}>{b.pct}%</span>}
            </div>
          </div>
          <span style={{ width: 26, fontSize: 10, fontWeight: 700, color: pctText, textAlign: 'right', flexShrink: 0 }}>{b.pct}%</span>
        </div>
      ))}
    </div>
  );
}


// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage({ onEnter, darkMode }) {
  const statsRef  = useRef(null);
  const heroBgRef = useRef(null);
  const [statsActive, setStatsActive] = useState(false);

  injectStyles('lp-v4', LP_CSS);
  useReveal();

  // Stats intersection trigger
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStatsActive(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  // Cursor-tracking glow on hero
  useEffect(() => {
    const el = heroBgRef.current;
    if (!el) return;
    const move = e => {
      el.style.setProperty('--mx', `${e.clientX}px`);
      el.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);


  const stats = [
    { val: 790,  suffix: '',     label: 'Courses indexed'   },
    { val: 5,    suffix: ' yrs', label: 'Grade history'     },
    { val: 3968, suffix: '+',    label: 'Grade records'     },
    { val: 100,  suffix: '%',    label: 'Free to use'       },
  ];

  const features = [
    {
      n: '01', title: 'Real grade distributions',
      desc: 'Every A through F — per professor, per semester, back to 2020. Not estimated. Actual institutional data.',
    },
    {
      n: '02', title: 'RateMyProfessor built in',
      desc: 'Ratings, difficulty scores, and student tags baked directly into every section listing. No more switching tabs.',
    },
    {
      n: '03', title: 'Smart filters',
      desc: 'Filter by GPA range, credits, days offered, and Pathways concept. Find what fits your schedule and degree plan.',
    },
    {
      n: '04', title: 'Visual schedule builder',
      desc: 'Drag sections onto a weekly grid, catch conflicts in real time, and lock in your plan before registration day.',
    },
  ];

  const previewCourses = [
    { subj: 'CS',   num: '4664', title: 'Machine Learning',             gpa: 3.38 },
    { subj: 'CS',   num: '3114', title: 'Data Structures & Algorithms', gpa: 2.87 },
    { subj: 'MATH', num: '2224', title: 'Multivariable Calculus',       gpa: 2.78 },
    { subj: 'ECE',  num: '2504', title: 'Intro Computer Engineering',   gpa: 2.81 },
    { subj: 'PHYS', num: '2305', title: 'Foundations of Physics I',     gpa: 2.74 },
    { subj: 'CS',   num: '2114', title: 'Software Design',              gpa: 3.01 },
  ];

  // ── Theme palette ──────────────────────────────────────────────────────────
  // Centralizes the dark/light values so each section can read them by key.
  const t = darkMode ? {
    text:        'white',
    textSub:     'rgba(255,255,255,0.38)',
    textMute:    'rgba(255,255,255,0.28)',
    textFaint:   'rgba(255,255,255,0.18)',
    cardBg:      'rgba(255,255,255,0.03)',
    cardBgHov:   'rgba(134,31,65,0.06)',
    cardBorder:  'rgba(255,255,255,0.07)',
    sectionLine: 'rgba(255,255,255,0.08)',
    sectionLineSoft: 'rgba(255,255,255,0.06)',
    gradeBg:     '#0c0c0c',
    footerBg:    '#080808',
    btnGhostText:   'rgba(255,255,255,0.45)',
    btnGhostBorder: 'rgba(255,255,255,0.12)',
    btnGhostHovBd:  'rgba(255,255,255,0.30)',
    btnGhostHovTxt: 'white',
  } : {
    text:        '#1a1210',
    textSub:     'rgba(20,16,12,0.55)',
    textMute:    'rgba(20,16,12,0.45)',
    textFaint:   'rgba(20,16,12,0.35)',
    cardBg:      'rgba(255,255,255,0.85)',
    cardBgHov:   'rgba(134,31,65,0.08)',
    cardBorder:  'rgba(20,16,12,0.10)',
    sectionLine: 'rgba(20,16,12,0.12)',
    sectionLineSoft: 'rgba(20,16,12,0.08)',
    gradeBg:     'rgba(255,250,243,0.92)',
    footerBg:    'rgba(255,250,243,0.95)',
    btnGhostText:   'rgba(20,16,12,0.55)',
    btnGhostBorder: 'rgba(20,16,12,0.18)',
    btnGhostHovBd:  'rgba(20,16,12,0.40)',
    btnGhostHovTxt: '#1a1210',
  };

  const Btn = ({ label, primary, onClick }) => (
    <button onClick={onClick} style={{
      background: primary ? '#861F41' : 'transparent',
      color: primary ? 'white' : t.btnGhostText,
      border: primary ? 'none' : `1px solid ${t.btnGhostBorder}`,
      borderRadius: 9, padding: '13px 30px',
      fontWeight: 800, fontSize: 14, cursor: 'pointer',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: 'all 0.2s', letterSpacing: '0.2px',
    }}
    onMouseEnter={e => {
      if (primary) { e.currentTarget.style.background = '#a02450'; e.currentTarget.style.transform = 'translateY(-2px)'; }
      else { e.currentTarget.style.borderColor = t.btnGhostHovBd; e.currentTarget.style.color = t.btnGhostHovTxt; }
    }}
    onMouseLeave={e => {
      if (primary) { e.currentTarget.style.background = '#861F41'; e.currentTarget.style.transform = 'none'; }
      else { e.currentTarget.style.borderColor = t.btnGhostBorder; e.currentTarget.style.color = t.btnGhostText; }
    }}
    >{label}</button>
  );

  // Section background colors that shift with mode
  const gradeBg  = t.gradeBg;
  const footerBg = t.footerBg;

  return (
    <div style={{ position: 'relative', background: 'transparent', fontFamily: "'Plus Jakarta Sans', sans-serif", color: t.text }}>

      {/* ── PHOTO BACKGROUND (fixed) ─────────────────────────────────────────── */}
      <CampusBackground darkMode={darkMode} />

      {/* ── ALL CONTENT (above background) ── */}
      <div style={{ position: 'relative', zIndex: 1 }}>

      {/* ── TOP TICKER ───────────────────────────────────────────────────────── */}
      <Ticker darkMode={darkMode} />

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section ref={heroBgRef} style={{
        minHeight: '100vh', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        '--mx': '50%', '--my': '40%',
      }}>
        {/* Cursor glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(700px circle at var(--mx) var(--my), rgba(134,31,65,0.09) 0%, transparent 65%)',
        }} />
        {/* Subtle maroon ambient */}
        <div style={{
          position: 'absolute', top: '-15%', right: '-8%',
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(134,31,65,0.12) 0%, transparent 60%)',
          filter: 'blur(80px)', pointerEvents: 'none',
          animation: 'lp-breathe 9s ease-in-out infinite',
        }} />

        {/* Main hero text */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          maxWidth: 1200, margin: '0 auto', padding: '60px 64px 40px',
          width: '100%', boxSizing: 'border-box', position: 'relative', zIndex: 2,
        }}>
          {/* Label */}
          <div className="lp-hero-fade" style={{ marginBottom: 36 }}>
            <span style={{
              fontSize: 10, fontWeight: 900, letterSpacing: '2.5px',
              color: '#861F41', textTransform: 'uppercase',
            }}>Course Planning · Grade Data</span>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: 36 }}>
            <span className="lp-hero-clip">
              <span className="lp-hero-line d1" style={{
                fontSize: 'clamp(52px, 7.5vw, 104px)', fontWeight: 900,
                lineHeight: 0.98, letterSpacing: '-4px', color: t.text,
              }}>Pick classes</span>
            </span>
            <span className="lp-hero-clip">
              <span className="lp-hero-line d2" style={{
                fontSize: 'clamp(52px, 7.5vw, 104px)', fontWeight: 900,
                lineHeight: 0.98, letterSpacing: '-4px', color: '#861F41',
              }}>with real data.</span>
            </span>
          </div>

          {/* Subtitle */}
          <p className="lp-hero-fade d3" style={{
            fontSize: 17, color: t.textSub,
            lineHeight: 1.72, margin: '0 0 44px', fontWeight: 500, maxWidth: 460,
          }}>
            Grade distributions, RateMyProfessor ratings, and a visual schedule builder — all in one place.
          </p>

          {/* CTA */}
          <div className="lp-hero-fade d4" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Btn label="Browse courses →" primary onClick={onEnter} />
          </div>

          {/* Trust line */}
          <div className="lp-hero-fade d5" style={{
            marginTop: 28, fontSize: 12, color: t.textFaint,
            fontWeight: 600, display: 'flex', gap: 20, flexWrap: 'wrap',
          }}>
            <span>✓ Real institutional grade data</span>
            <span>✓ Free forever</span>
          </div>
        </div>

        {/* Course preview grid */}
        <div style={{
          position: 'relative', zIndex: 2,
          maxWidth: 1200, margin: '0 auto', width: '100%',
          padding: '0 64px 72px', boxSizing: 'border-box',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {previewCourses.map((c, i) => {
              const gpaCol = c.gpa >= 3.3 ? '#4ade80' : c.gpa >= 3.0 ? '#86efac' : c.gpa >= 2.7 ? '#fbbf24' : '#f87171';
              return (
                <div key={i} className={`lp-fade d${i + 1}`} style={{
                  background: t.cardBg,
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 10, padding: '14px 14px',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(134,31,65,0.5)'; e.currentTarget.style.background = t.cardBgHov; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.cardBorder; e.currentTarget.style.background = t.cardBg; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: '#861F41', letterSpacing: '0.8px' }}>{c.subj} {c.num}</span>
                    <span style={{ fontSize: 10, fontWeight: 900, color: gpaCol }}>{c.gpa.toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(20,16,12,0.80)', lineHeight: 1.35 }}>{c.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{ padding: '80px 64px', maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {stats.map((s, i) => (
            <div key={i} className={`lp-fade d${i + 1}`} style={{
              borderTop: `1px solid ${t.sectionLine}`,
              borderRight: i < 3 ? `1px solid ${t.sectionLineSoft}` : 'none',
              padding: '32px 36px 28px',
            }}>
              <div style={{
                fontSize: 'clamp(38px, 4.5vw, 62px)', fontWeight: 900,
                color: t.text, letterSpacing: '-2.5px', lineHeight: 1,
              }}>
                <AnimCounter target={s.val} suffix={s.suffix} active={statsActive} />
              </div>
              <div style={{
                fontSize: 11, color: t.textMute,
                fontWeight: 700, marginTop: 10,
                textTransform: 'uppercase', letterSpacing: '1px',
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 64px 120px', maxWidth: 1200, margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: 80, alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 100 }}>
            <span className="lp-clip">
              <span className="lp-line" style={{
                display: 'block', fontSize: 10, fontWeight: 900,
                color: '#861F41', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 18,
              }}>What you get</span>
            </span>
            <span className="lp-clip">
              <span className="lp-line d1" style={{
                display: 'block', fontSize: 'clamp(26px, 3vw, 40px)', fontWeight: 900,
                color: t.text, lineHeight: 1.1, letterSpacing: '-1.5px',
              }}>Everything you need to choose wisely.</span>
            </span>
          </div>
          <div>
            {features.map((f, i) => (
              <div key={i} className={`lp-fade d${i + 1}`} style={{
                borderTop: `1px solid ${t.sectionLineSoft}`,
                padding: '30px 0',
                display: 'grid', gridTemplateColumns: '36px 1fr', gap: 20,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 900,
                  color: t.textFaint,
                  letterSpacing: '0.5px', paddingTop: 3,
                }}>{f.n}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: t.text, marginBottom: 9 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: t.textSub, lineHeight: 1.75, fontWeight: 500 }}>{f.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${t.sectionLineSoft}` }} />
          </div>
        </div>
      </section>

      {/* ── GRADE DATA ───────────────────────────────────────────────────────── */}
      <section style={{ background: gradeBg, padding: '120px 64px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <span className="lp-clip">
              <span className="lp-line" style={{
                display: 'block', fontSize: 10, fontWeight: 900,
                color: '#861F41', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: 18,
              }}>Grade data</span>
            </span>
            <span className="lp-clip">
              <span className="lp-line d1" style={{
                display: 'block', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 900,
                color: t.text, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 22,
              }}>24 years of real grade records.</span>
            </span>
            <p className="lp-fade d2" style={{
              fontSize: 15, color: t.textSub,
              lineHeight: 1.8, margin: '0 0 36px', fontWeight: 500,
            }}>
              Every section, every professor, every semester since 2001. See exactly how hard a class has been graded — not a guess, not a review, actual institutional data.
            </p>
            <div className="lp-fade d3">
              <Btn label="Explore grade data →" onClick={onEnter} />
            </div>
          </div>
          <div className="lp-fade d2">
            <GradeShowcase darkMode={darkMode} />
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section style={{ padding: '160px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(134,31,65,0.08) 0%, transparent 70%)',
        }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          <span className="lp-clip">
            <span className="lp-line" style={{
              display: 'block', fontSize: 'clamp(40px, 6vw, 80px)',
              fontWeight: 900, color: t.text, letterSpacing: '-3px', lineHeight: 1.0,
            }}>Stop guessing.</span>
          </span>
          <span className="lp-clip">
            <span className="lp-line d1" style={{
              display: 'block', fontSize: 'clamp(40px, 6vw, 80px)',
              fontWeight: 900, color: '#861F41', letterSpacing: '-3px', lineHeight: 1.0,
              marginBottom: 32,
            }}>Start knowing.</span>
          </span>
          <p className="lp-fade d2" style={{
            fontSize: 16, color: t.textMute,
            marginBottom: 44, lineHeight: 1.7, fontWeight: 500,
          }}>
            Real grade data. Every course. Every professor.
          </p>
          <div className="lp-fade d3">
            <Btn label="Browse courses →" primary onClick={onEnter} />
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${t.sectionLineSoft}`,
        padding: '24px 64px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: footerBg,
      }}>
        <span style={{ fontWeight: 900, fontSize: 14, color: t.textSub, letterSpacing: '-0.5px' }}>Darvis</span>
        <span style={{ fontSize: 11, color: t.textFaint, fontWeight: 600 }}>
          Course planning · Grade data · Schedule builder
        </span>
      </footer>

      </div>{/* end content wrapper */}
    </div>
  );
}

