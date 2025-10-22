from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


# פרטי חיבור למסד הנתונים
DB_USER = "postgres"
DB_PASSWORD = "sucsc2114"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "event_manager"

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# יצירת מנוע וסשן
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# פונקציה לקבלת session זמני
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
