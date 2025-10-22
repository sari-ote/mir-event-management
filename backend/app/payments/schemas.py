from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaymentBase(BaseModel):
    event_id: int
    guest_id: Optional[int] = None
    amount: float
    payment_type: str  # Ragil, HK, CreateToken
    currency: str = "1"  # 1 = שקל, 2 = דולר
    
    # פרטי לקוח
    zeout: Optional[str] = None
    client_name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    mail: Optional[str] = None
    
    # פרטי תשלומים
    tashloumim: int = 1
    groupe: Optional[str] = None
    comments: Optional[str] = None
    param1: Optional[str] = None
    param2: Optional[str] = None


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    status: Optional[str] = None
    transaction_id: Optional[str] = None
    confirmation: Optional[str] = None
    error_message: Optional[str] = None


class Payment(PaymentBase):
    id: int
    transaction_id: Optional[str] = None
    status: str
    created_at: datetime
    transaction_time: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Schema לקבלת Webhook מנדרים פלוס - עסקה רגילה
class NedarimPlusWebhookRegular(BaseModel):
    TransactionId: Optional[str] = None
    ClientId: Optional[str] = None
    Zeout: Optional[str] = None
    ClientName: Optional[str] = None
    Adresse: Optional[str] = None
    Phone: Optional[str] = None
    Mail: Optional[str] = None
    Amount: Optional[float] = None
    Currency: Optional[str] = None
    TransactionTime: Optional[str] = None  # נמיר ל-datetime
    Confirmation: Optional[str] = None
    LastNum: Optional[str] = None
    Tokef: Optional[str] = None
    TransactionType: Optional[str] = None
    Groupe: Optional[str] = None
    Comments: Optional[str] = None
    Tashloumim: Optional[int] = None
    FirstTashloum: Optional[float] = None
    MosadNumber: Optional[str] = None
    CallId: Optional[str] = None
    MasofId: Optional[str] = None
    Shovar: Optional[str] = None
    CompagnyCard: Optional[str] = None
    Solek: Optional[str] = None
    Tayar: Optional[str] = None
    Makor: Optional[str] = None
    KevaId: Optional[str] = None
    DebitIframe: Optional[str] = None
    ReceiptCreated: Optional[bool] = None
    ReceiptData: Optional[str] = None
    ReceiptDocNum: Optional[str] = None


# Schema לקבלת Webhook מנדרים פלוס - הוראת קבע
class NedarimPlusWebhookKeva(BaseModel):
    KevaId: Optional[str] = None
    ClientId: Optional[str] = None
    Zeout: Optional[str] = None
    ClientName: Optional[str] = None
    Adresse: Optional[str] = None
    Phone: Optional[str] = None
    Mail: Optional[str] = None
    Amount: Optional[float] = None
    Currency: Optional[str] = None
    NextDate: Optional[str] = None  # נמיר ל-datetime
    LastNum: Optional[str] = None
    Tokef: Optional[str] = None
    Groupe: Optional[str] = None
    Comments: Optional[str] = None
    Tashloumim: Optional[int] = None
    MosadNumber: Optional[str] = None
    MasofId: Optional[str] = None
    DebitIframe: Optional[str] = None


# Schema להחזרת מידע על קונפיגורציה של נדרים פלוס (לפרונטאנד)
class NedarimPlusConfig(BaseModel):
    mosad_id: str
    api_valid: str
    iframe_url: str = "https://matara.pro/nedarimplus/iframe"

