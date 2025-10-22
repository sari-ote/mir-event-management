from sqlalchemy import Column, Integer, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserEventPermission(Base):
    __tablename__ = "user_event_permissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    role_in_event = Column(String, nullable=False)  # event_admin / viewer

    __table_args__ = (
        UniqueConstraint('user_id', 'event_id', name='uq_user_event'),
    )

    # קשרים עתידיים (אם תצטרכי גישה למשתמש/אירוע מתוך ההרשאה)
    user = relationship("User", backref="event_permissions")
    event = relationship("Event", back_populates="user_permissions")

