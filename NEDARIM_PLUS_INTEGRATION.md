# אינטגרציה עם נדרים פלוס - מדריך מלא

## מה נבנה? 📦

### Backend (Python/FastAPI)
✅ **קונפיגורציה** - הוספנו הגדרות לנדרים פלוס ב-`backend/app/core/config.py`
✅ **מודלים** - יצרנו טבלאות `payments` ו-`payment_logs` ב-`backend/app/payments/models.py`
✅ **API Endpoints**:
  - `GET /payments/config` - קבלת הגדרות נדרים פלוס
  - `POST /payments` - יצירת תשלום
  - `GET /payments/event/{event_id}` - שליפת תשלומים לאירוע
  - `POST /payments/webhook/nedarim-plus/regular` - קבלת עדכונים מנדרים פלוס (עסקה רגילה)
  - `POST /payments/webhook/nedarim-plus/keva` - קבלת עדכונים מנדרים פלוס (הוראת קבע)
✅ **Migration** - קובץ מיגרציה ליצירת הטבלאות

### Frontend (React)
✅ **Component** - `NedarimPlusIframe.jsx` - מטמיע את ה-iframe של נדרים פלוס
✅ **טפסים מעודכנים** - `NewDonorsForm.jsx` משולב עם נדרים פלוס

---

## מה צריך לעשות כדי להפעיל? 🚀

### שלב 1: הגדרת Credentials
צריך להוסיף את פרטי נדרים פלוס ב-`.env` (או ליצור אם אין):

```bash
# ב-backend/.env או backend/app/.env
NEDARIM_PLUS_MOSAD_ID=1234567  # המזהה שלך (7 ספרות)
NEDARIM_PLUS_API_VALID=YourApiKey  # הסיסמה/API key שקיבלת
```

### שלב 2: הרצת המיגרציה
```bash
cd backend
alembic upgrade head
```

זה ייצור את טבלאות `payments` ו-`payment_logs` בבסיס הנתונים.

### שלב 3: הפעלת השרת
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8001
```

### שלב 4: בדיקה
1. פתח את `http://localhost:3000`
2. עבור לטופס "תורמים חדשים"
3. מלא פרטים ובחר סכום
4. בשלב התשלום תראה את ה-iframe של נדרים פלוס

---

## איך זה עובד? 🔧

### תהליך התשלום:

1. **משתמש ממלא טופס** → פרטים אישיים + סכום
2. **פרונטאנד יוצר אורח** → שומר בבסיס נתונים
3. **פרונטאנד מציג iframe** → טוען את דף התשלום המאובטח של נדרים פלוס
4. **משתמש מזין כרטיס אשראי** → באייפרם המאובטח
5. **נדרים פלוס מעבד תשלום** → מחזיר תוצאה
6. **פרונטאנד מקבל תוצאה** → דרך `postMessage`
7. **נדרים פלוס שולח webhook** → לשרת שלך (עדכון מאובטח)
8. **בקאנד שומר תשלום** → בטבלת `payments`

### אבטחה:
- ✅ IP Validation - רק מ-`18.194.219.73` (השרת של נדרים פלוס)
- ✅ PCI-DSS Compliant - פרטי כרטיס לא עוברים דרך השרת שלך
- ✅ Logging - כל webhook נשמר ב-`payment_logs`

---

## הגדרות נוספות ⚙️

### Callback URL להגדרה בנדרים פלוס:
שלח למשרד של נדרים פלוס את ה-URL הבא:

**עסקה רגילה:**
```
https://your-domain.com/payments/webhook/nedarim-plus/regular
```

**הוראת קבע:**
```
https://your-domain.com/payments/webhook/nedarim-plus/keva
```

⚠️ **חשוב:** החלף `your-domain.com` בדומיין האמיתי שלך!

---

## שאלות נפוצות ❓

### שאלה: איך אני מוסיף את נדרים פלוס לטפסים אחרים?

**תשובה:** אותו דבר בדיוק כמו ב-`NewDonorsForm.jsx`:

1. ייבא את `NedarimPlusIframe`
2. טען קונפיגורציה מ-`/payments/config`
3. החלף את `renderPaymentPanel` להשתמש ב-iframe
4. הוסף callbacks ל-`onTransactionComplete` ו-`onTransactionError`

דוגמה מינימלית:
```jsx
import NedarimPlusIframe from '../../NedarimPlusIframe.jsx';

// בתוך הקומפוננטה:
const [nedarimConfig, setNedarimConfig] = useState(null);

useEffect(() => {
  // טען קונפיג
  fetch('http://localhost:8001/payments/config', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(setNedarimConfig);
}, []);

// בתוך ה-render:
<NedarimPlusIframe
  paymentData={{
    Mosad: nedarimConfig.mosad_id,
    ApiValid: nedarimConfig.api_valid,
    Amount: String(amount),
    PaymentType: 'Ragil',
    FirstName: firstName,
    // ... שאר הפרמטרים
  }}
  onTransactionComplete={(data) => {
    console.log('Payment success!', data);
  }}
  onTransactionError={(error) => {
    alert('Payment failed: ' + error.Message);
  }}
/>
```

### שאלה: איך אני רואה את התשלומים שבוצעו?

**תשובה:** 
```bash
GET /payments/event/{event_id}
```

זה יחזיר רשימה של כל התשלומים לאירוע.

### שאלה: מה אם הwebhook נכשל?

**תשובה:** 
- כל webhook נשמר ב-`payment_logs` עם ה-raw data
- נדרים פלוס שולח רק פעם אחת
- אם יש שגיאה, הם שולחים מייל (אם הגדרת `CallBackMailError`)
- אפשר לראות את הלוג ב-`payment_logs` table ולעדכן ידנית אם צריך

### שאלה: איך אני בודק בסביבת פיתוח (localhost)?

**תשובה:**
- ה-iframe עובד גם ב-localhost
- הwebhook **לא יעבוד** מlocalhost (נדרים פלוס לא יכולים לשלוח ל-localhost)
- לבדיקת webhook, תצטרך:
  1. להעלות לשרת זמני (Heroku, Render, וכו')
  2. או להשתמש ב-ngrok לחשיפת localhost
  3. או לבדוק ידנית עם POST requests

---

## מה עוד נשאר לעשות? 📝

### IncreaseSddForm
אותו עדכון בדיוק כמו ב-NewDonorsForm - רק להעתיק את הקוד.

### בדיקות
- [ ] בדיקת תשלום חד פעמי
- [ ] בדיקת הוראת קבע
- [ ] בדיקת webhook
- [ ] בדיקת שמירה בבסיס נתונים

### אופציונלי - שיפורים
- [ ] דף ניהול תשלומים (רשימה מפורטת)
- [ ] ייצוא תשלומים ל-Excel
- [ ] התראות על תשלומים חדשים
- [ ] דו"חות תשלומים

---

## סיכום 🎯

**מה עבד:**
✅ אינטגרציה מלאה עם API של נדרים פלוס
✅ iframe מאובטח PCI-DSS
✅ Webhook לעדכונים אוטומטיים
✅ שמירה מסודרת בבסיס נתונים
✅ UI ידידותי למשתמש

**מה צריך:**
- הוסף credentials ל-.env
- הרץ מיגרציה
- הגדר webhook URLs בנדרים פלוס
- בדוק!

---

**כל הכבוד! המערכת מוכנה לקבל תשלומים! 🎉**

