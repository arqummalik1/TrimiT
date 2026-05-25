from pydantic import BaseModel, EmailStr

class EarlyAccessEmailCreate(BaseModel):
    email: EmailStr
