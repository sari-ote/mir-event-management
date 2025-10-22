from fastapi import APIRouter, Depends, HTTPException
from app.tableHead import repository, schemas
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/tables", tags=["Tables"])

@router.post("/table-heads/", response_model=schemas.TableHeadOut)
def create_table_head(table_head: schemas.TableHeadCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return repository.create_table_head(db, table_head, user_id=current_user.id)

@router.get("/table-heads/event/{event_id}", response_model=list[schemas.TableHeadOut])
def get_table_heads_by_event(event_id: int, db: Session = Depends(get_db)):
    return repository.get_table_heads_by_event(db, event_id)

@router.delete("/table-heads/{table_head_id}")
def delete_table_head(table_head_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    try:
        table_head = repository.delete_table_head(db, table_head_id, user_id=current_user.id)
        if not table_head:
            raise HTTPException(status_code=404, detail="Table head not found")
        return {"message": "Table head deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/table-heads/{table_head_id}", response_model=schemas.TableHeadOut)
def update_table_head(table_head_id: int, table_head_update: schemas.TableHeadUpdate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    table_head = repository.update_table_head(db, table_head_id, table_head_update, user_id=current_user.id)
    if not table_head:
        raise HTTPException(status_code=404, detail="Table head not found")
    return table_head