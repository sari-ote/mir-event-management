from sqlalchemy.orm import Session, joinedload
from app.seatings import schemas, models
from app.seatings.models import Seating, SeatingCard
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from app.audit_log.repository import log_change
from app.guests.models import Guest
from app.tables.models import Table
from app.events.models import Event
import json
import qrcode
import base64
from io import BytesIO
import os

def assign_seat(db: Session, seating: schemas.SeatingCreate, user_id: int = None):
    new_seating = Seating(**seating.dict())
    db.add(new_seating)
    try:
        db.flush()  # רק flush, לא commit
        db.refresh(new_seating)
        
        # קבלת מידע על המוזמן והשולחן
        
        guest = db.query(Guest).filter(Guest.id == seating.guest_id).first()
        table = db.query(Table).filter(Table.id == seating.table_id).first()
        
        guest_name = f"{guest.first_name} {guest.last_name}" if guest else "מוזמן לא ידוע"
        table_info = f"שולחן {table.table_number} ({table.size} מקומות)" if table else "שולחן לא ידוע"
        
        # תיעוד בלוג
        log_change(
            db=db,
            user_id=user_id,
            action="create",
            entity_type="Seating",
            entity_id=new_seating.id,
            field="table_id",
            old_value="",
            new_value=f"{guest_name} הוקצה ל{table_info}",
            event_id=seating.event_id
        )
        db.commit()  # שמור את כל השינויים
        return new_seating
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Guest already assigned to a table in this event")

