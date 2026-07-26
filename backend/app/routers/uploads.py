from fastapi import APIRouter, UploadFile, File
from fastapi.staticfiles import StaticFiles
import shutil
import uuid
import os
from pathlib import Path


router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"]
)


DATA_DIR = Path(
    os.getenv("DATA_DIR", Path(__file__).resolve().parent.parent.parent)
)
UPLOAD_DIR = DATA_DIR / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/")
async def upload_image(
    file: UploadFile = File(...)
):

    filename = (
        str(uuid.uuid4())
        + "."
        + file.filename.split(".")[-1]
    )

    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )


    return {
        "url": f"/uploads/{filename}"
    }
