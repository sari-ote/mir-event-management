from pydantic import BaseModel
from datetime import datetime

class EventBase(BaseModel):
    name: str
    type: str
    date: datetime
    location: str

class EventCreate(EventBase):
    # לא מוסיפים admin_id כאן – מגיע מה־token בצד השרת
    pass

class EventUpdate(EventBase):
    pass

class EventOut(EventBase):
    id: int
    admin_id: int | None = None  # מוסיפים כדי שיוחזר בתשובה, ומאפשרים None

    class Config:
        from_attributes = True  # נכון ככה
