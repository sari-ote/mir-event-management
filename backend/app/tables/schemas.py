from pydantic import BaseModel, validator
from typing import Optional

class TableBase(BaseModel):
    event_id: int
    table_number: int
    table_head: str | None = None
    category: str | None = None
    size: int
    shape: str = "circular"  # 'circular' or 'rectangular' or 'oblong'
    x: int | None = None
    y: int | None = None
    hall_type: str
    
    @validator('shape')
    def validate_shape(cls, v):
        print(f"Validating shape: {v}")
        if v not in ['circular', 'rectangular', 'oblong']:
            raise ValueError('shape must be either "circular" or "rectangular" or "oblong"')
        return v

class TableCreate(TableBase):
    pass

class TableUpdate(BaseModel):
    table_head: str | None = None
    category: str | None = None
    size: int | None = None
    shape: str | None = None
    x: int | None = None
    y: int | None = None
    hall_type: str | None = None

class TableOut(TableBase):
    id: int

    class Config:
        from_attributes = True

# HallElement schemas
class HallElementBase(BaseModel):
    event_id: int
    name: str
    element_type: str  # 'stage', 'entrance'
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = 0.0
    hall_type: str
    properties: Optional[str] = None

class HallElementCreate(HallElementBase):
    pass

class HallElementUpdate(BaseModel):
    name: Optional[str] = None
    element_type: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    rotation: Optional[float] = None
    properties: Optional[str] = None

class HallElementOut(HallElementBase):
    id: int

    class Config:
        from_attributes = True
