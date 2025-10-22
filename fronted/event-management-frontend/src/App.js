import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useParams } from "react-router-dom";
import Login from "./components/Login/Login";
import AdminDashboard from "./components/AdminDashboard";
import EventPage from "./components/EventTabs/EventPage"; // ✅ ייבוא הקובץ החדש
import AuditLog from "./components/AuditLog";

function AppRoutes() {
  const location = useLocation();
  const isLogin = location.pathname === "/";

  React.useEffect(() => {
    if (!isLogin) {
      document.body.classList.add("main-bg");
    } else {
      document.body.classList.remove("main-bg");
    }
    return () => document.body.classList.remove("main-bg");
  }, [isLogin]);

  return (
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/events/:eventId" element={<EventPage />} /> {/* ✅ ראוט חדש */}
      </Routes>
  );
}

function AuditLogButton() {
  const [showAuditLog, setShowAuditLog] = useState(false);
  const location = useLocation();
  
  // חלץ eventId מה-URL
  const eventIdMatch = location.pathname.match(/\/events\/(\d+)/);
  const eventId = eventIdMatch ? parseInt(eventIdMatch[1]) : null;

  return (
    <div style={{
      position: "fixed",
      top: 20,
      left: 20,
      zIndex: 1000
    }}>
      <button
        onClick={() => setShowAuditLog(!showAuditLog)}
        style={{
          background: "#fff",
          border: "none",
          borderRadius: "50%",
          width: 56,
          height: 56,
          boxShadow: "0 2px 12px #0002",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28
        }}
        title="היסטוריית שינויים"
      >
        🕒
      </button>
      {showAuditLog && eventId && (
        <div style={{
          marginTop: 12,
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 12px #0002",
          width: 350,
          maxHeight: 400,
          overflowY: "auto"
        }}>
          <AuditLog eventId={eventId} />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuditLogButton />
      <AppRoutes />
    </Router>
  );
}

export default App;
