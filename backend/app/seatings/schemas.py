from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SeatingBase(BaseModel):
    guest_id: int
    event_id: int
    table_id: int
    seat_number: Optional[int] = None

class SeatingCreate(SeatingBase):
    pass

class SeatingUpdate(BaseModel):
    table_id: Optional[int] = None
    seat_number: Optional[int] = None

class SeatingOut(SeatingBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_occupied: Optional[bool] = None
    occupied_at: Optional[datetime] = None
    occupied_by: Optional[int] = None
    guest_name: Optional[str] = None
    guest_gender: Optional[str] = None
    table_number: Optional[int] = None
    table_size: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class SeatingCardBase(BaseModel):
    event_id: int
    guest_id: int
    seating_id: int
    qr_code: str
    card_data: str
    logo_path: Optional[str] = None

class SeatingCardCreate(SeatingCardBase):
    pass

class SeatingCardUpdate(BaseModel):
    is_downloaded: Optional[bool] = None

class SeatingCardOut(SeatingCardBase):
    id: int
    created_at: Optional[datetime] = None
    is_downloaded: bool

    model_config = ConfigDict(from_attributes=True)

class GenerateCardsRequest(BaseModel):
    event_id: int
    logo_file: Optional[str] = None  # Base64 encoded logo

class CardData(BaseModel):
    guest_name: str
    event_name: str
    table_number: int
    seat_number: Optional[int]
    qr_code: str
