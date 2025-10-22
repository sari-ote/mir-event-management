from app.core.database import Base
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship


class TableHead(Base):
    __tablename__ = "table_heads"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    last_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    category = Column(String, nullable=True)
    gender = Column(String, nullable=False)  
    event = relationship("Event", back_populates="table_heads")