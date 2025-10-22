from sqlalchemy import create_engine, text
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://postgres:sucsc2114@localhost:5432/event_manager"
engine = create_engine(DATABASE_URL)

def fix_datetime_fields():
    """Fix NULL datetime values in seatings table"""
    try:
        with engine.connect() as conn:
            # Update seatings table
            result = conn.execute(text("""
                UPDATE seatings 
                SET created_at = NOW(), updated_at = NOW() 
                WHERE created_at IS NULL OR updated_at IS NULL
            """))
            conn.commit()
            print(f"Updated {result.rowcount} rows in seatings table")
            
            # Check if there are any remaining NULL values
            result = conn.execute(text("""
                SELECT COUNT(*) as null_count 
                FROM seatings 
                WHERE created_at IS NULL OR updated_at IS NULL
            """))
            null_count = result.fetchone()[0]
            print(f"Remaining NULL values: {null_count}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Fixing datetime fields...")
    fix_datetime_fields()
    print("Done!") 