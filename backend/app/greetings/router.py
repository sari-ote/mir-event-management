from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.greetings import schemas, service
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/greetings", tags=["Greetings"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.GreetingOut)
def create_greeting(greeting: schemas.GreetingCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """יצירת ברכה חדשה"""
    try:
        return service.GreetingService.create_greeting(db, greeting)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{greeting_id}", response_model=schemas.GreetingOut)
def get_greeting(greeting_id: int, db: Session = Depends(get_db)):
    """קבלת ברכה לפי מזהה"""
    greeting = service.GreetingService.get_greeting(db, greeting_id)
    if not greeting:
        raise HTTPException(status_code=404, detail="Greeting not found")
    return greeting

@router.get("/event/{event_id}", response_model=list[schemas.GreetingOut])
def get_greetings_by_event(event_id: int, db: Session = Depends(get_db)):
    """קבלת כל הברכות לאירוע"""
    return service.GreetingService.get_greetings_by_event(db, event_id)

@router.get("/guest/{guest_id}", response_model=schemas.GreetingOut)
def get_greeting_by_guest(guest_id: int, db: Session = Depends(get_db)):
    """קבלת ברכה של מוזמן"""
    greeting = service.GreetingService.get_greeting_by_guest(db, guest_id)
    if not greeting:
        raise HTTPException(status_code=404, detail="Greeting not found")
    return greeting

@router.put("/{greeting_id}", response_model=schemas.GreetingOut)
def update_greeting(greeting_id: int, greeting: schemas.GreetingUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """עדכון ברכה"""
    try:
        result = service.GreetingService.update_greeting(db, greeting_id, greeting)
        if not result:
            raise HTTPException(status_code=404, detail="Greeting not found")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{greeting_id}")
def delete_greeting(greeting_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """מחיקת ברכה"""
    result = service.GreetingService.delete_greeting(db, greeting_id)
    if not result:
        raise HTTPException(status_code=404, detail="Greeting not found")
    return {"message": "Greeting deleted"}

@router.post("/{greeting_id}/approve", response_model=schemas.GreetingOut)
def approve_greeting(greeting_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """אישור ברכה"""
    result = service.GreetingService.approve_greeting(db, greeting_id)
    if not result:
        raise HTTPException(status_code=404, detail="Greeting not found")
    return result

@router.get("/event/{event_id}/approved", response_model=list[schemas.GreetingOut])
def get_approved_greetings_by_event(event_id: int, db: Session = Depends(get_db)):
    """קבלת כל הברכות המאושרות לאירוע"""
    return service.GreetingService.get_approved_greetings_by_event(db, event_id) 