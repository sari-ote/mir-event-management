from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class Greeting(Base):
    __tablename__ = "greetings"
    
    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    content = Column(Text, nullable=False)
    signer_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_approved = Column(Boolean, default=False)
    
    # קשרים
    guest = relationship("Guest", back_populates="greeting")
    event = relationship("Event", back_populates="greetings") 