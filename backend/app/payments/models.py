from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Payment(Base):
    """
    מודל לניהול תשלומים דרך נדרים פלוס
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    
    # קישור לאירוע ואורח
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=True)  # יכול להיות null אם עדיין לא נוצר אורח
    
    # פרטי התשלום מנדרים פלוס
    transaction_id = Column(String, nullable=True, unique=True, index=True)  # מזהה עסקה בנדרים פלוס
    client_id = Column(String, nullable=True)  # מספר לקוח בנדרים
    
    # פרטי לקוח
    zeout = Column(String, nullable=True)  # מספר זהות
    client_name = Column(String, nullable=True)  # שם
    address = Column(String, nullable=True)  # כתובת
    phone = Column(String, nullable=True)  # טלפון
    mail = Column(String, nullable=True)  # מייל
    
    # פרטי עסקה
    amount = Column(Float, nullable=False)  # סכום כולל
    currency = Column(String, default="1")  # 1 = שקל, 2 = דולר
    payment_type = Column(String, nullable=False)  # Ragil, HK, CreateToken
    transaction_type = Column(String, nullable=True)  # סוג עסקה (רגיל / תשלומים / הו"ק)
    
    # פרטי כרטיס אשראי (חלקיים)
    last_num = Column(String, nullable=True)  # 4 ספרות אחרונות
    tokef = Column(String, nullable=True)  # תוקף
    
    # פרטי תשלומים
    tashloumim = Column(Integer, default=1)  # מספר תשלומים
    first_tashloum = Column(Float, nullable=True)  # סכום תשלום ראשון
    
    # פרטי אישור
    confirmation = Column(String, nullable=True)  # מספר אישור משב"א
    shovar = Column(String, nullable=True)  # מספר שובר
    compagny_card = Column(String, nullable=True)  # מספר מותג
    solek = Column(String, nullable=True)  # מספר סולק
    
    # מטה-דאטה
    groupe = Column(String, nullable=True)  # קטגוריה
    comments = Column(Text, nullable=True)  # הערות
    makor = Column(String, nullable=True)  # מקור העסקה
    
    # סטטוס
    status = Column(String, default="pending")  # pending, success, failed, cancelled
    error_message = Column(Text, nullable=True)  # הודעת שגיאה במקרה של כישלון
    
    # הוראת קבע
    keva_id = Column(String, nullable=True)  # מזהה הוראת קבע
    next_date = Column(DateTime, nullable=True)  # תאריך חיוב ראשון (להוראת קבע)
    
    # קבלה
    receipt_created = Column(Boolean, default=False)  # האם נוצרה קבלה
    receipt_data = Column(String, nullable=True)  # קישור למסמך קבלה
    receipt_doc_num = Column(String, nullable=True)  # מזהה קבלה
    
    # פרמטרים מותאמים אישית (Param1, Param2)
    param1 = Column(String, nullable=True)
    param2 = Column(String, nullable=True)
    
    # זמנים
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    transaction_time = Column(DateTime, nullable=True)  # תאריך ביצוע עסקה
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # קשרים
    event = relationship("Event", back_populates="payments")
    guest = relationship("Guest", back_populates="payments")


class PaymentLog(Base):
    """
    לוג של כל קריאות ה-webhook מנדרים פלוס (לדיבאגינג)
    """
    __tablename__ = "payment_logs"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=True)
    
    # Raw data
    raw_data = Column(Text, nullable=False)  # JSON מלא שהתקבל
    source_ip = Column(String, nullable=True)  # IP ממנו הגיעה הבקשה
    
    # זמן
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # קשרים
    payment = relationship("Payment")

