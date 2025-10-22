from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

# ייבוא TableHead למניעת שגיאת relationship
from app.tableHead.models import TableHead
from app.tables.models import Table

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    date = Column(DateTime, nullable=False)
    location = Column(String, nullable=False)

    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # קשרים
    tables = relationship("Table", back_populates="event")
    table_heads = relationship("TableHead", back_populates="event")
    guests = relationship("Guest", back_populates="event")
    custom_fields = relationship("GuestCustomField", back_populates="event") 
    seatings = relationship("Seating", back_populates="event")
    user_permissions = relationship("UserEventPermission", back_populates="event")
    greetings = relationship("Greeting", back_populates="event")
    attendance_logs = relationship("AttendanceLog", back_populates="event")
    realtime_notifications = relationship("RealTimeNotification", back_populates="event")
    hall_elements = relationship("HallElement", back_populates="event")
    payments = relationship("Payment", back_populates="event")
