// Main App component
import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import Nav from "./components/nav-auth.jsx";
import LandingPage from "./components/landing.jsx";
import CourseSearch, { CourseDetail } from "./components/courses.jsx";
import ScheduleBuilder from "./components/schedule.jsx";
import ChatbotPage from "./components/chatbot.jsx";
import ForumsPage from "./components/forums.jsx";
import FaqsPage from "./components/faqs.jsx";
import ProfessorProfile from "./components/dashboard-prof.jsx";
import AuthGate from "./components/auth-gate.jsx";
import ProfileModal from "./components/profile-modal.jsx";

// Pages that require authentication
const PROTECTED = new Set(["search", "schedule", "chatbot", "forums"]);

export default function App() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

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
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Persist schedule and theme
  useEffect(() => {
    try { localStorage.setItem("hokieDarvis_schedule", JSON.stringify(schedule)); } catch {}
  }, [schedule]);

  useEffect(() => {
    try { localStorage.setItem("hokieDarvis_theme", darkMode ? "dark" : "light"); } catch {}
  }, [darkMode]);

  // Show profile modal on first sign-in if onboarding not complete
  useEffect(() => {
    if (isSignedIn && userLoaded && user) {
      const done = user.unsafeMetadata?.onboardingComplete;
      if (!done) setShowProfileModal(true);
    }
  }, [isSignedIn, userLoaded, user]);

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

  // Show nothing until Clerk finishes loading (avoids auth gate flash)
  if (!authLoaded) {
    return (
      <div style={{
        background: darkMode ? "#080808" : "#f7f4f0",
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{
          width: 32, height: 32, border: "3px solid rgba(134,31,65,0.3)",
          borderTopColor: "#861F41", borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const renderPage = () => {
    // Protected pages: show auth gate if not signed in
    if (PROTECTED.has(page) && !isSignedIn) {
      return <AuthGate page={page} darkMode={darkMode} />;
    }

    if (page === "landing") {
      return <LandingPage onEnter={() => setPage("search")} darkMode={darkMode} />;
    }
    if (page === "chatbot") {
      return <ChatbotPage darkMode={darkMode} />;
    }
    if (page === "forums") {
      return <ForumsPage darkMode={darkMode} setPage={setPage} />;
    }
    if (page === "faqs") {
      return <FaqsPage darkMode={darkMode} setPage={setPage} />;
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
    <div style={{
      background: darkMode ? "#080808" : "#f7f4f0",
      minHeight: "100vh",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      transition: "background 0.3s",
    }}>
      <Nav
        page={page} setPage={setPage}
        schedule={schedule}
        darkMode={darkMode} setDarkMode={setDarkMode}
      />

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

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
}
