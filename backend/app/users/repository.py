from sqlalchemy.orm import Session
from app.users import models, schemas
from passlib.hash import bcrypt
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from app.audit_log.repository import log_change

def create_user(db: Session, user: schemas.UserCreate, user_id: int = None):
    existing_user = db.query(models.User).filter(models.User.id_number == user.id_number).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this ID number already exists")
    hashed_password = bcrypt.hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        role=user.role,
        id_number=user.id_number,
        full_name=user.full_name,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Log the user creation
    log_change(
        db=db,
        user_id=user_id,
        entity_type="User",
        entity_id=db_user.id,
        action="create",
        field="user",
        old_value="",
        new_value=f"{db_user.full_name} ({db_user.username}) - {db_user.role}"
    )
    
    return db_user


def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_all_users(db: Session):
    return db.query(models.User).all()

def delete_user(db: Session, user_id: int, current_user_id: int = None):
    from app.permissions.models import UserEventPermission
    # מחק קודם את כל ההרשאות של המשתמש
    db.query(UserEventPermission).filter_by(user_id=user_id).delete()
    db.commit()
    user = get_user_by_id(db, user_id)
    if user:
        # Log the user deletion before deleting
        log_change(
            db=db,
            user_id=current_user_id,
            entity_type="User",
            entity_id=user.id,
            action="delete",
            field="user",
            old_value=f"{user.full_name} ({user.username}) - {user.role}",
            new_value=""
        )
        
        db.delete(user)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            if "foreign key constraint" in str(e.orig).lower():
                raise Exception("Cannot delete user: user is referenced by events")
            else:
                raise
    return user

def deactivate_user(db: Session, user_id: int):
    user = db.query(models.User).get(user_id)
    if not user:
        return None

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()
