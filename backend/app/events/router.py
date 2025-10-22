from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.events import repository, schemas
from app.core.database import SessionLocal
from app.auth.dependencies import get_current_user  # ✅ הוספת current_user
from app.permissions.utils import check_event_permission
from app.core.config import settings

router = APIRouter(prefix="/events", tags=["Events"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ יצירת אירוע – עם admin_id לפי המשתמש המחובר
@router.post("/", response_model=schemas.EventOut)
def create_event(
    event: schemas.EventCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # רק admin (superadmin) יכול ליצור אירועים
    if not current_user or (current_user.role != "admin" and (not hasattr(current_user, 'email') or current_user.email not in settings.SUPERADMINS)):
        raise HTTPException(status_code=403, detail="רק מנהל מערכת יכול ליצור אירועים")
    return repository.create_event(db, event, admin_id=current_user.id, user_id=current_user.id)

# ✅ שליפת כל האירועים של המשתמש המחובר
@router.get("/", response_model=list[schemas.EventOut])
def get_my_events(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == 'admin':
        return repository.get_all_events(db)
    elif current_user.role == 'viewer':
        from app.permissions.models import UserEventPermission
        from app.events import models
        event_ids = [p.event_id for p in db.query(UserEventPermission).filter_by(user_id=current_user.id).all()]
        if not event_ids:
            return []
        return db.query(models.Event).filter(models.Event.id.in_(event_ids)).all()
    else:
        return repository.get_events_by_admin(db, current_user.id)

# ✅ שליפת אירוע לפי מזהה
@router.get("/{event_id}", response_model=schemas.EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = repository.get_event(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

# ✅ עדכון אירוע
@router.put("/{event_id}", response_model=schemas.EventOut)
def update_event(event_id: int, updated_event: schemas.EventUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    check_event_permission(db, current_user, event_id, required_roles=("event_admin",))
    event = repository.update_event(db, event_id, updated_event, user_id=current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

# ✅ מחיקת אירוע
@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    check_event_permission(db, current_user, event_id, required_roles=("event_admin",))
    event = repository.delete_event(db, event_id, user_id=current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}
