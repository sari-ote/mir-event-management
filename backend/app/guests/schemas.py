from pydantic import BaseModel
from typing import Optional
from pydantic import validator
from datetime import datetime

# ---------- Guests ----------
class GuestBase(BaseModel):
    event_id: int
    first_name: str
    last_name: str
    id_number: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    referral_source: Optional[str] = None
    table_head_id: Optional[int] = None
    gender: str  # חובה
    confirmed_arrival: Optional[bool] = False
    whatsapp_number: Optional[str] = None  # מספר וואטסאפ לבוט
    qr_code: Optional[str] = None  # NEW: Unique QR code for each guest
    check_in_time: Optional[datetime] = None  # NEW: Time of check-in
    check_out_time: Optional[datetime] = None  # NEW: Time of check-out
    is_overbooked: Optional[bool] = False  # NEW: If assigned to an overbooked spot
    last_scan_time: Optional[datetime] = None  # NEW: Last scan time

    @validator('gender')
    def validate_gender(cls, v):
        v = v.lower()
        if v in ['male', 'female']:
            return v
        if v == 'זכר':
            return 'male'
        if v == 'נקבה':
            return 'female'
        raise ValueError("gender must be 'male', 'female', 'זכר' או 'נקבה'")

class GuestCreate(GuestBase):
    pass

class GuestUpdate(BaseModel):
    first_name: str
    last_name: str
    id_number: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    referral_source: Optional[str] = None
    table_head_id: Optional[int] = None
    gender: str  # חובה
    confirmed_arrival: Optional[bool] = None
    whatsapp_number: Optional[str] = None  # מספר וואטסאפ לבוט
    qr_code: Optional[str] = None  # NEW: Unique QR code for each guest
    check_in_time: Optional[datetime] = None  # NEW: Time of check-in
    check_out_time: Optional[datetime] = None  # NEW: Time of check-out
    is_overbooked: Optional[bool] = None  # NEW: If assigned to an overbooked spot
    last_scan_time: Optional[datetime] = None  # NEW: Last scan time

    @validator('gender')
    def validate_gender(cls, v):
        v = v.lower()
        if v in ['male', 'female']:
            return v
        if v == 'זכר':
            return 'male'
        if v == 'נקבה':
            return 'female'
        raise ValueError("gender must be 'male', 'female', 'זכר' או 'נקבה'")

class GuestOut(GuestBase):
    id: int

    class Config:
        from_attributes = True


# ---------- Custom Fields ----------
class CustomFieldBase(BaseModel):
    event_id: int
    name: str
    field_type: str  # "text", "checkbox", "select"

class CustomFieldCreate(CustomFieldBase):
    pass

class CustomFieldOut(CustomFieldBase):
    id: int

    class Config:
        from_attributes = True


# ---------- Field Values ----------
class FieldValueBase(BaseModel):
    guest_id: int
    custom_field_id: int
    value: str



class FieldValueOut(FieldValueBase):
    id: int

    class Config:
        from_attributes = True
        

# נשלח מהפרונט
class FieldValueInput(BaseModel):
    guest_id: int
    field_name: str
    value: str

# לשימוש פנימי בלבד
class FieldValueCreate(BaseModel):
    guest_id: int
    custom_field_id: int
    value: str
