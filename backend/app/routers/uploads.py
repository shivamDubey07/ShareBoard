from fastapi import APIRouter, UploadFile, File
from fastapi.staticfiles import StaticFiles
import shutil
import uuid
import os


router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"]
)


UPLOAD_DIR = "app/uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


@router.post("/")
async def upload_image(
    file: UploadFile = File(...)
):

    filename = (
        str(uuid.uuid4())
        + "."
        + file.filename.split(".")[-1]
    )

    filepath = os.path.join(
        UPLOAD_DIR,
        filename
    )

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )


    return {
        "url": f"/uploads/{filename}"
    }