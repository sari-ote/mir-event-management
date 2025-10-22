from sqlalchemy.orm import Session
from app.greetings import models, schemas

def create_greeting(db: Session, greeting: schemas.GreetingCreate):
    """יצירת ברכה חדשה"""
    db_greeting = models.Greeting(
        guest_id=greeting.guest_id,
        event_id=greeting.event_id,
        content=greeting.content,
        signer_name=greeting.signer_name
    )
    db.add(db_greeting)
    db.commit()
    db.refresh(db_greeting)
    return db_greeting

def get_greeting(db: Session, greeting_id: int):
    """קבלת ברכה לפי מזהה"""
    return db.query(models.Greeting).filter(models.Greeting.id == greeting_id).first()

def get_greetings_by_event(db: Session, event_id: int):
    """קבלת כל הברכות לאירוע"""
    return db.query(models.Greeting).filter(models.Greeting.event_id == event_id).all()

def get_greeting_by_guest(db: Session, guest_id: int):
    """קבלת ברכה של מוזמן"""
    return db.query(models.Greeting).filter(models.Greeting.guest_id == guest_id).first()

def update_greeting(db: Session, greeting_id: int, greeting: schemas.GreetingUpdate):
    """עדכון ברכה"""
    db_greeting = db.query(models.Greeting).filter(models.Greeting.id == greeting_id).first()
    if not db_greeting:
        return None
    
    update_data = greeting.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_greeting, field, value)
    
    db.commit()
    db.refresh(db_greeting)
    return db_greeting

def delete_greeting(db: Session, greeting_id: int):
    """מחיקת ברכה"""
    db_greeting = db.query(models.Greeting).filter(models.Greeting.id == greeting_id).first()
    if not db_greeting:
        return False
    
    db.delete(db_greeting)
    db.commit()
    return True 