from fastapi import APIRouter, Depends, HTTPException, Header
from app.database import get_db

from fastapi import Request
from sqlalchemy.orm import Session

from app.schemas import PermissionUpdate

from pydantic import BaseModel
from app.crud import (
    create_board,
    get_board,
    update_board,
    lock_board,
    verify_password,
    unlock_board,
    update_permission
) 



from app.schemas import (
    BoardCreate,
    BoardUpdate,
    LockBoardRequest,
    VerifyPasswordRequest
)

router = APIRouter(prefix="/boards", tags=["Boards"])


@router.post("/")
def new_board(
    body: BoardCreate,
    db: Session = Depends(get_db)
):
    return create_board(
        db,
        body.slug
    )

@router.get("/{slug}")
def load_board(
    slug: str,
    request: Request,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token"
    ),
    db: Session = Depends(get_db)
):

    board = get_board(db, slug)


    if board is None:
        raise HTTPException(
            status_code=404,
            detail="Board not found"
        )
    
    is_owner = (
       owner_token == board.owner_token
    )

    if board.is_protected:

        verified = request.session.get(
            "verified_boards",
            []
        )

        if slug not in verified:

            return {
                "locked": True
            }

    return {
        "id": board.id,
        "slug": board.slug,
        "content": board.content,
        "is_protected": board.is_protected,
        "can_edit": board.can_edit,
        "is_owner": is_owner
    }


@router.put("/{slug}")
def save_board(
    slug: str,
    body: BoardUpdate,
    db: Session = Depends(get_db)
):
    board = update_board(db, slug, body.content)

    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")

    return board


# -------------------------
# Lock Board
# -------------------------

@router.post("/{slug}/lock")
def lock(
    slug: str,
    body: LockBoardRequest,
    db: Session = Depends(get_db)
):

    board = lock_board(
        db,
        slug,
        body.password
    )

    if board is None:
        raise HTTPException(
            status_code=404,
            detail="Board not found"
        )

    return {
        "message": "Board locked"
    }


# -------------------------
# Verify Password
# -------------------------

@router.post("/{slug}/verify")
def verify(
    slug: str,
    body: VerifyPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):

    success = verify_password(
        db,
        slug,
        body.password
    )

    if success:

        verified = request.session.get(
            "verified_boards",
            []
        )

        if slug not in verified:
            verified.append(slug)

        request.session["verified_boards"] = verified

    return {
        "success": success
    }

# -------------------------
# Unlock Board
# -------------------------

@router.delete("/{slug}/lock")
def unlock(
    slug: str,
    db: Session = Depends(get_db)
):

    board = unlock_board(
        db,
        slug
    )

    if board is None:
        raise HTTPException(
            status_code=404,
            detail="Board not found"
        )

    return {
        "message": "Board unlocked"
    }


@router.put("/{slug}/permission")
def change_permission(
    slug: str,
    body: PermissionUpdate,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token"
    ),
    db: Session = Depends(get_db)
):

    # Get the board
    board = get_board(db, slug)

    if board is None:
        raise HTTPException(
            status_code=404,
            detail="Board not found"
        )

    # Only the owner can change permissions
    if owner_token != board.owner_token:
        raise HTTPException(
            status_code=403,
            detail="Only the owner can change permissions"
        )

    # Update permission
    board = update_permission(
        db,
        slug,
        body.can_edit
    )

    return board