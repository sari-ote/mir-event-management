from sqlalchemy.orm import Session
from typing import Optional, List
from . import models, schemas
from datetime import datetime
import json


def create_payment(db: Session, payment: schemas.PaymentCreate) -> models.Payment:
    """יצירת תשלום חדש"""
    db_payment = models.Payment(**payment.model_dump())
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payment(db: Session, payment_id: int) -> Optional[models.Payment]:
    """שליפת תשלום לפי ID"""
    return db.query(models.Payment).filter(models.Payment.id == payment_id).first()


def get_payment_by_transaction_id(db: Session, transaction_id: str) -> Optional[models.Payment]:
    """שליפת תשלום לפי מזהה עסקה מנדרים פלוס"""
    return db.query(models.Payment).filter(models.Payment.transaction_id == transaction_id).first()


def get_payments_by_event(db: Session, event_id: int) -> List[models.Payment]:
    """שליפת כל התשלומים של אירוע"""
    return db.query(models.Payment).filter(models.Payment.event_id == event_id).all()


def get_payments_by_guest(db: Session, guest_id: int) -> List[models.Payment]:
    """שליפת כל התשלומים של אורח"""
    return db.query(models.Payment).filter(models.Payment.guest_id == guest_id).all()


def update_payment_from_webhook_regular(
    db: Session, 
    webhook_data: schemas.NedarimPlusWebhookRegular
) -> Optional[models.Payment]:
    """עדכון תשלום מתוך webhook של עסקה רגילה"""
    
    # נסה למצוא תשלום קיים לפי TransactionId
    payment = get_payment_by_transaction_id(db, webhook_data.TransactionId)
    
    if not payment:
        # אם אין תשלום קיים, ניצור חדש (במקרה שהתשלום נוצר ישירות בנדרים פלוס)
        # נסה לזהות אירוע לפי MosadNumber או פרמטר אחר
        # כרגע נדלג על זה ונחזיר None
        return None
    
    # עדכן את התשלום עם המידע מהwebhook
    payment.transaction_id = webhook_data.TransactionId
    payment.client_id = webhook_data.ClientId
    payment.zeout = webhook_data.Zeout
    payment.client_name = webhook_data.ClientName
    payment.address = webhook_data.Adresse
    payment.phone = webhook_data.Phone
    payment.mail = webhook_data.Mail
    payment.amount = webhook_data.Amount or payment.amount
    payment.currency = webhook_data.Currency or payment.currency
    payment.confirmation = webhook_data.Confirmation
    payment.last_num = webhook_data.LastNum
    payment.tokef = webhook_data.Tokef
    payment.transaction_type = webhook_data.TransactionType
    payment.groupe = webhook_data.Groupe
    payment.comments = webhook_data.Comments
    payment.tashloumim = webhook_data.Tashloumim or payment.tashloumim
    payment.first_tashloum = webhook_data.FirstTashloum
    payment.shovar = webhook_data.Shovar
    payment.compagny_card = webhook_data.CompagnyCard
    payment.solek = webhook_data.Solek
    payment.makor = webhook_data.Makor
    payment.keva_id = webhook_data.KevaId
    payment.receipt_created = webhook_data.ReceiptCreated or False
    payment.receipt_data = webhook_data.ReceiptData
    payment.receipt_doc_num = webhook_data.ReceiptDocNum
    
    # סטטוס - אם יש confirmation, העסקה הצליחה
    if webhook_data.Confirmation:
        payment.status = "success"
    else:
        payment.status = "pending"  # עסקה זמנית
    
    # זמן עסקה
    if webhook_data.TransactionTime:
        try:
            # המר מstring ל-datetime (הפורמט עשוי להשתנות)
            payment.transaction_time = datetime.fromisoformat(webhook_data.TransactionTime)
        except:
            pass
    
    db.commit()
    db.refresh(payment)
    return payment


def update_payment_from_webhook_keva(
    db: Session,
    webhook_data: schemas.NedarimPlusWebhookKeva
) -> Optional[models.Payment]:
    """עדכון תשלום מתוך webhook של הוראת קבע"""
    
    # חפש תשלום קיים לפי KevaId
    payment = db.query(models.Payment).filter(models.Payment.keva_id == webhook_data.KevaId).first()
    
    if not payment:
        return None
    
    # עדכן את התשלום
    payment.keva_id = webhook_data.KevaId
    payment.client_id = webhook_data.ClientId
    payment.zeout = webhook_data.Zeout
    payment.client_name = webhook_data.ClientName
    payment.address = webhook_data.Adresse
    payment.phone = webhook_data.Phone
    payment.mail = webhook_data.Mail
    payment.amount = webhook_data.Amount or payment.amount
    payment.currency = webhook_data.Currency or payment.currency
    payment.last_num = webhook_data.LastNum
    payment.tokef = webhook_data.Tokef
    payment.groupe = webhook_data.Groupe
    payment.comments = webhook_data.Comments
    payment.tashloumim = webhook_data.Tashloumim or payment.tashloumim
    payment.status = "success"
    
    # תאריך חיוב ראשון
    if webhook_data.NextDate:
        try:
            payment.next_date = datetime.fromisoformat(webhook_data.NextDate)
        except:
            pass
    
    db.commit()
    db.refresh(payment)
    return payment


def create_payment_log(
    db: Session,
    payment_id: Optional[int],
    raw_data: dict,
    source_ip: Optional[str]
) -> models.PaymentLog:
    """יצירת לוג של webhook"""
    log = models.PaymentLog(
        payment_id=payment_id,
        raw_data=json.dumps(raw_data, ensure_ascii=False),
        source_ip=source_ip
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def update_payment(db: Session, payment_id: int, update_data: schemas.PaymentUpdate) -> Optional[models.Payment]:
    """עדכון תשלום"""
    payment = get_payment(db, payment_id)
    if not payment:
        return None
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(payment, key, value)
    
    db.commit()
    db.refresh(payment)
    return payment

