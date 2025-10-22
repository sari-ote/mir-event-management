from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.permissions import schemas, repository
from pydantic import BaseModel
from app.permissions.models import UserEventPermission
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/permissions", tags=["Permissions"])

@router.post("/", response_model=schemas.UserEventPermissionOut)
def create(permission: schemas.UserEventPermissionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return repository.create_permission(db, permission, user_id=current_user.id)

@router.get("/user/{user_id}", response_model=list[schemas.UserEventPermissionOut])
def get_by_user(user_id: int, db: Session = Depends(get_db)):
    return repository.get_permissions_by_user(db, user_id)

@router.get("/event/{event_id}", response_model=list[schemas.UserEventPermissionOut])
def get_by_event(event_id: int, db: Session = Depends(get_db)):
    return repository.get_permissions_by_event(db, event_id)

@router.delete("/{permission_id}")
def delete(permission_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    result = repository.delete_permission(db, permission_id, current_user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Permission not found")
    return {"message": "Permission deleted"}

class PermissionUpdate(BaseModel):
    role_in_event: str

@router.put("/{permission_id}", response_model=schemas.UserEventPermissionOut)
def update_permission(permission_id: int, update_data: PermissionUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    perm = db.query(UserEventPermission).filter_by(id=permission_id).first()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")
    
    old_role = perm.role_in_event
    perm.role_in_event = update_data.role_in_event
    db.commit()
    db.refresh(perm)
    
    # Log the permission update
    from app.audit_log.repository import log_change
    log_change(
        db=db,
        user_id=current_user.id,
        entity_type="Permission",
        entity_id=perm.id,
        action="update",
        field="role_in_event",
        old_value=f"הרשאה למשתמש {perm.user_id} באירוע {perm.event_id} - {old_role}",
        new_value=f"הרשאה למשתמש {perm.user_id} באירוע {perm.event_id} - {perm.role_in_event}"
    )
    
    return perm
