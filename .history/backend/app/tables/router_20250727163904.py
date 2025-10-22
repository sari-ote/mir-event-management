from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.tables import repository, schemas, models
from app.core.database import SessionLocal
from app.auth.dependencies import get_current_user
from app.audit_log.repository import log_change

router = APIRouter(prefix="/tables", tags=["Tables"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.TableOut)
def create(table: schemas.TableCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return repository.create_table(db, table, user_id=current_user.id)

@router.get("/", response_model=list[schemas.TableOut])
def get_all(hall_type: str, db: Session = Depends(get_db)):
    return repository.get_all_tables(db, hall_type)

@router.get("/{table_id}", response_model=schemas.TableOut)
def get_one(table_id: int, db: Session = Depends(get_db)):
    table = repository.get_table(db, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

@router.put("/{table_id}", response_model=schemas.TableOut)
def update(table_id: int, update_table: schemas.TableUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    table = repository.update_table(db, table_id, update_table, user_id=current_user.id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

@router.delete("/{table_id}")
def delete(table_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    table = repository.delete_table(db, table_id, user_id=current_user.id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

@router.get("/event/{event_id}", response_model=list[schemas.TableOut])
def get_by_event(event_id: int, hall_type: str, db: Session = Depends(get_db)):
    return repository.get_tables_by_event(db, event_id, hall_type)

@router.post("/event/{event_id}/bulk", response_model=list[schemas.TableOut])
def bulk_create_tables(event_id: int, hall_type: str, tables: list[schemas.TableCreate] = Body(...), db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    from app.seatings import models as seatings_models
    print(f"=== Processing bulk tables for event {event_id}, hall {hall_type} ===")
    print(f"Received {len(tables) if tables else 0} tables")
    
    try:
        # קבל שולחנות קיימים
        existing_tables = db.query(models.Table).filter(
            models.Table.event_id == event_id,
            models.Table.hall_type == hall_type
        ).all()
        
        existing_table_ids = [t.id for t in existing_tables]
        print(f"Found {len(existing_table_ids)} existing tables")
        
        # בדוק אם יש שינוי אמיתי
        new_tables_data = []
        if tables:
            for i, t in enumerate(tables, 1):
                table_data = t.dict()
                table_data["hall_type"] = hall_type
                table_data["event_id"] = event_id
                table_data["table_number"] = i
                new_tables_data.append(table_data)
        
        print(f"Processed {len(new_tables_data)} new tables")
        
        # השוואה בין שולחנות קיימים לחדשים - כל השדות המשמעותיים
        def table_to_tuple(t):
            if hasattr(t, 'size'):  # זה אובייקט SQLAlchemy
                return (
                    t.size,
                    t.table_number,
                    getattr(t, 'x', None),
                    getattr(t, 'y', None),
                    getattr(t, 'hall_type', None),
                    getattr(t, 'event_id', None),
                    getattr(t, 'table_head', None),
                    getattr(t, 'category', None),
                )
            else:  # זה dictionary
                return (
                    t.get('size'),
                    t.get('table_number'),
                    t.get('x'),
                    t.get('y'),
                    t.get('hall_type'),
                    t.get('event_id'),
                    t.get('table_head'),
                    t.get('category'),
                )

        existing_tables_summary = sorted([table_to_tuple(t) for t in existing_tables])
        new_tables_summary = sorted([table_to_tuple(t) for t in new_tables_data])

        print(f"Existing tables: {existing_tables_summary}")
        print(f"New tables: {new_tables_summary}")

        print("--- Existing table tuples ---")
        for tup in existing_tables_summary:
            print(tup)
        print("--- New table tuples ---")
        for tup in new_tables_summary:
            print(tup)
        print("--- End of tuples ---")

        # בדיקה אם זה רק הוספת שולחן
        is_only_addition = len(new_tables_data) == len(existing_tables) + 1
        all_existing_included = all(t in new_tables_summary for t in existing_tables_summary)
        print(f"Is only addition: {is_only_addition}")
        print(f"All existing included: {all_existing_included}")

        if is_only_addition and all_existing_included:
            print("Only adding a table - will add without deleting existing tables")
            # מצא את השולחן החדש
            added_table = None
            for t in new_tables_data:
                if table_to_tuple(t) not in existing_tables_summary:
                    added_table = t
                    break
            if added_table:
                print(f"Found new table: {added_table}")
                # וודא שיש לנו dictionary עם כל השדות הנדרשים
                if isinstance(added_table, dict):
                    table_data = added_table.copy()
                else:
                    table_data = added_table.__dict__.copy()
                
                # וודא שכל השדות הנדרשים קיימים
                table_data["hall_type"] = hall_type
                table_data["event_id"] = event_id
                
                table = models.Table(**table_data)
                db.add(table)
                db.commit()
                db.refresh(table)
                log_change(
                    db=db,
                    user_id=current_user.id,
                    action="create",
                    entity_type="Table",
                    entity_id=table.id,
                    field="table_number",
                    old_value="",
                    new_value=f"שולחן {table.table_number} ({table.size} מקומות) - אולם {'גברים' if table.hall_type == 'm' else 'נשים'}"
                )
                result = existing_tables + [table]
                print(f"Successfully added new table. Total tables: {len(result)}")
                return result
            else:
                print("Could not find new table - returning existing tables")
                return existing_tables

        # בדיקה אם יש שינוי אמיתי - רק אם השולחנות שונים
        tables_changed = existing_tables_summary != new_tables_summary
        print(f"Tables changed: {tables_changed}")

        if tables_changed:
            print("Tables have changed - will delete and recreate")
            # יש שינוי - מחק את הקיימים ויצור חדשים
            if existing_table_ids:
                # מחק קודם את השיבוצים
                deleted_seatings = db.query(seatings_models.Seating).filter(
                    seatings_models.Seating.table_id.in_(existing_table_ids)
                ).delete(synchronize_session=False)
                print(f"Deleted {deleted_seatings} seatings")
                # מחק את השולחנות ותעד בלוג נפרד לכל שולחן
                for table in existing_tables:
                    log_change(
                        db=db,
                        user_id=current_user.id,
                        action="delete",
                        entity_type="Table",
                        entity_id=table.id,
                        field="table_number",
                        old_value=f"שולחן {table.table_number} ({table.size} מקומות) - אולם {'גברים' if table.hall_type == 'm' else 'נשים'}",
                        new_value=""
                    )
                deleted_tables = db.query(models.Table).filter(
                    models.Table.id.in_(existing_table_ids)
                ).delete(synchronize_session=False)
                print(f"Deleted {deleted_tables} tables")
                db.commit()
            # יצירת שולחנות חדשים
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
                for table in created:
                    log_change(
                        db=db,
                        user_id=current_user.id,
                        action="create",
                        entity_type="Table",
                        entity_id=table.id,
                        field="table_number",
                        old_value="",
                        new_value=f"שולחן {table.table_number} ({table.size} מקומות) - אולם {'גברים' if table.hall_type == 'm' else 'נשים'}"
                    )
            result = created if tables else repository.get_tables_by_event(db, event_id, hall_type)
        else:
            print("No changes detected, returning existing tables")
            result = existing_tables
        print(f"Returning {len(result)} tables")
        return result
        
    except Exception as e:
        print(f"Error during bulk operation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing tables: {str(e)}")
