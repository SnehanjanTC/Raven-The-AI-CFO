from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from cryptography.fernet import Fernet
import base64
import hashlib

from app.core.config import settings

# NOTE: We call `bcrypt` directly instead of going through passlib.
# passlib (last release 2020) is incompatible with bcrypt 4.x/5.x — its
# internal self-test trips the 72-byte limit that newer bcrypt enforces, so
# every hash/verify call 500s. Switching to bcrypt directly is the canonical
# upstream-recommended fix.
#
# bcrypt accepts at most 72 bytes of password input; we truncate explicitly
# (matching the historical passlib-with-bcrypt behavior) so long passwords
# don't blow up.
_BCRYPT_MAX_BYTES = 72


def get_fernet() -> Fernet:
    """Get Fernet instance for credential encryption"""
    key = settings.ENCRYPTION_KEY or settings.SECRET_KEY
    # Derive a valid Fernet key from the secret
    key_bytes = hashlib.sha256(key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def encrypt_value(value: str) -> str:
    return get_fernet().encrypt(value.encode()).decode()


def decrypt_value(encrypted: str) -> str:
    return get_fernet().decrypt(encrypted.encode()).decode()


def _truncate(password: str) -> bytes:
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(_truncate(plain_password), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_truncate(password), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
