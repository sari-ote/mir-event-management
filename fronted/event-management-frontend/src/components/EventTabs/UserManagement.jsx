import React, { useState, useEffect } from "react";

export default function UserManagement({ eventId }) {
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    full_name: "",
    email: "",
    password: "",
    role: "event_manager",
    id_number: ""
  });
  const [newPerm, setNewPerm] = useState({ user_id: "", role_in_event: "event_admin" });
  const [editPermId, setEditPermId] = useState(null);
  const [editPermRole, setEditPermRole] = useState("");
  const token = localStorage.getItem("access_token");
  const myUserId = localStorage.getItem("user_id");
  const myRole = localStorage.getItem("role");

  const fetchUsers = () => {
    fetch("http://localhost:8001/users", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setUsers(data));
  };
  const fetchPermissions = () => {
    fetch(`http://localhost:8001/permissions/event/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setPermissions(Array.isArray(data) ? data : []));
  };

  useEffect(() => {
    fetchUsers();
    fetchPermissions();
  }, [eventId]);

  const handleChange = (e) => {
    setNewUser({ ...newUser, [e.target.name]: e.target.value });
  };

  function isValidIsraeliID(id) {
    id = String(id).trim();
    if (id.length > 9 || id.length < 5 || isNaN(id)) return false;
    id = id.padStart(9, '0');
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let num = Number(id[i]) * ((i % 2) + 1);
      if (num > 9) num -= 9;
      sum += num;
    }
    return sum % 10 === 0;
  }
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const handleAddUser = () => {
    if (!isValidIsraeliID(newUser.id_number)) {
      alert("תעודת זהות לא תקינה");
      return;
    }
    if (!isValidEmail(newUser.email)) {
      alert("אימייל לא תקין");
      return;
    }
    fetch("http://localhost:8001/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(newUser),
    })
      .then(res => {
        if (!res.ok) throw new Error("שגיאה בהוספה");
        return res.json();
      })
      .then(() => {
        setNewUser({ username: "", full_name: "", email: "", password: "", role: "event_manager", id_number: "" });
        fetchUsers();
      })
      .catch(err => alert(err.message));
  };

  const handleDelete = (id) => {
    fetch(`http://localhost:8001/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      .then(() => fetchUsers());
  };

  // הרשאות
  const handlePermChange = (e) => {
    setNewPerm({ ...newPerm, [e.target.name]: e.target.value });
  };
  const handleAddPerm = () => {
    if (!newPerm.user_id || !newPerm.role_in_event) {
      alert("יש לבחור משתמש ותפקיד");
      return;
    }
    const payload = {
      user_id: Number(newPerm.user_id),
      event_id: Number(eventId),
      role_in_event: newPerm.role_in_event
    };
    console.log("[DEBUG] Payload sent to /permissions:", payload);
    fetch("http://localhost:8001/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error("שגיאה בהוספת הרשאה");
        return res.json();
      })
      .then(() => {
        setNewPerm({ user_id: "", role_in_event: "event_admin" });
        fetchPermissions();
      })
      .catch(err => alert(err.message));
  };
  const handleDeletePerm = (id) => {
    fetch(`http://localhost:8001/permissions/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      .then(() => fetchPermissions());
  };

  const handleSavePerm = (id) => {
    fetch(`http://localhost:8001/permissions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role_in_event: editPermRole }),
    })
      .then(res => {
        if (!res.ok) throw new Error("שגיאה בעדכון הרשאה");
        return res.json();
      })
      .then(() => {
        setEditPermId(null);
        fetchPermissions();
      })
      .catch(err => alert(err.message));
  };

  return (
    <div style={{ padding: "30px" }}>
      <h2>👤 ניהול משתמשים</h2>

      <div style={{ marginBottom: "20px" }}>
        <input name="username" placeholder="שם משתמש" value={newUser.username} onChange={handleChange} />
        <input name="full_name" placeholder="שם מלא" value={newUser.full_name} onChange={handleChange} />
        <input name="email" placeholder="אימייל" value={newUser.email} onChange={handleChange} />
        <input name="id_number" placeholder="תעודת זהות" value={newUser.id_number} onChange={handleChange} />
        <input name="password" type="password" placeholder="סיסמה" value={newUser.password} onChange={handleChange} />
        <select name="role" value={newUser.role} onChange={handleChange}>
          <option value="event_manager">מנהל אירוע</option>
          <option value="admin">מנהל מערכת</option>
          <option value="viewer">צופה</option>
        </select>
        <button onClick={handleAddUser}>➕ הוסף משתמש</button>
      </div>

      <table border="1" style={{ width: "100%", marginBottom: 40 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>שם משתמש</th>
            <th>שם מלא</th>
            <th>אימייל</th>
            <th>תפקיד</th>
            <th>🗑</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={u.id}>
              <td>{idx + 1}</td>
              <td>{u.username}</td>
              <td>{u.full_name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td><button onClick={() => handleDelete(u.id)}>🗑</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>הרשאות משתמשים לאירוע</h3>
      <div style={{ marginBottom: 20 }}>
        <select name="user_id" value={newPerm.user_id} onChange={handlePermChange}>
          <option value="">בחר משתמש</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
          ))}
        </select>
        <select name="role_in_event" value={newPerm.role_in_event} onChange={handlePermChange}>
          <option value="event_admin">מנהל אירוע</option>
          <option value="viewer">צופה</option>
        </select>
        <button onClick={handleAddPerm}>➕ הוסף הרשאה</button>
      </div>
      <table border="1" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>#</th>
            <th>משתמש</th>
            <th>תפקיד</th>
            <th>🗑</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((p, idx) => {
            const user = users.find(u => u.id === p.user_id);
            return (
              <tr key={p.id}>
                <td>{idx + 1}</td>
                <td>{user ? user.full_name : p.user_id}</td>
                <td>
                  {editPermId === p.id ? (
                    <select
                      value={editPermRole}
                      onChange={e => setEditPermRole(e.target.value)}
                    >
                      <option value="event_admin">מנהל אירוע</option>
                      <option value="viewer">צופה</option>
                    </select>
                  ) : (
                    p.role_in_event === 'event_admin' ? 'מנהל אירוע' : 'צופה'
                  )}
                </td>
                <td>
                  {editPermId === p.id ? (
                    <>
                      <button onClick={() => handleSavePerm(p.id)}>שמור</button>
                      <button onClick={() => setEditPermId(null)}>ביטול</button>
                    </>
                  ) : (
                    <button onClick={() => { setEditPermId(p.id); setEditPermRole(p.role_in_event); }}>ערוך</button>
                  )}
                  <button onClick={() => handleDeletePerm(p.id)}>🗑</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
