from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.auth.dependencies import get_current_user
from app.tables import models, schemas
from app.tables.repository import (
    create_table, get_table, get_tables_by_event, update_table, delete_table,
    create_hall_element, get_hall_elements_by_event, update_hall_element, delete_hall_element
)
from app.permissions.utils import check_event_permission
from app.audit_log.repository import log_change
from typing import List
import json

router = APIRouter(prefix="/tables", tags=["Tables"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.TableOut)
def create(table: schemas.TableCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return create_table(db, table, current_user.id)

@router.get("/", response_model=list[schemas.TableOut])
def get_all(hall_type: str, db: Session = Depends(get_db)):
    return get_tables_by_event(db, 0, hall_type) # Assuming event_id 0 for all tables

@router.get("/{table_id}", response_model=schemas.TableOut)
def get_one(table_id: int, db: Session = Depends(get_db)):
    table = get_table(db, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

@router.put("/{table_id}", response_model=schemas.TableOut)
def update(table_id: int, table_update: schemas.TableUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Note: avoid shadowing the imported function name
    table = update_table(db, table_id, table_update, current_user.id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

@router.delete("/{table_id}")
def delete(table_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    print(f"DELETE /tables/{table_id} requested by user {getattr(current_user,'id',None)} role={getattr(current_user,'role',None)}")
    # אם לא admin – נבדוק הרשאת מנהל אירוע לפי האירוע שאליו השולחן שייך
    if not current_user or getattr(current_user, 'role', None) != 'admin':
        table_obj = db.query(models.Table).filter(models.Table.id == table_id).first()
        if not table_obj:
            raise HTTPException(status_code=404, detail="Table not found")
        print(f"Table belongs to event {table_obj.event_id}; validating event permission for user {current_user.id}")
        # יזרוק 403 אם אין לו הרשאה של מנהל אירוע לאירוע של השולחן
        check_event_permission(db, current_user, table_obj.event_id, required_roles=("event_admin", "event_manager"))
    table = delete_table(db, table_id, current_user.id)
    print(f"Delete result: {'OK' if table else 'NOT FOUND'}")
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

@router.get("/event/{event_id}", response_model=list[schemas.TableOut])
def get_by_event(event_id: int, hall_type: str = None, db: Session = Depends(get_db)):
    return get_tables_by_event(db, event_id, hall_type)

@router.post("/event/{event_id}/bulk", response_model=list[schemas.TableOut])
def bulk_create_tables(event_id: int, hall_type: str, tables: list[schemas.TableCreate] = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # פעולת bulk – אם לא admin, ודא שהמשתמש מנהל אירוע לאירוע הזה
    if not current_user or getattr(current_user, 'role', None) != 'admin':
        check_event_permission(db, current_user, event_id, required_roles=("event_admin", "event_manager"))
    print(f"=== FUNCTION CALLED - bulk_create_tables ===")
    print(f"Event ID: {event_id}")
    print(f"Hall Type: {hall_type}")
    print(f"Tables parameter type: {type(tables)}")
    print(f"Tables parameter: {tables}")
    
    from app.seatings import models as seatings_models
    from app.audit_log.repository import log_change
    print(f"=== Processing bulk tables for event {event_id}, hall {hall_type} ===")
    print(f"Received {len(tables) if tables else 0} tables")
    
    # לוג מפורט של הנתונים שנקבלו
    if tables:
        print("=== RECEIVED TABLE DATA ===")
        for i, table in enumerate(tables):
            print(f"Table {i+1}: {table.dict()}")
        print("=== END RECEIVED DATA ===")
    
    try:
        # שלוף את כל השולחנות הקיימים לפני מחיקה
        old_tables = db.query(models.Table).filter(
            models.Table.event_id == event_id,
            models.Table.hall_type == hall_type
        ).all()
        # נשווה רק לפי size ולא לפי table_number כי המספרים משתנים
        old_set = set(t.size for t in old_tables)
        
        # נספור את השולחנות לפי גודל לפני המחיקה
        old_counts = {}
        for table in old_tables:
            old_counts[table.size] = old_counts.get(table.size, 0) + 1

        # מחק רק שיבוצים של השולחנות מה-hall_type הזה
        table_ids = [t.id for t in old_tables]
        print(f"Found {len(table_ids)} existing tables to delete")
        
        if table_ids:
            # מחק קודם את seating_cards שמתייחסים ל-seatings של השולחנות הספציפיים
            from app.seatings.models import SeatingCard
            deleted_seating_cards = db.query(SeatingCard).filter(
                SeatingCard.seating_id.in_(
                    db.query(seatings_models.Seating.id).filter(
                        seatings_models.Seating.table_id.in_(table_ids)
                    )
                )
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_seating_cards} seating cards")
            
            # מחק את attendance_logs שמתייחסים ל-guests בשולחנות הספציפיים
            from app.realtime.models import AttendanceLog
            guest_ids = db.query(seatings_models.Seating.guest_id).filter(
                seatings_models.Seating.table_id.in_(table_ids)
            ).all()
            if guest_ids:
                guest_id_list = [g[0] for g in guest_ids]
                deleted_attendance_logs = db.query(AttendanceLog).filter(
                    AttendanceLog.guest_id.in_(guest_id_list),
                    AttendanceLog.event_id == event_id  # רק של האירוע הספציפי
                ).delete(synchronize_session=False)
                print(f"Deleted {deleted_attendance_logs} attendance logs")
            
            # מחק את realtime_notifications שמתייחסים ל-guests בשולחנות הספציפיים
            from app.realtime.models import RealTimeNotification
            if guest_ids:
                deleted_notifications = db.query(RealTimeNotification).filter(
                    RealTimeNotification.guest_id.in_(guest_id_list),
                    RealTimeNotification.event_id == event_id  # רק של האירוע הספציפי
                ).delete(synchronize_session=False)
                print(f"Deleted {deleted_notifications} realtime notifications")
            
            # מחק את greetings שמתייחסים ל-guests בשולחנות הספציפיים
            from app.greetings.models import Greeting
            if guest_ids:
                deleted_greetings = db.query(Greeting).filter(
                    Greeting.guest_id.in_(guest_id_list),
                    Greeting.event_id == event_id  # רק של האירוע הספציפי
                ).delete(synchronize_session=False)
                print(f"Deleted {deleted_greetings} greetings")
            
            # מחק את guest_field_values שמתייחסים ל-guests בשולחנות הספציפיים
            from app.guests.models import GuestFieldValue
            if guest_ids:
                deleted_field_values = db.query(GuestFieldValue).filter(
                    GuestFieldValue.guest_id.in_(guest_id_list)
                ).delete(synchronize_session=False)
                print(f"Deleted {deleted_field_values} guest field values")
            
            # מחק את audit_log שמתייחס לשולחנות שנמחקים
            from app.audit_log.models import AuditLog
            deleted_audit_logs = db.query(AuditLog).filter(
                AuditLog.entity_type == "Table",
                AuditLog.entity_id.in_(table_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_audit_logs} audit logs")
            
            # מחק את seatings של השולחנות הספציפיים
            deleted_seatings = db.query(seatings_models.Seating).filter(
                seatings_models.Seating.table_id.in_(table_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {deleted_seatings} seatings")
            
            # מחק את השולחנות הספציפיים
            db.query(models.Table).filter(
                models.Table.id.in_(table_ids)
            ).delete(synchronize_session=False)
            print(f"Deleted {len(table_ids)} tables")
            db.commit()
        else:
            print("No existing tables to delete")
        
        created = []
        if tables:
            print("Creating new tables:")
            for i, t in enumerate(tables, 1):
                table_data = t.dict()
                table_data["hall_type"] = hall_type
                table_data["event_id"] = event_id
                table_data["table_number"] = i
                print(f"Processing table {i}: size={table_data['size']}, hall_type={table_data['hall_type']}")
                table = models.Table(**table_data)
                db.add(table)
                created.append(table)
            db.commit()
            print("Successfully committed all changes")
            for table in created:
                db.refresh(table)
            
        # שלוף את כל השולחנות אחרי יצירה
        new_tables = db.query(models.Table).filter(
            models.Table.event_id == event_id,
            models.Table.hall_type == hall_type
        ).all()
        
        # נשווה רק לפי size ולא לפי table_number כי המספרים משתנים
        new_set = set(t.size for t in new_tables)

        # נוספו
        added = new_set - old_set
        # נמחקו
        removed = old_set - new_set

        # לוג על מה שנוסף
        if added:
            # נספור כמה שולחנות מכל גודל נוספו
            added_counts = {}
            for table in new_tables:
                if table.size in added:
                    added_counts[table.size] = added_counts.get(table.size, 0) + 1
            
            details = [f"שולחן ל-{size} סועדים × {count} שולחנות" for size, count in added_counts.items()]
            log_change(
                db=db,
                user_id=current_user.id,
                action="create",
                entity_type="Table",
                entity_id=0,
                field="bulk_create",
                old_value="",
                new_value=", ".join(details),
                event_id=event_id
            )
            print(f"LOG: Created create log for: {', '.join(details)}")
            db.commit()
        # לוג על מה שנמחק
        if removed:
            # נספור כמה שולחנות מכל גודל נמחקו
            removed_counts = {}
            for size in removed:
                removed_counts[size] = old_counts.get(size, 0)
            
            details = [f"שולחן ל-{size} סועדים × {count} שולחנות" for size, count in removed_counts.items()]
            log_change(
                db=db,
                user_id=current_user.id,
                action="delete",
                entity_type="Table",
                entity_id=0,
                field="bulk_delete",
                old_value=", ".join(details),
                new_value="",
                event_id=event_id
            )
            print(f"LOG: Created delete log for: {', '.join(details)}")
            db.commit()
        
        result = created if tables else get_tables_by_event(db, event_id, hall_type)
        print(f"Returning {len(result)} tables")
        return result
        
    except Exception as e:
        print(f"Error during bulk operation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing tables: {str(e)}")

@router.post("/event/{event_id}/add-single", response_model=schemas.TableOut)
def add_single_table(event_id: int, table: schemas.TableCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """הוספת שולחן אחד בלבד ללא מחיקת שולחנות קיימים"""
    from app.audit_log.repository import log_change
    
    # מצא את המספר הבא לשולחן
    max_table_number = db.query(models.Table).filter(
        models.Table.event_id == event_id,
        models.Table.hall_type == table.hall_type
    ).with_entities(models.Table.table_number).order_by(models.Table.table_number.desc()).first()
    
    next_table_number = (max_table_number[0] if max_table_number else 0) + 1
    
    # צור את השולחן החדש
    db_table = models.Table(
        event_id=event_id,
        table_number=next_table_number,
        size=table.size,
        shape=table.shape,
        x=table.x,
        y=table.y,
        hall_type=table.hall_type,
        table_head=table.table_head,
        category=table.category
    )
    
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    
    # תיעוד בלוג
    log_change(
        db=db,
        user_id=current_user.id,
        action="create",
        entity_type="Table",
        entity_id=db_table.id,
        field="table_number",
        old_value="",
        new_value=f"שולחן {db_table.table_number} ({db_table.size} מקומות)",
        event_id=event_id
    )
    
    return db_table

@router.delete("/event/{event_id}/remove-single/{table_number}", response_model=dict)
def remove_single_table(event_id: int, table_number: int, hall_type: str, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """מחיקת שולחן אחד בלבד"""
    print(f"DELETE single table event={event_id} num={table_number} hall={hall_type} by user {getattr(current_user,'id',None)} role={getattr(current_user,'role',None)}")
    # אם לא admin, ודא שהוא מנהל אירוע לאירוע המבוקש
    if not current_user or getattr(current_user, 'role', None) != 'admin':
        check_event_permission(db, current_user, event_id, required_roles=("event_admin", "event_manager"))
    from app.audit_log.repository import log_change
    
    # מצא את השולחן למחיקה
    table = db.query(models.Table).filter(
        models.Table.event_id == event_id,
        models.Table.table_number == table_number,
        models.Table.hall_type == hall_type
    ).first()
    
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # תיעוד בלוג לפני מחיקה
    log_change(
        db=db,
        user_id=current_user.id,
        action="delete",
        entity_type="Table",
        entity_id=table.id,
        field="table_number",
        old_value=f"שולחן {table.table_number} ({table.size} מקומות)",
        new_value="",
        event_id=event_id
    )
    
    # מחק את השולחן
    db.delete(table)
    db.commit()
    print(f"Removed table number {table_number} for event {event_id} hall {hall_type}")
    
    return {"message": f"Table {table_number} removed successfully"}

# HallElement endpoints
@router.post("/hall-elements/event/{event_id}", response_model=schemas.HallElementOut)
def create_hall_element_endpoint(event_id: int, element: schemas.HallElementCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """יצירת אלמנט חדש באולם (במה, כניסה וכו')"""
    element.event_id = event_id
    return create_hall_element(db, element, current_user.id)

@router.get("/hall-elements/event/{event_id}", response_model=List[schemas.HallElementOut])
def get_hall_elements(event_id: int, hall_type: str = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """קבלת כל אלמנטי האולם לאירוע מסוים"""
    return get_hall_elements_by_event(db, event_id, hall_type)

@router.put("/hall-elements/{element_id}", response_model=schemas.HallElementOut)
def update_hall_element_endpoint(element_id: int, element_update: schemas.HallElementUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """עדכון אלמנט באולם"""
    return update_hall_element(db, element_id, element_update)

@router.delete("/hall-elements/{element_id}", response_model=dict)
def delete_hall_element_endpoint(element_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """מחיקת אלמנט מהאולם"""
    delete_hall_element(db, element_id)
    return {"message": "Hall element deleted successfully"}
