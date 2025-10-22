import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅
import loginImage from "../../images/login.png";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // ✅

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:8001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 401) {
          setError("שם משתמש או סיסמה שגויים");
        } else {
          setError(data.detail || "שגיאה בכניסה");
        }
        return;
      }
      
      const data = await response.json();
      console.log("💡 תגובת התחברות:", data);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user.id);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("full_name", data.user.full_name);

      // ניתוב חכם לצופה: מצא אירוע מורשה והיכנס אליו מיד
      try {
        const permsRes = await fetch(`http://localhost:8001/permissions/user/${data.user.id}`, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        const perms = await permsRes.json();
        if (Array.isArray(perms) && perms.length > 0) {
          // סדר עדיפות: אם יש ממש viewer, קח אותו; אחרת קח כל אירוע שיש הרשאה אליו
          let first = perms.find(p => p.role_in_event === 'viewer') || perms[0];
          localStorage.setItem('last_event_id', first.event_id);
          navigate(`/events/${first.event_id}`);
          return;
        }
      } catch (e) {
        console.warn('permissions fetch failed', e);
      }

      navigate("/admin");
    } catch (err) {
      setError("תקלה בשרת, נסי שנית");
    }
  }

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <img
        src={loginImage}
        alt="רקע"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.7)",
          zIndex: 1,
        }}
      />
      <form
        onSubmit={handleSubmit}
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "white",
        }}
      >
        <h2>התחברות</h2>
        <input
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="form-input"
        />
        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="form-input"
        />
        <button type="submit" className="form-button primary">
          התחבר
        </button>
        {error && <p className="form-error">{error}</p>}
      </form>
    </div>
  );
}
