from pydantic import BaseModel, EmailStr, validator

class UserBase(BaseModel):
    username: str
    full_name: str  
    email: str
    role: str  # admin / event_manager / viewer
    id_number: str
    
class UserCreate(UserBase):
    password: str

    @validator('id_number')
    def validate_id_number(cls, v):
        v = str(v).strip()
        if not v.isdigit() or len(v) != 9:
            raise ValueError('תעודת זהות לא תקינה')
        # אלגוריתם בדיקת ת"ז ישראלית
        v = v.zfill(9)
        s = sum(sum(divmod(int(d) * (1 + i % 2), 10)) for i, d in enumerate(v))
        if s % 10 != 0:
            raise ValueError('תעודת זהות לא תקינה')
        return v

class UserOut(UserBase):
    id: int

    class Config:
        from_attributes = True
