from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    id_number = Column(String, nullable=True)
    table_head_id = Column(Integer, ForeignKey("table_heads.id"), nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    referral_source = Column(String, nullable=True)
    gender = Column(String, nullable=False)
    confirmed_arrival = Column(Boolean, default=False)  # שדה חדש לאישור הגעה
    whatsapp_number = Column(String, nullable=True)  # מספר וואטסאפ לבוט
    qr_code = Column(String, nullable=True)  # NEW: Unique QR code for each guest
    check_in_time = Column(DateTime, nullable=True)  # NEW: Time of check-in
    check_out_time = Column(DateTime, nullable=True)  # NEW: Time of check-out
    is_overbooked = Column(Boolean, default=False)  # NEW: If assigned to an overbooked spot
    last_scan_time = Column(DateTime, nullable=True)  # NEW: Last scan time
    
    # קשרים
    event = relationship("Event", back_populates="guests")
    seating = relationship("Seating", foreign_keys="[Seating.guest_id]", back_populates="guest", uselist=False)
    field_values = relationship("GuestFieldValue", back_populates="guest")
    greeting = relationship("Greeting", back_populates="guest", uselist=False)
    attendance_logs = relationship("AttendanceLog", back_populates="guest")
    realtime_notifications = relationship("RealTimeNotification", back_populates="guest")
    payments = relationship("Payment", back_populates="guest")

    __table_args__ = (UniqueConstraint('event_id', 'id_number', name='uq_event_guest'),)


class GuestCustomField(Base):
    __tablename__ = "guest_custom_fields"

    id = Column(Integer, primary_key=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String, nullable=False)
    field_type = Column(String, nullable=False)  # למשל: text, checkbox, select

    # קשרים
    event = relationship("Event", back_populates="custom_fields")
    values = relationship("GuestFieldValue", back_populates="custom_field")


class GuestFieldValue(Base):
    __tablename__ = "guest_field_values"

    id = Column(Integer, primary_key=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    custom_field_id = Column(Integer, ForeignKey("guest_custom_fields.id"), nullable=False)
    value = Column(String, nullable=True)

    # קשרים
    guest = relationship("Guest", back_populates="field_values")
    custom_field = relationship("GuestCustomField", back_populates="values")
