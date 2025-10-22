from sqlalchemy.orm import Session

from app.events import models
from app.tableHead import schemas
from app.audit_log.repository import log_change
from app.guests.models import Guest

def create_table_head(db: Session, table_head: schemas.TableHeadCreate, user_id: int = None):
    db_table_head = models.TableHead(**table_head.dict())
    db.add(db_table_head)
    db.commit()
    db.refresh(db_table_head)
    # תיעוד בלוג
    log_change(
        db=db,
        user_id=user_id,
        action="create",
        entity_type="TableHead",
        entity_id=db_table_head.id,
        field="last_name",
        old_value="",
        new_value=db_table_head.last_name,
        event_id=table_head.event_id
    )
    return db_table_head

def get_table_heads_by_event(db: Session, event_id: int):
    return db.query(models.TableHead).filter(models.TableHead.event_id == event_id).all()

def delete_table_head(db: Session, table_head_id: int, user_id: int = None):
    db_table_head = db.query(models.TableHead).filter(models.TableHead.id == table_head_id).first()
    if db_table_head:
        # בדוק אם יש מוזמנים שמשתמשים בראש השולחן
        guests_using_table_head = db.query(Guest).filter(Guest.table_head_id == table_head_id).all()
        if guests_using_table_head:
            # נתק את כל המוזמנים מראש השולחן
            for guest in guests_using_table_head:
                guest.table_head_id = None
            db.commit()
        
        # תיעוד בלוג לפני המחיקה
        log_change(
            db=db,
            user_id=user_id,
            action="delete",
            entity_type="TableHead",
            entity_id=table_head_id,
            field="last_name",
            old_value=db_table_head.last_name,
            new_value="",
            event_id=db_table_head.event_id
        )
        db.delete(db_table_head)
        db.commit()
    return db_table_head

def update_table_head(db: Session, table_head_id: int, table_head_update: schemas.TableHeadUpdate, user_id: int = None):
    db_table_head = db.query(models.TableHead).filter(models.TableHead.id == table_head_id).first()
    if db_table_head:
        for key, value in table_head_update.dict(exclude_unset=True).items():
            old_value = getattr(db_table_head, key)
            if old_value != value:
                setattr(db_table_head, key, value)
                # תיעוד בלוג
                log_change(
                    db=db,
                    user_id=user_id,
                    action="update",
                    entity_type="TableHead",
                    entity_id=table_head_id,
                    field=key,
                    old_value=str(old_value) if old_value is not None else "",
                    new_value=str(value) if value is not None else "",
                    event_id=db_table_head.event_id
                )
        db.commit()
        db.refresh(db_table_head)
    return db_table_head