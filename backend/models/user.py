from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
    """Schema for creating a new user"""
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    """Schema for user response"""
    id: str
    username: str
    email: str
    balance: float
    
class UserInDB(BaseModel):
    """Schema for user in database"""
    username: str
    email: str
    password: bytes  # Hashed password
    balance: float = 10000.0
    created_at: datetime = Field(default_factory=datetime.now)
