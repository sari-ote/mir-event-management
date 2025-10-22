from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from app.core.database import Base
from datetime import datetime
import pytz

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String(100), nullable=True)  # שם המשתמש
    action = Column(String(20), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=False)
    event_id = Column(Integer, nullable=True)  # מזהה האירוע
    field = Column(String(50), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(TIMESTAMP, default=lambda: datetime.now(pytz.timezone('Asia/Jerusalem')))