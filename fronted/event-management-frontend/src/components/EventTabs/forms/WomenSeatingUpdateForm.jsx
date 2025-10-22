import React, { useState, useEffect } from 'react';

export default function WomenSeatingUpdateForm({ eventId }) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [dialCode, setDialCode] = useState('+972');
	const [phone, setPhone] = useState('');
	const [email, setEmail] = useState('');
	const [spouseName, setSpouseName] = useState('');
	const [participationWomen, setParticipationWomen] = useState('');
	const [participationMen, setParticipationMen] = useState('');
	const [saving, setSaving] = useState(false);
	const [showErrors, setShowErrors] = useState(false);

	// Dynamic custom fields
	const [customFields, setCustomFields] = useState([]); // [{id,name,field_type}]
	const [customValues, setCustomValues] = useState({}); // name -> value
	const [newFieldName, setNewFieldName] = useState('');
	const [requireNewField, setRequireNewField] = useState(false);
	const role = localStorage.getItem('role');
	const canManageFields = role === 'admin' || role === 'event_admin';

	// Load custom fields for this form
	useEffect(() => {
		(async () => {
			try {
				const token = localStorage.getItem('access_token');
				const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=women-seating-update`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				const data = res.ok ? await res.json() : [];
				setCustomFields(Array.isArray(data) ? data : []);
			} catch (e) { console.error('load custom fields failed', e); }
		})();
	}, [eventId]);

	const inputStyle = { padding: 14, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' };
	const invalidStyle = { border: '1px solid #ef4444' };
	const isEmailValid = (val) => /^(?!.*\.{2})[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val.trim());
	const generateTempId = () => `TEMP-${eventId}-${Date.now()}-${Math.floor(Math.random()*10000)}`;

	const reloadFields = async () => {
		try {
			const token = localStorage.getItem('access_token');
			const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=women-seating-update`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const data = res.ok ? await res.json() : [];
			setCustomFields(Array.isArray(data) ? data : []);
		} catch (e) { console.error('reload custom fields failed', e); }
	};

	async function handleSubmit() {
		if (saving) return;
		if (!firstName.trim() || !lastName.trim() || !phone.trim()) { setShowErrors(true); return; }
		if (email.trim() && !isEmailValid(email)) { setShowErrors(true); return; }
		try {
			setSaving(true);
			const token = localStorage.getItem('access_token');
			// Determine gender based on participation choice - OPPOSITE of what will be created
			const gender = participationMen === 'השתתפות יחיד' ? 'female' : 'male';
			
			const guestPayload = {
				event_id: Number(eventId),
				first_name: firstName,
				last_name: lastName,
				id_number: generateTempId(),
				address: '',
				phone: `${dialCode} ${phone}`.trim(),
				email,
				referral_source: 'women_seating_update',
				gender: gender
			};
			const res = await fetch('http://localhost:8001/guests', {
				method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(guestPayload)
			});
			if (!res.ok) {
				const txt = await res.text();
				throw new Error(`(${res.status}) ${txt}`);
			}
			const guest = await res.json();

			const fv = [];
			if (spouseName) fv.push(saveGuestFieldValue(eventId, guest.id, 'שם בת זוג', spouseName));
			if (participationWomen) fv.push(saveGuestFieldValue(eventId, guest.id, 'עדכון השתתפות נשים דינר פ"נ *', participationWomen));
			if (participationMen) fv.push(saveGuestFieldValue(eventId, guest.id, 'עדכון השתתפות גברים דינר פ"נ *', participationMen));
			// Dynamic custom values
			for (const f of customFields) {
				const val = customValues[f.name];
				if (val !== undefined && val !== null && String(val).trim() !== '') {
					fv.push(saveGuestFieldValue(eventId, guest.id, f.name, String(val)));
				}
			}
			await Promise.all(fv);

			// Create spouse automatically based on participation choices
			console.log('Checking spouse creation:', { participationWomen, participationMen });
			
			// If selected "השתתפות יחיד" (men field), create הרב (husband)
			if (participationMen === 'השתתפות יחיד') {
				console.log('Creating הרב (husband) for השתתפות יחיד:', { firstName, lastName });
				// Create husband with same last name
				const spousePayload = {
					event_id: Number(eventId),
					first_name: 'הרב',
					last_name: lastName, // Same last name
					id_number: generateTempId(),
					address: '',
					phone: `${dialCode} ${phone}`.trim(), // Same phone
					email: email, // Same email
					referral_source: 'women_seating_update_spouse',
					gender: 'male'
				};
				
				console.log('Spouse payload:', spousePayload);
				const spouseRes = await fetch('http://localhost:8001/guests', {
					method: 'POST', 
					headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
					body: JSON.stringify(spousePayload)
				});
				
				console.log('Spouse creation response:', spouseRes.status, spouseRes.ok);
				if (spouseRes.ok) {
					const spouseGuest = await spouseRes.json();
					console.log('Spouse created successfully:', spouseGuest);
					// Save spouse participation field
					await saveGuestFieldValue(eventId, spouseGuest.id, 'עדכון השתתפות גברים דינר פ"נ *', 'השתתפות יחיד');
				} else {
					const errorText = await spouseRes.text();
					console.error('Failed to create spouse:', spouseRes.status, errorText);
				}
			}
			
			// If selected "השתתפות יחידה נשים" (women field), create גברת (wife)  
			else if (participationWomen === 'השתתפות יחידה נשים') {
				console.log('Creating גברת (wife) for השתתפות יחידה נשים:', { firstName, lastName });
				// Create wife with same last name
				const spousePayload = {
					event_id: Number(eventId),
					first_name: 'גברת',
					last_name: lastName, // Same last name
					id_number: generateTempId(),
					address: '',
					phone: `${dialCode} ${phone}`.trim(), // Same phone
					email: email, // Same email
					referral_source: 'women_seating_update_spouse',
					gender: 'female'
				};
				
				console.log('Spouse payload:', spousePayload);
				const spouseRes = await fetch('http://localhost:8001/guests', {
					method: 'POST', 
					headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
					body: JSON.stringify(spousePayload)
				});
				
				console.log('Spouse creation response:', spouseRes.status, spouseRes.ok);
				if (spouseRes.ok) {
					const spouseGuest = await spouseRes.json();
					console.log('Spouse created successfully:', spouseGuest);
					// Save spouse participation field
					await saveGuestFieldValue(eventId, spouseGuest.id, 'עדכון השתתפות נשים דינר פ"נ *', 'השתתפות יחידה נשים');
				} else {
					const errorText = await spouseRes.text();
					console.error('Failed to create spouse:', spouseRes.status, errorText);
				}
			}

			alert('הטופס נשלח בהצלחה');
			setFirstName('');
			setLastName('');
			setPhone('');
			setEmail('');
			setSpouseName('');
			setParticipationWomen('');
			setParticipationMen('');
			setShowErrors(false);
		} catch (e) {
			console.error(e);
			alert('שגיאה בשליחה: ' + e.message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div style={{ background: '#f3f4f6', borderRadius: 16, padding: 20 }}>
			<div style={{ textAlign: 'center', marginBottom: 22 }}>
				<div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a' }}>ברוכים הבאים! נודה על עזרתכם במילוי השאלון לגבי הושבה</div>
				<div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a' }}>כדי שנוכל לכבדכם כיאות</div>
			</div>

			{/* Row 1: first/last/phone */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
				<input placeholder="שם פרטי *" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ ...inputStyle, ...(showErrors && !firstName.trim() ? invalidStyle : {}) }} />
				<input placeholder="שם משפחה *" value={lastName} onChange={e => setLastName(e.target.value)} style={{ ...inputStyle, ...(showErrors && !lastName.trim() ? invalidStyle : {}) }} />
				<div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
					<select value={dialCode} onChange={e => setDialCode(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
						<option value="+972">ישראל +972</option>
						<option value="+1">ארה"ב/קנדה +1</option>
						<option value="+44">בריטניה +44</option>
						<option value="+49">גרמניה +49</option>
						<option value="+33">צרפת +33</option>
						<option value="+34">ספרד +34</option>
						<option value="+39">איטליה +39</option>
						<option value="+31">הולנד +31</option>
						<option value="+7">רוסיה +7</option>
						<option value="+380">אוקראינה +380</option>
						<option value="+91">הודו +91</option>
					</select>
					<input placeholder="מספר נייד *" value={phone} onChange={e => setPhone(e.target.value)} style={{ ...inputStyle, ...(showErrors && !phone.trim() ? invalidStyle : {}) }} />
				</div>
			</div>

			{/* Row 2: women/men/spouse */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<select value={participationWomen} onChange={e => setParticipationWomen(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
					<option value="">עדכון השתתפות נשים דינר פ"נ *</option>
					<option value="השתתפות יחידה נשים">השתתפות יחידה נשים</option>
					<option value="לא משתתפת אחר">לא משתתפת אחר</option>
					<option value='לא משתתפת חו"ל'>לא משתתפת חו"ל</option>
					<option value="לא משתתפת עם משפחתית">לא משתתפת עם משפחתית</option>
					<option value="ספק">ספק</option>
				</select>
				<select value={participationMen} onChange={e => setParticipationMen(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
					<option value="">השתתפות גברים דינר פ"נ *</option>
					<option value="השתתפות יחיד">השתתפות יחיד</option>
					<option value="לא משתתף אחר">לא משתתף אחר</option>
					<option value='לא משתתף חו"ל'>לא משתתף חו"ל</option>
					<option value="לא משתתף עם משפחתית">לא משתתף עם משפחתית</option>
					<option value="ספק">ספק</option>
				</select>
				<input placeholder="שם בת זוג *" value={spouseName} onChange={e => setSpouseName(e.target.value)} style={inputStyle} />
			</div>

			{/* Row 3: email */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<input placeholder="מייל" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, ...(showErrors && email.trim() && !isEmailValid(email) ? invalidStyle : {}) }} />
				<div />
				<div />
			</div>

			{/* Dynamic custom fields */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				{customFields.map((f) => {
					const isReq = !!(f?.required || String(f.name).trim().endsWith(' *'));
					const hasVal = String(customValues[f.name] || '').trim() !== '';
					return (
						<div key={f.id} style={{ display: 'grid', gridTemplateColumns: canManageFields ? '1fr auto' : '1fr', alignItems: 'center', gap: 8 }}>
							<input
								placeholder={isReq && !String(f.name).trim().endsWith(' *') ? `${f.name} *` : f.name}
								value={customValues[f.name] || ''}
								onChange={e => setCustomValues(v => ({ ...v, [f.name]: e.target.value }))}
								style={{ ...inputStyle, ...(showErrors && isReq && !hasVal ? invalidStyle : {}) }}
							/>
							{canManageFields && (
								<button type="button" onClick={async () => { try { const token = localStorage.getItem('access_token'); await fetch(`http://localhost:8001/guests/custom-field/${f.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); reloadFields(); } catch(e) { console.error('delete custom field failed', e); } }} title="מחק שדה" style={{ padding: '6px 8px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>✕</button>
							)}
						</div>
					);
				})}

				<div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8 }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><input type="checkbox" checked={requireNewField} onChange={e => setRequireNewField(e.target.checked)} /> שדה חובה</label>
					<input placeholder="הוספת שדה" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); /* will call add below */ } }} style={inputStyle} />
					<button type="button" onClick={async () => { const name = newFieldName.trim(); if (!name) return; try { const token = localStorage.getItem('access_token'); await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ field_name: name, field_type: 'text', form_key: 'women-seating-update', required: requireNewField }) }); setNewFieldName(''); setRequireNewField(false); reloadFields(); } catch(e) { console.error('add custom field failed', e); } }} disabled={!newFieldName.trim()} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: newFieldName.trim() ? '#fff' : '#e5e7eb', cursor: newFieldName.trim() ? 'pointer' : 'not-allowed' }}>שמור</button>
				</div>
			</div>

			<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
				<button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: '12px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
					שליחה
				</button>
			</div>
		</div>
	);
}

function saveGuestFieldValue(eventId, guestId, field_name, value) {
	const token = localStorage.getItem('access_token');
	return fetch(`http://localhost:8001/events/${eventId}/guests/${guestId}/field-values`, {
		method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
		body: JSON.stringify({ guest_id: guestId, field_name, value })
	});
} 

async function addFieldRequest(eventId, name, required) {
	const token = localStorage.getItem('access_token');
	await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
		body: JSON.stringify({ field_name: name, field_type: 'text', form_key: 'women-seating-update', required })
	});
}

function addField() {
	// this helper will be invoked from UI
	// It uses above addFieldRequest and reloads fields
}