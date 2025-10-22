from sqlalchemy.orm import Session
from app.permissions import models, schemas
from app.audit_log.repository import log_change

def create_permission(db: Session, permission: schemas.UserEventPermissionCreate, user_id: int = None):
    db_perm = models.UserEventPermission(**permission.dict())
    db.add(db_perm)
    db.commit()
    db.refresh(db_perm)
    
    # Log the permission creation
    log_change(
        db=db,
        user_id=user_id,
        entity_type="Permission",
        entity_id=db_perm.id,
        action="create",
        field="permission",
        old_value="",
        new_value=f"הרשאה למשתמש {db_perm.user_id} באירוע {db_perm.event_id} - {db_perm.role_in_event}",
        event_id=permission.event_id
    )
    
    return db_perm

def get_permissions_by_user(db: Session, user_id: int):
    return db.query(models.UserEventPermission).filter_by(user_id=user_id).all()

def get_permissions_by_event(db: Session, event_id: int):
    return db.query(models.UserEventPermission).filter_by(event_id=event_id).all()

def delete_permission(db: Session, permission_id: int, current_user_id: int = None):
    perm = db.query(models.UserEventPermission).filter_by(id=permission_id).first()
    if perm:
        # Log the permission deletion before deleting
        log_change(
            db=db,
            user_id=current_user_id,
            entity_type="Permission",
            entity_id=perm.id,
            action="delete",
            field="permission",
            old_value=f"הרשאה למשתמש {perm.user_id} באירוע {perm.event_id} - {perm.role_in_event}",
            new_value="",
            event_id=perm.event_id
        )
        
        db.delete(perm)
        db.commit()
    return perm
