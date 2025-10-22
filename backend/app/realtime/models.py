from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"
    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    check_in_time = Column(DateTime, default=datetime.utcnow)
    check_out_time = Column(DateTime, nullable=True)
    scanned_by = Column(String, nullable=True)
    qr_code_data = Column(Text, nullable=True)
    status = Column(String, default="checked_in")
    notes = Column(Text, nullable=True)
    guest = relationship("Guest", back_populates="attendance_logs")
    event = relationship("Event", back_populates="attendance_logs")

class RealTimeNotification(Base):
    __tablename__ = "realtime_notifications"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    notification_type = Column(String, nullable=False)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False)
    severity = Column(String, default="info")
    priority = Column(Integer, default=1)
    persistent = Column(Boolean, default=False)  # התראות שלא נעלמות אוטומטית
    event = relationship("Event", back_populates="realtime_notifications")
    guest = relationship("Guest", back_populates="realtime_notifications")
    table = relationship("Table", back_populates="realtime_notifications") 