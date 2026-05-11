// Schedule Builder component
import { useState, useMemo } from "react";
import { MOCK } from "../mock-data.js";

const DAYS = ["Mon","Tue","Wed","Thu","Fri"];
const DAY_MAP = { "M":"Mon","T":"Tue","W":"Wed","R":"Thu","F":"Fri" };
const START_HOUR = 8;
const END_HOUR = 22;
const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;

const COURSE_COLORS = [
  { bg:"#fde8ee", border:"#861F41", text:"#861F41" },
  { bg:"#e8f0fe", border:"#1a4480", text:"#1a4480" },
  { bg:"#e8fdf0", border:"#1a7a38", text:"#1a7a38" },
  { bg:"#fef3c7", border:"#b45309", text:"#b45309" },
  { bg:"#f3e8ff", border:"#6b21a8", text:"#6b21a8" },
  { bg:"#fff1e8", border:"#c2410c", text:"#c2410c" },
  { bg:"#e8f8ff", border:"#0369a1", text:"#0369a1" },
];

function timeToMins(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minsToTop(mins) {
  return ((mins - START_HOUR * 60) / TOTAL_MINS) * 100;
}

function minsToPct(mins) {
  return (mins / TOTAL_MINS) * 100;
}

function formatTime(t) { return MOCK.formatTime(t); }

function hasConflict(sections) {
  for (let i = 0; i < sections.length; i++) {
    for (let j = i + 1; j < sections.length; j++) {
      const a = sections[i], b = sections[j];
      const sharedDay = a.days.some(d => b.days.includes(d));
      if (!sharedDay) continue;
      const aStart = timeToMins(a.startTime), aEnd = timeToMins(a.endTime);
      const bStart = timeToMins(b.startTime), bEnd = timeToMins(b.endTime);
      if (aStart < bEnd && bStart < aEnd) return [a.id, b.id];
    }
  }
  return null;
}

// ── Schedule Grid View ────────────────────────────────────────────
function ScheduleGrid({ sections, colorMap, darkMode, onRemove, onCourseClick }) {
  const colors = {
    bg: "#111111",
    border: "rgba(255,255,255,0.08)",
    text: "#f0edf3",
    sub: "rgba(255,255,255,0.38)",
    gridLine: "rgba(255,255,255,0.05)",
  };

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Group blocks by day
  const blocksByDay = {};
  DAYS.forEach(d => blocksByDay[d] = []);
  sections.forEach(sec => {
    sec.days.forEach(rawDay => {
      const day = DAY_MAP[rawDay];
      if (!day) return;
      blocksByDay[day].push(sec);
    });
  });

  const gridHeight = 680;
  const hourHeight = gridHeight / (END_HOUR - START_HOUR);

  return (
    <div style={{
      background: colors.bg, borderRadius: 16, border: `1.5px solid ${colors.border}`,
      overflow: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "56px repeat(5, 1fr)", borderBottom: `1.5px solid ${colors.border}` }}>
        <div style={{ padding: "10px 8px", borderRight: `1px solid ${colors.border}` }} />
        {DAYS.map(d => (
          <div key={d} style={{
            padding: "12px 8px", textAlign: "center",
            borderRight: `1px solid ${colors.border}`,
            fontWeight: 800, fontSize: 13, color: colors.text,
          }}>{d}</div>
        ))}
      </div>

      {/* Time grid */}
      <div style={{ display: "grid", gridTemplateColumns: "56px repeat(5, 1fr)", position: "relative" }}>
        {/* Hour labels */}
        <div style={{ borderRight: `1px solid ${colors.border}` }}>
          {hours.map(h => (
            <div key={h} style={{
              height: hourHeight, display: "flex", alignItems: "flex-start", justifyContent: "flex-end",
              paddingRight: 8, paddingTop: 2,
              borderBottom: `1px solid ${colors.gridLine}`,
              fontSize: 10, color: colors.sub, fontWeight: 600,
            }}>
              {h > 12 ? `${h-12}PM` : h === 12 ? "12PM" : `${h}AM`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map(day => (
          <div key={day} style={{ borderRight: `1px solid ${colors.border}`, position: "relative", height: gridHeight }}>
            {/* Hour lines */}
            {hours.map(h => (
              <div key={h} style={{
                position: "absolute", top: (h - START_HOUR) * hourHeight,
                left: 0, right: 0, height: 1,
                background: colors.gridLine,
              }} />
            ))}
            {/* Half-hour lines */}
            {hours.map(h => (
              <div key={`h${h}`} style={{
                position: "absolute", top: (h - START_HOUR) * hourHeight + hourHeight / 2,
                left: 0, right: 0, height: 1,
                background: colors.gridLine, opacity: 0.5,
                borderTop: `1px dashed ${colors.gridLine}`,
              }} />
            ))}
            {/* Course blocks */}
            {blocksByDay[day].map(sec => {
              const startMins = timeToMins(sec.startTime) - START_HOUR * 60;
              const endMins = timeToMins(sec.endTime) - START_HOUR * 60;
              const top = (startMins / (TOTAL_MINS)) * gridHeight;
              const height = Math.max(((endMins - startMins) / TOTAL_MINS) * gridHeight, 24);
              const course = MOCK.getCourse(sec.courseId);
              const colIdx = colorMap[sec.courseId] || 0;
              const col = COURSE_COLORS[colIdx % COURSE_COLORS.length];
              return (
                <div key={sec.id + day}
                  onClick={() => onCourseClick && onCourseClick(course)}
                  style={{
                    position: "absolute", left: 3, right: 3, top, height,
                    background: col.bg, border: `2px solid ${col.border}`,
                    borderRadius: 8, padding: "4px 7px", overflow: "hidden",
                    cursor: "pointer", zIndex: 2,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 11, color: col.text, lineHeight: 1.2 }}>
                    {course?.subject} {course?.number}
                  </div>
                  {height > 36 && (
                    <div style={{ fontSize: 10, color: col.text, opacity: 0.8, lineHeight: 1.2 }}>
                      {formatTime(sec.startTime)}
                    </div>
                  )}
                  {height > 52 && (
                    <div style={{ fontSize: 10, color: col.text, opacity: 0.7, lineHeight: 1.2 }}>
                      {sec.location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Schedule List View ────────────────────────────────────────────
function ScheduleList({ sections, colorMap, darkMode, onRemove, onCourseClick, onProfClick }) {
  const colors = {
    bg: "#111111",
    border: "rgba(255,255,255,0.08)",
    text: "#f0edf3",
    sub: "rgba(255,255,255,0.38)",
  };
  const totalCredits = sections.reduce((s, sec) => {
    const c = MOCK.getCourse(sec.courseId);
    return s + (c ? c.credits : 0);
  }, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 20px", background: "rgba(134,31,65,0.12)",
        borderRadius: 12, border: `1.5px solid rgba(134,31,65,0.4)`,
      }}>
        <span style={{ fontWeight: 700, color: "#861F41", fontSize: 14 }}>Total Credits</span>
        <span style={{ fontWeight: 800, color: "#861F41", fontSize: 22 }}>{totalCredits} cr</span>
      </div>

      {sections.map(sec => {
        const course = MOCK.getCourse(sec.courseId);
        const prof = MOCK.getProf(sec.profId);
        const colIdx = colorMap[sec.courseId] || 0;
        const col = COURSE_COLORS[colIdx % COURSE_COLORS.length];
        return (
          <div key={sec.id} style={{
            background: colors.bg, border: `1.5px solid ${colors.border}`,
            borderRadius: 14, overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ height: 5, background: col.border }} />
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ background: col.border, color: "white", borderRadius: 7, padding: "3px 10px", fontWeight: 800, fontSize: 12 }}>
                    {course?.subject} {course?.number}
                  </span>
                  <span style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: 12, padding: "3px 8px", borderRadius: 7 }}>
                    {course?.credits} cr
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: colors.sub }}>CRN: {sec.crn}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 15, color: colors.text, marginBottom: 6, cursor: "pointer" }}
                  onClick={() => onCourseClick(course)}
                >{course?.title}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 13, color: colors.sub, flexWrap: "wrap" }}>
                  <span>🕐 {sec.days.map(d => DAY_MAP[d] || d).join(", ")} · {formatTime(sec.startTime)} – {formatTime(sec.endTime)}</span>
                  <span>📍 {sec.location}</span>
                  {prof && (
                    <button onClick={() => onProfClick(prof)} style={{
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      color: "#861F41", fontWeight: 600, fontSize: 13,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>👤 {prof.name}</button>
                  )}
                </div>
              </div>
              <button onClick={() => onRemove(sec.id)} style={{
                background: "rgba(192,57,43,0.18)", color: "#f87171", border: "1.5px solid rgba(248,113,113,0.2)",
                borderRadius: 8, padding: "7px 14px", cursor: "pointer",
                fontWeight: 700, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif",
                flexShrink: 0,
              }}>Remove</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Schedule Builder Page ─────────────────────────────────────────
function ScheduleBuilder({ darkMode, schedule, onAdd, onRemove, onCourseClick, onProfClick, setPage }) {
  const [view, setView] = useState("grid");
  const dm = darkMode;
  const colors = {
    bg: "#0a0a0a",
    text: "#f0edf3",
    sub: "rgba(255,255,255,0.38)",
    border: "rgba(255,255,255,0.08)",
  };

  const sections = schedule.map(id => MOCK.sections.find(s => s.id === id)).filter(Boolean);
  const courseIds = [...new Set(sections.map(s => s.courseId))];
  const colorMap = {};
  courseIds.forEach((id, i) => colorMap[id] = i);

  const conflict = hasConflict(sections);

  return (
    <div style={{ background: colors.bg, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "32px 24px 28px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <h1 style={{ margin: "0 0 4px", color: "white", fontWeight: 800, fontSize: 26 }}>Schedule Builder</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.38)", fontSize: 14 }}>
            Fall 2025 · {sections.length} section{sections.length !== 1 ? "s" : ""} · {courseIds.length} course{courseIds.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px" }}>
        {/* Conflict alert */}
        {conflict && (
          <div style={{
            background: "rgba(192,57,43,0.12)", border: "1.5px solid rgba(248,113,113,0.3)", borderRadius: 12,
            padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 800, color: "#f87171", fontSize: 14 }}>Schedule Conflict Detected</div>
              <div style={{ color: "rgba(248,113,113,0.8)", fontSize: 13 }}>Two or more of your sections overlap. Please remove a conflicting section.</div>
            </div>
          </div>
        )}

        {sections.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: colors.sub }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: colors.text, marginBottom: 8 }}>Your schedule is empty</div>
            <div style={{ fontSize: 15, marginBottom: 24 }}>Browse courses and add sections to build your schedule</div>
            <button onClick={() => setPage("search")} style={{
              background: "#861F41", color: "white", border: "none", borderRadius: 12,
              padding: "12px 28px", fontWeight: 800, fontSize: 15, cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>Browse Courses →</button>
          </div>
        ) : (
          <>
            {/* View toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[["grid","📅 Weekly Grid"],["list","📋 List View"]].map(([v, label]) => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: view === v ? "#861F41" : "#111111",
                  color: view === v ? "white" : colors.text,
                  border: `1.5px solid ${view === v ? "#861F41" : colors.border}`,
                  borderRadius: 9, padding: "8px 18px", cursor: "pointer",
                  fontWeight: 700, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>{label}</button>
              ))}
            </div>

            {view === "grid" ? (
              <ScheduleGrid sections={sections} colorMap={colorMap} darkMode={dm} onRemove={onRemove} onCourseClick={onCourseClick} />
            ) : (
              <ScheduleList sections={sections} colorMap={colorMap} darkMode={dm} onRemove={onRemove} onCourseClick={onCourseClick} onProfClick={onProfClick} />
            )}
          </>
        )}

      </div>
    </div>
  );
}

export default ScheduleBuilder;
