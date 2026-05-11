// Dashboard + Professor Profile components
import { useState } from "react";
import { MOCK } from "../mock-data.js";
import { StarRating } from "./nav-auth.jsx";
import { GpaBadge, GradeGrid } from "./courses.jsx";

const COURSE_COLORS = [
  { bg:"#fde8ee", border:"#861F41", text:"#861F41" },
  { bg:"#e8f0fe", border:"#1a4480", text:"#1a4480" },
  { bg:"#e8fdf0", border:"#1a7a38", text:"#1a7a38" },
  { bg:"#fef3c7", border:"#b45309", text:"#b45309" },
  { bg:"#f3e8ff", border:"#6b21a8", text:"#6b21a8" },
  { bg:"#fff1e8", border:"#c2410c", text:"#c2410c" },
  { bg:"#e8f8ff", border:"#0369a1", text:"#0369a1" },
];

// ── Stat Card ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, darkMode }) {
  const dm = darkMode;
  return (
    <div style={{
      background: dm ? "#221e27" : "white",
      border: `1.5px solid ${dm ? "#3d3050" : "#e8e4ee"}`,
      borderRadius: 16, padding: "20px 24px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: dm ? "#998ba8" : "#75787b", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent || (dm ? "#f0edf3" : "#1c1a1e"), lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: dm ? "#998ba8" : "#75787b", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────
function Dashboard({ user, schedule, darkMode, onCourseClick, onProfClick, onRemove, setPage }) {
  const dm = darkMode;
  const colors = {
    bg: dm ? "#16131a" : "#f8f7f5",
    text: dm ? "#f0edf3" : "#1c1a1e",
    sub: dm ? "#998ba8" : "#75787b",
    border: dm ? "#3d3050" : "#e5e0ea",
    card: dm ? "#221e27" : "white",
  };

  const sections = schedule.map(id => MOCK.sections.find(s => s.id === id)).filter(Boolean);
  const courseIds = [...new Set(sections.map(s => s.courseId))];
  const totalCredits = courseIds.reduce((s, id) => {
    const c = MOCK.getCourse(id); return s + (c ? c.credits : 0);
  }, 0);
  const avgGpa = courseIds.length
    ? (courseIds.reduce((s, id) => { const c = MOCK.getCourse(id); return s + (c ? c.avgGpa : 0); }, 0) / courseIds.length).toFixed(2)
    : "—";

  const colorMap = {};
  courseIds.forEach((id, i) => colorMap[id] = i);

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #6b1833 0%, #861F41 60%, #a02850 100%)", padding: "36px 24px 32px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#f0c050",
              color: "#861F41", fontWeight: 900, fontSize: 22,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid rgba(255,255,255,0.3)",
            }}>{user?.name?.charAt(0) || "?"}</div>
            <div>
              <h1 style={{ margin: 0, color: "white", fontWeight: 800, fontSize: 24 }}>
                Welcome back, {user?.name?.split(" ")[0]}!
              </h1>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 2 }}>
                {user?.email} · PID: {user?.pid}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          <StatCard label="Enrolled Courses" value={courseIds.length} sub="Fall 2025" darkMode={dm} />
          <StatCard label="Total Credits" value={totalCredits} sub={totalCredits >= 12 ? "Full-time student" : "Part-time"} accent={totalCredits >= 12 ? "#1a7a38" : "#b45309"} darkMode={dm} />
          <StatCard label="Projected Avg GPA" value={avgGpa} sub="Based on historical data" accent={avgGpa !== "—" && parseFloat(avgGpa) >= 3.0 ? "#1a7a38" : "#b45309"} darkMode={dm} />
          <StatCard label="Term" value="Fall 2025" sub="Registration open" darkMode={dm} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "flex-start" }}>
          {/* Enrolled courses */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.text }}>My Courses</h2>
              <button onClick={() => setPage("schedule")} style={{
                background: "none", border: `1.5px solid ${colors.border}`, borderRadius: 9,
                padding: "6px 14px", cursor: "pointer", color: "#861F41",
                fontWeight: 700, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>View Schedule →</button>
            </div>

            {sections.length === 0 ? (
              <div style={{
                background: colors.card, border: `1.5px solid ${colors.border}`,
                borderRadius: 16, padding: "48px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: colors.text, marginBottom: 8 }}>No courses added yet</div>
                <div style={{ color: colors.sub, fontSize: 14, marginBottom: 20 }}>Browse courses to add sections to your schedule</div>
                <button onClick={() => setPage("search")} style={{
                  background: "#861F41", color: "white", border: "none",
                  borderRadius: 10, padding: "10px 24px", cursor: "pointer",
                  fontWeight: 800, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>Browse Courses</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {sections.map(sec => {
                  const course = MOCK.getCourse(sec.courseId);
                  const prof = MOCK.getProf(sec.profId);
                  const colIdx = colorMap[sec.courseId] || 0;
                  const col = COURSE_COLORS[colIdx % COURSE_COLORS.length];
                  return (
                    <div key={sec.id} style={{
                      background: colors.card, border: `1.5px solid ${colors.border}`,
                      borderRadius: 14, overflow: "hidden",
                    }}>
                      <div style={{ height: 4, background: col.border }} />
                      <div style={{ padding: "16px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: 12, background: col.bg,
                          border: `2px solid ${col.border}`, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 900, fontSize: 11, color: col.text, textAlign: "center", lineHeight: 1.2,
                        }}>
                          {course?.subject}<br/>{course?.number}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <button onClick={() => onCourseClick(course)} style={{
                            background: "none", border: "none", padding: 0, cursor: "pointer",
                            fontWeight: 800, fontSize: 15, color: colors.text, textAlign: "left",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}>{course?.title}</button>
                          <div style={{ display: "flex", gap: 12, marginTop: 5, fontSize: 13, color: colors.sub, flexWrap: "wrap" }}>
                            <span>🕐 {sec.days.join("")} {MOCK.formatTime(sec.startTime)}</span>
                            <span>📍 {sec.location}</span>
                            <span style={{ fontFamily: "monospace" }}>CRN {sec.crn}</span>
                            {prof && (
                              <button onClick={() => onProfClick(prof)} style={{
                                background: "none", border: "none", padding: 0, cursor: "pointer",
                                color: "#861F41", fontWeight: 600, fontSize: 13,
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                              }}>👤 {prof.name}</button>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                          <GpaBadge gpa={course?.avgGpa || 0} />
                          <button onClick={() => onRemove(sec.id)} style={{
                            background: "#fee2e2", color: "#c0392b", border: "none",
                            borderRadius: 7, padding: "4px 10px", cursor: "pointer",
                            fontWeight: 700, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}>Drop</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar: quick tips */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: colors.card, border: `1.5px solid ${colors.border}`,
              borderRadius: 16, padding: "20px",
            }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: colors.text }}>Credit Load Guide</h3>
              {[
                { range: "12–15 cr", label: "Full-time (typical)", color: "#1a7a38" },
                { range: "16–18 cr", label: "Heavy load", color: "#b45309" },
                { range: "< 12 cr", label: "Part-time", color: "#75787b" },
                { range: "> 18 cr", label: "Overload (needs approval)", color: "#c0392b" },
              ].map(item => (
                <div key={item.range} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: item.color }}>{item.range}</span>
                  <span style={{ color: colors.sub }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{
              background: "#fdf4f6", border: "1.5px solid #f5c0cc",
              borderRadius: 16, padding: "18px",
            }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#861F41", marginBottom: 6 }}>📅 Important Dates</div>
              {[
                ["Aug 25", "Fall 2025 classes begin"],
                ["Sep 8", "Last day to add/drop"],
                ["Oct 13", "Spring 2026 registration opens"],
                ["Dec 12", "Last day of classes"],
              ].map(([date, label]) => (
                <div key={date} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13 }}>
                  <span style={{ fontWeight: 800, color: "#861F41", minWidth: 50 }}>{date}</span>
                  <span style={{ color: "#5a3040" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Professor Profile ─────────────────────────────────────────────
export default function ProfessorProfile({ prof, darkMode, onCourseClick, onBack }) {
  const dm = darkMode;
  const colors = {
    bg: dm ? "#16131a" : "#f8f7f5",
    text: dm ? "#f0edf3" : "#1c1a1e",
    sub: dm ? "#998ba8" : "#75787b",
    border: dm ? "#3d3050" : "#e5e0ea",
    card: dm ? "#221e27" : "white",
  };

  const courses = MOCK.getProfCourses(prof.id);
  const sections = MOCK.getProfSections(prof.id);

  // Fake reviews
  const reviews = [
    { rating: 5, diff: 4, comment: `${prof.name.split(" ").pop()} is one of the best professors I've had at VT. Challenging but very rewarding.`, date: "Dec 2024", course: courses[0]?.subject + " " + courses[0]?.number },
    { rating: 4, diff: 3, comment: "Office hours are super helpful. Grades fairly and actually cares about students learning.", date: "May 2024", course: courses[0]?.subject + " " + courses[0]?.number },
    { rating: prof.rmpRating >= 4 ? 5 : 3, diff: prof.rmpDifficulty >= 4 ? 5 : 3, comment: prof.rmpRating >= 4 ? "Very knowledgeable and engaging lectures. Highly recommend." : "Material is dense and exams are tough. Make sure to go to office hours.", date: "Dec 2023", course: courses[1]?.subject + " " + courses[1]?.number || "" },
    { rating: 4, diff: 4, comment: "The workload is real but you come out of the class actually knowing the material.", date: "May 2023", course: courses[0]?.subject + " " + courses[0]?.number },
  ].filter(r => r.course);

  const ratingBar = (label, val, max = 5) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: colors.sub, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: colors.text }}>{val.toFixed(1)} / {max}</span>
      </div>
      <div style={{ height: 8, background: dm ? "#3d3050" : "#e5e0ea", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(val / max) * 100}%`, background: "#861F41", borderRadius: 4, transition: "width 0.5s" }} />
      </div>
    </div>
  );

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #6b1833 0%, #861F41 60%, #a02850 100%)", padding: "32px 24px 28px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <button onClick={onBack} style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
            color: "white", padding: "6px 14px", cursor: "pointer",
            fontWeight: 600, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: 16,
          }}>← Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#f0c050", color: "#861F41",
              fontWeight: 900, fontSize: 28,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "3px solid rgba(255,255,255,0.3)",
            }}>{prof.name.split(" ").pop().charAt(0)}</div>
            <div>
              <h1 style={{ margin: 0, color: "white", fontWeight: 800, fontSize: 24 }}>{prof.name}</h1>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, marginTop: 3 }}>
                Department of {prof.dept === "CS" ? "Computer Science" : prof.dept === "MATH" ? "Mathematics" : prof.dept === "ECE" ? "Electrical & Computer Engineering" : prof.dept === "BIOL" ? "Biological Sciences" : prof.dept === "HIST" ? "History" : prof.dept === "PSYC" ? "Psychology" : prof.dept === "PHYS" ? "Physics" : prof.dept}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, alignItems: "flex-start" }}>
          {/* Left: ratings card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: colors.card, border: `1.5px solid ${colors.border}`,
              borderRadius: 16, padding: "24px",
            }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 52, fontWeight: 900, color: "#861F41", lineHeight: 1 }}>{prof.rmpRating.toFixed(1)}</div>
                <StarRating rating={prof.rmpRating} size={18} />
                <div style={{ color: colors.sub, fontSize: 13, marginTop: 6 }}>Based on {prof.rmpCount} ratings</div>
                <div style={{ display: "inline-block", marginTop: 8, background: "#fdf4f6", border: "1px solid #f5c0cc", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: "#861F41" }}>
                  RateMyProfessors
                </div>
              </div>
              {ratingBar("Overall Quality", prof.rmpRating)}
              {ratingBar("Difficulty", prof.rmpDifficulty)}
              {ratingBar("Would Take Again", prof.rmpRating * 0.9)}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: colors.sub, textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Student Tags</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {prof.tags.map(t => (
                    <span key={t} style={{
                      background: dm ? "#3d3050" : "#f0edf8",
                      color: dm ? "#c8b8d8" : "#5a3a6a",
                      borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700,
                    }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div style={{
              background: colors.card, border: `1.5px solid ${colors.border}`,
              borderRadius: 16, padding: "20px",
            }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: colors.text }}>About</h3>
              <p style={{ margin: 0, fontSize: 13, color: colors.sub, lineHeight: 1.6 }}>{prof.bio}</p>
            </div>
          </div>

          {/* Right: courses + reviews */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Courses */}
            <div>
              <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, color: colors.text }}>Courses Taught</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                {courses.map(course => {
                  const secs = sections.filter(s => s.courseId === course.id);
                  return (
                    <button key={course.id} onClick={() => onCourseClick(course)} style={{
                      background: colors.card, border: `1.5px solid ${colors.border}`,
                      borderRadius: 14, padding: "16px", cursor: "pointer", textAlign: "left",
                      fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#861F41"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(134,31,65,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ background: "#861F41", color: "white", borderRadius: 7, padding: "3px 10px", fontWeight: 800, fontSize: 12 }}>
                          {course.subject} {course.number}
                        </span>
                        <GpaBadge gpa={course.avgGpa} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: colors.text, marginBottom: 4 }}>{course.title}</div>
                      <div style={{ fontSize: 12, color: colors.sub }}>{secs.length} section{secs.length !== 1 ? "s" : ""} this term</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grade distributions */}
            <div>
              <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, color: colors.text }}>Grade Distributions</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {courses.slice(0, 3).map(course => (
                  <div key={course.id} style={{
                    background: colors.card, border: `1.5px solid ${colors.border}`,
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: colors.text, marginBottom: 12 }}>
                      {course.subject} {course.number}: {course.title}
                    </div>
                    <GradeGrid dist={course.gradeDistribution} darkMode={dm} />
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            <div>
              <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, color: colors.text }}>Student Reviews</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {reviews.map((r, i) => (
                  <div key={i} style={{
                    background: colors.card, border: `1.5px solid ${colors.border}`,
                    borderRadius: 14, padding: "18px 20px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <StarRating rating={r.rating} size={14} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: colors.sub }}>Quality: {r.rating}/5</span>
                          </div>
                          <div style={{ fontSize: 12, color: colors.sub, marginTop: 2 }}>Difficulty: {r.diff}/5</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <span style={{ fontSize: 11, color: colors.sub }}>{r.date}</span>
                        {r.course && <span style={{ background: dm ? "#3d3050" : "#f0edf8", color: dm ? "#c8b8d8" : "#5a3a6a", borderRadius: 10, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{r.course}</span>}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: colors.text, lineHeight: 1.6, fontStyle: "italic" }}>"{r.comment}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

