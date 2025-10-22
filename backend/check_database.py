#!/usr/bin/env python3
"""
סקריפט פשוט לבדיקת הדטבייס
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, SessionLocal
from sqlalchemy import text

def check_database():
    """בדיקת חיבור לדטבייס וטבלאות"""
    try:
        # בדיקת חיבור
        with engine.connect() as connection:
            result = connection.execute(text("SELECT version();"))
            print("✅ חיבור לדטבייס הצליח!")
            print(f"גרסת PostgreSQL: {result.fetchone()[0]}")
            print()
            
        # רשימת טבלאות
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = result.fetchall()
            print("📋 רשימת טבלאות:")
            for table in tables:
                print(f"  - {table[0]}")
            print()
            
        # בדיקת טבלת שולחנות
        with engine.connect() as connection:
            result = connection.execute(text("SELECT COUNT(*) FROM tables;"))
            table_count = result.fetchone()[0]
            print(f"🪑 מספר שולחנות: {table_count}")
            
            if table_count > 0:
                # פרטים על השולחנות
                result = connection.execute(text("""
                    SELECT id, table_number, size, shape, hall_type, event_id, x, y
                    FROM tables 
                    ORDER BY event_id, hall_type, table_number
                    LIMIT 10;
                """))
                tables = result.fetchall()
                print("\n📊 10 השולחנות הראשונים:")
                for table in tables:
                    print(f"  ID: {table[0]}, מספר: {table[1]}, גודל: {table[2]}, צורה: {table[3]}, מגדר: {table[4]}, אירוע: {table[5]}, מיקום: ({table[6]}, {table[7]})")
            
        # בדיקת טבלת אירועים
        with engine.connect() as connection:
            result = connection.execute(text("SELECT COUNT(*) FROM events;"))
            event_count = result.fetchone()[0]
            print(f"\n🎉 מספר אירועים: {event_count}")
            
            if event_count > 0:
                result = connection.execute(text("""
                    SELECT id, name, date, admin_id
                    FROM events 
                    ORDER BY date DESC
                    LIMIT 5;
                """))
                events = result.fetchall()
                print("\n📅 5 האירועים האחרונים:")
                for event in events:
                    print(f"  ID: {event[0]}, שם: {event[1]}, תאריך: {event[2]}, מנהל: {event[3]}")
                    
    except Exception as e:
        print(f"❌ שגיאה בחיבור לדטבייס: {e}")
        return False
        
    return True

if __name__ == "__main__":
    print("🔍 בודק דטבייס...")
    check_database()
