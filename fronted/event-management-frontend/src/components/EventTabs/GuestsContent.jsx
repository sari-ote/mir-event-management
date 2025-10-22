import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";

export default function GuestsContent() {
  const [guests, setGuests] = useState([]);
  const [filters, setFilters] = useState({});
  const { eventId } = useParams();
  const [guestsRaw, setGuestsRaw] = useState([]);
  const [tableHeads, setTableHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTableHeadFor, setEditingTableHeadFor] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importInfo, setImportInfo] = useState(null); // { filename, ids: number[], uploadedAt }

  const storageKey = (eId) => `guestImport_${eId}`;
  const loadImportInfo = (eId) => {
    try { const raw = localStorage.getItem(storageKey(eId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const saveImportInfo = (eId, info) => { try { localStorage.setItem(storageKey(eId), JSON.stringify(info)); } catch {} };
  const clearImportInfo = (eId) => { try { localStorage.removeItem(storageKey(eId)); } catch {} };

  // טען את כל הנתונים בפעם אחת
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');
        
        // טען את כל הנתונים במקביל
        const [tableHeadsData, guestsWithFieldsData, guestsRawData] = await Promise.all([
          fetch(`http://localhost:8001/tables/table-heads/event/${eventId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          }).then(res => res.json()),
          fetch(`http://localhost:8001/guests/event/${eventId}/with-fields`, {
            headers: { "Authorization": `Bearer ${token}` }
          }).then(res => res.json()),
          fetch(`http://localhost:8001/guests/event/${eventId}`, {
            headers: { "Authorization": `Bearer ${token}` }
          }).then(res => res.json())
        ]);

        setTableHeads(Array.isArray(tableHeadsData) ? tableHeadsData : []);
        setGuests(Array.isArray(guestsWithFieldsData) ? guestsWithFieldsData : []);
        setGuestsRaw(Array.isArray(guestsRawData) ? guestsRawData : []);
        
        console.log("guestsRaw:", guestsRawData);
        console.log("DATA:", guestsWithFieldsData);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
    setImportInfo(loadImportInfo(eventId));
  }, [eventId]);

  const handleTableHeadChange = async (guestId, tableHeadId) => {
    try {
      const token = localStorage.getItem('access_token');
      const guest = guests.find(g => g.id === guestId);
      if (!guest) return;

      // עדכון מיידי בממשק המשתמש
      const updatedGuestsRaw = guestsRaw.map(g => 
        g.id === guestId 
          ? { ...g, table_head_id: tableHeadId === "" ? null : Number(tableHeadId) }
          : g
      );
      setGuestsRaw(updatedGuestsRaw);

      // נשתמש בנתונים מהשרת שמגיעים עם שמות שדות בעברית
      await fetch(`http://localhost:8001/guests/${guestId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: guest["שם"] || "",
          last_name: guest["שם משפחה"] || "",
          id_number: guest["תעודת זהות"] || "",
          address: "",
          phone: guest["טלפון"] || "",
          email: guest["אימייל"] || "",
          referral_source: "",
          gender: guest["gender"] || "male", // נשתמש בשדה gender מהשרת
          table_head_id: tableHeadId === "" ? null : Number(tableHeadId)
        })
      });

      // רענן את רשימת המוזמנים עם שדות נוספים
      const guestsWithFieldsResponse = await fetch(`http://localhost:8001/guests/event/${eventId}/with-fields`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const guestsWithFieldsData = await guestsWithFieldsResponse.json();
      setGuests(Array.isArray(guestsWithFieldsData) ? guestsWithFieldsData : []);

      // רענן גם את guestsRaw
      const guestsRawResponse = await fetch(`http://localhost:8001/guests/event/${eventId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const guestsRawData = await guestsRawResponse.json();
      setGuestsRaw(Array.isArray(guestsRawData) ? guestsRawData : []);
      setEditingTableHeadFor(null);
    } catch (error) {
      console.error("Error updating table head:", error);
    }
  };

  const handleConfirmedArrivalChange = async (guestId, confirmed) => {
    try {
      const token = localStorage.getItem('access_token');
      const guest = guests.find(g => g.id === guestId);
      if (!guest) return;

      // עדכון מיידי בממשק המשתמש
      const updatedGuests = guests.map(g => 
        g.id === guestId 
          ? { ...g, confirmed_arrival: confirmed }
          : g
      );
      setGuests(updatedGuests);

      // עדכון בשרת
      await fetch(`http://localhost:8001/guests/${guestId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: guest["שם"] || "",
          last_name: guest["שם משפחה"] || "",
          id_number: guest["תעודת זהות"] || "",
          address: "",
          phone: guest["טלפון"] || "",
          email: guest["אימייל"] || "",
          referral_source: "",
          gender: guest["gender"] || "male",
          table_head_id: guest.table_head_id,
          confirmed_arrival: confirmed
        })
      });

      console.log(`מוזמן ${guest["שם"]} ${guest["שם משפחה"]} ${confirmed ? 'אושר' : 'בוטל'} הגעה`);
    } catch (error) {
      console.error("Error updating confirmed arrival:", error);
      // אם יש שגיאה, נחזיר את המצב הקודם
      const originalGuests = guests.map(g => 
        g.id === guestId 
          ? { ...g, confirmed_arrival: !confirmed }
          : g
      );
      setGuests(originalGuests);
    }
  };

  // שדות הטבלה לפי אורח ראשון
  const fields = guests.length > 0 
    ? Object.keys(guests[0]).filter(f => f !== 'confirmed_arrival' && f !== 'table_head_id') 
    : [];

  // סינון לפי כל שדה
  const filteredGuests = guests.filter(g =>
    fields.every(field =>
      !filters[field] || String(g[field] || "").startsWith(filters[field])
    )
  );
  const [exportPreset, setExportPreset] = useState('all');

  const getGuestsForExport = () => {
    const base = filteredGuests;
    switch (exportPreset) {
      case 'confirmed':
        return base.filter(g => !!g.confirmed_arrival);
      case 'male':
        return base.filter(g => String(g.gender || '').toLowerCase() === 'male');
      case 'female':
        return base.filter(g => String(g.gender || '').toLowerCase() === 'female');
      case 'female_confirmed':
        return base.filter(g => String(g.gender || '').toLowerCase() === 'female' && !!g.confirmed_arrival);
      case 'male_confirmed':
        return base.filter(g => String(g.gender || '').toLowerCase() === 'male' && !!g.confirmed_arrival);
      case 'all':
      default:
        return base;
    }
  };

  const exportToExcel = () => {
    const data = getGuestsForExport();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guests");
    XLSX.writeFile(wb, "guests.xlsx");
  };

  // העלאת אקסל וייבוא מוזמנים
  const normalizeGender = (val) => {
    const s = String(val || '').trim().toLowerCase();
    if (["male", "m", "זכר", "גבר", "גברים"].includes(s)) return "male";
    if (["female", "f", "נקבה", "אשה", "נשים"].includes(s)) return "female";
    return "male"; // ברירת מחדל
  };

  const pickField = (row, keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return String(row[k]).trim();
    }
    return "";
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!Array.isArray(rows) || rows.length === 0) {
        alert('הקובץ ריק או לא נקרא');
        return;
      }
      const token = localStorage.getItem('access_token');
      const createdIds = [];
      const createOne = async (row) => {
        // ניסיון להרכיב שם מלא משדות שונים
        const first_name = pickField(row, ['first_name', 'שם', 'שם פרטי']);
        const last_name = pickField(row, ['last_name', 'שם משפחה']);
        if (!first_name && !last_name) return { ok: false, reason: 'חסר שם' };
        const id_number = pickField(row, ['id_number', 'תעודת זהות', 'מספר זהות']);
        const phone = pickField(row, ['phone', 'טלפון', 'פלאפון']);
        const email = pickField(row, ['email', 'מייל', 'אימייל']);
        const genderRaw = pickField(row, ['gender', 'מגדר', 'מין']);
        const gender = normalizeGender(genderRaw);
        const tableHeadName = pickField(row, ['table_head', 'ראש שולחן', 'קטגוריה']);
        let table_head_id = null;
        if (tableHeadName) {
          const found = tableHeads.find(th => (th.last_name || '').trim() === tableHeadName.trim());
          if (found) table_head_id = found.id;
        }
        const payload = {
          event_id: Number(eventId),
          first_name: first_name || '',
          last_name: last_name || '',
          id_number: id_number || '',
          address: '',
          phone,
          email,
          referral_source: '',
          gender,
          table_head_id
        };
        const res = await fetch('http://localhost:8001/guests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          return { ok: false, reason: txt || String(res.status) };
        }
        const json = await res.json().catch(() => null);
        if (json && json.id) createdIds.push(json.id);
        return { ok: true };
      };

      const results = await Promise.allSettled(rows.map(createOne));
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok).length;
      const failed = results.length - succeeded;

      // רענון רשימות
      const [guestsWithFieldsData, guestsRawData] = await Promise.all([
        fetch(`http://localhost:8001/guests/event/${eventId}/with-fields`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json()),
        fetch(`http://localhost:8001/guests/event/${eventId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.json())
      ]);
      setGuests(Array.isArray(guestsWithFieldsData) ? guestsWithFieldsData : []);
      setGuestsRaw(Array.isArray(guestsRawData) ? guestsRawData : []);

      // שמירת מידע הייבוא
      const info = { filename: file.name, ids: createdIds, uploadedAt: Date.now() };
      setImportInfo(info);
      saveImportInfo(eventId, info);

      alert(`ייבוא הושלם: נוספו ${succeeded} שורות, נכשלו ${failed}`);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert('שגיאה בקריאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImport = async () => {
    if (!importInfo || !Array.isArray(importInfo.ids) || importInfo.ids.length === 0) {
      setImportInfo(null); clearImportInfo(eventId); return;
    }
    if (!window.confirm(`למחוק את הייבוא של "${importInfo.filename}" ולסלק ${importInfo.ids.length} מוזמנים שנוצרו?`)) return;
    try {
      setUploading(true);
      const token = localStorage.getItem('access_token');
      const delOne = async (id) => fetch(`http://localhost:8001/guests/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const results = await Promise.allSettled(importInfo.ids.map(delOne));
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok).length;
      const failed = importInfo.ids.length - succeeded;
      clearImportInfo(eventId);
      setImportInfo(null);
      // רענון
      const [guestsWithFieldsData, guestsRawData] = await Promise.all([
        fetch(`http://localhost:8001/guests/event/${eventId}/with-fields`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch(`http://localhost:8001/guests/event/${eventId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
      ]);
      setGuests(Array.isArray(guestsWithFieldsData) ? guestsWithFieldsData : []);
      setGuestsRaw(Array.isArray(guestsRawData) ? guestsRawData : []);
      alert(`נמחקו ${succeeded} רשומות${failed ? `, נכשלו ${failed}` : ''}`);
    } catch (e) {
      console.error(e);
      alert('שגיאה במחיקה');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (guestId) => {
    try {
      const response = await fetch(`http://localhost:8001/guests/${guestId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      if (!response.ok) {
        let msg = "מחיקה נכשלה";
        try {
          const data = await response.json();
          if (data.detail) msg = data.detail;
        } catch {}
        alert(msg);
        return;
      }
      // רענון מהשרת
      fetch(`http://localhost:8001/guests/event/${eventId}/with-fields`)
        .then(res => res.json())
        .then(data => setGuests(Array.isArray(data) ? data : []));
      alert("האורח נמחק בהצלחה!");
    } catch (error) {
      alert("שגיאה במחיקת אורח");
      console.error(error);
    }
  };

  const role = localStorage.getItem("role");
  const isViewer = role === "viewer";
  const token = localStorage.getItem('access_token');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
        טוען נתונים...
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
        לא נמצאו מוזמנים
      </div>
    );
  }

  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#222' }}>
          רשימת מוזמנים
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* העלאת אקסל */}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelUpload}
            disabled={isViewer || uploading}
            style={{ padding: 8 }}
          />
          <span style={{ color: '#64748b', fontSize: 14 }}>
            ניתן לייבא קובץ אקסל עם עמודות: "שם", "שם פרטי", "שם משפחה", "טלפון", "מייל", "מגדר" ו"ראש שולחן" (אופציונלי)
          </span>
          {importInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', padding: '6px 10px', borderRadius: 8 }}>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>קובץ נטען:</span>
              <span style={{ color: '#334155' }}>{importInfo.filename}</span>
              <span style={{ color: '#64748b' }}>({(importInfo.ids||[]).length} רשומות)</span>
              <button disabled={isViewer || uploading} onClick={handleRemoveImport} style={{ marginInlineStart: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>הסר ייבוא</button>
            </div>
          )}
          <input
            list="export-presets"
            value={{
              all: 'כל המוזמנים',
              confirmed: 'מאושרי הגעה בלבד',
              male: 'גברים בלבד',
              female: 'נשים בלבד',
              female_confirmed: 'נשים מאושרות הגעה',
              male_confirmed: 'גברים מאושרי הגעה'
            }[exportPreset]}
            onChange={(e) => {
              const label = e.target.value.trim();
              const mapping = {
                'כל המוזמנים': 'all',
                'מאושרי הגעה בלבד': 'confirmed',
                'גברים בלבד': 'male',
                'נשים בלבד': 'female',
                'נשים מאושרות הגעה': 'female_confirmed',
                'גברים מאושרי הגעה': 'male_confirmed',
              };
              const key = mapping[label] || 'all';
              setExportPreset(key);
            }}
            placeholder="בחר תצורת ייצוא..."
            style={{
              minWidth: 220,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#fff',
              fontSize: 14
            }}
          />
          <datalist id="export-presets">
            <option value="כל המוזמנים" />
            <option value="מאושרי הגעה בלבד" />
            <option value="גברים בלבד" />
            <option value="נשים בלבד" />
            <option value="נשים מאושרות הגעה" />
            <option value="גברים מאושרי הגעה" />
          </datalist>

          <button
            onClick={exportToExcel}
            style={{
              background: '#4f8cff',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer'
            }}
          >
            📤 ייצוא לאקסל
          </button>
        </div>
      </div>

      {/* פילטרים */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: 24,
        flexWrap: 'wrap',
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #e2e8f0'
      }}>
        {fields.map((field, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 200 }}>
            <label style={{ fontWeight: 600, marginBottom: 8, color: '#1e293b', fontSize: 14 }}>{field}</label>
            <input
              value={filters[field] || ''}
              onChange={e => setFilters({ ...filters, [field]: e.target.value })}
              placeholder={`סנן ${field}`}
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: '12px',
                fontSize: 16,
                background: '#fff',
                outline: 'none'
              }}
            />
          </div>
        ))}
      </div>

      {/* טבלת מוזמנים */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {fields.map((field, i) => (
                  <th key={i} style={{ padding: '16px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#1e293b' }}>
                    {field}
                  </th>
                ))}
                <th style={{ padding: '16px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#1e293b' }}>
                  ראש שולחן
                </th>
                <th style={{ padding: '16px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#1e293b', width: 80 }}>
                  אישור הגעה
                </th>
                <th style={{ padding: '16px', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textAlign: 'center', color: '#1e293b' }}>
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((g, idx) => {
                const guestRaw = guestsRaw.find(gr => gr.id === g.id);
                const tableHeadId = guestRaw?.table_head_id;
                const category = tableHeads.find(h => h.id === Number(tableHeadId))?.category || "";
                
                return (
                  <tr key={g.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {fields.map(field => (
                      <td key={field} style={{ padding: '16px', color: '#1e293b' }}>
                        {g[field]}
                      </td>
                    ))}
                    <td style={{ padding: '16px' }}>
                      {tableHeadId && editingTableHeadFor !== g.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {category && (
                            <span style={{
                              background: '#f1f5f9',
                              color: '#64748b',
                              padding: '4px 12px',
                              borderRadius: 16,
                              fontSize: 14
                            }}>
                              {category}
                            </span>
                          )}
                          <button
                            onClick={() => setEditingTableHeadFor(g.id)}
                            style={{ background: '#e5e7eb', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
                          >
                            ערוך
                          </button>
                        </div>
                      ) : (
                        <select
                          value={tableHeadId ? String(tableHeadId) : ""}
                          onChange={e => handleTableHeadChange(g.id, e.target.value)}
                          onBlur={() => setEditingTableHeadFor(null)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            minWidth: 200,
                            fontSize: 16
                          }}
                        >
                          <option value="">ללא ראש שולחן</option>
                          {tableHeads.map(h => (
                            <option key={h.id} value={String(h.id)}>
                              {h.last_name} {h.phone ? `(${h.phone})` : ""}
                            </option>
                          ))}
                        </select>
                        )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!g.confirmed_arrival}
                        onChange={e => handleConfirmedArrivalChange(g.id, e.target.checked)}
                        style={{ width: 20, height: 20, cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDelete(g.id)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 16px',
                          fontWeight: 600,
                          cursor: isViewer ? 'not-allowed' : 'pointer',
                          opacity: isViewer ? 0.5 : 1
                        }}
                        disabled={isViewer}
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 