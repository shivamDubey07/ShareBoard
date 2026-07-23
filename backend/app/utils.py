import secrets


def generate_slug(length: int = 8):
    return secrets.token_urlsafe(length)[:length]