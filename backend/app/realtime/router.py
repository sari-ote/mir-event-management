from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.realtime.websocket_manager import websocket_manager
from app.realtime.schemas import QRScanRequest, QRScanResponse
from app.guests.models import Guest
from app.seatings.models import Seating
from app.realtime.models import AttendanceLog, RealTimeNotification
from datetime import datetime
from app.tables.models import Table

router = APIRouter(prefix="/realtime", tags=["RealTime"])

@router.websocket("/ws/{event_id}")
async def websocket_endpoint(websocket: WebSocket, event_id: int):
    await websocket_manager.connect(websocket, event_id)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, event_id)

@router.post("/scan-qr", response_model=QRScanResponse)
async def scan_qr_code(qr_data: QRScanRequest, db: Session = Depends(get_db)):
    print(f"Received QR scan request: {qr_data}")
    print(f"QR Code: {qr_data.qr_code}")
    print(f"Event ID: {qr_data.event_id}")
    
    qr_code = qr_data.qr_code
    event_id = qr_data.event_id
    
    # Validate input
    if not qr_code or not qr_code.strip():
        raise HTTPException(status_code=400, detail="קוד QR הוא שדה חובה")
    
    if not event_id:
        raise HTTPException(status_code=400, detail="מזהה אירוע הוא שדה חובה")
    
    print(f"Looking for guest with QR code: {qr_code}")
    
    guest = None
    
    # נסיון 1: פורמט JSON חדש שמכיל פרטי מוזמן
    if qr_code.strip().startswith("{"):
        try:
            import json as _json
            payload = _json.loads(qr_code)
            print(f"Parsed QR JSON payload: {payload}")
            
            phone = (payload.get("phone") or "").strip()
            first_name = (payload.get("first_name") or "").strip()
            last_name = (payload.get("last_name") or "").strip()
            qr_event_id = payload.get("event_id")
            
            if qr_event_id and int(qr_event_id) != int(event_id):
                print(f"Event ID mismatch: {qr_event_id} != {event_id}")
                raise HTTPException(status_code=400, detail="קוד QR לא תואם לאירוע זה")
            
            if phone:
                guest = db.query(Guest).filter(
                    Guest.event_id == event_id,
                    Guest.phone == phone
                ).first()
            
            if not guest and first_name and last_name:
                guest = db.query(Guest).filter(
                    Guest.event_id == event_id,
                    Guest.first_name == first_name,
                    Guest.last_name == last_name
                ).first()
            
            print(f"Found guest by JSON payload: {guest}")
        except Exception as e:
            print(f"Error parsing JSON QR: {e}")
            # נמשיך לנסיונות הבאים
    
    # נסיון 2: פורמט טקסט הישן GUEST_<id>_EVENT_<id>
    if not guest and qr_code.startswith("GUEST_") and "_EVENT_" in qr_code:
        try:
            parts = qr_code.split("_")
            print(f"QR Code parts: {parts}")
            if len(parts) >= 4:
                guest_id = int(parts[1])
                event_id_from_code = int(parts[3])
                if event_id_from_code != event_id:
                    print(f"Event ID mismatch: {event_id_from_code} != {event_id}")
                    raise HTTPException(status_code=400, detail="קוד QR לא תואם לאירוע זה")
                guest = db.query(Guest).filter(Guest.id == guest_id, Guest.event_id == event_id).first()
                print(f"Found guest: {guest}")
            else:
                print(f"Invalid QR code format: {qr_code}")
                raise HTTPException(status_code=400, detail="פורמט קוד QR לא תקין")
        except Exception as e:
            print(f"Error parsing legacy QR code: {e}")
            raise HTTPException(status_code=400, detail="פורמט קוד QR לא תקין")
    
    # נסיון 3: חיפוש לפי Guest.qr_code ההיסטורי
    if not guest:
        print(f"Trying to find by Guest.qr_code field")
        guest = db.query(Guest).filter(Guest.qr_code == qr_code, Guest.event_id == event_id).first()
        print(f"Found guest by qr_code field: {guest}")
    
    if not guest:
        print(f"Guest not found for QR code: {qr_code}")
        raise HTTPException(status_code=404, detail="מוזמן לא נמצא")
    
    print(f"Processing guest: {guest.first_name} {guest.last_name}")
    
    if guest.check_in_time:
        print(f"Guest already checked in: {guest.first_name} {guest.last_name}")
        
        # בדיקה אם ה-seating מעודכן
        seating = db.query(Seating).filter(Seating.guest_id == guest.id).first()
        if seating and not seating.is_occupied:
            print(f"Guest checked in but seating not occupied, updating...")
            seating.is_occupied = True
            seating.occupied_at = guest.check_in_time
            seating.occupied_by = guest.id
            db.commit()
            print(f"Updated seating for {guest.first_name} {guest.last_name}")
            
            # שלח עדכון בזמן אמת על העדכון
            websocket_message = {
                "type": "guest_arrived",
                "guest": {
                    "id": guest.id,
                    "first_name": guest.first_name,
                    "last_name": guest.last_name,
                    "table_id": seating.table_id if seating else None,
                    "table_number": seating.table.table_number if seating and seating.table else None
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
            print(f"Broadcasting updated seating WebSocket message: {websocket_message}")
            await websocket_manager.broadcast_to_event(event_id, websocket_message)
            print("WebSocket broadcast completed for updated seating")
        
        seating = db.query(Seating).filter(Seating.guest_id == guest.id).first()
        table_number = seating.table.table_number if seating and seating.table else None
        return QRScanResponse(
            status="already_checked_in", 
            message=f"מוזמן {guest.first_name} {guest.last_name} כבר נכנס",
            guest={
                "id": guest.id,
                "first_name": guest.first_name,
                "last_name": guest.last_name,
                "name": f"{guest.first_name} {guest.last_name}",
                "table_number": table_number
            },
            has_seating=bool(seating)
        )
    
    guest.check_in_time = datetime.utcnow()
    guest.last_scan_time = datetime.utcnow()
    
    seating = db.query(Seating).filter(Seating.guest_id == guest.id).first()
    has_seating = seating is not None
    table_number = seating.table.table_number if seating and seating.table else None
    
    print(f"Found seating for guest: {seating}")
    if seating:
        print(f"Seating details: Table {seating.table_id}, Occupied: {seating.is_occupied}, Occupied by: {seating.occupied_by}")
    
    if seating:
        seating.is_occupied = True
        seating.occupied_at = datetime.utcnow()
        seating.occupied_by = guest.id
        print(f"Updated seating: is_occupied={seating.is_occupied}, occupied_at={seating.occupied_at}, occupied_by={seating.occupied_by}")
        
        # בדיקת תפוסת השולחן
        table = seating.table
        if table:
            # ספירת מושבים תפוסים בשולחן
            occupied_seats = db.query(Seating).filter(
                Seating.table_id == table.id,
                Seating.is_occupied == True
            ).count()
            
            total_seats = table.size
            occupancy_percentage = (occupied_seats / total_seats) * 100 if total_seats > 0 else 0
            
            print(f"Table {table.table_number}: {occupied_seats}/{total_seats} seats occupied ({occupancy_percentage:.1f}%)")
            
            # התראה על שולחן מלא מדי (יותר מ-100%)
            if occupancy_percentage > 100:
                table_overbooked_notification = RealTimeNotification(
                    event_id=event_id,
                    notification_type="table_overbooked",
                    guest_id=guest.id,
                    table_id=table.id,
                    message=f"שולחן {table.table_number} מלא מדי! ({occupancy_percentage:.1f}%) - מוזמן {guest.first_name} {guest.last_name} נכנס לשולחן מלא מדי",
                    severity="error",
                    persistent=True  # התראה שלא נעלמת אוטומטית
                )
                db.add(table_overbooked_notification)
                
                # שלח הודעה בזמן אמת על שולחן מלא מדי
                table_overbooked_message = {
                    "type": "table_overbooked",
                    "table": {
                        "id": table.id,
                        "table_number": table.table_number,
                        "occupied_seats": occupied_seats,
                        "total_seats": total_seats,
                        "occupancy_percentage": occupancy_percentage
                    },
                    "guest": {
                        "id": guest.id,
                        "first_name": guest.first_name,
                        "last_name": guest.last_name
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket_manager.broadcast_to_event(event_id, table_overbooked_message)
                print(f"Broadcasting table overbooked message: {table_overbooked_message}")
            
            # התראה על שולחן מלא (100%)
            elif occupancy_percentage >= 100:
                table_full_notification = RealTimeNotification(
                    event_id=event_id,
                    notification_type="table_full",
                    guest_id=guest.id,
                    table_id=table.id,
                    message=f"שולחן {table.table_number} מלא! מוזמן {guest.first_name} {guest.last_name} נכנס לשולחן מלא",
                    severity="warning",
                    persistent=True  # התראה שלא נעלמת אוטומטית
                )
                db.add(table_full_notification)
                
                # שלח הודעה בזמן אמת על שולחן מלא
                table_full_message = {
                    "type": "table_full",
                    "table": {
                        "id": table.id,
                        "table_number": table.table_number,
                        "occupied_seats": occupied_seats,
                        "total_seats": total_seats,
                        "occupancy_percentage": occupancy_percentage
                    },
                    "guest": {
                        "id": guest.id,
                        "first_name": guest.first_name,
                        "last_name": guest.last_name
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket_manager.broadcast_to_event(event_id, table_full_message)
                print(f"Broadcasting table full message: {table_full_message}")
            
            # התראה על שולחן כמעט מלא (80%+)
            elif occupancy_percentage >= 80:
                table_almost_full_notification = RealTimeNotification(
                    event_id=event_id,
                    notification_type="table_almost_full",
                    guest_id=guest.id,
                    table_id=table.id,
                    message=f"שולחן {table.table_number} כמעט מלא ({occupancy_percentage:.1f}%) - מוזמן {guest.first_name} {guest.last_name} נכנס",
                    severity="info"
                )
                db.add(table_almost_full_notification)
                
                # שלח הודעה בזמן אמת על שולחן כמעט מלא
                table_almost_full_message = {
                    "type": "table_almost_full",
                    "table": {
                        "id": table.id,
                        "table_number": table.table_number,
                        "occupied_seats": occupied_seats,
                        "total_seats": total_seats,
                        "occupancy_percentage": occupancy_percentage
                    },
                    "guest": {
                        "id": guest.id,
                        "first_name": guest.first_name,
                        "last_name": guest.last_name
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
                await websocket_manager.broadcast_to_event(event_id, table_almost_full_message)
                print(f"Broadcasting table almost full message: {table_almost_full_message}")
        
        # התראה רגילה על כניסת מוזמן
        notification = RealTimeNotification(
            event_id=event_id,
            notification_type="guest_arrived",
            guest_id=guest.id,
            table_id=seating.table_id,
            message=f"מוזמן {guest.first_name} {guest.last_name} נכנס לאירוע",
            severity="info"
        )
        db.add(notification)
    else:
        print(f"No seating found for guest {guest.first_name} {guest.last_name}")
        notification = RealTimeNotification(
            event_id=event_id,
            notification_type="guest_arrived_no_seat",
            guest_id=guest.id,
            message=f"מוזמן {guest.first_name} {guest.last_name} נכנס ללא מקום ישיבה",
            severity="warning"
        )
        db.add(notification)
    
    attendance_log = AttendanceLog(
        guest_id=guest.id,
        event_id=event_id,
        qr_code_data=qr_code,
        status="checked_in"
    )
    db.add(attendance_log)
    db.commit()
    
    print(f"Successfully checked in guest: {guest.first_name} {guest.last_name}")
    
    # שלח עדכון בזמן אמת
    websocket_message = {
        "type": "guest_arrived",
        "guest": {
            "id": guest.id,
            "first_name": guest.first_name,
            "last_name": guest.last_name,
            "table_id": seating.table_id if seating else None,
            "table_number": seating.table.table_number if seating and seating.table else None
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    
    print(f"Broadcasting WebSocket message: {websocket_message}")
    await websocket_manager.broadcast_to_event(event_id, websocket_message)
    print("WebSocket broadcast completed")
    
    return QRScanResponse(
        status="success",
        message=(f"מוזמן {guest.first_name} {guest.last_name} נכנס בהצלחה" if has_seating else f"מוזמן {guest.first_name} {guest.last_name} נכנס (ללא מקום ישיבה)"),
        guest={
            "id": guest.id,
            "first_name": guest.first_name,
            "last_name": guest.last_name,
            "name": f"{guest.first_name} {guest.last_name}",
            "table_number": table_number,
            "check_in_time": guest.check_in_time.isoformat() if guest.check_in_time else None
        },
        has_seating=has_seating
    )

@router.get("/notifications/{event_id}")
def get_realtime_notifications(event_id: int, db: Session = Depends(get_db)):
    notifications = db.query(RealTimeNotification).filter(
        RealTimeNotification.event_id == event_id,
        RealTimeNotification.is_read == False
    ).order_by(RealTimeNotification.created_at.desc()).limit(50).all()
    return notifications

@router.post("/notifications/{notification_id}/mark-read")
def mark_notification_read(notification_id: int, db: Session = Depends(get_db)):
    notification = db.query(RealTimeNotification).filter(
        RealTimeNotification.id == notification_id
    ).first()
    if notification:
        notification.is_read = True
        db.commit()
    return {"status": "success"}

@router.post("/fix-seating-status/{event_id}")
async def fix_seating_status(event_id: int, db: Session = Depends(get_db)):
    """תקן את הסטטוס של כל המוזמנים שכבר נכנסו אבל ה-seating שלהם לא מעודכן"""
    try:
        # מצא את כל המוזמנים שכבר נכנסו
        checked_in_guests = db.query(Guest).filter(
            Guest.event_id == event_id,
            Guest.check_in_time.isnot(None)
        ).all()
        
        fixed_count = 0
        for guest in checked_in_guests:
            seating = db.query(Seating).filter(Seating.guest_id == guest.id).first()
            if seating and not seating.is_occupied:
                seating.is_occupied = True
                seating.occupied_at = guest.check_in_time
                seating.occupied_by = guest.id
                fixed_count += 1
                print(f"Fixed seating for {guest.first_name} {guest.last_name}")
        
        db.commit()
        print(f"Fixed {fixed_count} seatings for event {event_id}")
        
        return {
            "status": "success",
            "message": f"תוקנו {fixed_count} מקומות ישיבה",
            "fixed_count": fixed_count
        }
    except Exception as e:
        print(f"Error fixing seating status: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="שגיאה בתיקון סטטוס מקומות ישיבה") 