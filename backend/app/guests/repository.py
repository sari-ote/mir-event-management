from sqlalchemy.orm import Session
from app.guests import models, schemas
from app.seatings import models as seating_models
from sqlalchemy.exc import IntegrityError
from app.audit_log.repository import log_change
from sqlalchemy import and_

# Guests
def create_guest(db: Session, guest: schemas.GuestCreate, user_id: int = None):
    db_guest = models.Guest(**guest.dict())
    db.add(db_guest)
    try:
        db.commit()
        db.refresh(db_guest)
        # תיעוד בלוג
        log_change(
            db=db,
            user_id=user_id,
            action="create",
            entity_type="Guest",
            entity_id=db_guest.id,
            field="first_name",
            old_value="",
            new_value=f"מוזמן חדש: {db_guest.first_name} {db_guest.last_name}",
            event_id=guest.event_id
        )
        return db_guest
    except IntegrityError:
        db.rollback()
        return None


def get_guests_by_event(db: Session, event_id: int):
    return db.query(models.Guest).filter(models.Guest.event_id == event_id).all()

def get_guest_by_id(db: Session, guest_id: int):
    return db.query(models.Guest).filter(models.Guest.id == guest_id).first()

# Custom Fields
def create_custom_field(db: Session, field: schemas.CustomFieldCreate):
    db_field = models.GuestCustomField(**field.dict())
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

def get_guests_with_fields(db: Session, event_id: int):
    # שליפת כל האורחים לאירוע
    guests = db.query(models.Guest).filter(models.Guest.event_id == event_id).all()
    # שליפת כל השדות הדינמיים של האירוע
    custom_fields = db.query(models.GuestCustomField).filter(models.GuestCustomField.event_id == event_id).all()

    # רשימה להחזרה
    result = []
    for guest in guests:
        guest_data = {
            "id": guest.id,
            "שם": guest.first_name,
            "שם משפחה": guest.last_name,
            "טלפון": guest.phone,
            "אימייל": guest.email,
            "תעודת זהות": guest.id_number,
            "table_head_id": guest.table_head_id, 
            # תוסיפי פה כל שדה קבוע שתרצי להציג
            "gender": guest.gender,
            "confirmed_arrival": guest.confirmed_arrival,
        }
        # עוברת על כל שדה דינמי ומוסיפה ערך (אם קיים)
        for field in custom_fields:
            value_obj = db.query(models.GuestFieldValue).filter_by(
                guest_id=guest.id,
                custom_field_id=field.id
            ).first()
            guest_data[field.name] = value_obj.value if value_obj else ""
        result.append(guest_data)
    return result

def get_custom_fields(db: Session, event_id: int, form_key: str | None = None):
    q = db.query(models.GuestCustomField).filter(models.GuestCustomField.event_id == event_id)
    # If the model has a form_key attribute, filter by it; else we will filter later by name prefix
    if form_key and hasattr(models.GuestCustomField, 'form_key'):
        q = q.filter(models.GuestCustomField.form_key == form_key)
        return q.all()
    fields = q.all()
    if form_key:
        pref = f"[{form_key}] "
        return [f for f in fields if f.name.startswith(pref)]
    return fields

# Field Values
def create_field_value(db: Session, value: schemas.FieldValueCreate):
    db_value = models.GuestFieldValue(**value.dict())
    db.add(db_value)
    db.commit()
    db.refresh(db_value)
    return db_value

def get_field_values_for_guest(db: Session, guest_id: int):
    return db.query(models.GuestFieldValue).filter(models.GuestFieldValue.guest_id == guest_id).all()

def update_guest(db: Session, guest_id: int, guest: schemas.GuestUpdate, user_id: int):
    db_guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if not db_guest:
        return None
    
    # עדכון כל השדות שנשלחו
    for key, value in guest.dict(exclude_unset=True).items():
        if value is not None:  # עדכן רק אם הערך לא None
            old_value = getattr(db_guest, key)
            setattr(db_guest, key, value)
            log_change(
                db=db,
                user_id=user_id,
                action="update",
                entity_type="Guest",
                entity_id=guest_id,
                field=key,
                old_value=str(old_value) if old_value is not None else "",
                new_value=str(value) if value is not None else "",
                event_id=db_guest.event_id
            )
    
    db.commit()
    db.refresh(db_guest)
    return db_guest

def delete_guest(db: Session, guest_id: int, user_id: int = None):
    db_guest = db.query(models.Guest).filter(models.Guest.id == guest_id).first()
    if db_guest:
        # מחיקת רשומות קשורות בטבלת seatings
        seatings = db.query(seating_models.Seating).filter(seating_models.Seating.guest_id == guest_id).all()
        for seating in seatings:
            db.delete(seating)
        
        # תיעוד בלוג לפני המחיקה
        log_change(
            db=db,
            user_id=user_id,
            action="delete",
            entity_type="Guest",
            entity_id=guest_id,
            field="first_name",
            old_value=f"מוזמן נמחק: {db_guest.first_name} {db_guest.last_name}",
            new_value="",
            event_id=db_guest.event_id
        )
        db.delete(db_guest)
        db.commit()
    return db_guest

def update_guests_with_default_gender(db: Session, event_id: int):
    """עדכון מוזמנים קיימים עם מגדר ברירת מחדל"""
    guests = db.query(models.Guest).filter(models.Guest.event_id == event_id).all()
    updated_count = 0
    
    for guest in guests:
        if not guest.gender:
            # נסה לנחש לפי השם
            first_name = guest.first_name.lower()
            if any(name in first_name for name in ['יהודית', 'אילה', 'שרה', 'רחל', 'לאה', 'מרים', 'חנה', 'דבורה', 'רות', 'אסתר']):
                guest.gender = 'female'
            elif any(name in first_name for name in ['יעקב', 'חיים', 'דוד', 'משה', 'אברהם', 'יצחק', 'יוסף', 'בנימין', 'שמעון', 'לוי']):
                guest.gender = 'male'
            else:
                # ברירת מחדל - נקבה (לפי הסטטיסטיקות)
                guest.gender = 'female'
            updated_count += 1
    
    if updated_count > 0:
        db.commit()
        print(f"עודכנו {updated_count} מוזמנים עם מגדר ברירת מחדל")
    
    return updated_count
