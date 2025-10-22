import React, { useEffect, useState } from "react";

export default function AuditLog({ eventId }) {
  const [logs, setLogs] = useState([]);

  console.log('AuditLog: Component rendered with eventId:', eventId);

  const fetchLogs = () => {
    if (!eventId) {
      console.log('AuditLog: No eventId, returning');
      return;
    }
    let url = `http://localhost:8001/audit-log/all?event_id=${eventId}`;
    console.log('AuditLog: Fetching from URL:', url);
    const token = localStorage.getItem('access_token');
    console.log('AuditLog: Token exists:', !!token);
    fetch(url, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => {
        console.log('AuditLog: Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('AuditLog: Received data:', data);
        console.log('AuditLog: Data is array:', Array.isArray(data));
        console.log('AuditLog: Data length:', data?.length);
        setLogs(Array.isArray(data) ? data : []);
      })
      .catch(error => {
        console.error('AuditLog: Fetch error:', error);
      });
  };

  useEffect(() => {
    console.log('AuditLog: useEffect triggered with eventId:', eventId);
    fetchLogs();
    
    // רענון אוטומטי כל 5 שניות
    const interval = setInterval(fetchLogs, 5000);
    
    return () => clearInterval(interval);
  }, [eventId]);

  console.log('AuditLog: Current logs state:', logs);
  console.log('AuditLog: Logs length:', logs.length);

  if (!eventId) {
    console.log('AuditLog: No eventId, returning null');
    return null;
  }

  return (
    <div style={{ background: "#fff", borderRadius: 8, padding: 16, maxHeight: 400, overflowY: "auto" }}>
      <h4>היסטוריית שינויים לאירוע {eventId}</h4>
      {logs.length === 0 ? (
        <div style={{ color: "#888" }}>אין שינויים</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {logs.map(log => {
            let actionText = "";
            let detailsText = "";
            if (log.action === "create") {
              if (log.entity_type === "Table") {
                if (log.field === "bulk_create") {
                  actionText = "הוספת שולחנות";
                  detailsText = log.new_value;
                } else {
                  actionText = "הוספת שולחן";
                  detailsText = log.new_value;
                }
              } else {
                actionText = "סידור מקומות";
                detailsText = log.new_value;
              }
            } else if (log.action === "delete") {
              if (log.entity_type === "Table") {
                if (log.field === "bulk_delete") {
                  actionText = "מחיקת שולחנות";
                  detailsText = log.old_value;
                } else {
                  actionText = "מחיקת שולחן";
                  detailsText = log.old_value;
                }
              } else {
                actionText = "מחיקה";
                detailsText = log.old_value;
              }
            } else if (log.action === "update") {
              actionText = "העברת  בין שולחנות";
              detailsText = `${log.field}: ${log.old_value} → ${log.new_value}`;
            }
            return (
              <li key={log.id} style={{ marginBottom: 12, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
                <div style={{ fontWeight: 600, color: "#333", marginBottom: 4 }}>{actionText}</div>
                <div style={{ color: "#666", fontSize: 14, marginBottom: 4 }}>{detailsText}</div>
                <div style={{ fontSize: 12, color: "#888" }}>
                  <span>{log.timestamp && new Date(log.timestamp).toLocaleString("he-IL", {
                    timeZone: "Asia/Jerusalem",
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}</span>
                  {" | "}
                  <span>ע"י: {log.user_name || log.user_id || "לא ידוע"}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
} 