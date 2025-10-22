from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.seatings import repository, schemas, models
from app.guests.models import Guest
from app.tables.models import Table
from app.tableHead.models import TableHead
from app.auth.dependencies import get_current_user
from typing import List, Dict, Any, Optional
import base64
import os
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import io
from PIL import Image
import qrcode
from starlette.responses import StreamingResponse
from app.seatings.models import Seating, SeatingCard

router = APIRouter(prefix="/seatings", tags=["Seatings"])

@router.post("/", response_model=schemas.SeatingOut)
def assign_seat(seating: schemas.SeatingCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return repository.assign_seat(db, seating, user_id=current_user.id)

@router.get("/event/{event_id}", response_model=list[schemas.SeatingOut])
def get_seatings(event_id: int, db: Session = Depends(get_db)):
    try:
        print(f"מתחיל לטעון seatings לאירוע {event_id}")
        seatings_data = repository.get_seatings_by_event(db, event_id)
        print(f"נמצאו {len(seatings_data)} seatings")
        
        # יצירת אובייקטי Pydantic מהנתונים
        seatings = []
        for seating_dict in seatings_data:
            try:
                seating = schemas.SeatingOut(**seating_dict)
                seatings.append(seating)
            except Exception as e:
                print(f"שגיאה בעיבוד seating {seating_dict.get('id', 'unknown')}: {str(e)}")
                print(f"Seating data: {seating_dict}")
                # דלג על seating זה והמשך עם השאר
                continue
        
        return seatings
    except Exception as e:
        print(f"שגיאה בטעינת seatings: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"שגיאה בטעינת מקומות ישיבה: {str(e)}")

@router.delete("/{seating_id}")
def delete_seating(seating_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    result = repository.delete_seating(db, seating_id, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Seating not found")
    return {"message": "Seating deleted"}

@router.put("/{seating_id}")
def update_seating(seating_id: int, seating_update: dict, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    result = repository.update_seating(db, seating_id, seating_update, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Seating not found")
    return result

# נתיבים חדשים לסידור מקומות ישיבה
@router.post("/save-seating-plan")
def save_seating_plan(
    seating_data: Dict[str, Any], 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """שמירת תוכנית מקומות ישיבה שלמה"""
    try:
        event_id = seating_data.get("eventId")
        tables = seating_data.get("tables", [])
        guests = seating_data.get("guests", [])
        
        # קבלת מקומות ישיבה קיימים
        existing_seatings = db.query(Seating).filter(Seating.event_id == event_id).all()
        existing_seatings_dict = {seating.guest_id: seating for seating in existing_seatings}
        
        # יצירת מקומות ישיבה חדשים או עדכון קיימים
        created_seatings = []
        updated_seatings = []
        
        for guest in guests:
            # מציאת table_id לפי tableNumber
            table_id = None
            for table in tables:
                if table.get("table_number") == guest.get("tableNumber") or table.get("id") == guest.get("tableNumber"):
                    table_id = table.get("id")
                    break
            
            if table_id:
                guest_id = guest["id"]
                
                # בדיקה אם יש כבר מקום ישיבה למוזמן זה
                if guest_id in existing_seatings_dict:
                    # עדכון מקום ישיבה קיים
                    existing_seating = existing_seatings_dict[guest_id]
                    if existing_seating.table_id != table_id or existing_seating.seat_number != guest.get("seatNumber"):
                        existing_seating.table_id = table_id
                        existing_seating.seat_number = guest.get("seatNumber")
                        updated_seatings.append(existing_seating)
                else:
                    # יצירת מקום ישיבה חדש
                    seating = schemas.SeatingCreate(
                        guest_id=guest_id,
                        event_id=event_id,
                        table_id=table_id,
                        seat_number=guest.get("seatNumber")
                    )
                    created_seating = repository.assign_seat(db, seating, user_id=current_user.id)
                    created_seatings.append(created_seating)
        
        # מחיקת מקומות ישיבה שלא קיימים יותר ברשימה החדשה
        new_guest_ids = {guest["id"] for guest in guests}
        for seating in existing_seatings:
            if seating.guest_id not in new_guest_ids:
                # מחיקת כרטיסי ישיבה קודם
                db.query(SeatingCard).filter(SeatingCard.seating_id == seating.id).delete(synchronize_session=False)
                # מחיקת ה-seating
                db.delete(seating)
        
        db.commit()
        
        return {
            "message": "תוכנית מקומות הישיבה נשמרה בהצלחה",
            "created_seatings": len(created_seatings),
            "updated_seatings": len(updated_seatings)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשמירת תוכנית מקומות ישיבה: {str(e)}")

@router.get("/export-seating-map/{event_id}")
def export_seating_map(event_id: int, db: Session = Depends(get_db)):
    """יצוא מפת ישיבה לאירוע"""
    try:
        print(f"מתחיל יצוא מפת ישיבה לאירוע {event_id}")
        
        # טעינת כל הנתונים הנדרשים
        from app.guests.models import Guest
        from app.tables.models import Table
        from app.tableHead.models import TableHead
        
        # טעינת seatings עם guest ו-table
        seatings = repository.get_seatings_by_event(db, event_id)
        print(f"נמצאו {len(seatings)} seatings")
        
        # טעינת table_heads לקבלת קטגוריות
        table_heads = db.query(TableHead).filter(TableHead.event_id == event_id).all()
        table_heads_dict = {th.id: th.category for th in table_heads}
        print(f"נמצאו {len(table_heads)} table_heads")
        
        # ארגון הנתונים למפת ישיבה
        seating_map = {}
        for seating in seatings:
            if not seating.guest or not seating.table:
                print(f"Seating {seating.id} ללא guest או table")
                continue
                
            table_number = seating.table.table_number
            if table_number not in seating_map:
                seating_map[table_number] = []
            
            # יצירת שם מלא מ-first_name ו-last_name
            guest_name = f"{seating.guest.first_name} {seating.guest.last_name}".strip()
            
            # קבלת קטגוריה מ-table_head_id
            category = "ללא קטגוריה"
            if seating.guest.table_head_id:
                category = table_heads_dict.get(seating.guest.table_head_id, "ללא קטגוריה")
            
            seating_map[table_number].append({
                "guest_name": guest_name,
                "seat_number": seating.seat_number,
                "category": category
            })
        
        print(f"אורגנו {len(seating_map)} שולחנות")
        for table_num, guests in seating_map.items():
            print(f"שולחן {table_num}: {len(guests)} מוזמנים")
        
        return {
            "event_id": event_id,
            "seating_map": seating_map,
            "total_tables": len(seating_map),
            "total_guests": sum(len(guests) for guests in seating_map.values())
        }
    except Exception as e:
        print(f"שגיאה ביצוא מפת ישיבה: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"שגיאה ביצוא מפת ישיבה: {str(e)}")

@router.get("/export-guest-list/{event_id}")
def export_guest_list(event_id: int, db: Session = Depends(get_db)):
    """יצוא רשימת מוזמנים מסודרת לפי קטגוריות"""
    try:
        print(f"מתחיל יצוא רשימת מוזמנים לאירוע {event_id}")
        
        # טעינת כל הנתונים הנדרשים
        from app.guests.models import Guest
        from app.tables.models import Table
        from app.tableHead.models import TableHead
        
        # טעינת seatings עם guest ו-table
        seatings = repository.get_seatings_by_event(db, event_id)
        print(f"נמצאו {len(seatings)} seatings")
        
        # טעינת table_heads לקבלת קטגוריות
        table_heads = db.query(TableHead).filter(TableHead.event_id == event_id).all()
        table_heads_dict = {th.id: th.category for th in table_heads}
        print(f"נמצאו {len(table_heads)} table_heads")
        
        # ארגון לפי קטגוריות
        guest_list_by_category = {}
        for seating in seatings:
            if not seating.guest:
                print(f"Seating {seating.id} ללא guest")
                continue
                
            # קבלת קטגוריה מ-table_head_id
            category = "ללא קטגוריה"
            if seating.guest.table_head_id:
                category = table_heads_dict.get(seating.guest.table_head_id, "ללא קטגוריה")
            
            if category not in guest_list_by_category:
                guest_list_by_category[category] = []
            
            # יצירת שם מלא מ-first_name ו-last_name
            guest_name = f"{seating.guest.first_name} {seating.guest.last_name}".strip()
            
            # קבלת מספר השולחן הנכון
            table_number = seating.table.table_number if seating.table else seating.table_id
            
            guest_list_by_category[category].append({
                "name": guest_name,
                "table": table_number,
                "seat": seating.seat_number,
                "phone": seating.guest.phone if hasattr(seating.guest, 'phone') else "",
                "email": seating.guest.email if hasattr(seating.guest, 'email') else ""
            })
        
        print(f"אורגנו {len(guest_list_by_category)} קטגוריות")
        for category, guests in guest_list_by_category.items():
            print(f"קטגוריה '{category}': {len(guests)} מוזמנים")
        
        return {
            "event_id": event_id,
            "guest_list_by_category": guest_list_by_category,
            "total_guests": sum(len(guests) for guests in guest_list_by_category.values()),
            "categories": list(guest_list_by_category.keys())
        }
    except Exception as e:
        print(f"שגיאה ביצוא רשימת מוזמנים: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"שגיאה ביצוא רשימת מוזמנים: {str(e)}")

@router.get("/seating-statistics/{event_id}")
def get_seating_statistics(event_id: int, db: Session = Depends(get_db)):
    """קבלת סטטיסטיקות מקומות ישיבה"""
    try:
        seatings = repository.get_seatings_by_event(db, event_id)
        
        # חישוב סטטיסטיקות
        total_guests = len(seatings)
        tables_used = len(set(seating.table_id for seating in seatings))
        categories = {}
        
        for seating in seatings:
            category = seating.guest.category if hasattr(seating.guest, 'category') else "כללי"
            categories[category] = categories.get(category, 0) + 1
        
        return {
            "event_id": event_id,
            "total_guests": total_guests,
            "tables_used": tables_used,
            "categories_distribution": categories,
            "average_guests_per_table": total_guests / tables_used if tables_used > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בקבלת סטטיסטיקות: {str(e)}")

# נתיבים חדשים לכרטיסי ישיבה
@router.delete("/cards/{event_id}")
def delete_seating_cards(
    event_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """מחיקת כל כרטיסי הישיבה לאירוע"""
    try:
        deleted_count = repository.delete_seating_cards_by_event(db, event_id)
        return {"message": f"נמחקו {deleted_count} כרטיסי ישיבה"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-cards/{event_id}")
async def generate_seating_cards(
    event_id: int,
    logo_file: Optional[UploadFile] = File(None),
    template_file: Optional[UploadFile] = File(None),
    force_recreate: str = Form("false"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """יצירת כרטיסי ישיבה לכל המוזמנים עם אישור הגעה"""
    try:
        print(f"מתחיל יצירת כרטיסים לאירוע {event_id}")
        print(f"קובץ לוגו: {logo_file}")
        print(f"קובץ תבנית: {template_file}")
        print(f"force_recreate: {force_recreate}")
        
        # המרת force_recreate לבוליאן
        force_recreate_bool = force_recreate.lower() == 'true'
        
        # יצירת תיקיות
        os.makedirs("uploads/logos", exist_ok=True)
        os.makedirs("uploads/templates", exist_ok=True)
        
        # שמירת הלוגו אם הועלה
        logo_path = None
        if logo_file:
            print(f"מעבד קובץ לוגו: {logo_file.filename}")
            logo_content = await logo_file.read()
            logo_path = f"uploads/logos/logo_{event_id}_{current_user.id}.png"
            with open(logo_path, "wb") as f:
                f.write(logo_content)
            print(f"לוגו נשמר בנתיב: {logo_path}")
            print(f"לוגו קיים: {os.path.exists(logo_path)}")
        else:
            print("לא הועלה קובץ לוגו")
        
        # שמירת תבנית אם הועלתה
        template_path = None
        if template_file:
            print(f"מעבד קובץ תבנית: {template_file.filename}")
            template_content = await template_file.read()
            template_path = f"uploads/templates/template_{event_id}_{current_user.id}.png"
            with open(template_path, "wb") as f:
                f.write(template_content)
            print(f"תבנית נשמרה בנתיב: {template_path}")
        
        # יצירת כרטיסים
        cards = repository.generate_cards_for_event(db, event_id, logo_path, force_recreate_bool)
        
        # נשמור גם את הנתיב לתבנית בקבצים שנשתמש בהם בזמן יצירת ה-PDF (שמירה ברמת אירוע לפי נתיב)
        if template_path:
            with open(f"uploads/templates/template_{event_id}.path", "w", encoding="utf-8") as f:
                f.write(template_path)
        
        return {"message": f"נוצרו {len(cards)} כרטיסי ישיבה", "cards": cards}
    except Exception as e:
        print(f"שגיאה ביצירת כרטיסים: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cards/{event_id}")
def get_seating_cards(event_id: int, db: Session = Depends(get_db)):
    """קבלת כל כרטיסי הישיבה לאירוע"""
    try:
        cards = repository.get_seating_cards_by_event(db, event_id)
        return {
            "event_id": event_id,
            "cards": [
                {
                    "id": card.id,
                    "guest_name": f"{card.guest.first_name} {card.guest.last_name}",
                    "table_number": card.seating.table.table_number if card.seating and card.seating.table else None,
                    "seat_number": card.seating.seat_number if card.seating else None,
                    "created_at": card.created_at,
                    "is_downloaded": card.is_downloaded
                }
                for card in cards
            ],
            "total_cards": len(cards)
        }
    except Exception as e:
        print(f"שגיאה בקבלת כרטיסי ישיבה: {str(e)}")
        raise HTTPException(status_code=500, detail=f"שגיאה בקבלת כרטיסי ישיבה: {str(e)}")

@router.get("/card/{card_id}/download")
def download_seating_card(card_id: int, db: Session = Depends(get_db)):
    """הורדת כרטיס ישיבה ספציפי"""
    try:
        card = db.query(repository.SeatingCard).filter(repository.SeatingCard.id == card_id).first()
        if not card:
            raise HTTPException(status_code=404, detail="כרטיס ישיבה לא נמצא")
        
        # עדכון סטטוס ההורדה
        repository.update_card_download_status(db, card_id, True)
        
        # החזרת נתוני הכרטיס
        card_data = json.loads(card.card_data)
        
        return {
            "card_id": card.id,
            "guest_name": card_data["guest_name"],
            "event_name": card_data["event_name"],
            "table_number": card_data["table_number"],
            "seat_number": card_data["seat_number"],
            "qr_code": card_data["qr_code"],
            "logo_path": card.logo_path
        }
        
    except Exception as e:
        print(f"שגיאה בהורדת כרטיס ישיבה: {str(e)}")
        raise HTTPException(status_code=500, detail=f"שגיאה בהורדת כרטיס ישיבה: {str(e)}")

@router.get("/cards/{event_id}/download-all")
async def download_all_cards(
    event_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """הורדת כל כרטיסי הישיבה כקובץ PDF"""
    try:
        # קבלת כל הכרטיסים לאירוע
        cards = db.query(models.SeatingCard).filter(models.SeatingCard.event_id == event_id).all()
        
        if not cards:
            raise HTTPException(status_code=404, detail="לא נמצאו כרטיסי ישיבה לאירוע זה")
        
        print(f"נמצאו {len(cards)} כרטיסים להורדה")
        
        # יצירת PDF
        pdf_buffer = io.BytesIO()
        pdf = canvas.Canvas(pdf_buffer, pagesize=A4)
        
        # הגדרת פונט עברי
        try:
            # נסה פונטים עבריים שונים
            hebrew_fonts = ['Arial', 'David', 'Times New Roman', 'Helvetica']
            font_name = 'Helvetica'  # ברירת מחדל
            
            for font in hebrew_fonts:
                try:
                    pdfmetrics.registerFont(TTFont('Hebrew', f'{font}.ttf'))
                    font_name = 'Hebrew'
                    break
                except:
                    continue
        except:
            font_name = 'Helvetica'
        
        # פונקציה להפיכת טקסט עברי
        def reverse_hebrew_text(text):
            """הופך טקסט עברי לכתיבה נכונה"""
            # הפיכת כל המשפט
            return text[::-1]
        
        for i, card in enumerate(cards):
            if i > 0:
                pdf.showPage()
            
            print(f"מעבד כרטיס {i+1}: {card.id}")
            print(f"לוגו נתיב: {card.logo_path}")
            print(f"לוגו קיים: {os.path.exists(card.logo_path) if card.logo_path else False}")
            
            # הדפסת תוכן ה-QR
            print(f"QR Code content for card {card.id}: {card.qr_code}")
            
            # הדפסת הנתונים המקוריים
            try:
                card_data = json.loads(card.card_data)
                print(f"Card data for {card.id}: {card_data}")
            except Exception as e:
                print(f"Error parsing card data for {card.id}: {e}")
            
            # חישוב מיקום הכרטיס (שליש דף מרוכז)
            card_width = A4[0] * 0.8  # 80% מרוחב הדף
            card_height = A4[1] * 0.3  # 30% מגובה הדף
            card_x = (A4[0] - card_width) / 2  # מרכוז אופקי
            card_y = (A4[1] - card_height) / 2  # מרכוז אנכי
            
            # בדיקת תבנית רקע שהועלתה
            template_path_hint = f"uploads/templates/template_{event_id}.path"
            template_path = None
            if os.path.exists(template_path_hint):
                try:
                    with open(template_path_hint, 'r', encoding='utf-8') as f:
                        template_path = f.read().strip()
                except Exception as e:
                    print(f"שגיאה בקריאת נתיב תבנית: {e}")
            
            if template_path and os.path.exists(template_path):
                try:
                    # ציור הרקע מתוך התבנית
                    pdf.drawImage(template_path, card_x, card_y, width=card_width, height=card_height)
                except Exception as e:
                    print(f"שגיאה בציור תבנית: {e}")
                    # רקע ברירת מחדל
                    pdf.setFillColor(colors.white)
                    pdf.rect(card_x, card_y, card_width, card_height, fill=True)
                    pdf.setStrokeColor(colors.black)
                    pdf.setLineWidth(2)
                    pdf.rect(card_x, card_y, card_width, card_height, fill=False)
            else:
                # רקע ברירת מחדל
                pdf.setFillColor(colors.white)
                pdf.rect(card_x, card_y, card_width, card_height, fill=True)
                pdf.setStrokeColor(colors.black)
                pdf.setLineWidth(2)
                pdf.rect(card_x, card_y, card_width, card_height, fill=False)
            
            # לוגו (אם קיים) - בצד שמאל למעלה
            if card.logo_path and os.path.exists(card.logo_path):
                try:
                    print(f"מוסיף לוגו: {card.logo_path}")
                    logo_width = 2*cm
                    logo_height = 2*cm
                    logo_x = card_x + 1*cm
                    logo_y = card_y + card_height - logo_height - 1*cm
                    pdf.drawImage(card.logo_path, logo_x, logo_y, width=logo_width, height=logo_height)
                    print(f"לוגו נוסף בהצלחה במיקום: ({logo_x}, {logo_y})")
                except Exception as e:
                    print(f"שגיאה בהוספת לוגו: {e}")
            
            # כותרת - במרכז העליון
            pdf.setFont(font_name, 18)
            pdf.setFillColor(colors.darkblue)
            title_x = card_x + card_width / 2
            title_y = card_y + card_height - 2*cm
            title_text = "כרטיס ישיבה"
            title_text_fixed = reverse_hebrew_text(title_text)
            pdf.drawCentredString(title_x, title_y, title_text_fixed)
            
            # פרטי המוזמן - יישור לימין
            card_data = json.loads(card.card_data)
            pdf.setFont(font_name, 14)
            pdf.setFillColor(colors.black)
            
            # מיקום התחלתי לטקסט - יישור לימין
            text_start_x = card_x + card_width - 2*cm
            text_y = card_y + card_height - 4*cm
            
            # שלום.. (שם המשתמש)
            guest_text = f"שלום {card_data['guest_name']}"
            guest_text_fixed = reverse_hebrew_text(guest_text)
            text_width = pdf.stringWidth(guest_text_fixed, font_name, 14)
            pdf.drawString(text_start_x - text_width, text_y, guest_text_fixed)
            text_y -= 1*cm
            
            # הנך מוזמן לאירוע
            event_text = f"הנך מוזמן לאירוע: {card_data['event_name']}"
            event_text_fixed = reverse_hebrew_text(event_text)
            text_width = pdf.stringWidth(event_text_fixed, font_name, 14)
            pdf.drawString(text_start_x - text_width, text_y, event_text_fixed)
            text_y -= 1*cm
            
            # מספר שולחן - תיקון המספרים
            table_number = str(card_data['table_number'])
            table_number_fixed = table_number[::-1]  # הפיכת המספר
            table_text = f"מספר שולחן: {table_number_fixed}"
            table_text_fixed = reverse_hebrew_text(table_text)
            text_width = pdf.stringWidth(table_text_fixed, font_name, 14)
            pdf.drawString(text_start_x - text_width, text_y, table_text_fixed)
            text_y -= 1*cm
            
            # מספר כסא - תיקון המספרים
            if card_data.get('seat_number'):
                seat_number = str(card_data['seat_number'])
                seat_number_fixed = seat_number[::-1]  # הפיכת המספר
                seat_text = f"מספר כסא: {seat_number_fixed}"
                seat_text_fixed = reverse_hebrew_text(seat_text)
                text_width = pdf.stringWidth(seat_text_fixed, font_name, 14)
                pdf.drawString(text_start_x - text_width, text_y, seat_text_fixed)
                text_y -= 1*cm
            
            # QR Code - בצד שמאל למטה
            try:
                qr_data = card.qr_code
                if qr_data.startswith('data:image/png;base64,'):
                    # חילוץ הנתונים מה-base64
                    qr_base64 = qr_data.split(',')[1]
                    qr_image_bytes = base64.b64decode(qr_base64)
                    
                    # שמירה זמנית של ה-QR Code
                    temp_qr_path = f"temp_qr_{card.id}.png"
                    with open(temp_qr_path, "wb") as f:
                        f.write(qr_image_bytes)
                    
                    # הוספה ל-PDF - בצד שמאל למטה
                    qr_size = 4*cm
                    qr_x = card_x + 2*cm
                    qr_y = card_y + 2*cm
                    pdf.drawImage(temp_qr_path, qr_x, qr_y, width=qr_size, height=qr_size)
                    
                    # מחיקת הקובץ הזמני
                    os.remove(temp_qr_path)
                    print(f"QR Code נוסף בהצלחה במיקום: ({qr_x}, {qr_y})")
                else:
                    # אם זה לא base64, ננסה לטפל כנתיב קובץ
                    if os.path.exists(qr_data):
                        qr_size = 4*cm
                        qr_x = card_x + 2*cm
                        qr_y = card_y + 2*cm
                        pdf.drawImage(qr_data, qr_x, qr_y, width=qr_size, height=qr_size)
            except Exception as e:
                print(f"שגיאה בהוספת QR Code: {e}")
                # נמשיך בלי QR Code אם יש בעיה
        
        pdf.save()
        pdf_buffer.seek(0)
        
        # יצירת איטרטור מה-buffer
        def iter_pdf_buffer():
            while True:
                chunk = pdf_buffer.read(4096)  # קרא בנתחים של 4KB
                if not chunk:
                    break
                yield chunk
        
        return StreamingResponse(
            iter_pdf_buffer(),  # העבר את האיטרטור
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=seating_cards_{event_id}.pdf"}
        )
        
    except Exception as e:
        print(f"שגיאה ביצירת PDF: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export-seating-map-filtered/{event_id}")
def export_seating_map_filtered(
    event_id: int,
    include_empty_seats: bool = False,
    gender_filter: Optional[str] = None,  # "male", "female", None for all
    guest_type_filter: Optional[str] = None,  # "family", "friends", "colleagues", etc.
    category_filter: Optional[str] = None,  # filter by table head category
    db: Session = Depends(get_db)
):
    """יצוא מפת ישיבה עם פילטרים מתקדמים"""
    try:
        print(f"מתחיל יצוא מפת ישיבה עם פילטרים לאירוע {event_id}")
        print(f"פילטרים: empty_seats={include_empty_seats}, gender={gender_filter}, type={guest_type_filter}, category={category_filter}")
        
        # טעינת כל הנתונים הנדרשים
        from app.guests.models import Guest
        from app.tables.models import Table
        from app.tableHead.models import TableHead
        
        # טעינת כל השולחנות לאירוע
        tables = db.query(Table).filter(Table.event_id == event_id).all()
        print(f"נמצאו {len(tables)} שולחנות")
        
        # טעינת table_heads לקבלת קטגוריות
        table_heads = db.query(TableHead).filter(TableHead.event_id == event_id).all()
        table_heads_dict = {th.id: th.category for th in table_heads}
        print(f"נמצאו {len(table_heads)} table_heads")
        
        # טעינת seatings עם guest ו-table
        seatings = repository.get_seatings_by_event(db, event_id)
        print(f"נמצאו {len(seatings)} seatings")
        
        # יצירת מילון של שולחנות עם מקומות ישיבה
        seating_map = {}
        
        for table in tables:
            table_number = table.table_number
            seating_map[table_number] = {
                "table_id": table.id,
                "table_number": table_number,
                "capacity": table.capacity if hasattr(table, 'capacity') else 8,  # ברירת מחדל 8
                "seats": []
            }
        
        # מילוי המקומות התפוסים
        for seating in seatings:
            if not seating.table:
                continue
                
            table_number = seating.table.table_number
            
            # בדיקת פילטרים
            should_include = True
            
            if seating.guest:
                # פילטר מגדר
                if gender_filter and hasattr(seating.guest, 'gender'):
                    if gender_filter.lower() != seating.guest.gender.lower():
                        should_include = False
                
                # פילטר סוג מוזמן
                if guest_type_filter and hasattr(seating.guest, 'guest_type'):
                    if guest_type_filter.lower() != seating.guest.guest_type.lower():
                        should_include = False
                
                # פילטר קטגוריה
                if category_filter and seating.guest.table_head_id:
                    category = table_heads_dict.get(seating.guest.table_head_id, "")
                    if category_filter.lower() != category.lower():
                        should_include = False
            else:
                # אם אין guest, נכלול רק אם רוצים מקומות ריקים
                should_include = include_empty_seats
            
            if should_include:
                guest_name = ""
                category = "ללא קטגוריה"
                gender = ""
                guest_type = ""
                
                if seating.guest:
                    guest_name = f"{seating.guest.first_name} {seating.guest.last_name}".strip()
                    if seating.guest.table_head_id:
                        category = table_heads_dict.get(seating.guest.table_head_id, "ללא קטגוריה")
                    if hasattr(seating.guest, 'gender'):
                        gender = seating.guest.gender
                    if hasattr(seating.guest, 'guest_type'):
                        guest_type = seating.guest.guest_type
                
                seating_map[table_number]["seats"].append({
                    "seat_number": seating.seat_number,
                    "guest_name": guest_name,
                    "category": category,
                    "gender": gender,
                    "guest_type": guest_type,
                    "is_occupied": bool(seating.guest)
                })
        
        # הוספת מקומות ריקים אם נדרש
        if include_empty_seats:
            for table_number, table_data in seating_map.items():
                occupied_seats = {seat["seat_number"] for seat in table_data["seats"]}
                capacity = table_data["capacity"]
                
                # הוספת מקומות ריקים
                for seat_num in range(1, capacity + 1):
                    if seat_num not in occupied_seats:
                        table_data["seats"].append({
                            "seat_number": seat_num,
                            "guest_name": "",
                            "category": "",
                            "gender": "",
                            "guest_type": "",
                            "is_occupied": False
                        })
                
                # מיון לפי מספר כסא
                table_data["seats"].sort(key=lambda x: x["seat_number"])
        
        # סטטיסטיקות
        total_tables = len(seating_map)
        total_seats = sum(len(table_data["seats"]) for table_data in seating_map.values())
        occupied_seats = sum(
            sum(1 for seat in table_data["seats"] if seat["is_occupied"])
            for table_data in seating_map.values()
        )
        empty_seats = total_seats - occupied_seats
        
        # פירוט לפי מגדר
        gender_stats = {}
        for table_data in seating_map.values():
            for seat in table_data["seats"]:
                if seat["is_occupied"] and seat["gender"]:
                    gender = seat["gender"].lower()
                    gender_stats[gender] = gender_stats.get(gender, 0) + 1
        
        # פירוט לפי קטגוריה
        category_stats = {}
        for table_data in seating_map.values():
            for seat in table_data["seats"]:
                if seat["is_occupied"] and seat["category"]:
                    category = seat["category"]
                    category_stats[category] = category_stats.get(category, 0) + 1
        
        print(f"אורגנו {total_tables} שולחנות עם {total_seats} מקומות")
        print(f"מקומות תפוסים: {occupied_seats}, מקומות ריקים: {empty_seats}")
        
        return {
            "event_id": event_id,
            "filters": {
                "include_empty_seats": include_empty_seats,
                "gender_filter": gender_filter,
                "guest_type_filter": guest_type_filter,
                "category_filter": category_filter
            },
            "seating_map": seating_map,
            "statistics": {
                "total_tables": total_tables,
                "total_seats": total_seats,
                "occupied_seats": occupied_seats,
                "empty_seats": empty_seats,
                "gender_distribution": gender_stats,
                "category_distribution": category_stats
            }
        }
    except Exception as e:
        print(f"שגיאה ביצוא מפת ישיבה עם פילטרים: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"שגיאה ביצוא מפת ישיבה עם פילטרים: {str(e)}")

@router.get("/export-seating-map-filtered-pdf/{event_id}")
async def export_seating_map_filtered_pdf(
    event_id: int,
    include_empty_seats: bool = False,
    gender_filter: Optional[str] = None,
    guest_type_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """יצוא מפת ישיבה עם פילטרים כקובץ PDF"""
    try:
        print(f"מתחיל יצוא PDF מפת ישיבה עם פילטרים לאירוע {event_id}")
        
        # קבלת הנתונים עם הפילטרים
        from app.seatings.router import export_seating_map_filtered
        
        # יצירת בקשת HTTP פנימית
        from fastapi import Request
        from starlette.testclient import TestClient
        from app.main import app
        
        client = TestClient(app)
        
        # בניית query parameters
        params = {
            "include_empty_seats": include_empty_seats
        }
        if gender_filter:
            params["gender_filter"] = gender_filter
        if guest_type_filter:
            params["guest_type_filter"] = guest_type_filter
        if category_filter:
            params["category_filter"] = category_filter
        
        # קריאה לנתיב הקיים
        response = client.get(f"/seatings/export-seating-map-filtered/{event_id}", params=params)
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="שגיאה בקבלת נתוני מפת ישיבה")
        
        data = response.json()
        seating_map = data["seating_map"]
        filters = data["filters"]
        statistics = data["statistics"]
        
        # יצירת PDF
        pdf_buffer = io.BytesIO()
        pdf = canvas.Canvas(pdf_buffer, pagesize=A4)
        
        # הגדרת פונט עברי
        try:
            hebrew_fonts = ['Arial', 'David', 'Times New Roman', 'Helvetica']
            font_name = 'Helvetica'
            
            for font in hebrew_fonts:
                try:
                    pdfmetrics.registerFont(TTFont('Hebrew', f'{font}.ttf'))
                    font_name = 'Hebrew'
                    break
                except:
                    continue
        except:
            font_name = 'Helvetica'
        
        # פונקציה להפיכת טקסט עברי
        def reverse_hebrew_text(text):
            return text[::-1]
        
        # כותרת ראשית
        pdf.setFont(font_name, 20)
        pdf.setFillColor(colors.darkblue)
        title_text = "מפת ישיבה - דוח מסונן"
        title_text_fixed = reverse_hebrew_text(title_text)
        pdf.drawCentredString(A4[0]/2, A4[1]-2*cm, title_text_fixed)
        
        # פרטי הפילטרים
        pdf.setFont(font_name, 12)
        pdf.setFillColor(colors.black)
        filter_text = "פילטרים: "
        if filters["include_empty_seats"]:
            filter_text += "כולל מקומות ריקים, "
        if filters["gender_filter"]:
            filter_text += f"מגדר: {filters['gender_filter']}, "
        if filters["guest_type_filter"]:
            filter_text += f"סוג מוזמן: {filters['guest_type_filter']}, "
        if filters["category_filter"]:
            filter_text += f"קטגוריה: {filters['category_filter']}, "
        
        if filter_text == "פילטרים: ":
            filter_text += "כל המוזמנים"
        
        filter_text_fixed = reverse_hebrew_text(filter_text)
        pdf.drawString(2*cm, A4[1]-3*cm, filter_text_fixed)
        
        # סטטיסטיקות
        stats_text = f"סטטיסטיקות: {statistics['total_tables']} שולחנות, {statistics['total_seats']} מקומות, {statistics['occupied_seats']} תפוסים, {statistics['empty_seats']} ריקים"
        stats_text_fixed = reverse_hebrew_text(stats_text)
        pdf.drawString(2*cm, A4[1]-4*cm, stats_text_fixed)
        
        # מיקום התחלתי לטבלאות
        current_y = A4[1] - 5*cm
        tables_per_page = 3
        current_table_count = 0
        
        for table_number, table_data in sorted(seating_map.items()):
            # בדיקה אם צריך דף חדש
            if current_table_count % tables_per_page == 0 and current_table_count > 0:
                pdf.showPage()
                current_y = A4[1] - 2*cm
                current_table_count = 0
            
            # כותרת שולחן
            pdf.setFont(font_name, 16)
            pdf.setFillColor(colors.darkblue)
            table_title = f"שולחן {table_number}"
            table_title_fixed = reverse_hebrew_text(table_title)
            pdf.drawString(2*cm, current_y, table_title_fixed)
            current_y -= 1*cm
            
            # פרטי שולחן
            pdf.setFont(font_name, 10)
            pdf.setFillColor(colors.black)
            capacity_text = f"קיבולת: {table_data['capacity']} מקומות"
            capacity_text_fixed = reverse_hebrew_text(capacity_text)
            pdf.drawString(2*cm, current_y, capacity_text_fixed)
            current_y -= 0.5*cm
            
            # כותרות עמודות
            pdf.setFont(font_name, 9)
            pdf.setFillColor(colors.darkgrey)
            col_width = (A4[0] - 4*cm) / 5  # 5 עמודות
            
            headers = ["מקום", "שם", "קטגוריה", "מגדר", "סוג"]
            headers_fixed = [reverse_hebrew_text(h) for h in headers]
            
            for i, header in enumerate(headers_fixed):
                x_pos = 2*cm + i * col_width
                pdf.drawString(x_pos, current_y, header)
            
            current_y -= 0.5*cm
            
            # נתוני מקומות ישיבה
            pdf.setFont(font_name, 8)
            pdf.setFillColor(colors.black)
            
            for seat in table_data["seats"]:
                # בדיקה אם יש מקום בדף
                if current_y < 2*cm:
                    pdf.showPage()
                    current_y = A4[1] - 2*cm
                
                # צבע רקע למקומות ריקים
                if not seat["is_occupied"]:
                    pdf.setFillColor(colors.lightgrey)
                    pdf.rect(1.5*cm, current_y-0.2*cm, A4[0]-3*cm, 0.4*cm, fill=True)
                    pdf.setFillColor(colors.black)
                
                # נתוני המקום
                seat_num = str(seat["seat_number"])
                guest_name = seat["guest_name"] if seat["guest_name"] else "ריק"
                category = seat["category"] if seat["category"] else ""
                gender = seat["gender"] if seat["gender"] else ""
                guest_type = seat["guest_type"] if seat["guest_type"] else ""
                
                # הפיכת טקסט עברי
                seat_num_fixed = seat_num[::-1]
                guest_name_fixed = reverse_hebrew_text(guest_name)
                category_fixed = reverse_hebrew_text(category)
                gender_fixed = reverse_hebrew_text(gender)
                guest_type_fixed = reverse_hebrew_text(guest_type)
                
                # הדפסת הנתונים
                pdf.drawString(2*cm, current_y, seat_num_fixed)
                pdf.drawString(2*cm + col_width, current_y, guest_name_fixed)
                pdf.drawString(2*cm + 2*col_width, current_y, category_fixed)
                pdf.drawString(2*cm + 3*col_width, current_y, gender_fixed)
                pdf.drawString(2*cm + 4*col_width, current_y, guest_type_fixed)
                
                current_y -= 0.4*cm
            
            current_y -= 1*cm  # רווח בין שולחנות
            current_table_count += 1
        
        # הוספת פירוט סטטיסטיקות בסוף
        if statistics["gender_distribution"] or statistics["category_distribution"]:
            pdf.showPage()
            current_y = A4[1] - 2*cm
            
            pdf.setFont(font_name, 16)
            pdf.setFillColor(colors.darkblue)
            stats_title = "פירוט סטטיסטיקות"
            stats_title_fixed = reverse_hebrew_text(stats_title)
            pdf.drawCentredString(A4[0]/2, current_y, stats_title_fixed)
            current_y -= 1.5*cm
            
            # פירוט לפי מגדר
            if statistics["gender_distribution"]:
                pdf.setFont(font_name, 12)
                pdf.setFillColor(colors.darkblue)
                gender_title = "פירוט לפי מגדר:"
                gender_title_fixed = reverse_hebrew_text(gender_title)
                pdf.drawString(2*cm, current_y, gender_title_fixed)
                current_y -= 0.8*cm
                
                pdf.setFont(font_name, 10)
                pdf.setFillColor(colors.black)
                for gender, count in statistics["gender_distribution"].items():
                    gender_text = f"{gender}: {count} מוזמנים"
                    gender_text_fixed = reverse_hebrew_text(gender_text)
                    pdf.drawString(3*cm, current_y, gender_text_fixed)
                    current_y -= 0.5*cm
                
                current_y -= 0.5*cm
            
            # פירוט לפי קטגוריה
            if statistics["category_distribution"]:
                pdf.setFont(font_name, 12)
                pdf.setFillColor(colors.darkblue)
                category_title = "פירוט לפי קטגוריה:"
                category_title_fixed = reverse_hebrew_text(category_title)
                pdf.drawString(2*cm, current_y, category_title_fixed)
                current_y -= 0.8*cm
                
                pdf.setFont(font_name, 10)
                pdf.setFillColor(colors.black)
                for category, count in statistics["category_distribution"].items():
                    category_text = f"{category}: {count} מוזמנים"
                    category_text_fixed = reverse_hebrew_text(category_text)
                    pdf.drawString(3*cm, current_y, category_text_fixed)
                    current_y -= 0.5*cm
        
        pdf.save()
        pdf_buffer.seek(0)
        
        # יצירת איטרטור מה-buffer
        def iter_pdf_buffer():
            while True:
                chunk = pdf_buffer.read(4096)
                if not chunk:
                    break
                yield chunk
        
        # יצירת שם קובץ עם הפילטרים
        filename_parts = [f"seating_map_filtered_{event_id}"]
        if include_empty_seats:
            filename_parts.append("with_empty")
        if gender_filter:
            filename_parts.append(f"gender_{gender_filter}")
        if guest_type_filter:
            filename_parts.append(f"type_{guest_type_filter}")
        if category_filter:
            filename_parts.append(f"category_{category_filter}")
        
        filename = "_".join(filename_parts) + ".pdf"
        
        return StreamingResponse(
            iter_pdf_buffer(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        print(f"שגיאה ביצירת PDF מפת ישיבה עם פילטרים: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filter-options/{event_id}")
def get_filter_options(event_id: int, db: Session = Depends(get_db)):
    """קבלת אפשרויות פילטרים זמינות לאירוע"""
    try:
        print(f"מתחיל קבלת אפשרויות פילטרים לאירוע {event_id}")
        
        # טעינת כל הנתונים הנדרשים
        from app.guests.models import Guest
        from app.tables.models import Table
        from app.tableHead.models import TableHead
        
        # טעינת table_heads לקבלת קטגוריות
        table_heads = db.query(TableHead).filter(TableHead.event_id == event_id).all()
        categories = [th.category for th in table_heads if th.category]
        print(f"נמצאו {len(categories)} קטגוריות")
        
        # טעינת seatings עם guest
        seatings = repository.get_seatings_by_event(db, event_id)
        print(f"נמצאו {len(seatings)} seatings")
        
        # איסוף מגדרים זמינים
        genders = set()
        guest_types = set()
        
        for seating in seatings:
            # seating הוא dictionary, לא object
            if seating.get('guest_gender'):
                genders.add(seating['guest_gender'].lower())
            if seating.get('guest_type'):
                guest_types.add(seating['guest_type'].lower())
        
        # טעינת שולחנות לקבלת קיבולת
        tables = db.query(Table).filter(Table.event_id == event_id).all()
        total_capacity = sum(table.capacity if hasattr(table, 'capacity') else 8 for table in tables)
        occupied_seats = len(seatings)
        empty_seats = total_capacity - occupied_seats
        
        return {
            "event_id": event_id,
            "available_filters": {
                "categories": list(set(categories)),  # הסרת כפילויות
                "genders": list(genders),
                "guest_types": list(guest_types)
            },
            "seating_statistics": {
                "total_capacity": total_capacity,
                "occupied_seats": occupied_seats,
                "empty_seats": empty_seats,
                "total_tables": len(tables)
            },
            "filter_examples": {
                "include_empty_seats": "הצגת מקומות ריקים",
                "gender_filter": "male/female - סינון לפי מגדר",
                "guest_type_filter": "family/friends/colleagues - סינון לפי סוג מוזמן",
                "category_filter": "קטגוריה מהרשימה - סינון לפי קטגוריה"
            }
        }
    except Exception as e:
        print(f"שגיאה בקבלת אפשרויות פילטרים: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"שגיאה בקבלת אפשרויות פילטרים: {str(e)}")

