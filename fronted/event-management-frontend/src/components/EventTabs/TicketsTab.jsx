// TicketsTab.jsx - קוד מתוקן ללא שגיאות
import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

export default function TicketsTab({ eventId }) {
  const [logoFile, setLogoFile] = useState(null);
  const [templateFile, setTemplateFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuPos, setExportMenuPos] = useState({ top: 0, left: 0 });
  const [lastPreset, setLastPreset] = useState('all');
  const exportMenuRef = useRef(null);
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [mapMenuPos, setMapMenuPos] = useState({ top: 0, left: 0 });
  const [lastMapGender, setLastMapGender] = useState('male'); // 'male' | 'female'
  const mapMenuRef = useRef(null);

  // פונקציות לכרטיסים
  const handleCreateSeatingCards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const formData = new FormData();
      if (logoFile) {
        formData.append('logo_file', logoFile);
      }
      if (templateFile) {
        formData.append('template_file', templateFile);
      }
      
      formData.append('force_recreate', 'true');
      
      const response = await fetch(`http://localhost:8001/seatings/generate-cards/${eventId}`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        body: formData
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`נוצרו ${data.cards?.length || 0} כרטיסי ישיבה בהצלחה!`);
      } else {
        const error = await response.json();
        alert(`שגיאה ביצירת כרטיסי ישיבה: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error creating seating cards:', error);
      alert('שגיאה ביצירת כרטיסי ישיבה');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSeatingCards = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/seatings/cards/${eventId}/download-all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `כרטיסי_ישיבה_אירוע_${eventId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert("כרטיסי ישיבה הורדו בהצלחה!");
      } else {
        const error = await response.json();
        alert(`שגיאה בהורדת כרטיסי ישיבה: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error downloading seating cards:', error);
      alert('שגיאה בהורדת כרטיסי ישיבה');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSeatingCards = async () => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את כל כרטיסי הישיבה הקיימים?")) {
      return;
    }
    
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/seatings/cards/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message);
      } else {
        const error = await response.json();
        alert(`שגיאה במחיקת כרטיסי ישיבה: ${error.detail}`);
      }
    } catch (error) {
      console.error('Error deleting seating cards:', error);
      alert('שגיאה במחיקת כרטיסי ישיבה');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`http://localhost:8001/guests/export?event_id=${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guests-${eventId}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('שגיאה ביצוא לאקסל');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('שגיאה ביצוא לאקסל');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcelWithPreset = async (preset) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      // מפה בין preset לפרמטרים
      const presetToParams = {
        all: {},
        confirmed: { confirmed_only: 'true' },
        not_confirmed: { confirmed_only: 'false' },
        male: { gender: 'male' },
        female: { gender: 'female' },
        female_confirmed: { gender: 'female', confirmed_only: 'true' },
        male_confirmed: { gender: 'male', confirmed_only: 'true' },
        female_not_confirmed: { gender: 'female', confirmed_only: 'false' },
        male_not_confirmed: { gender: 'male', confirmed_only: 'false' }
      };
      const params = presetToParams[preset] || {};

      // בניית URL עם פרמטרים
      let url = `http://localhost:8001/guests/export?event_id=${eventId}`;
      if (params.gender) url += `&gender=${params.gender}`;
      if (params.confirmed_only) url += `&confirmed_only=${params.confirmed_only}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = (() => {
          switch (preset) {
            case 'confirmed': return `guests-${eventId}-confirmed.xlsx`;
            case 'not_confirmed': return `guests-${eventId}-not-confirmed.xlsx`;
            case 'male': return `guests-${eventId}-male.xlsx`;
            case 'female': return `guests-${eventId}-female.xlsx`;
            case 'female_confirmed': return `guests-${eventId}-female-confirmed.xlsx`;
            case 'male_confirmed': return `guests-${eventId}-male-confirmed.xlsx`;
            case 'female_not_confirmed': return `guests-${eventId}-female-not-confirmed.xlsx`;
            case 'male_not_confirmed': return `guests-${eventId}-male-not-confirmed.xlsx`;
            default: return `guests-${eventId}.xlsx`;
          }
        })();
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('שגיאה ביצוא לאקסל');
      }
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('שגיאה ביצוא לאקסל');
    } finally {
      setLoading(false);
      setShowExportMenu(false);
    }
  };

  const handleExportSeatingImage = async (genderPreset = 'male') => {
    try {
      setLoading(true);
      // קביעת מגדר לפי הפריסט שנבחר
      let gender = null;
      let onlyEmptyTables = false;
      if (genderPreset.includes('|only_empty') || genderPreset.includes('|only_available')) {
        const [g] = genderPreset.split('|');
        gender = g;
        onlyEmptyTables = genderPreset.includes('|only_empty');
        var onlyAvailableTables = genderPreset.includes('|only_available');
      } else {
        if (genderPreset === 'male') gender = 'male';
        if (genderPreset === 'female') gender = 'female';
      }
      
      // ברירת מחדל: כל המקומות (אפשר להרחיב בהמשך ל־preset נפרד)
      let showEmptySeats = true;
      let showOccupiedSeats = true;
      
      const token = localStorage.getItem('access_token');
      
      // בניית URL עם פרמטרים
      let url = `http://localhost:8001/guests/export-seating-image?event_id=${eventId}`;
      if (gender) {
        url += `&gender=${gender}`;
      }
      url += `&show_empty_seats=${showEmptySeats}`;
      url += `&show_occupied_seats=${showOccupiedSeats}`;
      if (onlyEmptyTables) {
        url += `&only_empty_tables=true`;
      }
      if (typeof onlyAvailableTables !== 'undefined' && onlyAvailableTables) {
        url += `&only_available_tables=true`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `seating-map-${eventId}${gender ? `-${gender}` : ''}.png`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('שגיאה ביצוא תמונה');
      }
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('שגיאה ביצוא תמונה');
    } finally {
      setLoading(false);
    }
  };

  // סגירת תפריט הייצוא בלחיצה מחוץ
  useEffect(() => {
    if (!showExportMenu) return;
    const onClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showExportMenu]);

  // סגירת תפריט מפת ישיבה בלחיצה מחוץ
  useEffect(() => {
    if (!showMapMenu) return;
    const onClickOutside = (e) => {
      if (mapMenuRef.current && !mapMenuRef.current.contains(e.target)) {
        setShowMapMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showMapMenu]);

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setLogoFile(file);
    }
  };

  const handleTemplateUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setTemplateFile(file);
    }
  };

  // עיצוב משופר לכפתורים
  const buttonStyle = {
    padding: "10px 16px",
    border: "none",
    borderRadius: "6px",
    color: "white",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "all 0.2s ease",
    minWidth: "140px",
    margin: "4px"
  };

  return (
    <div style={{ direction: "rtl", padding: "20px" }}>
      <h3 style={{ textAlign: "center", marginBottom: "30px", color: "#2c3e50" }}>
        ניהול כרטיסים
      </h3>

      {/* אין בחירה קבועה למעלה – התפריט יופיע בלחיצה על יצוא */}

      {/* אזור הלוגו - עיצוב משופר */}
      <div style={{
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "10px",
        padding: "20px",
        marginBottom: "25px",
        textAlign: "center"
      }}>
        <h4 style={{ marginBottom: "15px", color: "#495057" }}>לוגו לכרטיסים</h4>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            style={{ display: "none" }}
            id="logo-upload"
          />
          <label
            htmlFor="logo-upload"
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              transition: "background-color 0.2s ease"
            }}
          >
            בחירת קובץ
          </label>
          <span style={{ color: "#6c757d", fontSize: "13px" }}>
            {logoFile ? logoFile.name : "לא נבחר קובץ"}
          </span>
        </div>
      </div>

      {/* אזור התבנית - עיצוב משופר */}
      <div style={{
        backgroundColor: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "10px",
        padding: "20px",
        marginBottom: "25px",
        textAlign: "center"
      }}>
        <h4 style={{ marginBottom: "15px", color: "#495057" }}>תבנית לכרטיסים</h4>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleTemplateUpload}
            style={{ display: "none" }}
            id="template-upload"
          />
          <label
            htmlFor="template-upload"
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              transition: "background-color 0.2s ease"
            }}
          >
            בחירת תבנית
          </label>
          <span style={{ color: "#6c757d", fontSize: "13px" }}>
            {templateFile ? templateFile.name : "לא נבחר תבנית"}
          </span>
        </div>
      </div>

      {/* כפתורי פעולה - עיצוב משופר ומרוכז */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginBottom: "25px",
        justifyContent: "center",
        maxWidth: "800px",
        margin: "0 auto 25px auto"
      }}>
        <button
          onClick={handleCreateSeatingCards}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#e91e63",
            opacity: loading ? 0.6 : 1
          }}
        >
          יצירת כרטיסי ישיבה
        </button>

        <button
          onClick={handleDownloadSeatingCards}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#ff9800",
            opacity: loading ? 0.6 : 1
          }}
        >
          הורדת כרטיסי ישיבה
        </button>

        <button
          onClick={handleDeleteSeatingCards}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#f44336",
            opacity: loading ? 0.6 : 1
          }}
        >
          מחיקת כרטיסי ישיבה
        </button>

        {/* כפתור יחיד: פותח תפריט ייצוא אקסל */}
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setExportMenuPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX - 140 });
            setShowExportMenu((v) => !v);
          }}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#607d8b",
            opacity: loading ? 0.6 : 1
          }}
        >
          יצוא לאקסל ▾
        </button>

        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMapMenuPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX - 140 });
            setShowMapMenu((v) => !v);
          }}
          disabled={loading}
          style={{
            ...buttonStyle,
            backgroundColor: "#0a6cff",
            opacity: loading ? 0.6 : 1
          }}
        >
          יצוא תמונה מפת ישיבה ▾
        </button>
      </div>

      {loading && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "20px",
          borderRadius: "8px",
          zIndex: 1000,
          fontSize: "16px"
        }}>
          טוען...
        </div>
      )}

      {/* תפריט בחירת ייצוא (צף) */}
      {showExportMenu && (
        <div
          style={{
            position: 'absolute',
            top: exportMenuPos.top,
            left: exportMenuPos.left,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
            minWidth: 220,
            padding: 8
          }}
          ref={exportMenuRef}
        >
          {[
            { key: 'all', label: 'כל המוזמנים' },
            { key: 'confirmed', label: 'מאושרי הגעה בלבד' },
            { key: 'not_confirmed', label: 'לא אישרו הגעה' },
            { key: 'male', label: 'גברים בלבד' },
            { key: 'female', label: 'נשים בלבד' },
            { key: 'female_confirmed', label: 'נשים מאושרות הגעה' },
            { key: 'male_confirmed', label: 'גברים מאושרי הגעה' },
            { key: 'female_not_confirmed', label: 'נשים שלא אישרו הגעה' },
            { key: 'male_not_confirmed', label: 'גברים שלא אישרו הגעה' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => { setLastPreset(opt.key); handleExportExcelWithPreset(opt.key); }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'right',
                background: 'transparent',
                border: 'none',
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: 6
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* תפריט בחירת מגדר לתמונת המפה (צף) */}
      {showMapMenu && (
        <div
          style={{
            position: 'absolute',
            top: mapMenuPos.top,
            left: mapMenuPos.left,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1000,
            minWidth: 220,
            padding: 8
          }}
          ref={mapMenuRef}
        >
          {[
            { key: 'male', label: 'מפת ישיבה - גברים' },
            { key: 'female', label: 'מפת ישיבה - נשים' },
            { key: 'male_empty', label: 'מפת ישיבה - שולחנות פנויים (גברים)' },
            { key: 'female_empty', label: 'מפת ישיבה - שולחנות פנויים (נשים)' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => {
                setLastMapGender(opt.key.includes('female') ? 'female' : 'male');
                const gender = opt.key.includes('female') ? 'female' : 'male';
                const onlyEmpty = opt.key.endsWith('_empty');
                const onlyAvailable = opt.key.endsWith('_available');
                let payload = gender;
                if (onlyEmpty) payload = `${gender}|only_empty`;
                if (onlyAvailable) payload = `${gender}|only_available`;
                handleExportSeatingImage(payload);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'right',
                background: 'transparent',
                border: 'none',
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: 6
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}