from fastapi import HTTPException
from app.permissions.models import UserEventPermission
from app.core.config import settings

def check_event_permission(db, user, event_id, required_roles=("event_admin",)):
    # admin או SUPERADMIN תמיד יכול
    if user.role == 'admin' or (hasattr(user, 'email') and user.email in settings.SUPERADMINS):
        return
    # בדוק הרשאה לאירוע
    perm = db.query(UserEventPermission).filter_by(user_id=user.id, event_id=event_id).first()
    if not perm or perm.role_in_event not in required_roles:
        raise HTTPException(status_code=403, detail="אין לך הרשאה לפעולה זו") 