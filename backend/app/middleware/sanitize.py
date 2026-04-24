"""
Input sanitization utilities for Raven.
Sanitizes user input to prevent injection attacks and malformed data.
"""

import re
from typing import Optional


def sanitize_chat_input(text: str, max_length: int = 4000) -> str:
    """
    Sanitize chat input from user.
    - Remove HTML/XML tags
    - Limit length
    - Strip excessive whitespace
    """
    if not isinstance(text, str):
        return ""

    # Remove HTML/XML tags
    text = re.sub(r"<[^>]+>", "", text)

    # Limit length
    text = text[:max_length]

    # Strip leading/trailing whitespace
    text = text.strip()

    # Replace excessive whitespace with single spaces (but preserve newlines)
    text = re.sub(r" +", " ", text)
    text = re.sub(r"\n\n\n+", "\n\n", text)

    return text


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename for CSV uploads.
    - Remove path traversal attempts
    - Remove special characters
    - Limit length
    """
    if not isinstance(filename, str):
        return "upload"

    # Remove path traversal attempts
    filename = filename.replace("../", "").replace("..\\", "")
    filename = filename.lstrip("./\\")

    # Remove or replace special characters
    # Keep only alphanumerics, hyphens, underscores, and dots
    filename = re.sub(r"[^a-zA-Z0-9._-]", "_", filename)

    # Remove multiple consecutive underscores or dots
    filename = re.sub(r"_{2,}", "_", filename)
    filename = re.sub(r"\.{2,}", ".", filename)

    # Limit length (reserve space for potential suffixes)
    if len(filename) > max_length - 10:
        name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")
        name = name[: max_length - len(ext) - 11]
        filename = f"{name}.{ext}" if ext else name

    # Ensure filename is not empty
    if not filename or filename == ".":
        filename = "upload"

    return filename


def sanitize_json_field(value: Optional[str]) -> Optional[str]:
    """
    Sanitize a value that will be stored as JSON.
    """
    if value is None:
        return None

    if not isinstance(value, str):
        return str(value)

    # Remove control characters
    value = "".join(char for char in value if ord(char) >= 32 or char in "\t\n\r")

    return value.strip()


def is_safe_url(url: str) -> bool:
    """
    Basic URL validation - reject clearly malicious URLs.
    """
    if not url:
        return False

    # Reject javascript: and data: URLs
    if url.lower().startswith(("javascript:", "data:", "vbscript:")):
        return False

    # Allow http(s) and relative URLs
    if url.startswith(("http://", "https://", "/")):
        return True

    return False
