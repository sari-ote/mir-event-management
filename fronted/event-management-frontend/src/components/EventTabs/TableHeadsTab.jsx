import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as XLSX from "xlsx";

export default function TableHeadsTab() {
  const { eventId } = useParams();
  const [activeHallTab, setActiveHallTab] = useState('m');
  const [tableHeads, setTableHeads] = useState([]);
  const [form, setForm] = useState({ last_name: "", phone: "", email: "", category: "", gender: "" });
  const [filterTableHead, setFilterTableHead] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ last_name: "", phone: "", email: "", category: "", gender: "" });
  const role = localStorage.getItem("role");
  const isViewer = role === "viewer";
  const [uploading, setUploading] = useState(false);
  const [importInfo, setImportInfo] = useState(null); // { filename, ids: number[], uploadedAt }

  const storageKey = (eId, hall) => `tableHeadImport_${eId}_${hall}`;
  const loadImportInfo = (eId, hall) => {
    try { const raw = localStorage.getItem(storageKey(eId, hall)); return raw ? JSON.parse(raw) : null; } catch { return null; }
  };
  const saveImportInfo = (eId, hall, info) => {
    try { localStorage.setItem(storageKey(eId, hall), JSON.stringify(info)); } catch {}
  };
  const clearImportInfo = (eId, hall) => { try { localStorage.removeItem(storageKey(eId, hall)); } catch {} };

  // טען ראשי שולחן לפי אולם
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    fetch(`http://localhost:8001/tables/table-heads/event/${eventId}?hall_type=${activeHallTab}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setTableHeads(data))
      .catch(err => console.error('Error fetching table heads:', err));
    setImportInfo(loadImportInfo(eventId, activeHallTab));
  }, [eventId, activeHallTab]);

  // עזר: נירמול מגדר
  const normalizeGender = (val) => {
    const s = String(val || '').trim().toLowerCase();
    if (["male", "m", "זכר", "גבר", "גברים"].includes(s)) return "male";
    if (["female", "f", "נקבה", "אשה", "נשים"].includes(s)) return "female";
    return activeHallTab === 'm' ? 'male' : 'female';
  };

  // עזר: שליפת שדה בשם אפשרי אחד מתוך כמה
  const pickField = (row, keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null) return String(row[k]).trim();
    }
    return "";
  };

  // העלאת אקסל וייבוא ראשי שולחן
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
        const last_name = pickField(row, ['last_name', 'שם משפחה', 'שם משפחתי']);
        if (!last_name) return { ok: false, reason: 'חסר שם משפחה' };
        const phone = pickField(row, ['phone', 'טלפון', 'פלאפון']);
        const email = pickField(row, ['email', 'מייל', 'אימייל']);
        const category = pickField(row, ['category', 'קטגוריה', 'קבוצה']);
        const genderRaw = pickField(row, ['gender', 'מגדר', 'מין']);
        const gender = normalizeGender(genderRaw);
        const payload = { event_id: Number(eventId), last_name, phone, email, category, gender, hall_type: activeHallTab };
        const res = await fetch('http://localhost:8001/tables/table-heads/', {
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
      // רענון רשימה
      await fetch(`http://localhost:8001/tables/table-heads/event/${eventId}?hall_type=${activeHallTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => setTableHeads(d));

      // שמירת מידע הייבוא
      const info = { filename: file.name, ids: createdIds, uploadedAt: Date.now() };
      setImportInfo(info);
      saveImportInfo(eventId, activeHallTab, info);

      alert(`ייבוא הושלם: נוספו ${succeeded} שורות, נכשלו ${failed}`);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert('שגיאה בקריאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  // הסרת ייבוא (מוחק את כל הרשומות שנוצרו מהקובץ)
  const handleRemoveImport = async () => {
    if (!importInfo || !Array.isArray(importInfo.ids) || importInfo.ids.length === 0) {
      setImportInfo(null); clearImportInfo(eventId, activeHallTab); return;
    }
    if (!window.confirm(`למחוק את הייבוא של "${importInfo.filename}" ולסלק ${importInfo.ids.length} ראשי שולחן שנוצרו?`)) return;
    try {
      setUploading(true);
      const token = localStorage.getItem('access_token');
      const delOne = async (id) => fetch(`http://localhost:8001/tables/table-heads/${id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const results = await Promise.allSettled(importInfo.ids.map(delOne));
      const succeeded = results.filter(r => r.status === 'fulfilled' && r.value && r.value.ok).length;
      const failed = importInfo.ids.length - succeeded;
      clearImportInfo(eventId, activeHallTab);
      setImportInfo(null);
      // רענון
      await fetch(`http://localhost:8001/tables/table-heads/event/${eventId}?hall_type=${activeHallTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).then(d => setTableHeads(d));
      alert(`נמחקו ${succeeded} רשומות${failed ? `, נכשלו ${failed}` : ''}`);
    } catch (e) {
      console.error(e);
      alert('שגיאה במחיקה');
    } finally {
      setUploading(false);
    }
  };

  // הוספת ראש שולחן
  const handleAdd = async () => {
    if (!form.last_name || !form.category || !form.gender) {
      alert("חובה למלא שם משפחה, קטגוריה ומגדר");
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      await fetch("http://localhost:8001/tables/table-heads/", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...form, event_id: eventId, hall_type: activeHallTab })
      });
      
      fetch(`http://localhost:8001/tables/table-heads/event/${eventId}?hall_type=${activeHallTab}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setTableHeads(data));
      
      setForm({ last_name: "", phone: "", email: "", category: "", gender: "" });
    } catch (error) {
      console.error('Error adding table head:', error);
    }
  };

  // עדכון ראש שולחן
  const handleEdit = async () => {
    if (!editForm.last_name || !editForm.category || !editForm.gender) {
      alert("חובה למלא שם משפחה, קטגוריה ומגדר");
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://localhost:8001/tables/table-heads/${editId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });
      
      fetch(`http://localhost:8001/tables/table-heads/event/${eventId}?hall_type=${activeHallTab}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setTableHeads(data));
      
      setEditId(null);
    } catch (error) {
      console.error('Error editing table head:', error);
    }
  };

  // מחיקת ראש שולחן
  const handleDelete = async (tableHeadId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק את ראש השולחן? המוזמנים שמחוברים אליו יקבלו 'ללא ראש שולחן'.")) {
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8001/tables/table-heads/${tableHeadId}`, {
        method: "DELETE",
        mode: 'cors',
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'מחיקה נכשלה';
        alert(errorMessage);
        return;
      }
      
      fetch(`http://localhost:8001/tables/table-heads/event/${eventId}?hall_type=${activeHallTab}`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      })
        .then(res => res.json())
        .then(data => setTableHeads(data));
    } catch (error) {
      console.error('Error deleting table head:', error);
      alert('שגיאה במחיקת ראש שולחן');
    }
  };

  // סינון ראשי שולחן לפי מגדר
  const filteredTableHeads = tableHeads.filter(
    h => h.gender === (activeHallTab === 'm' ? 'male' : 'female')
  );

  return (
    <div style={{ background: '#f8fafc', borderRadius: 16, boxShadow: '0 2px 12px #0001', padding: 32, margin: '30px auto', maxWidth: 800 }}>
      {/* טאבים לבחירת אולם */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActiveHallTab('m')}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: activeHallTab === 'm' ? '#4f8cff' : '#e2e8f0',
            color: activeHallTab === 'm' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1
          }}
        >
          ראשי שולחן - אולם גברים
        </button>
        <button
          onClick={() => setActiveHallTab('w')}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: activeHallTab === 'w' ? '#4f8cff' : '#e2e8f0',
            color: activeHallTab === 'w' ? 'white' : '#64748b',
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1
          }}
        >
          ראשי שולחן - אולם נשים
        </button>
      </div>

      {/* טופס הוספת ראש שולחן */}
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, marginBottom: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 16px 0', fontWeight: 600, fontSize: 18 }}>הוספת ראש שולחן</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} disabled={isViewer || uploading} style={{ padding: 8 }} />
          <span style={{ color: '#64748b', fontSize: 14 }}>
            ניתן לייבא קובץ אקסל עם עמודות: "שם משפחה", "טלפון", "מייל", "קטגוריה", "מגדר" (אופציונלי)
          </span>
          {importInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', padding: '6px 10px', borderRadius: 8 }}>
              <span style={{ color: '#0f172a', fontWeight: 600 }}>קובץ נטען:</span>
              <span style={{ color: '#334155' }}>{importInfo.filename}</span>
              <span style={{ color: '#64748b' }}>({(importInfo.ids||[]).length} רשומות)</span>
              <button disabled={isViewer || uploading} onClick={handleRemoveImport} style={{ marginInlineStart: 8, background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>הסר ייבוא</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: 'wrap' }}>
          <input
            value={form.last_name}
            onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            placeholder="שם משפחה"
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', flex: 1, minWidth: 200, fontSize: 16 }}
          />
          <input
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="טלפון"
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', flex: 1, minWidth: 200, fontSize: 16 }}
          />
          <input
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="מייל"
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', flex: 1, minWidth: 200, fontSize: 16 }}
          />
          <input
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="קטגוריה"
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', flex: 1, minWidth: 200, fontSize: 16 }}
          />
          <select
            value={form.gender}
            onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', flex: 1, minWidth: 120, fontSize: 16 }}
            required
          >
            <option value="">בחר מגדר</option>
            <option value="male">זכר</option>
            <option value="female">נקבה</option>
          </select>
          <button disabled={isViewer} onClick={handleAdd} style={{
              background: '#4f8cff',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: 16,
              cursor: 'pointer',
              minWidth: 120
            }}>
            הוסף
          </button>
        </div>
      </div>

      {/* רשימת ראשי שולחן */}
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18 }}>רשימת ראשי שולחן</h3>
          <input
            type="text"
            placeholder="חיפוש לפי שם משפחה"
            value={filterTableHead}
            onChange={e => setFilterTableHead(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', width: 200, fontSize: 16 }}
          />
        </div>
        {filteredTableHeads.length === 0 ? (
          <div style={{ color: '#64748b', background: '#f1f5f9', padding: 16, borderRadius: 8, textAlign: 'center' }}>
            לא נמצאו ראשי שולחן
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredTableHeads
              .filter(h => h.last_name.includes(filterTableHead))
              .map(head => (
                <div
                  key={head.id}
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '16px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    alignItems: 'center'
                  }}
                >
                  {editId === head.id ? (
                    <>
                      <input
                        value={editForm.last_name}
                        onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                        placeholder="שם משפחה"
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 120, fontSize: 16 }}
                      />
                      <input
                        value={editForm.phone}
                        onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="טלפון"
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 120, fontSize: 16 }}
                      />
                      <input
                        value={editForm.email}
                        onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="מייל"
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 120, fontSize: 16 }}
                      />
                      <input
                        value={editForm.category}
                        onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                        placeholder="קטגוריה"
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 120, fontSize: 16 }}
                      />
                      <select
                        value={editForm.gender}
                        onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                        style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 100, fontSize: 16 }}
                        required
                      >
                        <option value="">בחר מגדר</option>
                        <option value="male">זכר</option>
                        <option value="female">נקבה</option>
                      </select>
                      <button disabled={isViewer} onClick={handleEdit} style={{ background: '#4f8cff', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15, marginRight: 8 }}>שמור</button>
                      <button onClick={() => setEditId(null)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15 }}>ביטול</button>
                    </>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{head.last_name}</div>
                        <div style={{ display: 'flex', gap: 16, color: '#64748b', fontSize: 14 }}>
                          <span>{head.phone}</span>
                          <span>{head.email}</span>
                          {head.category && <span>קטגוריה: {head.category}</span>}
                          <span>{head.gender === 'male' ? 'זכר' : head.gender === 'female' ? 'נקבה' : ''}</span>
                        </div>
                      </div>
                      <button disabled={isViewer} onClick={() => { setEditId(head.id); setEditForm(head); }} style={{ background: '#4f8cff', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15 }}>ערוך</button>
                      <button disabled={isViewer} onClick={() => handleDelete(head.id)} style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, fontSize: 15 }}>מחק</button>
                    </>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
} 