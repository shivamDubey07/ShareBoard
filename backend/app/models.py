from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base
import uuid


class Board(Base):
    __tablename__ = "boards"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    slug = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    content = Column(
        String,
        default=""
    )

    # Password protection
    is_protected = Column(
        Boolean,
        default=False,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=True
    )

    can_edit = Column(
        Boolean,
        default=True
    )
    owner_token = Column(
        String,
        unique=True,
        nullable=False,
        default=lambda: str(uuid.uuid4())
    )