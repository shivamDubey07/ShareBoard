import os
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine, migrate_database
import app.models

from app.routers.boards import router as board_router
from app.routers.uploads import router as upload_router

from app.websocket_manager import manager

from starlette.middleware.sessions import SessionMiddleware


# Create database tables
Base.metadata.create_all(bind=engine)
migrate_database()


app = FastAPI(
    title="SnapBoard API"
)


app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "local-development-secret"),
    same_site=os.getenv("SESSION_COOKIE_SAMESITE", "lax"),
    https_only=os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true",
)

# -------------------------
# CORS
# -------------------------

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# API Routes
# -------------------------

app.include_router(board_router)
app.include_router(upload_router)


@app.get("/")
def root():

    return {
        "status": "ok",
        "message": "SnapBoard API is running"
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------------
# WebSocket
# -------------------------

@app.websocket("/ws/{slug}")
async def websocket_endpoint(
    websocket: WebSocket,
    slug: str
):

    await manager.connect(slug, websocket)

    try:

        while True:

            message = await websocket.receive_text()

            await manager.broadcast(
    slug,
    message,
    websocket
)

    except WebSocketDisconnect:

        manager.disconnect(
            slug,
            websocket
        )


# -------------------------
# Uploaded Images
# -------------------------

data_dir = Path(
    os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent)
)
upload_dir = data_dir / "uploads"
upload_dir.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=upload_dir),
    name="uploads"
)
