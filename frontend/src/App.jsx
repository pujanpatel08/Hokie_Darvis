// Main App component
const { useState, useEffect } = React;


function App() {
  const [page, setPage] = useState("landing");
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("hokieDarvis_theme") !== "light"; } catch { return true; }
  });
  const [schedule, setSchedule] = useState(() => {
    try { const s = localStorage.getItem("hokieDarvis_schedule"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedProf,   setSelectedProf]   = useState(null);
  const [profReturnPage, setProfReturnPage]  = useState("search");

  useEffect(() => {
    try { localStorage.setItem("hokieDarvis_schedule", JSON.stringify(schedule)); } catch {}
  }, [schedule]);

  useEffect(() => {
    try { localStorage.setItem("hokieDarvis_theme", darkMode ? "dark" : "light"); } catch {}
  }, [darkMode]);

  const addSection    = id => { if (!schedule.includes(id)) setSchedule(prev => [...prev, id]); };
  const removeSection = id => setSchedule(prev => prev.filter(x => x !== id));

  const openCourse = course => setSelectedCourse(course);

  const openProf = prof => {
    setSelectedProf(prof);
    setProfReturnPage(page);
    setSelectedCourse(null);
    setPage("professor");
  };

  const closeProf = () => {
    setPage(profReturnPage || "search");
    setSelectedProf(null);
  };

  const renderPage = () => {
    if (page === "landing") {
      return <LandingPage onEnter={() => setPage("search")} darkMode={darkMode} />;
    }
    if (page === "chatbot") {
      return <ChatbotPage darkMode={darkMode} />;
    }
    if (page === "professor" && selectedProf) {
      return (
        <ProfessorProfile
          prof={selectedProf} darkMode={darkMode}
          onCourseClick={openCourse} onBack={closeProf}
        />
      );
    }
    if (page === "schedule") {
      return (
        <ScheduleBuilder
          darkMode={darkMode}
          schedule={schedule}
          onAdd={addSection} onRemove={removeSection}
          onCourseClick={openCourse} onProfClick={openProf}
          setPage={setPage}
        />
      );
    }
    return (
      <CourseSearch
        darkMode={darkMode}
        schedule={schedule}
        onCourseClick={openCourse} onProfClick={openProf}
      />
    );
  };

  return (
    <div style={{ background: "#080808", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Nav page={page} setPage={setPage} schedule={schedule} darkMode={darkMode} setDarkMode={setDarkMode} />

      {renderPage()}

      {selectedCourse && (
        <CourseDetail
          course={selectedCourse} darkMode={darkMode}
          schedule={schedule}
          onAdd={addSection} onRemove={removeSection}
          onClose={() => setSelectedCourse(null)}
          onProfClick={openProf}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
