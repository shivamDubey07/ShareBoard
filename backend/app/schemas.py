from typing import Optional
from pydantic import BaseModel


# ----------------------------
# Create Board
# ----------------------------

class BoardCreate(BaseModel):
    slug: Optional[str] = None


# ----------------------------
# Board Responses
# ----------------------------

class BoardCreateResponse(BaseModel):
    id: int
    slug: str
    owner_token: str

    class Config:
        from_attributes = True


class BoardResponse(BaseModel):
    id: int
    slug: str
    content: str
    is_protected: bool
    can_edit: bool
    is_owner: bool

    class Config:
        from_attributes = True


# ----------------------------
# Update Content
# ----------------------------

class BoardUpdate(BaseModel):
    content: str


# ----------------------------
# Permission Update
# ----------------------------

class PermissionUpdate(BaseModel):
    can_edit: bool

# ----------------------------
# Password Protection
# ----------------------------

class LockBoardRequest(BaseModel):
    password: str


class VerifyPasswordRequest(BaseModel):
    password: str


class VerifyPasswordResponse(BaseModel):
    success: bool

