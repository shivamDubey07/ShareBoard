from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.board_access import (
    create_board_access_token,
    has_board_access,
)
from app.crud import (
    create_board,
    get_board,
    lock_board,
    unlock_board,
    update_board,
    update_permission,
    verify_password,
)
from app.database import get_db
from app.schemas import (
    BoardCreate,
    BoardUpdate,
    LockBoardRequest,
    PermissionUpdate,
    VerifyPasswordRequest,
)


router = APIRouter(prefix="/boards", tags=["Boards"])


def _is_owner(board, owner_token: str | None) -> bool:
    return bool(owner_token) and owner_token == board.owner_token


def _board_response(board, is_owner: bool) -> dict:
    return {
        "id": board.id,
        "slug": board.slug,
        "content": board.content or "",
        "is_protected": board.is_protected,
        "can_edit": board.can_edit,
        "is_owner": is_owner,
        "version": board.content_version,
    }


def _has_protected_access(board, access_token: str | None) -> bool:
    return (
        not board.is_protected
        or has_board_access(
            access_token,
            board.slug,
            board.password_hash,
        )
    )


@router.post("/", status_code=status.HTTP_201_CREATED)
def new_board(
    body: BoardCreate,
    db: Session = Depends(get_db),
):
    board = create_board(db, body.slug)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A board with this link already exists",
        )

    return {
        "id": board.id,
        "slug": board.slug,
        "owner_token": board.owner_token,
    }


@router.get("/{slug}")
def load_board(
    slug: str,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token",
    ),
    access_token: str | None = Header(
        default=None,
        alias="X-Board-Access-Token",
    ),
    db: Session = Depends(get_db),
):
    board = get_board(db, slug)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    if not _has_protected_access(board, access_token):
        return {
            "locked": True,
            "is_protected": True,
        }

    return _board_response(
        board,
        _is_owner(board, owner_token),
    )


@router.put("/{slug}")
def save_board(
    slug: str,
    body: BoardUpdate,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token",
    ),
    access_token: str | None = Header(
        default=None,
        alias="X-Board-Access-Token",
    ),
    db: Session = Depends(get_db),
):
    board = get_board(db, slug)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    if not _has_protected_access(board, access_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enter the board password before editing",
        )

    is_owner = _is_owner(board, owner_token)

    if not board.can_edit and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can edit this board",
        )

    updated_board = update_board(
        db,
        slug,
        body.content,
        body.version,
    )

    if updated_board is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This board changed before your save completed. "
                "Reload before editing again."
            ),
        )

    return _board_response(updated_board, is_owner)


@router.post("/{slug}/lock")
def lock(
    slug: str,
    body: LockBoardRequest,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token",
    ),
    db: Session = Depends(get_db),
):
    board = get_board(db, slug)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    if not _is_owner(board, owner_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can protect this board",
        )

    board = lock_board(db, slug, body.password)

    return {
        "message": "Board protected",
        "access_token": create_board_access_token(
            board.slug,
            board.password_hash,
        ),
    }


@router.post("/{slug}/verify")
def verify(
    slug: str,
    body: VerifyPasswordRequest,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token",
    ),
    db: Session = Depends(get_db),
):
    board = get_board(db, slug)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    if not verify_password(db, slug, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    response = _board_response(
        board,
        _is_owner(board, owner_token),
    )
    response.update(
        {
            "success": True,
            "access_token": (
                create_board_access_token(
                    board.slug,
                    board.password_hash,
                )
                if board.is_protected
                else None
            ),
        }
    )
    return response


@router.delete("/{slug}/lock")
def unlock(
    slug: str,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token",
    ),
    db: Session = Depends(get_db),
):
    board = get_board(db, slug)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    if not _is_owner(board, owner_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can remove protection",
        )

    board = unlock_board(db, slug)

    return _board_response(board, True)


@router.put("/{slug}/permission")
def change_permission(
    slug: str,
    body: PermissionUpdate,
    owner_token: str | None = Header(
        default=None,
        alias="X-Owner-Token",
    ),
    db: Session = Depends(get_db),
):
    board = get_board(db, slug)

    if board is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    if not _is_owner(board, owner_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can change permissions",
        )

    board = update_permission(db, slug, body.can_edit)
    return _board_response(board, True)
