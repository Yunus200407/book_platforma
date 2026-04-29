from pydantic import BaseModel
from typing import Optional


class BookCreate(BaseModel):
    title: str
    author: str
    description: Optional[str] = None
    path: str


class BookRead(BaseModel):
    id: int
    title: str
    author: str
    description: Optional[str] = None
    path: str

    model_config = {"from_attributes": True}


class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    description: Optional[str] = None
    path: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    password: str


class UserRead(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str