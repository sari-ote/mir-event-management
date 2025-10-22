from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Seating(Base):
    __tablename__ = "seatings"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False)
    seat_number = Column(Integer, nullable=True)
    is_occupied = Column(Boolean, default=False)  # NEW: Is the seat occupied
    occupied_at = Column(DateTime, nullable=True)  # NEW: When was it occupied
    occupied_by = Column(Integer, ForeignKey("guests.id"), nullable=True)  # NEW: Who occupied it
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # קשרים
    guest = relationship("Guest", foreign_keys=[guest_id], back_populates="seating")
    event = relationship("Event", back_populates="seatings")
    table = relationship("Table", back_populates="seatings")

class SeatingCard(Base):
    __tablename__ = "seating_cards"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    seating_id = Column(Integer, ForeignKey("seatings.id"), nullable=False)
    qr_code = Column(Text, nullable=False)  # QR Code data
    card_data = Column(Text, nullable=False)  # JSON data of the card
    logo_path = Column(String, nullable=True)  # Path to uploaded logo
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_downloaded = Column(Boolean, default=False)
    
    # קשרים
    event = relationship("Event")
    guest = relationship("Guest")
    seating = relationship("Seating")
