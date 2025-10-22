from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AttendanceLogBase(BaseModel):
    guest_id: int
    event_id: int
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    scanned_by: Optional[str] = None
    qr_code_data: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AttendanceLogOut(AttendanceLogBase):
    id: int
    class Config:
        from_attributes = True

class RealTimeNotificationBase(BaseModel):
    event_id: int
    notification_type: str
    guest_id: Optional[int] = None
    table_id: Optional[int] = None
    message: str
    created_at: Optional[datetime] = None
    is_read: Optional[bool] = False
    severity: Optional[str] = "info"
    priority: Optional[int] = 1

class RealTimeNotificationOut(RealTimeNotificationBase):
    id: int
    class Config:
        from_attributes = True

class QRScanRequest(BaseModel):
    qr_code: str
    event_id: int

class QRScanResponse(BaseModel):
    status: str
    message: str
    guest: Optional[dict] = None
    has_seating: Optional[bool] = None 