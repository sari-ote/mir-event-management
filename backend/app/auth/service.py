from sqlalchemy.orm import Session
from app.users import models
from app.auth.schemas import UserCreate, UserLogin
from passlib.context import CryptContext
from app.core.config import settings
from jose import jwt
import datetime
from app.users.repository import get_user_by_email  # במקום get_user_by_username

from app.users.repository import get_user_by_username
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from typing import Optional


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)




def get_password_hash(password):
    return pwd_context.hash(password)

def register_user(db: Session, user_data: UserCreate):
    # בדיקה אם קיים משתמש עם אותו אימייל
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(status_code=409, detail="אימייל זה כבר קיים במערכת")
    hashed_password = get_password_hash(user_data.password)
    new_user = models.User(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
        id_number=user_data.id_number,
        is_active=True
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="שגיאה ביצירת משתמש")





def authenticate_user(db: Session, email: str, password: str):
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None

    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=1)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
