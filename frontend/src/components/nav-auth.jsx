// Nav component — dark minimal
const { useState } = React;

// StarRating stays here since courses.jsx uses it
function StarRating({ rating, max = 5, size = 14 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1, alignItems: "center" }}>
      {Array.from({ length: max }).map((_, i) => {
        const fill = i < Math.floor(rating) ? 1 : i < rating ? 0.5 : 0;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 16 16">
            <defs>
              <linearGradient id={`sg${i}${Math.round(rating * 10)}`}>
                <stop offset={`${fill * 100}%`} stopColor="#861F41" />
                <stop offset={`${fill * 100}%`} stopColor="#333" />
              </linearGradient>
            </defs>
            <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,12 3.5,15 5,9.5 1,6 6,6"
              fill={`url(#sg${i}${Math.round(rating * 10)})`} />
          </svg>
        );
      })}
    </span>
  );
}

function Nav({ page, setPage, schedule, darkMode = true, setDarkMode }) {
  const navLinks = [
    { id: "search",   label: "Browse Courses" },
    { id: "schedule", label: "Schedule Builder" },
    { id: "chatbot",  label: "AI Chat" },
    { id: "forums",   label: "Forums" },
    { id: "faqs",     label: "FAQs" },
  ];

  // Nav adapts: on landing page the campus image is behind it, elsewhere App bg applies
  const navBg     = darkMode ? "rgba(8,8,8,0.88)"   : "rgba(255,252,248,0.88)";
  const navBorder = darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const logoColor = darkMode ? "white" : "#1a1210";
  const linkActive  = darkMode ? "white" : "#1a1210";
  const linkDefault = darkMode ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)";
  const linkSoon    = darkMode ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.22)";
  const metaColor   = darkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.28)";

  // Sun icon (light mode) / Moon icon (dark mode)
  const ThemeIcon = () => darkMode ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 200,
      background: navBg,
      backdropFilter: "blur(18px)",
      WebkitBackdropFilter: "blur(18px)",
      borderBottom: `1px solid ${navBorder}`,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        padding: "0 64px", height: 60,
        display: "flex", alignItems: "center", gap: 0,
        boxSizing: "border-box",
      }}>
        {/* Logo */}
        <button onClick={() => setPage("landing")} style={{
          background: "none", border: "none", cursor: "pointer",
          padding: 0, marginRight: 48,
          display: "flex", alignItems: "center", gap: 0,
        }}>
          <span style={{
            fontWeight: 900, fontSize: 17, color: logoColor,
            letterSpacing: "-0.5px", transition: "color 0.3s",
          }}>
            Hokie<span style={{ color: "#861F41" }}>Darvis</span>
          </span>
        </button>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {navLinks.map(link => (
            <button key={link.id} onClick={() => setPage(link.id)} style={{
              background: "none", border: "none",
              color: page === link.id ? linkActive : link.soon ? linkSoon : linkDefault,
              padding: "6px 14px", cursor: "pointer",
              fontWeight: page === link.id ? 700 : 500,
              fontSize: 14,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: "color 0.15s",
              borderRadius: 7,
              position: "relative",
              display: "flex", alignItems: "center", gap: 7,
            }}
            onMouseEnter={e => {
              if (!link.soon || page === link.id) e.currentTarget.style.color = linkActive;
              else e.currentTarget.style.color = darkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = page === link.id ? linkActive : link.soon ? linkSoon : linkDefault;
            }}
            >
              {link.label}
              {link.soon && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.5px",
                  background: "rgba(134,31,65,0.25)", color: "#861F41",
                  borderRadius: 5, padding: "2px 5px", textTransform: "uppercase",
                }}>Soon</span>
              )}
              {link.id === "schedule" && schedule.length > 0 && (
                <span style={{
                  background: "#861F41", color: "white",
                  borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800,
                }}>{schedule.length}</span>
              )}
              {page === link.id && (
                <span style={{
                  position: "absolute", bottom: -1, left: "50%",
                  transform: "translateX(-50%)",
                  width: 20, height: 2, background: "#861F41", borderRadius: 2,
                }} />
              )}
            </button>
          ))}
        </div>

        {/* Right: theme toggle + year */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {setDarkMode && (
            <button
              onClick={() => setDarkMode(m => !m)}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: metaColor, padding: 6, borderRadius: 7,
                display: "flex", alignItems: "center",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = darkMode ? "white" : "#1a1210";
                e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = metaColor;
                e.currentTarget.style.background = "none";
              }}
            >
              <ThemeIcon />
            </button>
          )}
          <div style={{ fontSize: 11, color: metaColor, fontWeight: 600, letterSpacing: "0.5px" }}>
            VT · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </nav>
  );
}

// AuthModal kept for compatibility but not used in the main flow
function AuthModal({ onClose }) {
  return null;
}

Object.assign(window, { Nav, AuthModal, StarRating });
