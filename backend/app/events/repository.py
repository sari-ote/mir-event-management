from sqlalchemy.orm import Session
from app.events import models, schemas
from app.audit_log.repository import log_change

def create_event(db: Session, event: schemas.EventCreate, admin_id: int, user_id: int = None):
    db_event = models.Event(**event.dict(), admin_id=admin_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    # תיעוד בלוג
    log_change(
        db=db,
        user_id=user_id,
        action="create",
        entity_type="Event",
        entity_id=db_event.id,
        field="name",
        old_value="",
        new_value=db_event.name,
        event_id=db_event.id
    )
    return db_event

def get_event(db: Session, event_id: int):
    return db.query(models.Event).filter(models.Event.id == event_id).first()


def get_events_by_admin(db: Session, admin_id: int):
    return db.query(models.Event).filter(models.Event.admin_id == admin_id).all()

def get_all_events(db: Session):
    return db.query(models.Event).all()

def update_event(db: Session, event_id: int, event_update: schemas.EventUpdate, user_id: int = None):
    db_event = get_event(db, event_id)
    if db_event:
        for key, value in event_update.dict().items():
            old_value = getattr(db_event, key)
            if old_value != value:
                setattr(db_event, key, value)
                # תיעוד בלוג
                log_change(
                    db=db,
                    user_id=user_id,
                    action="update",
                    entity_type="Event",
                    entity_id=event_id,
                    field=key,
                    old_value=str(old_value) if old_value is not None else "",
                    new_value=str(value) if value is not None else "",
                    event_id=event_id
                )
        db.commit()
        db.refresh(db_event)
    return db_event

def delete_event(db: Session, event_id: int, user_id: int = None):
    db_event = get_event(db, event_id)
    if db_event:
        # תיעוד בלוג לפני המחיקה
        log_change(
            db=db,
            user_id=user_id,
            action="delete",
            entity_type="Event",
            entity_id=event_id,
            field="name",
            old_value=db_event.name,
            new_value="",
            event_id=event_id
        )
        db.delete(db_event)
        db.commit()
    return db_event
