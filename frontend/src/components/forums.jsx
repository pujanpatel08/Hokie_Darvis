// Forums page — community discussion hub
const { useState } = React;

function ForumsPage({ darkMode = true, setPage }) {
  const bg       = "#080808";
  const cardBg   = "rgba(255,255,255,0.04)";
  const border   = "rgba(255,255,255,0.08)";
  const text      = "rgba(255,255,255,0.88)";
  const subtext   = "rgba(255,255,255,0.45)";
  const accent    = "#861F41";

  const categories = [
    {
      icon: "📚",
      title: "Course Reviews",
      description: "Share your experience with specific courses — workload, exams, what to expect.",
      posts: 142,
      tag: "course-reviews",
    },
    {
      icon: "👨‍🏫",
      title: "Professor Experiences",
      description: "Discuss teaching styles, office hours, and what it's actually like in their class.",
      posts: 98,
      tag: "professors",
    },
    {
      icon: "📅",
      title: "Schedule Planning",
      description: "Get advice on course loads, scheduling conflicts, and semester planning.",
      posts: 74,
      tag: "scheduling",
    },
    {
      icon: "🎓",
      title: "Major & Pathway Advice",
      description: "Questions about CS, ECE, Business, Pathways requirements, and degree planning.",
      posts: 61,
      tag: "majors",
    },
    {
      icon: "💡",
      title: "Study Tips & Resources",
      description: "Tutoring, study groups, useful websites, and how to survive hard courses.",
      posts: 53,
      tag: "study-tips",
    },
    {
      icon: "🔔",
      title: "Site Feedback",
      description: "Suggestions, bug reports, and ideas for HokieDarvis features.",
      posts: 19,
      tag: "feedback",
    },
  ];

  const recentPosts = [
    { title: "CS 3114 with Shaffer vs Lohm — grade outcomes match the vibe?", category: "Course Reviews", time: "2h ago", replies: 7 },
    { title: "Is MATH 2114 worth taking over the summer for credit?", category: "Schedule Planning", time: "5h ago", replies: 12 },
    { title: "ECE 2574 Data Structures — anyone have tips for the labs?", category: "Study Tips & Resources", time: "8h ago", replies: 4 },
    { title: "How accurate is the AI Chat for predicting my GPA impact?", category: "Site Feedback", time: "1d ago", replies: 9 },
    { title: "BIOL 1005 vs BIOL 1006 — which has better grade outcomes?", category: "Course Reviews", time: "1d ago", replies: 15 },
  ];

  return (
    <div style={{ background: bg, minHeight: "100vh", color: text, fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${border}`, padding: "48px 0 40px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px" }}>
                Forums
              </h1>
              <p style={{ margin: "10px 0 0", color: subtext, fontSize: 15 }}>
                Real talk about VT courses from students who've been there.
              </p>
            </div>
            <button
              style={{
                background: accent, color: "white", border: "none", borderRadius: 9,
                padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onClick={() => alert("Post creation coming soon — sign-in required.")}
            >
              + New Post
            </button>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 32, marginTop: 32, flexWrap: "wrap" }}>
            {[
              { label: "Posts", value: "447" },
              { label: "Active members", value: "312" },
              { label: "Courses discussed", value: "89" },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: subtext, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 48px 0", display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "start" }}>

        {/* Left: categories */}
        <div>
          <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: subtext, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Categories
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {categories.map(cat => (
              <button
                key={cat.tag}
                onClick={() => alert(`${cat.title} thread view coming soon.`)}
                style={{
                  background: cardBg, border: `1px solid ${border}`,
                  borderRadius: 12, padding: "18px 22px",
                  display: "flex", alignItems: "center", gap: 18,
                  cursor: "pointer", textAlign: "left",
                  transition: "background 0.15s, border-color 0.15s",
                  width: "100%",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = cardBg;
                  e.currentTarget.style.borderColor = border;
                }}
              >
                <span style={{ fontSize: 26, flexShrink: 0 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: text }}>{cat.title}</div>
                  <div style={{ fontSize: 13, color: subtext, marginTop: 3, lineHeight: 1.5 }}>{cat.description}</div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{cat.posts}</div>
                  <div style={{ fontSize: 11, color: subtext }}>posts</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: recent activity */}
        <div>
          <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: subtext, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Recent posts
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentPosts.map((post, i) => (
              <button
                key={i}
                onClick={() => alert("Thread view coming soon.")}
                style={{
                  background: cardBg, border: `1px solid ${border}`,
                  borderRadius: 10, padding: "14px 16px",
                  textAlign: "left", cursor: "pointer", width: "100%",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => e.currentTarget.style.background = cardBg}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: text, lineHeight: 1.45 }}>{post.title}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: accent, fontWeight: 600 }}>{post.category}</span>
                  <span style={{ fontSize: 11, color: subtext }}>{post.time}</span>
                  <span style={{ fontSize: 11, color: subtext, marginLeft: "auto" }}>{post.replies} replies</span>
                </div>
              </button>
            ))}
          </div>

          {/* AI Chat CTA */}
          <div style={{
            marginTop: 24, background: `${accent}18`, border: `1px solid ${accent}44`,
            borderRadius: 12, padding: "18px 20px",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "white", marginBottom: 6 }}>
              Looking for grade data?
            </div>
            <div style={{ fontSize: 13, color: subtext, lineHeight: 1.55, marginBottom: 14 }}>
              The AI Chat can pull historical grade distributions for any VT course or instructor instantly.
            </div>
            <button
              onClick={() => setPage && setPage("chatbot")}
              style={{
                background: accent, color: "white", border: "none",
                borderRadius: 7, padding: "8px 16px", fontWeight: 700, fontSize: 13,
                cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Open AI Chat →
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { ForumsPage });
