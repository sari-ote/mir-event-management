from sqlalchemy.orm import Session
from app.tables import models, schemas
from sqlalchemy.exc import IntegrityError
from app.audit_log.repository import log_change

def create_table(db: Session, table: schemas.TableCreate, user_id: int = None):
    # בדיקה אם כבר קיימת רשומה עם אותו event_id ו-table_number
    existing = db.query(models.Table).filter_by(
        event_id=table.event_id,
        table_number=table.table_number
    ).first()
    if existing:
        return existing  # מחזיר את הרשומה הקיימת
    db_table = models.Table(**table.dict())
    db.add(db_table)
    try:
        db.flush()  # רק flush, לא commit
        db.refresh(db_table)
        # תיעוד בלוג
        log_change(
            db=db,
            user_id=user_id,
            action="create",
            entity_type="Table",
            entity_id=db_table.id,
            field="table_number",
            old_value="",
            new_value=f"שולחן {db_table.table_number} ({db_table.size} מקומות)",
            event_id=table.event_id
        )
        db.commit()  # שמור את כל השינויים
    except IntegrityError:
        db.rollback()
        # חפש שוב את הרשומה והחזר אותה
        return db.query(models.Table).filter_by(
            event_id=table.event_id,
            table_number=table.table_number
        ).first()
    return db_table

def get_table(db: Session, table_id: int):
    return db.query(models.Table).filter(models.Table.id == table_id).first()

def get_all_tables(db: Session, hall_type: str):
    return db.query(models.Table).filter(models.Table.hall_type == hall_type).all()

def update_table(db: Session, table_id: int, table_update: schemas.TableUpdate, user_id: int = None):
    db_table = get_table(db, table_id)
    if db_table:
        # עדכן רק שדות שנשלחו בפועל בבקשה, כדי לא לדרוס עמודות not-null ב-None
        updates = table_update.dict(exclude_unset=True)
        for key, value in updates.items():
            old_value = getattr(db_table, key)
            if old_value != value:
                setattr(db_table, key, value)
                # תיעוד בלוג
                log_change(
                    db=db,
                    user_id=user_id,
                    action="update",
                    entity_type="Table",
                    entity_id=table_id,
                    field=key,
                    old_value=str(old_value) if old_value is not None else "",
                    new_value=str(value) if value is not None else "",
                    event_id=db_table.event_id
                )
        db.commit()
        db.refresh(db_table)
    return db_table


def get_tables_by_event(db: Session, event_id: int, hall_type: str = None):
    query = db.query(models.Table).filter(models.Table.event_id == event_id)
    if hall_type:
        query = query.filter(models.Table.hall_type == hall_type)
    return query.all()

def delete_table(db: Session, table_id: int, user_id: int = None):
    db_table = get_table(db, table_id)
    if db_table:
        # תיעוד בלוג לפני המחיקה
        log_change(
            db=db,
            user_id=user_id,
            action="delete",
            entity_type="Table",
            entity_id=table_id,
            field="table_number",
            old_value=f"שולחן {db_table.table_number} ({db_table.size} מקומות)",
            new_value="",
            event_id=db_table.event_id
        )
        db.delete(db_table)
        db.commit()
    return db_table

# HallElement repository functions
def create_hall_element(db: Session, element: schemas.HallElementCreate, user_id: int = None):
    db_element = models.HallElement(**element.dict())
    db.add(db_element)
    try:
        db.flush()
        db.refresh(db_element)
        # תיעוד בלוג
        log_change(
            db=db,
            user_id=user_id,
            action="create",
            entity_type="HallElement",
            entity_id=db_element.id,
            field="name",
            old_value="",
            new_value=f"{element.element_type}: {element.name}",
            event_id=element.event_id
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        return db.query(models.HallElement).filter_by(
            event_id=element.event_id,
            name=element.name,
            hall_type=element.hall_type
        ).first()
    return db_element

def get_hall_elements_by_event(db: Session, event_id: int, hall_type: str = None):
    query = db.query(models.HallElement).filter(models.HallElement.event_id == event_id)
    if hall_type:
        query = query.filter(models.HallElement.hall_type == hall_type)
    return query.all()

def update_hall_element(db: Session, element_id: int, element_update: schemas.HallElementUpdate):
    db_element = db.query(models.HallElement).filter(models.HallElement.id == element_id).first()
    if db_element:
        for field, value in element_update.dict(exclude_unset=True).items():
            setattr(db_element, field, value)
        db.commit()
        db.refresh(db_element)
    return db_element

def delete_hall_element(db: Session, element_id: int):
    db_element = db.query(models.HallElement).filter(models.HallElement.id == element_id).first()
    if db_element:
        db.delete(db_element)
        db.commit()
    return db_element
