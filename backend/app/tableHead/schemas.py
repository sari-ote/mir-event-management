from pydantic import BaseModel

class TableHeadBase(BaseModel):
    event_id: int
    last_name: str
    phone: str | None = None
    email: str | None = None
    category: str | None = None
    gender: str  

class TableHeadCreate(TableHeadBase):
    pass

class TableHeadUpdate(BaseModel):
    last_name: str | None = None
    phone: str | None = None
    email: str | None = None
    category: str | None = None
    gender: str | None = None  

class TableHeadOut(TableHeadBase):
    id: int

    class Config:
        orm_mode = True