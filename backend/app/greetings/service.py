from sqlalchemy.orm import Session
from app.greetings import models, schemas, repository
from typing import List, Optional

class GreetingService:
    """שירות לניהול ברכות"""
    
    @staticmethod
    def create_greeting(db: Session, greeting_data: schemas.GreetingCreate) -> models.Greeting:
        """יצירת ברכה חדשה עם ולידציה"""
        # בדיקה אם כבר קיימת ברכה למוזמן זה
        existing_greeting = repository.get_greeting_by_guest(db, greeting_data.guest_id)
        if existing_greeting:
            raise ValueError("כבר קיימת ברכה למוזמן זה")
        
        # ולידציה של תוכן הברכה
        if len(greeting_data.content.strip()) < 10:
            raise ValueError("תוכן הברכה חייב להיות לפחות 10 תווים")
        
        if len(greeting_data.content) > 1000:
            raise ValueError("תוכן הברכה לא יכול להיות יותר מ-1000 תווים")
        
        # ולידציה של שם החותם
        if len(greeting_data.signer_name.strip()) < 2:
            raise ValueError("שם החותם חייב להיות לפחות 2 תווים")
        
        return repository.create_greeting(db, greeting_data)
    
    @staticmethod
    def get_greeting(db: Session, greeting_id: int) -> Optional[models.Greeting]:
        """קבלת ברכה לפי מזהה"""
        return repository.get_greeting(db, greeting_id)
    
    @staticmethod
    def get_greetings_by_event(db: Session, event_id: int) -> List[models.Greeting]:
        """קבלת כל הברכות לאירוע"""
        return repository.get_greetings_by_event(db, event_id)
    
    @staticmethod
    def get_greeting_by_guest(db: Session, guest_id: int) -> Optional[models.Greeting]:
        """קבלת ברכה של מוזמן"""
        return repository.get_greeting_by_guest(db, guest_id)
    
    @staticmethod
    def update_greeting(db: Session, greeting_id: int, greeting_data: schemas.GreetingUpdate) -> Optional[models.Greeting]:
        """עדכון ברכה עם ולידציה"""
        # בדיקה שהברכה קיימת
        existing_greeting = repository.get_greeting(db, greeting_id)
        if not existing_greeting:
            return None
        
        # ולידציה של תוכן הברכה אם השתנה
        if greeting_data.content is not None:
            if len(greeting_data.content.strip()) < 10:
                raise ValueError("תוכן הברכה חייב להיות לפחות 10 תווים")
            
            if len(greeting_data.content) > 1000:
                raise ValueError("תוכן הברכה לא יכול להיות יותר מ-1000 תווים")
        
        # ולידציה של שם החותם אם השתנה
        if greeting_data.signer_name is not None:
            if len(greeting_data.signer_name.strip()) < 2:
                raise ValueError("שם החותם חייב להיות לפחות 2 תווים")
        
        return repository.update_greeting(db, greeting_id, greeting_data)
    
    @staticmethod
    def delete_greeting(db: Session, greeting_id: int) -> bool:
        """מחיקת ברכה"""
        return repository.delete_greeting(db, greeting_id)
    
    @staticmethod
    def approve_greeting(db: Session, greeting_id: int) -> Optional[models.Greeting]:
        """אישור ברכה"""
        greeting = repository.get_greeting(db, greeting_id)
        if not greeting:
            return None
        
        greeting.is_approved = True
        db.commit()
        db.refresh(greeting)
        return greeting
    
    @staticmethod
    def get_approved_greetings_by_event(db: Session, event_id: int) -> List[models.Greeting]:
        """קבלת כל הברכות המאושרות לאירוע"""
        return db.query(models.Greeting).filter(
            models.Greeting.event_id == event_id,
            models.Greeting.is_approved == True
        ).all() 