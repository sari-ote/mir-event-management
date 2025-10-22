# app/auth/router.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth import schemas, service
from fastapi.responses import JSONResponse
from app.users import models
import os # ייבוא חדש
from app.core.config import settings
from app.auth.service import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])

# הגדרת המייל של מנהל המערכת (מומלץ להשתמש במשתני סביבה)
SYSTEM_ADMIN_EMAIL = os.getenv("SYSTEM_ADMIN_EMAIL", "admin@example.com")

@router.post("/register")
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # חשוב: יש להגן על נקודת קצה זו כך שרק מנהל מערכת יוכל להוסיף משתמשים חדשים.
    # הדבר מתבצע בדרך כלל באמצעות תלות (Dependency) שבודקת את תפקיד המשתמש.
    user = service.register_user(db, user_data)
    return user

@router.post("/login")
def login_user(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    # בדיקה עבור כל מנהלי־העל
    if user_data.email in settings.SUPERADMINS:
        if user_data.password == user_data.email:
            token = create_access_token(data={"sub": user_data.email, "role": "admin"})
            return {
                "access_token": token,
                "user": {
                    "id": 0,
                    "email": user_data.email,
                    "role": "admin",
                    "full_name": "מנהל מערכת"
                }
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    # לוגיקה רגילה
    token = service.authenticate_user(db, user_data.email, user_data.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = db.query(models.User).filter_by(email=user_data.email).first()
    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": user.full_name
        }
    }