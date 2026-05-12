// Chatbot page — full AI chat experience powered by the FastAPI backend
import { useState, useEffect, useRef, useCallback } from "react";
import { Chart, registerables } from "chart.js";
import { DARVIS_CONFIG } from "../config.js";

Chart.register(...registerables);

const CHAT_API = DARVIS_CONFIG.chatApiUrl;

const SUGGESTED = [
  "Which CS 3114 professor has the strongest grade outcomes?",
  "Show me CS electives with the highest GPA",
  "What 2000-level courses have the lowest F rate?",
  "Professor profile for Shaffer",
  "Which CS courses have the most grade data?",
];

// ── Input sanitization & NLP normalization ────────────────────────
// Cleans raw user input before it hits the backend:
//   1. Strips control characters and excessive whitespace
//   2. Caps length at 500 characters
//   3. Normalizes VT course codes (cs3114, cs-3114, CS3114 → CS 3114)
//   4. Title-cases common professor name patterns
function sanitizeInput(raw) {
  if (!raw) return "";
  // Strip non-printable control chars (except newline/tab which are valid in chat)
  let s = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  // Collapse runs of whitespace
  s = s.replace(/[ \t]+/g, " ").trim();
  // Cap length
  if (s.length > 500) s = s.slice(0, 500).trim();
  return s;
}

// Normalizes VT-specific shorthand:
//   "cs3114" or "cs-3114" or "CS3114" → "CS 3114"
//   "ece 2604" stays as-is
function normalizeCourseCode(s) {
  // Match 2-5 letters immediately followed (optional hyphen) by exactly 4 digits
  return s.replace(/\b([A-Za-z]{2,5})-?(\d{4})\b/g, (_, subj, num) => {
    return subj.toUpperCase() + " " + num;
  });
}

function normalizeInput(raw) {
  let s = sanitizeInput(raw);
  s = normalizeCourseCode(s);
  return s;
}