def get_seatings_by_event(db: Session, event_id: int):
    try:
        print(f"מתחיל לטעון seatings לאירוע {event_id}")
        
        # בדיקה כללית של כל ה-seatings
        total_seatings = db.query(Seating).count()
        print(f"סהכ seatings בדאטהבייס: {total_seatings}")
        
        # בדיקה ישירה של המוזמנים
        guests = db.query(Guest).filter(Guest.event_id == event_id).all()
        print(f"נמצאו {len(guests)} מוזמנים לאירוע {event_id}")
        for guest in guests:
            print(f"Guest {guest.id}: {guest.first_name} {guest.last_name}, Gender: {guest.gender}")
        
        # בדיקה ישירה של seatings
        all_seatings = db.query(Seating).filter(Seating.event_id == event_id).all()
        print(f"נמצאו {len(all_seatings)} seatings לאירוע {event_id}")
        
        seatings = db.query(Seating).options(
            joinedload(Seating.guest),
            joinedload(Seating.table)
        ).filter(Seating.event_id == event_id).all()
        
        print(f"נמצאו {len(seatings)} seatings עם joins")
        
        # הוספת מידע על המוזמן לכל seating
        result = []
        for seating in seatings:
            guest_gender = seating.guest.gender if seating.guest else None
            guest_name = f"{seating.guest.first_name} {seating.guest.last_name}" if seating.guest else None
            
            print(f"Seating {seating.id}: Guest {guest_name}, Gender: {guest_gender}")
            print(f"Guest object: {seating.guest}")
            if seating.guest:
                print(f"Guest gender field: {seating.guest.gender}")
                print(f"Guest first_name: {seating.guest.first_name}")
                print(f"Guest last_name: {seating.guest.last_name}")
            
            seating_dict = {
                "id": seating.id,
                "event_id": seating.event_id,
                "table_id": seating.table_id,
                "guest_id": seating.guest_id,
                "seat_number": seating.seat_number,
                "is_occupied": seating.is_occupied,
                "occupied_at": seating.occupied_at,
                "occupied_by": seating.occupied_by,
                "guest_name": guest_name,
                "guest_gender": guest_gender,
                "table_number": seating.table.table_number if seating.table else None,
                "table_size": seating.table.size if seating.table else None
            }
            result.append(seating_dict)
        
        print(f"נמצאו {len(result)} seatings")
        return result
    except Exception as e:
        print(f"שגיאה בטעינת seatings: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def delete_seating(db: Session, seating_id: int, user_id: int = None):
    db_seating = db.query(Seating).filter(Seating.id == seating_id).first()
    if db_seating:
        # קבלת מידע על המוזמן והשולחן
        
        guest = db.query(Guest).filter(Guest.id == db_seating.guest_id).first()
        table = db.query(Table).filter(Table.id == db_seating.table_id).first()
        
        guest_name = f"{guest.first_name} {guest.last_name}" if guest else "מוזמן לא ידוע"
        table_info = f"שולחן {table.table_number} ({table.size} מקומות)" if table else "שולחן לא ידוע"
        
        # תיעוד בלוג לפני המחיקה
        log_change(
            db=db,
            user_id=user_id,
            action="delete",
            entity_type="Seating",
            entity_id=seating_id,
            field="table_id",
            old_value=f"{guest_name} הוסר מ{table_info}",
            new_value="",
            event_id=db_seating.event_id
        )
        
        # מחיקת כרטיסי ישיבה קודם (כי הם מתייחסים ל-seating)
        db.query(SeatingCard).filter(SeatingCard.seating_id == seating_id).delete(synchronize_session=False)
        
        # מחיקת ה-seating
        db.delete(db_seating)
        db.commit()
    return db_seating

def update_seating(db: Session, seating_id: int, seating_update: dict, user_id: int = None):
    db_seating = db.query(Seating).filter(Seating.id == seating_id).first()
    if db_seating:
        for key, value in seating_update.items():
            old_value = getattr(db_seating, key)
            if old_value != value:
                setattr(db_seating, key, value)
                
                # אם זה העברת שולחן
                if key == "table_id":
                    
                    guest = db.query(Guest).filter(Guest.id == db_seating.guest_id).first()
                    old_table = db.query(Table).filter(Table.id == old_value).first()
                    new_table = db.query(Table).filter(Table.id == value).first()
                    
                    guest_name = f"{guest.first_name} {guest.last_name}" if guest else "מוזמן לא ידוע"
                    old_table_info = f"שולחן {old_table.table_number}" if old_table else "שולחן לא ידוע"
                    new_table_info = f"שולחן {new_table.table_number}" if new_table else "שולחן לא ידוע"
                    
                    # בדיקה אם זה העברת קטגוריה שלמה
                    # נבדוק אם יש עוד מוזמנים מאותה קטגוריה שעברו לאותו שולחן
                    if guest and guest.table_head_id:
                        from app.tableHead.models import TableHead
                        table_head = db.query(TableHead).filter(TableHead.id == guest.table_head_id).first()
                        if table_head:
                            category = table_head.category
                            # נבדוק כמה מוזמנים מאותה קטגוריה עברו לאותו שולחן באותו זמן
                            recent_seatings = db.query(Seating).filter(
                                Seating.table_id == value,
                                Seating.id != seating_id
                            ).all()
                            
                            category_guests = []
                            for recent_seating in recent_seatings:
                                recent_guest = db.query(Guest).filter(Guest.id == recent_seating.guest_id).first()
                                if recent_guest and recent_guest.table_head_id == guest.table_head_id:
                                    category_guests.append(recent_guest)
                            
                            # אם יש יותר מ-2 מוזמנים מאותה קטגוריה, זה כנראה העברת קטגוריה
                            if len(category_guests) >= 2:
                                actionText = "העברת קטגוריה"
                                detailsText = f"קטגוריה '{category}' הוסרה משולחן {old_table_info} והועברה לשולחן {new_table_info}"
                            else:
                                actionText = "העברת מוזמן"
                                detailsText = f"{guest_name} הוסר משולחן {old_table_info} והועבר לשולחן {new_table_info}"
                        else:
                            actionText = "העברת מוזמן"
                            detailsText = f"{guest_name} הוסר משולחן {old_table_info} והועבר לשולחן {new_table_info}"
                    else:
                        actionText = "העברת מוזמן"
                        detailsText = f"{guest_name} הוסר משולחן {old_table_info} והועבר לשולחן {new_table_info}"
                    
                    # תיעוד בלוג
                    log_change(
                        db=db,
                        user_id=user_id,
                        action="update",
                        entity_type="Seating",
                        entity_id=seating_id,
                        field=key,
                        old_value=f"{guest_name} הוסר משולחן {old_table.table_number}",
                        new_value=f"{guest_name} הועבר לשולחן {new_table.table_number}",
                        event_id=db_seating.event_id
                    )
                else:
                    # תיעוד בלוג רגיל
                    log_change(
                        db=db,
                        user_id=user_id,
                        action="update",
                        entity_type="Seating",
                        entity_id=seating_id,
                        field=key,
                        old_value=str(old_value) if old_value is not None else "",
                        new_value=str(value) if value is not None else "",
                        event_id=db_seating.event_id
                    )
        db.commit()
        db.refresh(db_seating)
    return db_seating

def delete_seatings_by_event(db: Session, event_id: int, user_id: int = None):
    """מחיקת כל מקומות הישיבה לאירוע מסוים"""
    seatings = db.query(Seating).filter(Seating.event_id == event_id).all()
    
    # תיעוד בלוג לפני המחיקה
    for seating in seatings:
        
        guest = db.query(Guest).filter(Guest.id == seating.guest_id).first()
        table = db.query(Table).filter(Table.id == seating.table_id).first()
        
        guest_name = f"{guest.first_name} {guest.last_name}" if guest else "מוזמן לא ידוע"
        table_info = f"שולחן {table.table_number}" if table else "שולחן לא ידוע"
        
        log_change(
            db=db,
            user_id=user_id,
            action="delete",
            entity_type="Seating",
            entity_id=seating.id,
            field="event_id",
            old_value=f"{guest_name} הוסר מ{table_info}",
            new_value="",
            event_id=event_id
        )
    
    # מחיקת כרטיסי ישיבה קודם (כי הם מתייחסים ל-seatings)
    db.query(SeatingCard).filter(SeatingCard.event_id == event_id).delete(synchronize_session=False)
    
    # מחיקת כל מקומות הישיבה
    db.query(Seating).filter(Seating.event_id == event_id).delete(synchronize_session=False)
    db.commit()
    
    return len(seatings)

# פונקציות חדשות לכרטיסי ישיבה
def create_seating_card(db: Session, card_data: schemas.SeatingCardCreate):
    db_card = SeatingCard(**card_data.dict())
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

def get_seating_cards_by_event(db: Session, event_id: int):
    return db.query(SeatingCard).options(
        joinedload(SeatingCard.guest),
        joinedload(SeatingCard.seating),
        joinedload(SeatingCard.event)
    ).filter(SeatingCard.event_id == event_id).all()

def update_card_download_status(db: Session, card_id: int, is_downloaded: bool):
    card = db.query(SeatingCard).filter(SeatingCard.id == card_id).first()
    if card:
        card.is_downloaded = is_downloaded
        db.commit()
        db.refresh(card)
        return card
    return None

def generate_qr_code(data: str) -> str:
    """יצירת QR Code מנתונים"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    # המרה ל-base64
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

def delete_seating_cards_by_event(db: Session, event_id: int):
    """מחיקת כל כרטיסי הישיבה לאירוע מסוים"""
    cards = db.query(SeatingCard).filter(SeatingCard.event_id == event_id).all()
    for card in cards:
        db.delete(card)
    db.commit()
    return len(cards)

def generate_cards_for_event(db: Session, event_id: int, logo_path: str = None, force_recreate: bool = False):
    """יצירת כרטיסי ישיבה לכל המוזמנים שהגיעו"""
    
    print(f"מתחיל יצירת כרטיסים לאירוע {event_id}")
    print(f"נתיב לוגו: {logo_path}")
    print(f"לוגו קיים: {os.path.exists(logo_path) if logo_path else False}")
    
    # בדיקה אם כבר קיימים כרטיסים לאירוע זה
    existing_cards = db.query(SeatingCard).filter(SeatingCard.event_id == event_id).all()
    if existing_cards and not force_recreate:
        print(f"כבר קיימים {len(existing_cards)} כרטיסים לאירוע זה. לא יוצרים חדשים.")
        return existing_cards
    
    # אם יש כרטיסים קיימים ורוצים ליצור מחדש, נמחק אותם
    if existing_cards and force_recreate:
        print(f"מוחק {len(existing_cards)} כרטיסים קיימים ויוצר חדשים")
        delete_seating_cards_by_event(db, event_id)
    
    # קבלת כל המוזמנים שהגיעו לאירוע
    confirmed_guests = db.query(Guest).filter(
        Guest.event_id == event_id,
        Guest.confirmed_arrival == True
    ).all()
    
    print(f"נמצאו {len(confirmed_guests)} מוזמנים עם אישור הגעה")
    
    created_cards = []
    
    for guest in confirmed_guests:
        # בדיקה אם יש מקום ישיבה למוזמן
        seating = db.query(Seating).filter(
            Seating.guest_id == guest.id,
            Seating.event_id == event_id
        ).first()
        
        if not seating:
            print(f"אין מקום ישיבה למוזמן {guest.first_name} {guest.last_name}")
            continue
            
        # קבלת פרטי השולחן
        table = db.query(Table).filter(Table.id == seating.table_id).first()
        event = db.query(Event).filter(Event.id == event_id).first()
        
        if not table or not event:
            print(f"חסרים פרטי שולחן או אירוע למוזמן {guest.first_name} {guest.last_name}")
            continue
            
        # יצירת QR Code - כעת ללא פרטי מקום; רק זיהוי מוזמן + אירוע
        qr_data = json.dumps({
            "event_id": event_id,
            "first_name": guest.first_name,
            "last_name": guest.last_name,
            "phone": guest.phone or ""
        })
        
        print(f"QR Code data for {guest.first_name} {guest.last_name}: {qr_data}")
        
        qr_code = generate_qr_code(qr_data)
        
        # יצירת נתוני הכרטיס
        card_data = {
            "guest_name": f"{guest.first_name} {guest.last_name}",
            "event_name": event.name,
            "table_number": table.table_number,
            "seat_number": seating.seat_number,
            "qr_code": qr_code
        }
        
        print(f"יוצר כרטיס למוזמן: {guest.first_name} {guest.last_name}")
        print(f"לוגו שישמר: {logo_path}")
        
        # יצירת כרטיס ישיבה
        card_create = schemas.SeatingCardCreate(
            event_id=event_id,
            guest_id=guest.id,
            seating_id=seating.id,
            qr_code=qr_code,
            card_data=json.dumps(card_data),
            logo_path=logo_path
        )
        
        created_card = create_seating_card(db, card_create)
        created_cards.append(created_card)
        print(f"כרטיס נוצר בהצלחה עם ID: {created_card.id}")
    
    print(f"סה״כ נוצרו {len(created_cards)} כרטיסים")
    return created_cards
