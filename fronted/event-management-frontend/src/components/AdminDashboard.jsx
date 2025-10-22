import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../images/login.png";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "בוקר טוב";
  if (hour < 18) return "צהריים טובים";
  return "ערב טוב";
}

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("events"); // events
  const [newEvent, setNewEvent] = useState({
    name: "",
    type: "",
    date: "",
    location: "",
  });
  const [customFields, setCustomFields] = useState([]);

  const fullName = localStorage.getItem("full_name");
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  const isAdmin = role === "admin";

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch("http://localhost:8001/events", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        console.error("שגיאה בטעינה:", err);
      }
    };
    fetchEvents();
  }, [token]);

  const isPast = (dateStr) => new Date(dateStr) < new Date();
  const handleEventClick = (id) => navigate(`/events/${id}`);

  const handleAddField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const handleFieldChange = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      
      const response = await fetch("http://localhost:8001/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newEvent.name,
          type: newEvent.type,
          date: newEvent.date,
          location: newEvent.location,
          extra_fields: customFields.reduce((acc, field) => {
            if (field.key.trim()) acc[field.key] = field.value;
            return acc;
          }, {}),
        }),
      });
      const data = await response.json();
      setEvents([...events, data]);
      setShowForm(false);
      setNewEvent({ name: "", type: "", date: "", location: "" });
      setCustomFields([]);
    } catch (err) {
      console.error("שגיאה ביצירה:", err);
    }
  };

  return (
    <div className="admin-hero" style={{ backgroundImage: `url(${backgroundImage})` }}>
      <div className="admin-hero-content">
        <div className="admin-greeting">
          <h1>{getGreeting()} {fullName}</h1>
        </div>

      {/* תוכן טאב אירועים */}
      {activeTab === "events" && (
        <>
          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="form-button primary"
              style={{ margin: "20px 0", backgroundColor: "#4CAF50" }}
            >
              + הוסף אירוע חדש
            </button>
          )}

          {showForm && (
            <div className="form-container" style={{ marginBottom: "30px" }}>
              <form onSubmit={handleCreate} className="form-grid">
                <input
                  type="text"
                  placeholder="שם האירוע"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  required
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="סוג"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  required
                  className="form-input"
                />
                
                <input
                  type="datetime-local"
                  placeholder="תאריך ושעה"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  required
                  className="form-input"
                />
                
                <input
                  type="text"
                  placeholder="מיקום"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  required
                  className="form-input"
                />

                <div className="form-group">
                  <h4>שדות נוספים:</h4>
                  {customFields.map((field, index) => (
                    <div key={index} className="form-row">
                      <input
                        placeholder="שם שדה"
                        value={field.key}
                        onChange={(e) => handleFieldChange(index, "key", e.target.value)}
                        className="form-input"
                      />
                      <input
                        placeholder="ערך"
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, "value", e.target.value)}
                        className="form-input"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="form-button-group">
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="form-button secondary"
                  >
                    + הוסף שדה נוסף
                  </button>
                  <button type="submit" className="form-button primary">שמור</button>
                </div>
              </form>
            </div>
          )}

          <h2>האירועים שלך:</h2>
          {events.length > 0 ? (
            <div className="events-grid">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event.id)}
                  className={`event-card ${isPast(event.date) ? 'past' : ''}`}
                >
                  <div className="event-card-header">
                    <h3 className="event-card-title">{event.name}</h3>
                  </div>
                  <div className="event-card-date">
                    {new Date(event.date).toLocaleDateString('he-IL')}
                  </div>
                  <div className="event-card-date" style={{ fontSize: "12px", color: "#666" }}>
                    {new Date(event.date).toLocaleString()}
                  </div>
                  {isPast(event.date) && <p style={{ color: "red" }}>אירוע חלף</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="events-empty">
              <div className="events-empty-icon">📅</div>
              <div className="events-empty-title">אין אירועים עדיין</div>
              <div className="events-empty-subtitle">צור את האירוע הראשון שלך</div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
