from sqlalchemy.orm import Session

from app.models import Board
from app.utils import generate_slug
import bcrypt


def create_board(db: Session, slug: str = None):

    # If user provided a slug
    if slug:

        existing = (
            db.query(Board)
            .filter(Board.slug == slug)
            .first()
        )

        if existing:
            return existing

    else:

        while True:

            slug = generate_slug()

            exists = (
                db.query(Board)
                .filter(Board.slug == slug)
                .first()
            )

            if not exists:
                break

    board = Board(
        slug=slug,
        content=""
    )

    db.add(board)
    db.commit()
    db.refresh(board)

    return board


def get_board(db: Session, slug: str):

    return (
        db.query(Board)
        .filter(Board.slug == slug)
        .first()
    )


def update_board(
    db: Session,
    slug: str,
    content: str
):

    board = get_board(db, slug)

    if board is None:
        return None

    board.content = content

    db.commit()
    db.refresh(board)

    return board


def lock_board(
    db: Session,
    slug: str,
    password: str
):

    board = get_board(db, slug)

    if board is None:
        return None

    hashed = bcrypt.hashpw(
        password.encode(),
        bcrypt.gensalt()
    )

    board.password_hash = hashed.decode()
    board.is_protected = True

    db.commit()
    db.refresh(board)

    return board


def verify_password(
    db: Session,
    slug: str,
    password: str
):

    board = get_board(db, slug)

    if board is None:
        return False

    if not board.is_protected:
        return True

    return bcrypt.checkpw(
        password.encode(),
        board.password_hash.encode()
    )


def unlock_board(
    db: Session,
    slug: str
):

    board = get_board(db, slug)

    if board is None:
        return None

    board.is_protected = False
    board.password_hash = None

    db.commit()
    db.refresh(board)

    return board

def update_permission(
    db: Session,
    slug: str,
    can_edit: bool
):
    board = get_board(db, slug)

    if board is None:
        return None

    board.can_edit = can_edit

    db.commit()
    db.refresh(board)

    return board