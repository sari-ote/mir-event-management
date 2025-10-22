from pydantic import BaseModel, EmailStr
from typing import Literal
from typing import Optional
from typing import List

class TokenData(BaseModel):
    sub: Optional[int] = None

class UserCreate(BaseModel):
    username: str                   # ⬅️ תוסיפי
    email: EmailStr
    password: str
    full_name: str
    role: Literal['admin', 'event_admin', 'viewer']
    id_number: Optional[str] = None  # ⬅️ תוסיפי (אם השדה אופציונלי)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PermissionCreate(BaseModel):
    user_id: int
    event_ids: List[int]  # קבלת רשימה של מזהי אירועים
    role_in_event: str    # 'event_manager' או 'viewer'