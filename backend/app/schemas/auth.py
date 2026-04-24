from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str | None = None
    company_name: str | None = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str | None
    company_name: str | None
    gstin: str | None
    pan: str | None
    startup_stage: str | None
    is_guest: bool

    class Config:
        from_attributes = True
