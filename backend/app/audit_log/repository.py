from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime
import pytz

def get_user_name(db: Session, user_id: int) -> str:
    """קבלת שם המשתמש לפי ID"""
    if user_id is None:
        return "לא ידוע"

    try:
        # נסה למצוא משתמש בטבלת users
        from app.users.models import User # Local import to avoid circular dependency
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user.full_name or user.username or f"משתמש {user_id}"
    except Exception as e:
        print(f"Error getting user name: {e}")

    return f"משתמש {user_id}"

def create_audit_log(db: Session, log: schemas.AuditLogCreate):
    # הוסף שעת ישראל
    israel_tz = pytz.timezone('Asia/Jerusalem')
    israel_time = datetime.now(israel_tz)

    db_log = models.AuditLog(**log.dict())
    db_log.timestamp = israel_time
    db.add(db_log)
    db.flush()
    db.refresh(db_log)
    return db_log

def get_audit_logs(db: Session, entity_type: str, entity_id: int, event_id: int = None):
    query = db.query(models.AuditLog).filter(
        models.AuditLog.entity_type == entity_type,
        models.AuditLog.entity_id == entity_id
    )
    if event_id:
        query = query.filter(models.AuditLog.event_id == event_id)
    return query.order_by(models.AuditLog.timestamp.desc()).all()

def log_change(db: Session, user_id: int, action: str, entity_type: str, entity_id: int, field: str, old_value: str, new_value: str, event_id: int = None):
    user_name = get_user_name(db, user_id)
    log = schemas.AuditLogCreate(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        event_id=event_id,
        field=field,
        old_value=old_value,
        new_value=new_value,
        user_name=user_name
    )
    return create_audit_log(db, log)    