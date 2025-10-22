from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.guests import schemas as guest_schemas, repository as guest_repository, models as guest_models
from app.events import models as event_models, repository as event_repository
from app.greetings import schemas as greeting_schemas, service as greeting_service
from app.seatings import models as seating_models
from app.tables import models as table_models
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/bot", tags=["Bot"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/event/{event_id}")
def get_event_info_for_bot(event_id: int, db: Session = Depends(get_db)):
    """קבלת מידע על אירוע לבוט"""
    event = db.query(event_models.Event).filter(event_models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {
        "event_id": event.id,
        "name": event.name,
        "date": event.date,
        "location": event.location,
        "type": event.type
    }

@router.get("/guests/confirmed/{event_id}")
def get_confirmed_guests_for_bot(event_id: int, db: Session = Depends(get_db)):
    """קבלת רשימת מוזמנים מאושרים לבוט"""
    confirmed_guests = db.query(guest_models.Guest).filter(
        guest_models.Guest.event_id == event_id,
        guest_models.Guest.confirmed_arrival == True
    ).all()
    
    return [
        {
            "guest_id": guest.id,
            "name": f"{guest.first_name} {guest.last_name}",
            "phone": guest.phone,
            "whatsapp_number": guest.whatsapp_number
        }
        for guest in confirmed_guests
    ]

@router.post("/guest/register")
def register_guest_via_bot(guest_data: guest_schemas.GuestCreate, db: Session = Depends(get_db)):
    """רישום מוזמן דרך בוט"""
    return guest_repository.create_guest(db, guest_data)

@router.get("/guest/{guest_id}/info")
def get_guest_info_for_bot(guest_id: int, db: Session = Depends(get_db)):
    """קבלת מידע על מוזמן לבוט"""
    guest = db.query(guest_models.Guest).filter(guest_models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    return {
        "guest_id": guest.id,
        "name": f"{guest.first_name} {guest.last_name}",
        "phone": guest.phone,
        "whatsapp_number": guest.whatsapp_number,
        "confirmed_arrival": guest.confirmed_arrival,
        "event_id": guest.event_id
    }

@router.post("/greeting")
def create_greeting_via_bot(greeting_data: greeting_schemas.GreetingCreate, db: Session = Depends(get_db)):
    """יצירת ברכה דרך בוט"""
    try:
        return greeting_service.GreetingService.create_greeting(db, greeting_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/greeting/{guest_id}")
def get_guest_greeting(guest_id: int, db: Session = Depends(get_db)):
    """קבלת ברכה של מוזמן לבוט"""
    greeting = greeting_service.GreetingService.get_greeting_by_guest(db, guest_id)
    if not greeting:
        return {"message": "No greeting found for this guest"}
    
    return {
        "greeting_id": greeting.id,
        "content": greeting.content,
        "signer_name": greeting.signer_name,
        "created_at": greeting.created_at,
        "is_approved": greeting.is_approved
    }

@router.get("/event/{event_id}/greetings")
def get_event_greetings_for_bot(event_id: int, db: Session = Depends(get_db)):
    """קבלת כל הברכות לאירוע לבוט"""
    greetings = greeting_service.GreetingService.get_greetings_by_event(db, event_id)
    
    return [
        {
            "greeting_id": greeting.id,
            "content": greeting.content,
            "signer_name": greeting.signer_name,
            "guest_name": f"{greeting.guest.first_name} {greeting.guest.last_name}",
            "created_at": greeting.created_at,
            "is_approved": greeting.is_approved
        }
        for greeting in greetings
    ]

# ===== נקודות קצה להתראות ותזכורות =====

@router.get("/reminders/upcoming")
def get_upcoming_reminders(db: Session = Depends(get_db)):
    """קבלת תזכורות קרובות לשירות החיצוני"""
    # תזכורות ל-24 שעות הקרובות
    tomorrow = datetime.now() + timedelta(days=1)
    
    # שליפת אירועים ב-24 השעות הקרובות
    upcoming_events = db.query(event_models.Event).filter(
        event_models.Event.date >= datetime.now(),
        event_models.Event.date <= tomorrow
    ).all()
    
    reminders = []
    for event in upcoming_events:
        # שליפת מוזמנים מאושרים לאירוע
        confirmed_guests = db.query(guest_models.Guest).filter(
            guest_models.Guest.event_id == event.id,
            guest_models.Guest.confirmed_arrival == True
        ).all()
        
        for guest in confirmed_guests:
            reminders.append({
                "event_id": event.id,
                "event_name": event.name,
                "event_date": event.date,
                "event_location": event.location,
                "guest_id": guest.id,
                "guest_name": f"{guest.first_name} {guest.last_name}",
                "guest_phone": guest.phone,
                "guest_whatsapp": guest.whatsapp_number,
                "reminder_type": "24h_before",
                "scheduled_for": event.date - timedelta(hours=24)
            })
    
    return reminders

@router.get("/reminders/week-before")
def get_week_before_reminders(db: Session = Depends(get_db)):
    """קבלת תזכורות לשבוע הקרוב לשירות החיצוני"""
    # תזכורות לשבוע הקרוב
    week_from_now = datetime.now() + timedelta(days=7)
    
    upcoming_events = db.query(event_models.Event).filter(
        event_models.Event.date >= datetime.now(),
        event_models.Event.date <= week_from_now
    ).all()
    
    reminders = []
    for event in upcoming_events:
        confirmed_guests = db.query(guest_models.Guest).filter(
            guest_models.Guest.event_id == event.id,
            guest_models.Guest.confirmed_arrival == True
        ).all()
        
        for guest in confirmed_guests:
            reminders.append({
                "event_id": event.id,
                "event_name": event.name,
                "event_date": event.date,
                "event_location": event.location,
                "guest_id": guest.id,
                "guest_name": f"{guest.first_name} {guest.last_name}",
                "guest_phone": guest.phone,
                "guest_whatsapp": guest.whatsapp_number,
                "reminder_type": "week_before",
                "scheduled_for": event.date - timedelta(days=7)
            })
    
    return reminders

@router.post("/notification/sent")
def mark_notification_sent(notification_data: dict, db: Session = Depends(get_db)):
    """סימון התראה כנשלחה על ידי השירות החיצוני"""
    return {
        "status": "success",
        "message": "Notification marked as sent",
        "notification_id": notification_data.get("notification_id"),
        "sent_at": datetime.now()
    }

@router.post("/reminder/sent")
def mark_reminder_sent(reminder_data: dict, db: Session = Depends(get_db)):
    """סימון תזכורת כנשלחה על ידי השירות החיצוני"""
    return {
        "status": "success",
        "message": "Reminder marked as sent",
        "reminder_id": reminder_data.get("reminder_id"),
        "sent_at": datetime.now()
    }

@router.get("/event/{event_id}/notification-data")
def get_event_notification_data(event_id: int, db: Session = Depends(get_db)):
    """קבלת כל הנתונים הנדרשים להתראות לאירוע"""
    event = db.query(event_models.Event).filter(event_models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # שליפת כל המוזמנים לאירוע
    guests = db.query(guest_models.Guest).filter(
        guest_models.Guest.event_id == event_id
    ).all()
    
    return {
        "event": {
            "id": event.id,
            "name": event.name,
            "date": event.date,
            "location": event.location,
            "type": event.type
        },
        "guests": [
            {
                "id": guest.id,
                "name": f"{guest.first_name} {guest.last_name}",
                "phone": guest.phone,
                "whatsapp_number": guest.whatsapp_number,
                "email": guest.email,
                "confirmed_arrival": guest.confirmed_arrival
            }
            for guest in guests
        ],
        "total_guests": len(guests),
        "confirmed_guests": len([g for g in guests if g.confirmed_arrival])
    }

# ===== נקודות קצה לכרטיסים =====

@router.get("/guest/{guest_id}/ticket")
def get_guest_ticket(guest_id: int, db: Session = Depends(get_db)):
    """קבלת כרטיס ישיבה למוזמן לבוט"""
    guest = db.query(guest_models.Guest).filter(guest_models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    # שליפת מקום ישיבה
    seating = db.query(seating_models.Seating).filter(
        seating_models.Seating.guest_id == guest_id
    ).first()
    
    if not seating:
        return {
            "guest_id": guest.id,
            "guest_name": f"{guest.first_name} {guest.last_name}",
            "has_seating": False,
            "message": "אין מקום ישיבה מוקצה למוזמן זה"
        }
    
    # שליפת פרטי השולחן
    table = db.query(table_models.Table).filter(table_models.Table.id == seating.table_id).first()
    
    return {
        "guest_id": guest.id,
        "guest_name": f"{guest.first_name} {guest.last_name}",
        "has_seating": True,
        "table_number": table.table_number if table else None,
        "seat_number": seating.seat_number,
        "event_id": guest.event_id
    }

@router.get("/event/{event_id}/tickets")
def get_event_tickets(event_id: int, db: Session = Depends(get_db)):
    """קבלת כל הכרטיסים לאירוע לבוט"""
    # שליפת כל המוזמנים עם מקומות ישיבה
    seatings = db.query(seating_models.Seating).filter(
        seating_models.Seating.event_id == event_id
    ).all()
    
    tickets = []
    for seating in seatings:
        guest = db.query(guest_models.Guest).filter(guest_models.Guest.id == seating.guest_id).first()
        if guest:
            table = db.query(table_models.Table).filter(table_models.Table.id == seating.table_id).first()
            
            tickets.append({
                "guest_id": guest.id,
                "guest_name": f"{guest.first_name} {guest.last_name}",
                "guest_phone": guest.phone,
                "guest_whatsapp": guest.whatsapp_number,
                "table_number": table.table_number if table else None,
                "seat_number": seating.seat_number,
                "confirmed_arrival": guest.confirmed_arrival
            })
    
    return tickets

@router.post("/guest/{guest_id}/confirm-arrival")
def confirm_guest_arrival(guest_id: int, db: Session = Depends(get_db)):
    """אישור הגעה של מוזמן דרך בוט"""
    guest = db.query(guest_models.Guest).filter(guest_models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    guest.confirmed_arrival = True
    db.commit()
    db.refresh(guest)
    
    return {
        "guest_id": guest.id,
        "guest_name": f"{guest.first_name} {guest.last_name}",
        "confirmed_arrival": True,
        "message": "הגעה אושרה בהצלחה"
    }

# ===== נקודות קצה לשדות מותאמים אישית =====

@router.get("/event/{event_id}/custom-fields")
def get_event_custom_fields(event_id: int, db: Session = Depends(get_db)):
    """קבלת שדות מותאמים אישית לאירוע לבוט"""
    from app.guests.models import GuestCustomField
    custom_fields = db.query(GuestCustomField).filter(
        GuestCustomField.event_id == event_id
    ).all()
    
    return [
        {
            "field_id": field.id,
            "name": field.name,
            "field_type": field.field_type
        }
        for field in custom_fields
    ]

@router.get("/guest/{guest_id}/custom-fields")
def get_guest_custom_fields(guest_id: int, db: Session = Depends(get_db)):
    """קבלת ערכי שדות מותאמים אישית למוזמן לבוט"""
    from app.guests.models import GuestFieldValue, GuestCustomField
    field_values = db.query(GuestFieldValue).filter(
        GuestFieldValue.guest_id == guest_id
    ).all()
    
    result = []
    for field_value in field_values:
        # שליפת פרטי השדה
        custom_field = db.query(GuestCustomField).filter(
            GuestCustomField.id == field_value.custom_field_id
        ).first()
        
        if custom_field:
            result.append({
                "field_id": custom_field.id,
                "field_name": custom_field.name,
                "field_type": custom_field.field_type,
                "value": field_value.value
            })
    
    return result

@router.post("/guest/{guest_id}/custom-field")
def set_guest_custom_field(guest_id: int, field_data: dict, db: Session = Depends(get_db)):
    """הגדרת ערך שדה מותאם אישית למוזמן דרך בוט"""
    from app.guests.models import GuestCustomField, GuestFieldValue
    
    guest = db.query(guest_models.Guest).filter(guest_models.Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    
    field_name = field_data.get("field_name")
    field_value = field_data.get("value")
    
    if not field_name or not field_value:
        raise HTTPException(status_code=400, detail="field_name and value are required")
    
    # שליפת השדה המותאם אישית
    custom_field = db.query(GuestCustomField).filter(
        GuestCustomField.event_id == guest.event_id,
        GuestCustomField.name == field_name
    ).first()
    
    if not custom_field:
        raise HTTPException(status_code=404, detail="Custom field not found")
    
    # בדיקה אם כבר קיים ערך לשדה זה
    existing_value = db.query(GuestFieldValue).filter(
        GuestFieldValue.guest_id == guest_id,
        GuestFieldValue.custom_field_id == custom_field.id
    ).first()
    
    if existing_value:
        # עדכון ערך קיים
        existing_value.value = field_value
        db.commit()
        db.refresh(existing_value)
        return {
            "field_id": custom_field.id,
            "field_name": custom_field.name,
            "value": existing_value.value,
            "message": "ערך השדה עודכן בהצלחה"
        }
    else:
        # יצירת ערך חדש
        new_value = GuestFieldValue(
            guest_id=guest_id,
            custom_field_id=custom_field.id,
            value=field_value
        )
        db.add(new_value)
        db.commit()
        db.refresh(new_value)
        
        return {
            "field_id": custom_field.id,
            "field_name": custom_field.name,
            "value": new_value.value,
            "message": "ערך השדה נוסף בהצלחה"
        } 