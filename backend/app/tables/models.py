from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    table_number = Column(Integer, nullable=False)
    table_head = Column(String, nullable=True)
    category = Column(String, nullable=True)
    size = Column(Integer, nullable=False)
    shape = Column(String, default="circular")  # 'circular' or 'rectangular'
    x = Column(Integer, nullable=True)
    y = Column(Integer, nullable=True)
    hall_type = Column(String, nullable=False)

    event = relationship("Event", back_populates="tables")
    seatings = relationship("Seating", back_populates="table")
    realtime_notifications = relationship("RealTimeNotification", back_populates="table")

    __table_args__ = (
        UniqueConstraint('event_id', 'table_number', 'hall_type', name='uq_event_table_number'),
    )

class HallElement(Base):
    __tablename__ = "hall_elements"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    name = Column(String, nullable=False)
    element_type = Column(String, nullable=False)  # 'stage', 'entrance'
    x = Column(Float, nullable=True)
    y = Column(Float, nullable=True)
    width = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    rotation = Column(Float, default=0.0)
    hall_type = Column(String, nullable=False)
    properties = Column(String, nullable=True)  # JSON string for additional properties

    event = relationship("Event", back_populates="hall_elements")

    __table_args__ = (
        UniqueConstraint('event_id', 'name', 'hall_type', name='uq_event_element_name'),
    )