import React, { useEffect, useState } from 'react';

export default function IncreaseSddForm({ eventId }) {
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [spouseName, setSpouseName] = useState('');

	const [dialCode, setDialCode] = useState('+972');
	const [phone, setPhone] = useState('');
	const [email, setEmail] = useState('');

	const [street, setStreet] = useState('');
	const [city, setCity] = useState('');
	const [neighborhood, setNeighborhood] = useState('');
	const [buildingNumber, setBuildingNumber] = useState('');
	const [apartment, setApartment] = useState('');
	const [occupation, setOccupation] = useState('');

	const [sddIncrease, setSddIncrease] = useState('');
	const [participationWomen, setParticipationWomen] = useState('');
	const [participationMen, setParticipationMen] = useState('');
	const [donationAbility, setDonationAbility] = useState('');
	const [enteredBy, setEnteredBy] = useState('');
	const [blessingOption, setBlessingOption] = useState(''); // הוספת פרטים עכשיו | לא נצרך | שימוש בברכה של הדינר הקודם
	const [remarks, setRemarks] = useState(''); // תוכן הברכה
	const [blessingSigner, setBlessingSigner] = useState('');
	const [blessingLogo, setBlessingLogo] = useState(null);
	const [extraGuestsMain, setExtraGuestsMain] = useState('');
	const [extraGuests, setExtraGuests] = useState([]); // [{firstName,lastName,idNumber,gender,seatNear}]
	const [seatNearMain, setSeatNearMain] = useState('');
	const [saving, setSaving] = useState(false);
	const [showErrors, setShowErrors] = useState(false);

	// Dynamic custom fields for this form
	const [customFields, setCustomFields] = useState([]); // [{id,name,field_type}]
	const [customValues, setCustomValues] = useState({}); // name->value
	const [newFieldName, setNewFieldName] = useState('');
	const [requireNewField, setRequireNewField] = useState(false);
	const role = localStorage.getItem('role');
	const canManageFields = role === 'admin' || role === 'event_admin';

	const inputStyle = { padding: 14, borderRadius: 16, border: '1px solid #e2e8f0', background: '#fff' };
	const compactInputStyle = { ...inputStyle, padding: 10, borderRadius: 12, fontSize: 14 };
	const invalidStyle = { border: '1px solid #ef4444' };
	const isEmailValid = (val) => /^(?!.*\.{2})[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(val.trim());
	const generateTempId = () => `TEMP-${eventId}-${Date.now()}-${Math.floor(Math.random()*10000)}`;

	useEffect(() => {
		// load custom fields for this form
		(async () => {
			try {
				const token = localStorage.getItem('access_token');
				const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=increase-sdd`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				const data = res.ok ? await res.json() : [];
				setCustomFields(Array.isArray(data) ? data : []);
			} catch (e) { console.error('load custom fields failed', e); }
		})();
	}, [eventId]);

	const reloadFields = async () => {
		try {
			const token = localStorage.getItem('access_token');
			const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=increase-sdd`, {
				headers: { Authorization: `Bearer ${token}` }
			});
			const data = res.ok ? await res.json() : [];
			setCustomFields(Array.isArray(data) ? data : []);
		} catch (e) { console.error('reload custom fields failed', e); }
	};

	// sync extra guests array with selected count
	useEffect(() => {
		const count = Number(extraGuestsMain) || 0;
		setExtraGuests(prev => {
			const arr = [...prev];
			if (count > arr.length) {
				for (let i = arr.length; i < count; i++) {
					arr.push({ firstName: '', lastName: '', idNumber: '', gender: '', seatNear: '' });
				}
			}
			if (count < arr.length) {
				arr.length = count;
			}
			return arr;
		});
	}, [extraGuestsMain]);

	const updateExtra = (idx, patch) => {
		setExtraGuests(prev => {
			const arr = [...prev];
			arr[idx] = { ...arr[idx], ...patch };
			return arr;
		});
	};

	const isCustomRequiredFilled = () => customFields.every(f => {
		const isReq = !!(f?.required || String(f?.name || '').trim().endsWith(' *'));
		if (!isReq) return true;
		return String(customValues[f.name] || '').trim() !== '';
	});
	const isRequiredFilled = () => participationMen && participationWomen && enteredBy.trim() && isCustomRequiredFilled();

	async function handleSubmit() {
		if (saving) return;
		if (!isRequiredFilled()) { setShowErrors(true); return; }
		if (email.trim() && !isEmailValid(email)) { setShowErrors(true); return; }
		try {
			setSaving(true);
			const token = localStorage.getItem('access_token');
			const payload = {
				event_id: Number(eventId),
				first_name: firstName,
				last_name: lastName,
				id_number: generateTempId(),
				address: [street, buildingNumber, apartment, neighborhood, city].filter(Boolean).join(' '),
				phone: `${dialCode} ${phone}`.trim(),
				email,
				referral_source: 'increase_sdd_form',
				gender: 'male'
			};
			const res = await fetch('http://localhost:8001/guests', {
				method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
				body: JSON.stringify(payload)
			});
			if (!res.ok) {
				const txt = await res.text();
				throw new Error(`(${res.status}) ${txt}`);
			}
			const guest = await res.json();

			const requests = [];
			if (spouseName) requests.push(saveGuestFieldValue(eventId, guest.id, 'שם בת הזוג', spouseName));
			if (street) requests.push(saveGuestFieldValue(eventId, guest.id, 'רחוב', street));
			if (buildingNumber) requests.push(saveGuestFieldValue(eventId, guest.id, 'מספר בנין', buildingNumber));
			if (apartment) requests.push(saveGuestFieldValue(eventId, guest.id, 'מספר דירה', apartment));
			if (neighborhood) requests.push(saveGuestFieldValue(eventId, guest.id, 'שכונה', neighborhood));
			if (city) requests.push(saveGuestFieldValue(eventId, guest.id, 'עיר', city));
			if (occupation) requests.push(saveGuestFieldValue(eventId, guest.id, 'עיסוק', occupation));
			if (sddIncrease) requests.push(saveGuestFieldValue(eventId, guest.id, 'הגדלת הו"ק חודשית ב:', sddIncrease));
			if (participationMen) requests.push(saveGuestFieldValue(eventId, guest.id, 'השתתפות גברים דינר פ"נ *', participationMen));
			if (participationWomen) requests.push(saveGuestFieldValue(eventId, guest.id, 'עדכון השתתפות נשים דינר פ"נ *', participationWomen));
			if (donationAbility) requests.push(saveGuestFieldValue(eventId, guest.id, 'יכולת תרומה', donationAbility));
			if (enteredBy) requests.push(saveGuestFieldValue(eventId, guest.id, 'הוכנס למערכת ע"י *', enteredBy));
			if (blessingOption) requests.push(saveGuestFieldValue(eventId, guest.id, 'ברכה בספר הברכות', blessingOption));
			if (blessingOption === 'הוספת פרטים עכשיו') {
				if (blessingSigner) requests.push(saveGuestFieldValue(eventId, guest.id, 'ברכה - חותם', blessingSigner));
				if (remarks) requests.push(saveGuestFieldValue(eventId, guest.id, 'ברכה - תוכן', remarks));
				if (blessingLogo) requests.push(saveGuestFieldValue(eventId, guest.id, 'ברכה - לוגו', blessingLogo.name));
			}
			requests.push(saveGuestFieldValue(eventId, guest.id, 'הבאת אורח/ת נוספת *', String(Number(extraGuestsMain) || 0)));
			if (seatNearMain) requests.push(saveGuestFieldValue(eventId, guest.id, 'ליד מי תרצו לשבת? (משתתף ראשי)', seatNearMain));

			// Create extra guests
			for (let i = 0; i < extraGuests.length; i++) {
				const eg = extraGuests[i];
				if (!eg.firstName && !eg.lastName) continue;
				const egPayload = {
					event_id: Number(eventId),
					first_name: eg.firstName || '',
					last_name: eg.lastName || '',
					address: '',
					phone: '',
					email: '',
					referral_source: 'extra_guest',
					gender: eg.gender === 'זכר' ? 'male' : eg.gender === 'נקבה' ? 'female' : 'male'
				};
				if ((eg.idNumber || '').trim()) { egPayload.id_number = eg.idNumber.trim(); }
				/* eslint-disable no-await-in-loop */
				const r = await fetch('http://localhost:8001/guests', {
					method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
					body: JSON.stringify(egPayload)
				});
				if (r.ok) {
					const gjson = await r.json();
					if (eg.seatNear) await saveGuestFieldValue(eventId, gjson.id, `ליד מי תרצו לשבת? (משתתף ${i+1})`, eg.seatNear);
				}
			}

			// Save dynamic custom field values
			for (const f of customFields) {
				const val = customValues[f.name];
				if (val !== undefined && val !== null && String(val).trim() !== '') {
					requests.push(saveGuestFieldValue(eventId, guest.id, f.name, String(val)));
				}
			}
			await Promise.all(requests);

			// Create spouse automatically based on participation choices
			if (participationWomen === 'השתתפות יחידה נשים') {
				// Create husband with same last name
				const spousePayload = {
					event_id: Number(eventId),
					first_name: 'הרב',
					last_name: lastName, // Same last name as the woman
					id_number: generateTempId(),
					address: [street, buildingNumber, neighborhood, city].filter(Boolean).join(' '),
					phone: `${dialCode} ${phone}`.trim(), // Same phone
					email: email, // Same email
					referral_source: 'increase_sdd_form_spouse',
					gender: 'male'
				};
				
				const spouseRes = await fetch('http://localhost:8001/guests', {
					method: 'POST', 
					headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
					body: JSON.stringify(spousePayload)
				});
				
				if (spouseRes.ok) {
					const spouseGuest = await spouseRes.json();
					// Save spouse participation field
					await saveGuestFieldValue(eventId, spouseGuest.id, 'עדכון השתתפות גברים דינר פ"נ *', 'השתתפות יחיד');
					// Copy other relevant fields to spouse
					if (occupation) await saveGuestFieldValue(eventId, spouseGuest.id, 'עיסוק', occupation);
					if (donationAbility) await saveGuestFieldValue(eventId, spouseGuest.id, 'יכולת תרומה', donationAbility);
					if (enteredBy) await saveGuestFieldValue(eventId, spouseGuest.id, 'הוכנס למערכת ע"י *', enteredBy);
				}
			} else if (participationMen === 'השתתפות יחיד') {
				// Create wife with same last name
				const spousePayload = {
					event_id: Number(eventId),
					first_name: 'גברת',
					last_name: lastName, // Same last name as the man
					id_number: generateTempId(),
					address: [street, buildingNumber, neighborhood, city].filter(Boolean).join(' '),
					phone: `${dialCode} ${phone}`.trim(), // Same phone
					email: email, // Same email
					referral_source: 'increase_sdd_form_spouse',
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
					if (occupation) await saveGuestFieldValue(eventId, spouseGuest.id, 'עיסוק', occupation);
					if (donationAbility) await saveGuestFieldValue(eventId, spouseGuest.id, 'יכולת תרומה', donationAbility);
					if (enteredBy) await saveGuestFieldValue(eventId, spouseGuest.id, 'הוכנס למערכת ע"י *', enteredBy);
				}
			}

			alert('הטופס נשמר בהצלחה');
			setFirstName(''); setLastName(''); setSpouseName('');
			setDialCode('+972'); setPhone(''); setEmail('');
			setStreet(''); setCity(''); setNeighborhood(''); setBuildingNumber(''); setApartment(''); setOccupation('');
			setSddIncrease(''); setParticipationMen(''); setParticipationWomen(''); setDonationAbility(''); setEnteredBy(''); setBlessingOption(''); setRemarks(''); setBlessingSigner(''); setBlessingLogo(null); setExtraGuestsMain(''); setExtraGuests([]); setSeatNearMain('');
			setShowErrors(false);
		} catch (e) {
			console.error(e);
			alert('שגיאה בשמירה: ' + e.message);
		} finally {
			setSaving(false);
		}
	}

	async function handleAddCustomField() {
		const name = newFieldName.trim();
		if (!name) return;
		try {
			const token = localStorage.getItem('access_token');
			await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ field_name: name, field_type: 'text', form_key: 'increase-sdd', required: requireNewField })
			});
			setNewFieldName('');
			// reload list
			const res = await fetch(`http://localhost:8001/guests/events/${eventId}/form-fields?form_key=increase-sdd`, {
				headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
			});
			const data = res.ok ? await res.json() : [];
			setCustomFields(Array.isArray(data) ? data : []);
		} catch (e) { console.error('add custom field failed', e); }
	}

	async function deleteField(fieldId) {
		try {
			const token = localStorage.getItem('access_token');
			await fetch(`http://localhost:8001/guests/custom-field/${fieldId}`, {
				method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
			});
			reloadFields();
		} catch (e) { console.error('delete custom field failed', e); }
	}

	return (
		<div style={{ background: '#f3f4f6', borderRadius: 16, padding: 20 }}>
			<div style={{ textAlign: 'center', marginBottom: 22 }}>
				<div style={{ fontSize: 26, fontWeight: 900, color: '#0f172a' }}>עד לפתיחת שערים</div>
			</div>

			{/* Row 1: first, last, email */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
				<input placeholder="שם פרטי (משתתף ראשי)" value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
				<input placeholder="שם משפחה (משתתף ראשי)" value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
				<input placeholder="מייל (משתתף ראשי)" value={email} onChange={e => setEmail(e.target.value)} style={{ ...inputStyle, ...(showErrors && email.trim() && !isEmailValid(email) ? invalidStyle : {}) }} />
			</div>

			{/* Row 2: phone (single) */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
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
					<input placeholder="מספר נייד (משתתף ראשי)" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
				</div>
				<input placeholder="עיר" value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
				<input placeholder="רחוב" value={street} onChange={e => setStreet(e.target.value)} style={inputStyle} />
			</div>

			{/* Row 3: building, apt (street moved up) */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<input placeholder="מספר בניין" value={buildingNumber} onChange={e => setBuildingNumber(e.target.value)} style={inputStyle} />
				<input placeholder="מספר דירה" value={apartment} onChange={e => setApartment(e.target.value)} style={inputStyle} />
				<input placeholder='הוכנס למערכת ע"י *' value={enteredBy} onChange={e => setEnteredBy(e.target.value)} style={{ ...inputStyle, ...(showErrors && !enteredBy.trim() ? invalidStyle : {}) }} />
			</div>

			{/* Row 4: HOK, blessing select */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<select value={sddIncrease} onChange={e => setSddIncrease(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
					<option value="">הגדלת הו"ק חודשית ב:</option>
					{Array.from({ length: 10 }, (_, i) => (i + 1) * 100).map(v => (
						<option key={v} value={`${v}₪`}>{`${v}₪`}</option>
					))}
				</select>
				<select value={blessingOption} onChange={e => setBlessingOption(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
					<option value="">ברכה בספר הברכות</option>
					<option value="הוספת פרטים עכשיו">הוספת פרטים עכשיו</option>
					<option value="לא נצרך">לא נצרך</option>
					<option value="שימוש בברכה של הדינר הקודם">שימוש בברכה של הדינר הקודם</option>
				</select>
				<input placeholder="ליד מי תרצו לשבת? (משתתף ראשי)" value={seatNearMain} onChange={e => setSeatNearMain(e.target.value)} style={inputStyle} />
			</div>

			{blessingOption === 'הוספת פרטים עכשיו' && (
				<div style={{ marginTop: 12 }}>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
						<input placeholder="שם חותם הברכה" value={blessingSigner} onChange={e => setBlessingSigner(e.target.value)} style={compactInputStyle} />
						<textarea placeholder="תוכן הברכה *" value={remarks} onChange={e => setRemarks(e.target.value)} style={{ ...compactInputStyle, minHeight: 60 }} />
						<input type="file" accept="image/*" onChange={e => setBlessingLogo(e.target.files?.[0] || null)} style={compactInputStyle} />
					</div>
				</div>
			)}

			{/* Row 5: donation ability, extra guests */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 12 }}>
				<select value={donationAbility} onChange={e => setDonationAbility(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
					<option value="">יכולת תרומה:</option>
					<option value='הו"ק גבוהה'>הו"ק גבוהה</option>
					<option value='הו"ק רגילה'>הו"ק רגילה</option>
					<option value="יכולת גבוהה">יכולת גבוהה</option>
					<option value="לא ידוע">לא ידוע</option>
					<option value="VIP">VIP</option>
				</select>
				<select value={(extraGuestsMain === '' || extraGuestsMain === '0' || extraGuestsMain === 0) ? '' : extraGuestsMain} onChange={e => setExtraGuestsMain(e.target.value)} style={{ ...inputStyle, background: '#fff' }}>
					<option value="" disabled>הבאת אורח/ת נוספ/ת *</option>
					{[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
				</select>
				<div />
			</div>

			{/* Extra guests dynamic fields */}
			{extraGuests.length > 0 && (
				<div style={{ marginTop: 12 }}>
					{extraGuests.map((g, idx) => (
						<div key={idx} style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 12, background: '#f8fafc', padding: 12, borderRadius: 10 }}>
							<input placeholder={`שם פרטי משתתף (${idx+1})`} value={g.firstName} onChange={e => updateExtra(idx, { firstName: e.target.value })} style={inputStyle} />
							<input placeholder={`שם משפחה משתתף (${idx+1})`} value={g.lastName} onChange={e => updateExtra(idx, { lastName: e.target.value })} style={inputStyle} />
							<input placeholder={`מספר זהות משתתף (${idx+1})`} value={g.idNumber} onChange={e => updateExtra(idx, { idNumber: e.target.value })} style={inputStyle} />
							<select value={g.gender} onChange={e => updateExtra(idx, { gender: e.target.value })} style={{ ...inputStyle, background: '#fff' }}>
								<option value="">מגדר</option>
								<option value="זכר">זכר</option>
								<option value="נקבה">נקבה</option>
							</select>
							<input placeholder={`ליד מי תרצו לשבת? (משתתף ${idx+1})`} value={g.seatNear} onChange={e => updateExtra(idx, { seatNear: e.target.value })} style={inputStyle} />
						</div>
					))}
				</div>
			)}


			{/* Row 6: dynamic custom fields and add-input */}
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
				{/* add-field control as a field in-grid */}
				<div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 8 }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
						<input type="checkbox" checked={requireNewField} onChange={e => setRequireNewField(e.target.checked)} /> שדה חובה
					</label>
					<input
						placeholder="הוספת שדה"
						value={newFieldName}
						onChange={e => setNewFieldName(e.target.value)}
						onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomField(); } }}
						style={inputStyle}
					/>
					<button type="button" onClick={handleAddCustomField} disabled={!newFieldName.trim()} style={{ padding: '6px 12px', borderRadius: 10, border: '1px solid #e2e8f0', background: newFieldName.trim() ? '#fff' : '#e5e7eb', cursor: newFieldName.trim() ? 'pointer' : 'not-allowed' }}>שמור</button>
				</div>
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
		body: JSON.stringify({ field_name, value })
	});
} 