// ── Chart widget ──────────────────────────────────────────────────
function ChartWidget({ spec, darkMode }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !spec?.data?.length) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const ctx = canvasRef.current.getContext("2d");
    const { chart_type, x_key, y_key, orientation, data } = spec;
    const dm = darkMode;
    const gridColor  = dm ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    const tickColor  = dm ? "rgba(255,255,255,0.40)" : "rgba(0,0,0,0.45)";
    const tickFont   = { family: "'Plus Jakarta Sans', sans-serif", size: 11 };

    let config;

    if (chart_type === "bar") {
      const horizontal = orientation === "horizontal";
      config = {
        type: "bar",
        data: {
          labels: data.map(d => d[y_key]),
          datasets: [{
            data: data.map(d => d[x_key]),
            backgroundColor: "rgba(134,31,65,0.82)",
            borderColor: "#861F41",
            borderWidth: 1,
            borderRadius: 4,
          }],
        },
        options: {
          indexAxis: horizontal ? "y" : "x",
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` ${x_key}: ${ctx.parsed[horizontal ? "x" : "y"]}`,
              },
            },
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: tickColor, font: tickFont } },
            y: { grid: { color: gridColor }, ticks: { color: tickColor, font: tickFont } },
          },
        },
      };
    } else if (chart_type === "scatter") {
      config = {
        type: "scatter",
        data: {
          datasets: [{
            data: data.map(d => ({ x: d[x_key], y: d[y_key] })),
            backgroundColor: "rgba(134,31,65,0.75)",
            borderColor: "#861F41",
            pointRadius: 6,
            pointHoverRadius: 9,
          }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const d = data[ctx.dataIndex];
                  const label = d["Instructor"] || d["Course"] || "";
                  return ` ${label}  (${x_key}: ${ctx.parsed.x}, ${y_key}: ${ctx.parsed.y})`;
                },
              },
            },
          },
          scales: {
            x: {
              title: { display: true, text: x_key, color: tickColor, font: { size: 11 } },
              grid: { color: gridColor }, ticks: { color: tickColor, font: tickFont },
            },
            y: {
              title: { display: true, text: y_key, color: tickColor, font: { size: 11 } },
              grid: { color: gridColor }, ticks: { color: tickColor, font: tickFont },
            },
          },
        },
      };
    }

    if (config) chartRef.current = new Chart(ctx, config);
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [spec, darkMode]);

  if (!spec?.data?.length) return null;
  return (
    <div style={{
      marginTop: 14, borderRadius: 10, padding: "14px 16px",
      background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
      border: `1px solid ${darkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: "#861F41",
        textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 12,
      }}>{spec.title}</div>
      <canvas ref={canvasRef} />
      {spec.description && (
        <div style={{ fontSize: 11, marginTop: 8, color: darkMode ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)", fontStyle: "italic" }}>
          {spec.description}
        </div>
      )}
    </div>
  );
}

// ── Table widget ──────────────────────────────────────────────────
function TableWidget({ table, darkMode }) {
  if (!table?.rows?.length) return null;
  const dm = darkMode;
  const c = {
    border:    dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    headerBg:  dm ? "rgba(255,255,255,0.04)" : "#f0edf8",
    text:      dm ? "#f0edf3" : "#1a1210",
    sub:       dm ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.42)",
    rowAlt:    dm ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.018)",
  };

  const confidence = v => {
    if (v === "High")   return { color: "#16a34a", bg: "#dcfce7" };
    if (v === "Medium") return { color: "#b45309", bg: "#fef3c7" };
    return                      { color: "#c0392b", bg: "#fee2e2" };
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: "#861F41",
        textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 8,
      }}>{table.title}</div>
      <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${c.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <thead>
            <tr>
              {table.columns.map(col => (
                <th key={col} style={{
                  padding: "7px 10px", textAlign: "left",
                  fontSize: 10, fontWeight: 800, color: c.sub,
                  textTransform: "uppercase", letterSpacing: "0.5px",
                  background: c.headerBg,
                  borderBottom: `1px solid ${c.border}`,
                  whiteSpace: "nowrap",
                }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? c.rowAlt : "transparent", borderBottom: `1px solid ${c.border}` }}>
                {table.columns.map(col => {
                  const val = row[col];
                  const isConf = col === "Confidence Label" && val;
                  const conf = isConf ? confidence(val) : null;
                  return (
                    <td key={col} style={{ padding: "7px 10px", color: c.text, whiteSpace: "nowrap" }}>
                      {isConf ? (
                        <span style={{
                          background: conf.bg, color: conf.color,
                          borderRadius: 20, padding: "2px 8px",
                          fontSize: 11, fontWeight: 700,
                        }}>{val}</span>
                      ) : val != null ? String(val) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Bot message ───────────────────────────────────────────────────
function BotMessage({ msg, darkMode }) {
  const dm = darkMode;
  const [chartsOpen, setChartsOpen] = useState(false);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", maxWidth: "85%" }}>
      {/* Avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
        background: "#861F41", display: "flex", alignItems: "center", justifyContent: "center",
        marginTop: 2, overflow: "hidden",
      }}>
        <img src={darkMode ? "/logo.svg" : "/logo-light.svg"} alt="Darvis" style={{ width: 20, height: 20 }} />
      </div>

      <div style={{ flex: 1 }}>
        {/* Answer text */}
        <div style={{
          background: dm ? "rgba(255,255,255,0.04)" : "white",
          border: `1px solid ${dm ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          borderRadius: "4px 14px 14px 14px",
          padding: "14px 16px",
          color: dm ? "#f0edf3" : "#1a1210",
          fontSize: 14, lineHeight: 1.65, fontWeight: 450,
        }}>
          {msg.answer}
        </div>

        {/* Warnings */}
        {msg.warnings?.length > 0 && (
          <div style={{
            marginTop: 6, fontSize: 11, color: dm ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.38)",
            fontStyle: "italic", lineHeight: 1.5,
          }}>
            {msg.warnings[0]}
          </div>
        )}

        {/* Tables */}
        {msg.tables?.map((t, i) => <TableWidget key={i} table={t} darkMode={dm} />)}

        {/* Charts toggle */}
        {msg.charts?.filter(c => c.data?.length).length > 0 && (
          <div style={{ marginTop: 10 }}>
            <button
              onClick={() => setChartsOpen(o => !o)}
              style={{
                background: "none", border: `1px solid ${dm ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                borderRadius: 20, padding: "4px 14px",
                color: dm ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
                fontSize: 11, fontWeight: 700, cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                letterSpacing: "0.3px",
              }}
            >
              {chartsOpen ? "Hide" : "Show"} charts · {msg.charts.filter(c => c.data?.length).length}
            </button>
            {chartsOpen && msg.charts.map((chart, i) => (
              <ChartWidget key={i} spec={chart} darkMode={dm} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main chatbot page ─────────────────────────────────────────────
export default function ChatbotPage({ darkMode }) {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [serverDown,  setServerDown]  = useState(false);
  const [useRecency,  setUseRecency]  = useState(true);
  const [minStudents, setMinStudents] = useState(30);
  const [topN,        setTopN]        = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const dm = darkMode;

  const c = dm ? {
    bg:      "#0a0a0a",
    surface: "rgba(255,255,255,0.03)",
    border:  "rgba(255,255,255,0.08)",
    text:    "#f0edf3",
    sub:     "rgba(255,255,255,0.40)",
    faint:   "rgba(255,255,255,0.20)",
    inputBg: "rgba(255,255,255,0.05)",
  } : {
    bg:      "#fbf8f4",
    surface: "rgba(0,0,0,0.025)",
    border:  "rgba(0,0,0,0.09)",
    text:    "#1a1210",
    sub:     "rgba(0,0,0,0.50)",
    faint:   "rgba(0,0,0,0.28)",
    inputBg: "white",
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (questionOverride) => {
    const question = normalizeInput(questionOverride || input);
    if (!question || loading) return;

    setInput("");
    setServerDown(false);
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    try {
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          use_recency: useRecency,
          min_students: minStudents,
          top_n: topN,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "bot", ...data }]);
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === "AbortError";
      const isNetwork = isTimeout || err.message === "Failed to fetch";
      setServerDown(isNetwork);
      setMessages(prev => [...prev, {
        role: "bot",
        answer: isTimeout
          ? "The request timed out. If the server was inactive, Render free tier takes ~30 seconds to start — try again in a moment."
          : isNetwork
          ? "Couldn't reach the server. Check your connection or try again in ~30 seconds."
          : `Something went wrong: ${err.message}`,
        tables: [], charts: [], warnings: [],
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, useRecency, minStudents, topN]);

  const handleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const isEmpty = messages.length === 0;

  return (
    <div style={{
      background: c.bg, minHeight: "calc(100vh - 60px)",
      display: "flex", flexDirection: "column",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>

      {/* ── Empty state ─────────────────────────────────────────── */}
      {isEmpty && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 24px 200px",
        }}>
          <div style={{
            fontSize: 10, fontWeight: 900, color: "#861F41",
            letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 20,
          }}>Darvis AI</div>
          <h1 style={{
            margin: "0 0 12px", fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 900, color: c.text, letterSpacing: "-2px", textAlign: "center",
          }}>
            Ask about <span style={{ color: "#861F41" }}>any course.</span>
          </h1>
          <p style={{
            margin: "0 0 40px", fontSize: 15, color: c.sub,
            maxWidth: 440, textAlign: "center", lineHeight: 1.7,
          }}>
            Grade distributions, professor comparisons, and historical trends — all from real data.
          </p>

          {/* Suggested questions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600 }}>
            {SUGGESTED.map(q => (
              <button key={q} onClick={() => send(q)} style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 20, padding: "8px 16px",
                color: c.sub, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#861F41"; e.currentTarget.style.color = "#861F41"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.sub; }}
              >{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────── */}
      {!isEmpty && (
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 0 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>
            {messages.map((msg, i) => (
              msg.role === "user" ? (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{
                    background: "#861F41", color: "white",
                    borderRadius: "14px 4px 14px 14px",
                    padding: "12px 16px", fontSize: 14, lineHeight: 1.5,
                    maxWidth: "75%", fontWeight: 500,
                  }}>{msg.content}</div>
                </div>
              ) : (
                <BotMessage key={i} msg={msg} darkMode={dm} />
              )
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                  background: "#861F41", display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  <img src={darkMode ? "/logo.svg" : "/logo-light.svg"} alt="Darvis" style={{ width: 20, height: 20 }} />
                </div>
                <div style={{
                  background: dm ? "rgba(255,255,255,0.04)" : "white",
                  border: `1px solid ${c.border}`,
                  borderRadius: "4px 14px 14px 14px",
                  padding: "14px 18px",
                  display: "flex", gap: 5, alignItems: "center",
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#861F41", opacity: 0.7,
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────── */}
      <div style={{
        position: "sticky", bottom: 0,
        background: c.bg,
        borderTop: `1px solid ${c.border}`,
        padding: "16px 24px 20px",
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>

          {/* Settings row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <button
              onClick={() => setShowSettings(s => !s)}
              style={{
                background: "none", border: "none", padding: 0,
                color: c.faint, fontSize: 11, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.5px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >{showSettings ? "▾" : "▸"} Settings</button>

            {serverDown && (
              <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>
                ⚠ Server unreachable — try again in ~30 seconds
              </span>
            )}
          </div>

          {showSettings && (
            <div style={{
              display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center",
              marginBottom: 12, padding: "12px 14px",
              background: c.surface, borderRadius: 10,
              border: `1px solid ${c.border}`,
              fontSize: 12, color: c.sub,
            }}>
              {/* Recency weighting */}
              <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={useRecency}
                  onChange={e => setUseRecency(e.target.checked)}
                  style={{ accentColor: "#861F41", width: 14, height: 14, cursor: "pointer" }}
                />
                <span style={{ fontWeight: 600 }}>Weight recent terms</span>
              </label>

              {/* Min students */}
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>Min students: {minStudents}</span>
                <input
                  type="range" min="0" max="100" step="5"
                  value={minStudents}
                  onChange={e => setMinStudents(Number(e.target.value))}
                  style={{ width: 80, accentColor: "#861F41" }}
                />
              </label>

              {/* Top N */}
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>Results: {topN}</span>
                <input
                  type="range" min="3" max="25" step="1"
                  value={topN}
                  onChange={e => setTopN(Number(e.target.value))}
                  style={{ width: 80, accentColor: "#861F41" }}
                />
              </label>
            </div>
          )}

          {/* Input */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about a course, professor, or grade trend…"
              rows={1}
              style={{
                flex: 1, padding: "12px 16px",
                border: `1px solid ${c.border}`,
                borderRadius: 12, resize: "none",
                background: c.inputBg, color: c.text,
                fontSize: 14, fontWeight: 500,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                outline: "none", lineHeight: 1.5,
                transition: "border-color 0.15s ease",
                overflowY: "hidden",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "#861F41"}
              onBlur={e => e.currentTarget.style.borderColor = c.border}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading ? "#861F41" : "rgba(134,31,65,0.2)",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13" /><path d="M22 2L15 22 11 13 2 9l20-7z" />
              </svg>
            </button>
          </div>

          <div style={{ fontSize: 11, color: c.faint, marginTop: 8, textAlign: "center" }}>
            Based on historical grade data only · Enter to send
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
