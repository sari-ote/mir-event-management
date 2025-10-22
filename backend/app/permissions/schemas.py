from pydantic import BaseModel
from typing import Literal

class UserEventPermissionBase(BaseModel):
    user_id: int
    event_id: int
    role_in_event: Literal['event_admin', 'viewer']

class UserEventPermissionCreate(UserEventPermissionBase):
    pass

class UserEventPermissionOut(UserEventPermissionBase):
    id: int

    class Config:
        from_attributes = True
