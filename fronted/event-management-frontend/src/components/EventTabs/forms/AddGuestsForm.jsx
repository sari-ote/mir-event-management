import React, { useState, useEffect } from 'react';

export default function AddGuestsForm({ eventId }) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [spouseName, setSpouseName] = useState('');

	const [dialCode, setDialCode] = useState('+972');
	const [phone, setPhone] = useState('');
	const [altDialCode, setAltDialCode] = useState('+972');
	const [altPhone, setAltPhone] = useState('');
	const [email, setEmail] = useState('');

	const [street, setStreet] = useState('');
	const [city, setCity] = useState('');
	const [neighborhood, setNeighborhood] = useState('');
	const [buildingNumber, setBuildingNumber] = useState('');
	const [occupation, setOccupation] = useState('');

	const [participationWomen, setParticipationWomen] = useState('');
	const [participationMen, setParticipationMen] = useState('');
	const [donationAbility, setDonationAbility] = useState('');
	const [enteredBy, setEnteredBy] = useState('');
	const [groupAssociation, setGroupAssociation] = useState('ללא שיוך');
	const [tableHeads, setTableHeads] = useState([]); // fetched list of table heads
	const [remarks, setRemarks] = useState('');

	// removed extra guests feature
	const [saving, setSaving] = useState(false);
	const [showErrors, setShowErrors] = useState(false);

	// Dynamic custom fields
	const [customFields, setCustomFields] = useState([]);
	const [customValues, setCustomValues] = useState({});
	const [newFieldName, setNewFieldName] = useState('');
	const [requireNewField, setRequireNewField] = useState(false);
	const role = localStorage.getItem('role');
	const canManageFields = role === 'admin' || role === 'event_admin';

	const inputStyle = { padding: 14, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' };
	const invalidStyle = { border: '1px solid #ef4444' };
	const isEmailValid = (val) => /^(?!.*\.{2})[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val.trim());
	const generateTempId = () => `TEMP-${eventId}-${Date.now()}-${Math.floor(Math.random()*10000)}`;

	const isCustomRequiredFilled = () => customFields.every(f => {
		const isReq = !!(f?.required || String(f?.name || '').trim().endsWith(' *'));
		if (!isReq) return true;
		return String(customValues[f.name] || '').trim() !== '';
	});

	const isRequiredFilled = () => participationMen && participationWomen && enteredBy.trim() && isCustomRequiredFilled();

	// Load all table heads for this event
	useEffect(() => {
		const token = localStorage.getItem('access_token');
		if (!eventId || !token) return;
		fetch(`http://localhost:8001/tables/table-heads/event/${eventId}`, {
			headers: { 'Authorization': `Bearer ${token}` }
		})
		  .then(r => r.ok ? r.json() : [])
		  .then(list => setTableHeads(Array.isArray(list) ? list : []))
		  .catch(() => setTableHeads([]));
	}, [eventId]);

	// Load custom fields for this form
	useEffect(() => {
		(async () => {
			try {
				const token = localStorage.getItem('access_token');
				const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=add-guests`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				const data = res.ok ? await res.json() : [];
				setCustomFields(Array.isArray(data) ? data : []);
			} catch (e) { console.error('load custom fields failed', e); }
		})();
	}, [eventId]);

	const addField = async () => {
		const name = newFieldName.trim();
		if (!name) return;
		try {
			await addFieldRequest(eventId, name, requireNewField);
			setNewFieldName('');
			setRequireNewField(false);
			reloadFields();
		} catch (e) { console.error('add custom field failed', e); }
	};

	const reloadFields = async () => {
		try {
			const token = localStorage.getItem('access_token');
			const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=add-guests`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const data = res.ok ? await res.json() : [];
			setCustomFields(Array.isArray(data) ? data : []);
		} catch (e) { console.error('reload custom fields failed', e); }
	};

	async function deleteField(fieldId) {
		try {
			const token = localStorage.getItem('access_token');
			await fetch(`http://localhost:8001/guests/custom-field/${fieldId}`, {
				method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
			});
			reloadFields();
		} catch (e) { console.error('delete custom field failed', e); }
	}

	async function handleSubmit() {
		if (saving) return;
		if (!isRequiredFilled()) { setShowErrors(true); return; }
		if (email.trim() && !isEmailValid(email)) { setShowErrors(true); return; }
		try {
			setSaving(true);
			const token = localStorage.getItem('access_token');
			const mainPayload = {
				event_id: Number(eventId),
				first_name: firstName,
				last_name: lastName,
				id_number: generateTempId(),
				address: [street, buildingNumber, neighborhood, city].filter(Boolean).join(' '),
				phone: `${dialCode} ${phone}`.trim(),
				email,
				referral_source: 'add_guests_form',
				gender: 'male'
			};
			const res = await fetch('http://localhost:8001/guests', {
				method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(mainPayload)
			});
			if (!res.ok) {
				const txt = await res.text();
				throw new Error(`(${res.status}) ${txt}`);
			}
			const mainGuest = await res.json();

			const requests = [];
			// Save all additional fields as field-values to match the screenshot
			if (spouseName) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'שם בת הזוג', spouseName));
			if (altPhone) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'טלפון נוסף', `${altDialCode} ${altPhone}`.trim()));
			if (street) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'רחוב', street));
			if (city) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'עיר', city));
			if (neighborhood) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'שכונה', neighborhood));
			if (buildingNumber) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'מספר בנין', buildingNumber));
			if (occupation) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'עיסוק', occupation));
			if (participationMen) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'השתתפות גברים דינר פ"נ *', participationMen));
			if (participationWomen) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'עדכון השתתפות נשים דינר פ"נ *', participationWomen));
			if (donationAbility) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'יכולת תרומה', donationAbility));
			if (enteredBy) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'הוכנס למערכת ע"י *', enteredBy));
			if (groupAssociation) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'דרך קבוצה (שדה רשות)', groupAssociation));
			if (remarks) requests.push(saveGuestFieldValue(eventId, mainGuest.id, 'הערות', remarks));

			// dynamic custom values
			for (const f of customFields) {
				const val = customValues[f.name];
				if (val !== undefined && val !== null && String(val).trim() !== '') {
					requests.push(saveGuestFieldValue(eventId, mainGuest.id, f.name, String(val)));
				}
			}

			// extra guests removed per request

			await Promise.all(requests);

			// Create spouse automatically based on participation choices
			if (participationMen === 'השתתפות יחיד') {
				// Create wife with same last name
				const spousePayload = {
					event_id: Number(eventId),
					first_name: 'גברת',
					last_name: lastName, // Same last name as the man
					id_number: generateTempId(),
					address: [street, buildingNumber, neighborhood, city].filter(Boolean).join(' '),
					phone: `${dialCode} ${phone}`.trim(), // Same phone
					email: email, // Same email
					referral_source: 'add_guests_form_spouse',
					gender: 'female'
				};
				
				const spouseRes = await fetch('http://localhost:8001/guests', {
					method: 'POST', 
					headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
					body: JSON.stringify(spousePayload)
				});
				
				if (spouseRes.ok) {
					const spouseGuest = await spouseRes.json();
					// Save spouse participation field
					await saveGuestFieldValue(eventId, spouseGuest.id, 'עדכון השתתפות נשים דינר פ"נ *', 'השתתפות יחידה נשים');
					// Copy other relevant fields to spouse
					if (street) await saveGuestFieldValue(eventId, spouseGuest.id, 'רחוב', street);
					if (city) await saveGuestFieldValue(eventId, spouseGuest.id, 'עיר', city);
					if (neighborhood) await saveGuestFieldValue(eventId, spouseGuest.id, 'שכונה', neighborhood);
					if (buildingNumber) await saveGuestFieldValue(eventId, spouseGuest.id, 'מספר בנין', buildingNumber);
					if (donationAbility) await saveGuestFieldValue(eventId, spouseGuest.id, 'יכולת תרומה', donationAbility);
					if (enteredBy) await saveGuestFieldValue(eventId, spouseGuest.id, 'הוכנס למערכת ע"י *', enteredBy);
					if (remarks) await saveGuestFieldValue(eventId, spouseGuest.id, 'הערות', remarks);
				}
			}

			alert('הוספת האורחים נשמרה בהצלחה');
			// reset
			setFirstName(''); setLastName(''); setSpouseName('');
			setDialCode('+972'); setPhone(''); setAltDialCode('+972'); setAltPhone(''); setEmail('');
			setStreet(''); setCity(''); setNeighborhood(''); setBuildingNumber(''); setOccupation('');
			setParticipationMen(''); setParticipationWomen(''); setDonationAbility(''); setEnteredBy(''); setGroupAssociation('ללא שיוך'); setRemarks('');
			setShowErrors(false);
		} catch (e) {
			console.error(e);
			alert('שגיאה בשמירה: ' + e.message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="form-container">
			<div className="form-title">יש להכין את מספר הפרטים המריבים</div>

			{/* Row 1 */}
			<div className="form-grid">
				<input placeholder="שם פרטי" value={firstName} onChange={e => setFirstName(e.target.value)} className="form-input" />
				<input placeholder="שם משפחה" value={lastName} onChange={e => setLastName(e.target.value)} className="form-input" />
				<input placeholder="שם בת הזוג" value={spouseName} onChange={e => setSpouseName(e.target.value)} className="form-input" />
			</div>

			{/* Row 2: phones + email */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
					<select value={altDialCode} onChange={e => setAltDialCode(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
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
					<input placeholder="טלפון נוסף" value={altPhone} onChange={e => setAltPhone(e.target.value)} style={inputStyle} />
				</div>
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
					<input placeholder="מספר נייד" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
				</div>
				<input placeholder="מייל" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, ...(showErrors && email.trim() && !isEmailValid(email) ? invalidStyle : {}) }} />
			</div>

			{/* Row 3: address */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<input placeholder="שכונה" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} style={inputStyle} />
				<input placeholder="מספר בנין" value={buildingNumber} onChange={e => setBuildingNumber(e.target.value)} style={inputStyle} />
				<input placeholder="רחוב" value={street} onChange={e => setStreet(e.target.value)} style={inputStyle} />
			</div>

			{/* Row 4: city, occupation, men participation */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<select value={participationMen} onChange={e => setParticipationMen(e.target.value)} style={{ ...inputStyle, background: '#fff', ...(showErrors && !participationMen ? invalidStyle : {}) }}>
					<option value="">השתתפות גברים דינר פ"נ *</option>
					<option value="השתתפות יחיד">השתתפות יחיד</option>
					<option value='לא משתתף חו"ל'>לא משתתף חו"ל</option>
					<option value="לא משתתף אחר">לא משתתף אחר</option>
					<option value="לא משתתף עם משפחתית">לא משתתף עם משפחתית</option>
					<option value="ספק">ספק</option>
				</select>
				<input placeholder="עיסוק" value={occupation} onChange={e => setOccupation(e.target.value)} style={inputStyle} />
				<input placeholder="עיר" value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
			</div>
			{showErrors && !participationMen && (
				<div style={{ color: '#ef4444', fontSize: 12, marginTop: -8 }}>חובה</div>
			)}

			{/* Row 5: entered by, donation ability, women participation */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<input placeholder='הוכנס למערכת ע"י *' value={enteredBy} onChange={e => setEnteredBy(e.target.value)} style={{ ...inputStyle, ...(showErrors && !enteredBy.trim() ? invalidStyle : {}) }} />
				<select value={donationAbility} onChange={e => setDonationAbility(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
					<option value="">יכולת תרומה:</option>
					<option value='הו"ק גבוהה'>הו"ק גבוהה</option>
					<option value='הו"ק רגילה'>הו"ק רגילה</option>
					<option value="יכולת גבוהה">יכולת גבוהה</option>
					<option value="לא ידוע">לא ידוע</option>
					<option value="VIP">VIP</option>
				</select>
				<select value={participationWomen} onChange={e => setParticipationWomen(e.target.value)} style={{ ...inputStyle, background: '#fff', ...(showErrors && !participationWomen ? invalidStyle : {}) }}>
					<option value="">עדכון השתתפות נשים דינר פ"נ *</option>
					<option value="השתתפות יחידה נשים">השתתפות יחידה נשים</option>
					<option value='לא משתתפת חו"ל'>לא משתתפת חו"ל</option>
					<option value="לא משתתפת אחר">לא משתתפת אחר</option>
					<option value="לא משתתפת עם משפחתית">לא משתתפת עם משפחתית</option>
					<option value="ספק">ספק</option>
				</select>
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
								<button type="button" onClick={() => deleteField(f.id)} title="מחק שדה" style={{ padding: '6px 8px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>✕</button>
							)}
						</div>
					);
				})}
				<div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8 }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><input type="checkbox" checked={requireNewField} onChange={e => setRequireNewField(e.target.checked)} /> שדה חובה</label>
					<input placeholder="הוספת שדה" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }} style={inputStyle} />
					<button type="button" onClick={addField} disabled={!newFieldName.trim()} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: newFieldName.trim() ? '#fff' : '#e5e7eb', cursor: newFieldName.trim() ? 'pointer' : 'not-allowed' }}>שמור</button>
				</div>
			</div>
			{showErrors && (!enteredBy.trim() || !participationWomen) && (
				<div style={{ color: '#ef4444', fontSize: 12, marginTop: -8 }}>חובה</div>
			)}

			{/* Row 6: group association + remarks */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<select value={groupAssociation} onChange={e => setGroupAssociation(e.target.value)} style={{ ...inputStyle, background: '#fff', height: 48 }}>
					<option value="ללא שיוך">ללא שיוך</option>
					{tableHeads.map(th => (
						<option key={th.id || th.last_name} value={th.last_name}>{th.last_name}</option>
					))}
				</select>
				<div />
				<textarea placeholder="הערות:" value={remarks} onChange={e => setRemarks(e.target.value)} style={{ ...inputStyle, minHeight: 120 }} />
			</div>

			<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
				<button type="button" onClick={handleSubmit} disabled={saving} style={{ padding: '12px 24px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
					שמירה
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
		body: JSON.stringify({ field_name: name, field_type: 'text', form_key: 'add-guests', required })
	});
}
