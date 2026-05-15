// Browse Instructors page
import { useState, useEffect, useMemo } from "react";
import { API } from "../api.js";
import { GpaBadge } from "./courses.jsx";
import { StarRating } from "./nav-auth.jsx";
import ProfessorProfile from "./dashboard-prof.jsx";

const DEPT_NAMES = {
  CS:   "Computer Science",
  MATH: "Mathematics",
  ECE:  "Electrical & Computer Engineering",
  BIOL: "Biological Sciences",
  PHYS: "Physics",
  CHEM: "Chemistry",
  HIST: "History",
  PSYC: "Psychology",
  STAT: "Statistics",
  ACIS: "Accounting & Information Systems",
  ME:   "Mechanical Engineering",
  AOE:  "Aerospace & Ocean Engineering",
  CEE:  "Civil & Environmental Engineering",
  IE:   "Industrial & Systems Engineering",
  ESM:  "Engineering Science & Mechanics",
  ENGL: "English",
  SOC:  "Sociology",
  ECON: "Economics",
  MGT:  "Management",
  MKTG: "Marketing",
  FIN:  "Finance",
};

// ── Instructor Card ────────────────────────────────────────────────
function InstructorCard({ instr, darkMode, onOpen }) {
  const dm = darkMode;
  const colors = {
    bg:      dm ? "#141414" : "#ffffff",
    text:    dm ? "#f0edf3" : "#1c1a1e",
    sub:     dm ? "rgba(255,255,255,0.38)" : "#75787b",
    border:  dm ? "rgba(255,255,255,0.08)" : "#e5e0ea",
    tag:     dm ? "rgba(255,255,255,0.08)" : "rgba(134,31,65,0.09)",
    tagText: dm ? "rgba(255,255,255,0.7)" : "#861F41",
    meta:    dm ? "rgba(255,255,255,0.06)" : "#f4f4f4",
  };

  const initials = instr.name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map(n => n[0])
    .join("")
    .toUpperCase();

  const ratingColor =
    instr.rmpRating == null ? colors.sub :
    instr.rmpRating >= 4   ? "#1a7a38" :
    instr.rmpRating >= 3   ? "#b45309" : "#c0392b";

  return (
    <div
      onClick={() => onOpen(instr)}
      style={{
        background: colors.bg,
        border: `1.5px solid ${colors.border}`,
        borderRadius: 16,
        padding: "20px",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = dm
          ? "0 8px 24px rgba(0,0,0,0.4)"
          : "0 8px 24px rgba(0,0,0,0.1)";
        e.currentTarget.style.borderColor = "#861F41";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = colors.border;
      }}
    >
      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg, #6b1833 0%, #861F41 55%, #b03060 100%)",
          color: "white", fontWeight: 900, fontSize: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          letterSpacing: "-0.5px",
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: 15, color: colors.text,
            lineHeight: 1.25, marginBottom: 3,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {instr.name}
          </div>
          <div style={{ fontSize: 12, color: colors.sub, fontWeight: 600 }}>
            {instr.subjects.map(s => DEPT_NAMES[s] || s).join(" · ")}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {instr.avgGpa != null && <GpaBadge gpa={instr.avgGpa} darkMode={dm} />}

        {instr.rmpRating != null && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: colors.meta, borderRadius: 8, padding: "3px 8px",
          }}>
            <StarRating rating={instr.rmpRating} size={11} />
            <span style={{ fontSize: 12, fontWeight: 700, color: ratingColor }}>
              {instr.rmpRating.toFixed(1)}
            </span>
            {instr.rmpCount > 0 && (
              <span style={{ fontSize: 11, color: colors.sub }}>
                ({instr.rmpCount})
              </span>
            )}
          </div>
        )}

        <div style={{
          fontSize: 12, fontWeight: 600, color: colors.sub,
          background: colors.meta, borderRadius: 8, padding: "3px 8px",
        }}>
          {instr.courseCount} {instr.courseCount === 1 ? "course" : "courses"}
        </div>
      </div>

      {/* Tags */}
      {instr.rmpTags && instr.rmpTags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {instr.rmpTags.slice(0, 3).map(tag => (
            <span key={tag} style={{
              fontSize: 11, fontWeight: 600,
              padding: "2px 8px", borderRadius: 6,
              background: colors.tag, color: colors.tagText,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {instr.rmpRating == null && (
        <div style={{ fontSize: 11, color: colors.sub, fontStyle: "italic" }}>
          No RMP data
        </div>
      )}
    </div>
  );
}

// ── Browse Instructors Page ────────────────────────────────────────
export default function InstructorsPage({ darkMode }) {
  const dm = darkMode;
  const colors = {
    bg:     dm ? "#080808" : "#f7f4f0",
    text:   dm ? "#f0edf3" : "#1c1a1e",
    sub:    dm ? "rgba(255,255,255,0.38)" : "#75787b",
    border: dm ? "rgba(255,255,255,0.08)" : "#e5e0ea",
    input:  dm ? "#141414" : "#ffffff",
    pill:   dm ? "#141414" : "#ffffff",
    filterBar: dm ? "rgba(12,12,12,0.95)" : "rgba(250,248,245,0.95)",
  };

  const PAGE_SIZE = 24;

  const [instructors, setInstructors]     = useState([]);
  const [loading, setLoading]             = useState(true);
  const [q, setQ]                         = useState("");
  const [subjectFilter, setSubjectFilter] = useState([]);
  const [sortBy, setSortBy]               = useState("name");
  const [currentPage, setCurrentPage]     = useState(1);
  const [selectedProf, setSelectedProf]   = useState(null);
  const [isMobile, setIsMobile]           = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    API.getInstructors()
      .then(data => { setInstructors(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Collect all distinct subjects present in the data
  const allSubjects = useMemo(() => {
    const s = new Set();
    instructors.forEach(i => i.subjects.forEach(sub => s.add(sub)));
    return [...s].sort();
  }, [instructors]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = instructors;

    if (q.trim()) {
      const lower = q.trim().toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(lower));
    }

    if (subjectFilter.length > 0) {
      result = result.filter(i =>
        i.subjects.some(s => subjectFilter.includes(s))
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === "gpa") {
        return (b.avgGpa ?? -1) - (a.avgGpa ?? -1);
      }
      if (sortBy === "rmp") {
        if (a.rmpRating == null && b.rmpRating == null) return a.name.localeCompare(b.name);
        if (a.rmpRating == null) return 1;
        if (b.rmpRating == null) return -1;
        return b.rmpRating - a.rmpRating;
      }
      return a.name.localeCompare(b.name);
    });
  }, [instructors, q, subjectFilter, sortBy]);

  const toggleSubject = sub => {
    setSubjectFilter(prev =>
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
    setCurrentPage(1);
  };

  // Reset to page 1 whenever search or sort changes
  const handleSearch = val => { setQ(val); setCurrentPage(1); };
  const handleSort   = val => { setSortBy(val); setCurrentPage(1); };

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const inputPad = isMobile ? "0 16px" : "0 64px";

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.bg,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Hero / Search header */}
      <div style={{
        background: "linear-gradient(135deg, #6b1833 0%, #861F41 60%, #a0253c 100%)",
        padding: isMobile ? "36px 16px 32px" : "48px 64px 40px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{
            margin: "0 0 8px", fontSize: isMobile ? 26 : 32,
            fontWeight: 900, color: "white", letterSpacing: "-0.5px",
          }}>
            Browse Instructors
          </h1>
          <p style={{ margin: "0 0 24px", fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
            {loading
              ? "Loading..."
              : `${instructors.length} instructor${instructors.length !== 1 ? "s" : ""} in the Darvis database`}
          </p>

          {/* Search input */}
          <div style={{ position: "relative", maxWidth: 480 }}>
            <svg
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.55 }}
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={q}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by last name..."
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 42, paddingRight: 16,
                paddingTop: 11, paddingBottom: 11,
                background: "rgba(255,255,255,0.15)",
                border: "1.5px solid rgba(255,255,255,0.25)",
                borderRadius: 10, color: "white",
                fontSize: 15, fontWeight: 500,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Sticky filter + sort bar */}
      <div style={{
        borderBottom: `1px solid ${colors.border}`,
        background: colors.filterBar,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        padding: isMobile ? "10px 16px" : "10px 64px",
        position: "sticky", top: 60, zIndex: 100,
        overflowX: "auto",
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center",
          gap: 8, flexWrap: isMobile ? "nowrap" : "wrap",
          minWidth: isMobile ? "max-content" : undefined,
        }}>
          {allSubjects.length > 0 && (
            <>
              <span style={{ fontSize: 11, fontWeight: 800, color: colors.sub, letterSpacing: "0.8px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Dept
              </span>
              {allSubjects.map(sub => (
                <button key={sub} onClick={() => toggleSubject(sub)} style={{
                  fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                  border: subjectFilter.includes(sub)
                    ? "1.5px solid #861F41"
                    : `1.5px solid ${colors.border}`,
                  background: subjectFilter.includes(sub) ? "rgba(134,31,65,0.15)" : "none",
                  color: subjectFilter.includes(sub) ? "#861F41" : colors.sub,
                  cursor: "pointer",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}>
                  {sub}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: colors.border, margin: "0 6px", flexShrink: 0 }} />
            </>
          )}

          <span style={{ fontSize: 11, fontWeight: 800, color: colors.sub, letterSpacing: "0.8px", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            Sort
          </span>
          {[["name","Name"],["gpa","Avg GPA"],["rmp","RMP Rating"]].map(([id, label]) => (
            <button key={id} onClick={() => handleSort(id)} style={{
              fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
              border: sortBy === id
                ? "1.5px solid #861F41"
                : `1.5px solid ${colors.border}`,
              background: sortBy === id ? "rgba(134,31,65,0.15)" : "none",
              color: sortBy === id ? "#861F41" : colors.sub,
              cursor: "pointer",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results grid */}
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: isMobile ? "24px 16px" : "32px 64px",
      }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <div style={{
              width: 32, height: 32,
              border: "3px solid rgba(134,31,65,0.3)",
              borderTopColor: "#861F41",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}/>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: colors.text, marginBottom: 6 }}>
              No instructors found
            </div>
            <div style={{ fontSize: 14, color: colors.sub }}>
              Try a different name or clear the department filter.
            </div>
          </div>
        ) : (
          <>
            {/* Result count */}
            <div style={{ fontSize: 13, color: colors.sub, fontWeight: 600, marginBottom: 20 }}>
              {filtered.length} instructor{filtered.length !== 1 ? "s" : ""}
              {q || subjectFilter.length > 0 ? " matching filters" : ""}
              {totalPages > 1 && ` · page ${currentPage} of ${totalPages}`}
            </div>

            {/* Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}>
              {paginated.map(instr => (
                <InstructorCard
                  key={instr.name}
                  instr={instr}
                  darkMode={dm}
                  onOpen={setSelectedProf}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, marginTop: 40,
              }}>
                <button
                  onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === 1}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", borderRadius: 10,
                    border: `1.5px solid ${colors.border}`,
                    background: "none",
                    color: currentPage === 1 ? colors.sub : colors.text,
                    fontWeight: 700, fontSize: 13,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    opacity: currentPage === 1 ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Prev
                </button>

                {/* Page number pills */}
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === "…" ? (
                        <span key={`ellipsis-${idx}`} style={{
                          padding: "6px 4px", fontSize: 13,
                          color: colors.sub, fontWeight: 600,
                          display: "flex", alignItems: "center",
                        }}>…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          style={{
                            width: 36, height: 36, borderRadius: 9,
                            border: p === currentPage ? "1.5px solid #861F41" : `1.5px solid ${colors.border}`,
                            background: p === currentPage ? "rgba(134,31,65,0.15)" : "none",
                            color: p === currentPage ? "#861F41" : colors.sub,
                            fontWeight: p === currentPage ? 800 : 600,
                            fontSize: 13, cursor: "pointer",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: "all 0.15s",
                          }}
                        >
                          {p}
                        </button>
                      )
                    )
                  }
                </div>

                <button
                  onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === totalPages}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 18px", borderRadius: 10,
                    border: `1.5px solid ${colors.border}`,
                    background: "none",
                    color: currentPage === totalPages ? colors.sub : colors.text,
                    fontWeight: 700, fontSize: 13,
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    transition: "all 0.15s",
                  }}
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Professor modal overlay */}
      {selectedProf && (
        <ProfessorProfile
          prof={selectedProf}
          darkMode={dm}
          onClose={() => setSelectedProf(null)}
        />
      )}
    </div>
  );
}
