from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from . import repository, schemas, models

router = APIRouter(prefix="/audit-log", tags=["AuditLog"])

@router.get("/", response_model=list[schemas.AuditLogOut])
def get_audit_log(entity_type: str, entity_id: int, event_id: int = None, db: Session = Depends(get_db)):
    return repository.get_audit_logs(db, entity_type, entity_id, event_id)

@router.get("/all", response_model=list[schemas.AuditLogOut])
def get_all_audit_logs(event_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.AuditLog)
    if event_id:
        query = query.filter(models.AuditLog.event_id == event_id)
    return query.order_by(models.AuditLog.timestamp.desc()).all()


def log_change(db: Session, user_id: int, action: str, entity_type: str, entity_id: int, field: str, old_value: str, new_value: str, event_id: int = None):
    log = schemas.AuditLogCreate(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        event_id=event_id,
        field=field,
        old_value=old_value,
        new_value=new_value
    )
    return repository.create_audit_log(db, log)