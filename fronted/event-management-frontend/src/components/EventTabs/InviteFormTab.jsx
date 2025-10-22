// InviteFormTab.jsx
import React, { useState, useEffect } from "react";
import NewDonorsForm from "./forms/NewDonorsForm.jsx";
import WomenSeatingUpdateForm from "./forms/WomenSeatingUpdateForm.jsx";
import AddGuestsForm from "./forms/AddGuestsForm.jsx";
import IncreaseSddForm from "./forms/IncreaseSddForm.jsx";
import VipRegistrationForm from "./forms/VipRegistrationForm.jsx";

const defaultFields = [
  { name: "שם" },
  { name: "שם משפחה" },
  { name: "תעודת זהות" },
  { name: "טלפון" },
  { name: "אימייל" },
  { name: "מגדר" },
  { name: "בא עם בן/ת זוג?" },
  { name: "עדיפות למקום ישיבה" },
  { name: "מי הביא אותך?" },
  { name: 'הגדלת הו"ק חודשית ב:', options: ["300₪", "400₪", "500₪", "600₪", "700₪", "800₪", "900₪", "אחר"] },
  { name: 'עדכון השתתפות נשים דינר פ"נ *', options: [
    "השתתפות יחידה נשים",
    "לא משתתפת אחר",
    "לא משתתפת חו\"ל",
    "לא משתתפת עם משפחתית",
    "ספק"
  ] },
  { name: 'עדכון השתתפות גברים דינר פ"נ *', options: [
    "השתתפות יחיד",
    "לא משתתף אחר",
    "לא משתתף חו\"ל",
    "לא משתתף עם משפחתית",
    "ספק"
  ] },
  { name: "ברכה בספר הברכות" },
  { name: "הבאת אורח/ת נוסף/ת" },
  { name: "ליד מי תרצו לשבת? (משתתף ראשי)" },
];

// הגדרת 5 סוגי טפסים
const FORM_TABS = [
  { key: "new-donors", label: "תורמים חדשים" },
  { key: "women-seating-update", label: "עדכון הושבה נשים" },
  { key: "add-guests", label: "הוספת אורחים" },
  { key: "increase-sdd", label: "הגדלת הו\"ק" },
  { key: "vip-registration", label: "רישום VIP" },
];

