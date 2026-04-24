"""Unit tests for core security module."""
import pytest
from datetime import timedelta

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
    encrypt_value,
    decrypt_value,
    _truncate,
    _BCRYPT_MAX_BYTES,
)


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "securePassword123!"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)

    def test_wrong_password_fails(self):
        hashed = get_password_hash("correct-password")
        assert not verify_password("wrong-password", hashed)

    def test_hash_is_not_plaintext(self):
        password = "myPassword"
        hashed = get_password_hash(password)
        assert hashed != password
        assert hashed.startswith("$2")

    def test_different_hashes_for_same_password(self):
        password = "samePassword"
        h1 = get_password_hash(password)
        h2 = get_password_hash(password)
        assert h1 != h2  # Different salts

    def test_empty_password(self):
        hashed = get_password_hash("")
        assert verify_password("", hashed)
        assert not verify_password("notempty", hashed)

    def test_long_password_truncation(self):
        long_pw = "a" * 200
        hashed = get_password_hash(long_pw)
        assert verify_password(long_pw, hashed)

    def test_verify_with_invalid_hash_returns_false(self):
        assert not verify_password("password", "not-a-valid-hash")


class TestTruncate:
    def test_short_password_unchanged(self):
        result = _truncate("hello")
        assert result == b"hello"

    def test_long_password_truncated_to_72_bytes(self):
        long_pw = "x" * 200
        result = _truncate(long_pw)
        assert len(result) == _BCRYPT_MAX_BYTES

    def test_multibyte_characters(self):
        # Unicode characters that are multi-byte in UTF-8
        pw = "\u00e9" * 100  # é is 2 bytes in UTF-8
        result = _truncate(pw)
        assert len(result) <= _BCRYPT_MAX_BYTES


class TestJWT:
    def test_create_and_decode_token(self):
        data = {"sub": "user@example.com", "role": "admin"}
        token = create_access_token(data)
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == "user@example.com"
        assert decoded["role"] == "admin"
        assert "exp" in decoded

    def test_token_with_custom_expiry(self):
        data = {"sub": "test"}
        token = create_access_token(data, expires_delta=timedelta(minutes=5))
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == "test"

    def test_invalid_token_returns_none(self):
        assert decode_token("invalid.token.string") is None

    def test_empty_token_returns_none(self):
        assert decode_token("") is None

    def test_token_payload_is_preserved(self):
        data = {"sub": "user1", "custom_field": "custom_value", "count": 42}
        token = create_access_token(data)
        decoded = decode_token(token)
        assert decoded["custom_field"] == "custom_value"
        assert decoded["count"] == 42


class TestEncryption:
    def test_encrypt_and_decrypt(self):
        original = "sensitive-api-key-12345"
        encrypted = encrypt_value(original)
        assert encrypted != original
        decrypted = decrypt_value(encrypted)
        assert decrypted == original

    def test_different_encryptions_differ(self):
        value = "same-value"
        e1 = encrypt_value(value)
        e2 = encrypt_value(value)
        # Fernet uses a timestamp + random IV, so encryptions differ
        assert e1 != e2

    def test_empty_string(self):
        encrypted = encrypt_value("")
        assert decrypt_value(encrypted) == ""

    def test_unicode_values(self):
        original = "API密钥-тест-🔑"
        encrypted = encrypt_value(original)
        assert decrypt_value(encrypted) == original
