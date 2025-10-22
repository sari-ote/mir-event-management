from fastapi import FastAPI
from app.core.config import settings
from app.seatings.models import Seating
from app.core.database import Base, engine
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

# Import the centralized router
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from backendapp.urls import router

app = FastAPI(title=settings.PROJECT_NAME)  # <- יצירת האפליקציה

# Include the centralized router
app.include_router(router)
Base.metadata.create_all(bind=engine)






app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # או ["*"] לבדיקה
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "המערכת מוכנה!"}



if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)