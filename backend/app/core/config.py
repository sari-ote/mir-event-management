from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "MyEventSystem"
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    SUPERADMINS: list[str] = ["admin@example.com", "sari@example.com"]
    
    # Nedarim Plus Configuration
    NEDARIM_PLUS_MOSAD_ID: str = ""  # מזהה מוסד (7 ספרות)
    NEDARIM_PLUS_API_VALID: str = ""  # טקסט אימות
    NEDARIM_PLUS_CALLBACK_IP: str = "18.194.219.73"  # IP של נדרים פלוס לאימות

    class Config:
        env_file = ".env"

settings = Settings()
