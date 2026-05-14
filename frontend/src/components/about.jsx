// About Us page — static
export default function AboutPage({ darkMode, setPage }) {
  const dm = darkMode;
  const colors = {
    bg:     dm ? "#080808" : "#f7f4f0",
    text:   dm ? "#f0edf3" : "#1c1a1e",
    sub:    dm ? "rgba(255,255,255,0.5)"  : "#75787b",
    border: dm ? "rgba(255,255,255,0.08)" : "#e5e0ea",
    card:   dm ? "#141414" : "#ffffff",
    accent: "#861F41",
  };

  const features = [
    {
      icon: "📊",
      title: "Real grade data",
      desc: "Historical grade distributions pulled from Virginia Tech's public records — every letter grade, every semester, going back years.",
    },
    {
      icon: "⭐",
      title: "Rate My Professor scores",
      desc: "RMP ratings, difficulty scores, and student reviews pulled directly from the source and matched to VT instructors.",
    },
    {
      icon: "🗓️",
      title: "Live Fall 2026 sections",
      desc: "Actual timetable data scraped from the VT course catalog — real CRNs, meeting times, seat counts, and locations.",
    },
    {
      icon: "🧠",
      title: "Darvis Chatbot",
      desc: "Ask anything about a course, an instructor, or your schedule. Darvis answers with data, not guesses.",
    },
    {
      icon: "📅",
      title: "Schedule Builder",
      desc: "Build your semester visually. Add sections, spot conflicts, and see your week laid out before you commit.",
    },
    {
      icon: "💬",
      title: "Forums",
      desc: "Talk to other Hokies about courses, professors, and campus life. Real conversations, not rate-limited Reddit threads.",
    },
  ];

  const team = [
    {
      name: "Pujan Patel",
      role: "Founder & Developer",
      bio: "CS + Entrepreneurship, Virginia Tech '27. Built Darvis to make course planning less of a puzzle.",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bg,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #6b1833 0%, #861F41 60%, #a0253c 100%)",
        padding: "64px 64px 56px",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🦃</div>
          <h1 style={{
            margin: "0 0 14px", fontSize: 36, fontWeight: 900,
            color: "white", letterSpacing: "-0.5px", lineHeight: 1.15,
          }}>
            Built for Hokies, by a Hokie
          </h1>
          <p style={{
            margin: 0, fontSize: 17, color: "rgba(255,255,255,0.75)",
            fontWeight: 500, lineHeight: 1.6,
          }}>
            Darvis started as a frustration. Picking courses at VT meant
            bouncing between Hokie SPA, Rate My Professor, and a spreadsheet.
            We put it all in one place.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 64px" }}>

        {/* What Darvis is */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{
            margin: "0 0 16px", fontSize: 22, fontWeight: 900,
            color: colors.text, letterSpacing: "-0.3px",
          }}>
            What is Darvis?
          </h2>
          <p style={{
            margin: "0 0 14px", fontSize: 16, color: colors.sub,
            lineHeight: 1.7, fontWeight: 500,
          }}>
            Darvis is a course planning tool built specifically for Virginia Tech students.
            It combines historical grade data, Rate My Professor scores, live section
            information, and an AI chatbot into a single interface.
          </p>
          <p style={{
            margin: 0, fontSize: 16, color: colors.sub,
            lineHeight: 1.7, fontWeight: 500,
          }}>
            The goal is simple: you should be able to answer "should I take this course
            with this professor?" without opening five browser tabs.
          </p>
        </section>

        {/* Features grid */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{
            margin: "0 0 24px", fontSize: 22, fontWeight: 900,
            color: colors.text, letterSpacing: "-0.3px",
          }}>
            What's inside
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 16,
          }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: colors.card,
                border: `1.5px solid ${colors.border}`,
                borderRadius: 16,
                padding: "22px 24px",
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <div style={{
                  fontSize: 15, fontWeight: 800, color: colors.text,
                  marginBottom: 8, lineHeight: 1.3,
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontSize: 13, color: colors.sub,
                  lineHeight: 1.65, fontWeight: 500,
                }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section style={{
          marginBottom: 64,
          background: colors.card,
          border: `1.5px solid ${colors.border}`,
          borderRadius: 20,
          padding: "28px 32px",
        }}>
          <h2 style={{
            margin: "0 0 16px", fontSize: 22, fontWeight: 900,
            color: colors.text, letterSpacing: "-0.3px",
          }}>
            Data sources
          </h2>
          {[
            ["Grade distributions", "Virginia Tech's publicly posted grade data (UDC Reports)"],
            ["Rate My Professor", "Scraped and matched to VT instructors by name"],
            ["Fall 2026 timetable", "Virginia Tech's Banner course timetable"],
            ["Course catalog",     "VT's official course descriptions and pathways"],
          ].map(([source, desc]) => (
            <div key={source} style={{
              display: "flex", gap: 20,
              padding: "12px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}>
              <div style={{
                fontWeight: 800, fontSize: 14, color: colors.text,
                minWidth: 180, flexShrink: 0,
              }}>
                {source}
              </div>
              <div style={{ fontSize: 14, color: colors.sub, fontWeight: 500 }}>
                {desc}
              </div>
            </div>
          ))}
          <p style={{
            margin: "16px 0 0", fontSize: 13, color: colors.sub,
            fontWeight: 500, lineHeight: 1.6,
          }}>
            All data is used for educational and informational purposes. Darvis
            is a student project and is not affiliated with Virginia Tech or
            Rate My Professors.
          </p>
        </section>

        {/* Team */}
        <section style={{ marginBottom: 64 }}>
          <h2 style={{
            margin: "0 0 24px", fontSize: 22, fontWeight: 900,
            color: colors.text, letterSpacing: "-0.3px",
          }}>
            Team
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {team.map(member => (
              <div key={member.name} style={{
                display: "flex", alignItems: "center", gap: 20,
                background: colors.card,
                border: `1.5px solid ${colors.border}`,
                borderRadius: 16,
                padding: "20px 24px",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: "linear-gradient(135deg, #6b1833 0%, #861F41 55%, #b03060 100%)",
                  color: "white", fontWeight: 900, fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {member.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: colors.text, marginBottom: 3 }}>
                    {member.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent, marginBottom: 6 }}>
                    {member.role}
                  </div>
                  <div style={{ fontSize: 13, color: colors.sub, fontWeight: 500, lineHeight: 1.5 }}>
                    {member.bio}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: "center" }}>
          <div style={{
            background: "linear-gradient(135deg, #6b1833 0%, #861F41 60%, #a0253c 100%)",
            borderRadius: 20,
            padding: "40px 32px",
          }}>
            <h2 style={{
              margin: "0 0 12px", fontSize: 24, fontWeight: 900,
              color: "white", letterSpacing: "-0.3px",
            }}>
              Ready to plan smarter?
            </h2>
            <p style={{
              margin: "0 0 24px", fontSize: 15,
              color: "rgba(255,255,255,0.72)", fontWeight: 500,
            }}>
              Search courses, explore instructors, and build your Fall 2026 schedule.
            </p>
            <button
              onClick={() => setPage("search")}
              style={{
                background: "white", color: "#861F41",
                border: "none", borderRadius: 10,
                padding: "12px 28px",
                fontWeight: 800, fontSize: 15,
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              Browse Courses
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