function InviteFormTab({ eventId }) {
  console.log('InviteFormTab: eventId from props:', eventId);
  const getInitialFormFromUrl = () => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const f = sp.get('form');
      return FORM_TABS.some(t => t.key === f) ? f : FORM_TABS[0].key;
    } catch {
      return FORM_TABS[0].key;
    }
  };
  const [activeForm, setActiveForm] = useState(getInitialFormFromUrl());
  // תרומה: מצב ספציפי ל"תורמים חדשים"
  const [donationAmount, setDonationAmount] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [months, setMonths] = useState(24);
  const [currency, setCurrency] = useState('ILS');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTab, setPaymentTab] = useState('credit'); // 'credit' | 'bank'

  // שדות וטופס לפי סוג
  const [fieldsByForm, setFieldsByForm] = useState(() => {
    const map = {};
    FORM_TABS.forEach(t => { map[t.key] = []; });
    return map;
  });
  const [newField, setNewField] = useState("");
  const [newFieldType, setNewFieldType] = useState('text');
  const [logoUrl, setLogoUrl] = useState(null);
  const [formDataByForm, setFormDataByForm] = useState(() => {
    const map = {};
    FORM_TABS.forEach(t => { map[t.key] = {}; });
    return map;
  });

  const fields = fieldsByForm[activeForm] || [];
  const formData = formDataByForm[activeForm] || {};

  const role = localStorage.getItem("role");
  const isManager = role === "admin" || role === "event_admin";
  
  useEffect(() => {
    async function loadFields() {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=${activeForm}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const serverFields = res.ok ? await res.json() : [];
        // Keep id, name, type to enable drag ordering
        setFieldsByForm(prev => ({ ...prev, [activeForm]: serverFields.map(f => ({ id: f.id, name: f.name, type: f.field_type })) }));
      } catch (e) { console.error('loadFields failed', e); }
    }
    if (eventId && activeForm) loadFields();
  }, [eventId, activeForm]);

  const presetTiles = [
    { title: 'ידיד', amount: 250, per: 'לחודש × 24' },
    { title: 'מחזיק', amount: 360, per: 'לחודש × 24' },
    { title: 'תומך', amount: 500, per: 'לחודש' },
    { title: 'נועם נשאול', amount: 720, per: 'לחודש' },
    { title: 'שותף', amount: 1000, per: 'לחודש' },
    { title: 'זכות התורה אברך', amount: 1500, per: 'לחודש' },
    { title: 'זכות התורה חברותא', amount: 3000, per: 'לחודש' },
    { title: 'אוהב תורה', amount: 3600, per: 'לחודש' },
    { title: 'פרנס חברות י"ח עשרה ת"ח', amount: 18000, per: 'לחודש' },
    { title: 'פרנס חברות י"ח ת"ח', amount: 25000, per: 'לחודש' },
    { title: 'פרנס ההסעות ליום', amount: 36000 },
    { title: 'זכות בית המדרש', amount: 100000 },
  ];

  const DonationHeader = () => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14,
      boxShadow: '0 6px 18px rgba(0,0,0,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <select value={currency} onChange={e => setCurrency(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontWeight: 700 }}>
          <option value="ILS">₪ ILS</option>
        </select>
        <input
          type="number"
          min={0}
          value={donationAmount || ''}
          onChange={e => setDonationAmount(Number(e.target.value) || 0)}
          placeholder="הזנת סכום חופשי"
          style={{ width: 160, padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontWeight: 800, textAlign: 'left' }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
          הוראת קבע בסכום זה למשך
        </label>
        <select disabled={!isRecurring} value={months} onChange={e => setMonths(Number(e.target.value))}
          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #e2e8f0', minWidth: 70 }}>
          {[12, 18, 24, 36].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <span>חודשים</span>
      </div>
    </div>
  );

  // Unified input style to match existing design
  const fieldInputStyle = { width: '100%', padding: 14, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' };

  const DonationTiles = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: 16,
      marginTop: 14
    }}>
      {presetTiles.map((t, i) => {
        const selected = donationAmount === t.amount;
        return (
          <button key={i} onClick={() => setDonationAmount(t.amount)}
            style={{
              textAlign: 'center', background: selected ? '#eef2ff' : '#fff', borderRadius: 14,
              border: selected ? '2px solid #6366f1' : '1px solid #e2e8f0',
              padding: 18, minHeight: 130, boxShadow: selected ? '0 8px 18px rgba(99,102,241,0.25)' : '0 4px 10px rgba(0,0,0,0.04)',
              cursor: 'pointer'
            }}>
            <div style={{ color: '#64748b', marginBottom: 8, fontWeight: 700 }}>{t.title}</div>
            <div style={{ fontSize: 34, fontWeight: 900 }}>₪{t.amount.toLocaleString()}</div>
            {t.per && <div style={{ color: '#64748b', marginTop: 6 }}>{t.per}</div>}
          </button>
        );
      })}
    </div>
  );

  const PaymentPanel = () => (
    <div style={{ marginTop: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={() => setPaymentTab('credit')} style={{
          padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
          background: paymentTab === 'credit' ? '#111827' : '#fff', color: paymentTab === 'credit' ? '#fff' : '#334155', fontWeight: 700
        }}>אשראי</button>
        <button onClick={() => setPaymentTab('bank')} style={{
          padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0', cursor: 'pointer',
          background: paymentTab === 'bank' ? '#111827' : '#fff', color: paymentTab === 'bank' ? '#fff' : '#334155', fontWeight: 700
        }}>העברה בנקאית</button>
      </div>
      {paymentTab === 'credit' ? (
        <div style={{ display: 'grid', gap: 12, maxWidth: 820 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>מספר כרטיס אשראי:</label>
              <input placeholder="XXXX XXXX XXXX XXXX" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>תוקף:</label>
              <input placeholder="MM/YY" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label>3 ספרות בגב הכרטיס:</label>
              <input placeholder="CVV" style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
            </div>
          </div>
          <div style={{ marginTop: 8, fontWeight: 800, textAlign: 'center' }}>סה"כ לתשלום: {isRecurring ? `₪${donationAmount.toLocaleString()} לחודש` : `₪${donationAmount.toLocaleString()} חד פעמי`} {isRecurring ? ` למשך ${months} חודשים` : ''}</div>
          <div style={{ textAlign: 'center' }}>
            <button type="button" style={{ padding: '12px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}>תשלום</button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 720 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            להשלמת ההרשמה נא לבצע העברה בנקאית לישיבה. בלחיצה על "אישור", תיווצר התחייבות לתשלום מול הארגון ויש ליצור קשר עם הארגון להשלמת ההעברה ועבור קבלה.
          </div>
          <div style={{ textAlign: 'center' }}>
            <button type="button" style={{ padding: '12px 24px', background: '#f59e0b', color: '#111827', border: 'none', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}>אישור</button>
          </div>
        </div>
      )}
    </div>
  );

  const handleAddField = () => {
    if (!newField.trim()) return;
  
    const body = {
      field_name: newField,
      field_type: newFieldType,
      form_key: activeForm,
    };
  
    fetch(`http://localhost:8001/guests/events/${eventId}/form-fields`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('access_token')}` },
      body: JSON.stringify(body),
    })
      .then((res) => res.json())
      .then((data) => {
        setFieldsByForm(prev => ({
          ...prev,
          [activeForm]: [...(prev[activeForm] || []), { id: data.id, name: data.name, type: data.field_type }]
        }));
        setNewField("");
      })
      .catch((err) => {
        console.error("שגיאה בהוספת שדה:", err);
      });
  };

  // Drag & drop reorder
  const [dragIndex, setDragIndex] = useState(null);
  const onDragStart = (index) => setDragIndex(index);
  const onDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setFieldsByForm(prev => {
      const list = [...(prev[activeForm] || [])];
      const [moved] = list.splice(dragIndex, 1);
      list.splice(index, 0, moved);
      setDragIndex(index);
      return { ...prev, [activeForm]: list };
    });
  };
  const onDragEnd = async () => {
    setDragIndex(null);
    try {
      const token = localStorage.getItem('access_token');
      const ids = (fieldsByForm[activeForm] || []).map(f => f.id).filter(Boolean);
      await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ form_key: activeForm, ordered_ids: ids })
      });
    } catch (e) { console.error('reorder failed', e); }
  };

  function handleRemoveField(index) {
    setFieldsByForm(prev => {
      const updated = [...(prev[activeForm] || [])];
      updated.splice(index, 1);
      return { ...prev, [activeForm]: updated };
    });
  }

  function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleInputChange(name, value) {
    setFormDataByForm(prev => ({
      ...prev,
      [activeForm]: { ...(prev[activeForm] || {}), [name]: value }
    }));
  }

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

  const handleSubmit = async () => {
    try {
      if (!isValidIsraeliID(formData["תעודת זהות"])) {
        alert("תעודת זהות לא תקינה");
        return;
      }
      if (!isValidEmail(formData["אימייל"])) {
        alert("אימייל לא תקין");
        return;
      }
      if (!formData["מגדר"]) {
        alert("יש לבחור מגדר");
        return;
      }
      const payload = {
        event_id: parseInt(eventId),
        first_name: formData["שם"] || "",
        last_name: formData["שם משפחה"] || "",
        id_number: formData["תעודת זהות"] || "",
        address: "",
        phone: formData["טלפון"] || "",
        email: formData["אימייל"] || "",
        referral_source: formData["מי הביא אותך?"] || "",
        gender: formData["מגדר"] === "זכר" ? "male" : formData["מגדר"] === "נקבה" ? "female" : null
      };

      const guestResponse = await fetch(`http://localhost:8001/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify(payload)
      });

      if (!guestResponse.ok) {
        let msg = "שגיאה בהוספת מוזמן";
        try {
          const data = await guestResponse.json();
          if (data.detail) {
            if (Array.isArray(data.detail)) {
              msg = data.detail.map(d => d.msg).join(", ");
            } else if (typeof data.detail === "string") {
              msg = data.detail;
            }
          }
        } catch {}
        alert(msg);
        return;
      }

      const guest = await guestResponse.json();
      if (!guest.id) throw new Error("שמירת האורח נכשלה");

      const fieldValueRequests = Object.entries(formData).map(([field_name, value]) => {
        return fetch(`http://localhost:8001/guests/events/${eventId}/guests/${guest.id}/field-values`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem('access_token')}` },
          body: JSON.stringify({ field_name, value }),
        });
      });

      await Promise.all(fieldValueRequests);

      alert("ההזמנה נשלחה בהצלחה!");
      setFormDataByForm(prev => ({ ...prev, [activeForm]: {} }));

    } catch (error) {
      console.error("שגיאה בשליחה:", error);
      alert(error.message || "אירעה שגיאה בשליחה");
    }
  };

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('form', activeForm);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, [activeForm]);

  const shareLink = (() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('form', activeForm);
      return url.toString();
    } catch {
      return window.location.href;
    }
  })();

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('קישור הועתק');
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "16px", boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontWeight: 700 }}>🔧 הגדרת טופס הזמנה</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input readOnly value={shareLink} style={{ width: 320, padding: 8, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }} />
          <button onClick={copyShareLink} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>העתק קישור</button>
        </div>
      </div>

      {/* תתי-טאבים לטפסים */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {FORM_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveForm(tab.key); setShowPayment(false); }}
            style={{
              padding: '10px 16px',
              borderRadius: 999,
              border: '1px solid #e2e8f0',
              background: activeForm === tab.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
              color: activeForm === tab.key ? '#fff' : '#475569',
              boxShadow: activeForm === tab.key ? '0 6px 16px rgba(99,102,241,0.35)' : 'none',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(() => {
        const isBuiltInForm = ['new-donors','women-seating-update','add-guests','increase-sdd','vip-registration'].includes(activeForm);
        if (isBuiltInForm) return null;
        return (
      <form>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {(fields || []).map((field, index) => (
          <div
            key={field.id || index}
            draggable={isManager}
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragEnd={onDragEnd}
            style={{
              display: "flex",
              alignItems: "center",
              background: dragIndex === index ? '#eef2ff' : 'transparent',
              padding: 4, borderRadius: 6
            }}
          >
            {field.name === "מגדר" ? (
              <select
                required
                style={fieldInputStyle}
                value={formData["מגדר"] || ""}
                onChange={e => handleInputChange("מגדר", e.target.value)}
              >
                <option value="">בחר</option>
                <option value="זכר">זכר</option>
                <option value="נקבה">נקבה</option>
              </select>
            ) : field.options ? (
              <select
                style={fieldInputStyle}
                value={formData[field.name] || ""}
                onChange={e => handleInputChange(field.name, e.target.value)}
              >
                <option value="">בחר</option>
                {field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input type="checkbox" checked={!!formData[field.name]} onChange={e => handleInputChange(field.name, e.target.checked)} style={{ width: 24, height: 24 }} />
            ) : field.type === 'number' ? (
              <input
                type="number"
                placeholder={field.name}
                style={fieldInputStyle}
                value={formData[field.name] || ""}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
              />
            ) : (
              <input
                type="text"
                placeholder={field.name}
                style={fieldInputStyle}
                value={formData[field.name] || ""}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
              />
            )}
            {isManager && (
              <button
                type="button"
                style={{ marginRight: "10px" }}
                onClick={() => handleRemoveField(index)}
                title="הסר שדה מהרשימה (לא מוחק מהשרת)"
              >
                ❌
              </button>
            )}
          </div>
        ))}
        {isManager && (
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="הוספת שדה"
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddField(); } }}
              style={{ ...fieldInputStyle, paddingLeft: 90 }}
            />
            {newField.trim() && (
              <button
                type="button"
                onClick={handleAddField}
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', padding: '6px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}
              >
                שמור
              </button>
            )}
          </div>
        )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "6px",
          }}
        >
          שלח הזמנה
        </button>
      </form>
        );
      })()}
      {(activeForm === 'new-donors' || activeForm === 'women-seating-update' || activeForm === 'add-guests' || activeForm === 'increase-sdd' || activeForm === 'vip-registration') && (
        <div style={{ marginTop: 24 }}>
          {activeForm === 'new-donors' && <NewDonorsForm eventId={eventId} />}
          {activeForm === 'women-seating-update' && <WomenSeatingUpdateForm eventId={eventId} />}
          {activeForm === 'add-guests' && <AddGuestsForm eventId={eventId} />}
          {activeForm === 'increase-sdd' && <IncreaseSddForm eventId={eventId} />}
          {activeForm === 'vip-registration' && <VipRegistrationForm eventId={eventId} />}
        </div>
      )}
    </div>
  );
}

export default InviteFormTab;
export { InviteFormTab as InviteFormTabComponent };
