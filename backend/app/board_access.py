import hashlib
import os

from itsdangerous import BadSignature, URLSafeSerializer


def _serializer() -> URLSafeSerializer:
    return URLSafeSerializer(
        os.getenv("SESSION_SECRET", "local-development-secret"),
        salt="shareboard-access",
    )


def _password_fingerprint(password_hash: str | None) -> str:
    return hashlib.sha256((password_hash or "").encode()).hexdigest()


def create_board_access_token(slug: str, password_hash: str | None) -> str:
    return _serializer().dumps(
        {
            "slug": slug,
            "password": _password_fingerprint(password_hash),
        }
    )


def has_board_access(
    token: str | None,
    slug: str,
    password_hash: str | None,
) -> bool:
    if not token:
        return False

    try:
        payload = _serializer().loads(token)
    except BadSignature:
        return False

    return (
        payload.get("slug") == slug
        and payload.get("password")
        == _password_fingerprint(password_hash)
    )
