import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DATA_DIR / 'snapboard.db'}"
)

engine_options = {}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_options)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def migrate_database():
    """Apply small, backwards-compatible migrations for existing SQLite data."""

    inspector = inspect(engine)

    if "boards" not in inspector.get_table_names():
        return

    columns = {
        column["name"]
        for column in inspector.get_columns("boards")
    }

    if "content_version" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE boards "
                    "ADD COLUMN content_version INTEGER "
                    "NOT NULL DEFAULT 0"
                )
            )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
