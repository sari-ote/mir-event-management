from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AuditLogBase(BaseModel):
    user_id: Optional[int]
    user_name: Optional[str]  # שם המשתמש
    action: str
    entity_type: str
    entity_id: int
    event_id: Optional[int]  # מזהה האירוע
    field: Optional[str]
    old_value: Optional[str]
    new_value: Optional[str]

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogOut(AuditLogBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True