from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
import app.models

from app.routers.boards import router as board_router
from app.routers.uploads import router as upload_router

from app.websocket_manager import manager

from starlette.middleware.sessions import SessionMiddleware


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="SnapBoard API"
)


app.add_middleware(
    SessionMiddleware,
    secret_key="CHANGE_THIS_TO_A_LONG_RANDOM_SECRET"
)

# -------------------------
# CORS
# -------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173"
    ],
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

app.mount(
    "/uploads",
    StaticFiles(directory="app/uploads"),
    name="uploads"
)