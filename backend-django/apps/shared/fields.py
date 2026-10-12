"""Campos cifrados AES-256 (Fernet) para valores financieros.

Lectura dual: si el valor en BD es texto plano (datos previos), se interpreta
como Decimal; si es un token Fernet, se descifra. La escritura siempre cifra.
"""
from decimal import Decimal, InvalidOperation

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _fernet() -> Fernet:
    key = settings.FIELD_ENCRYPTION_KEY
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_plain(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


class EncryptedDecimalField(models.CharField):
    """Decimal cifrado en reposo. Columna VARCHAR; API sigue exponiendo Decimal."""

    def __init__(self, *args, max_digits=14, decimal_places=2, **kwargs):
        self.max_digits = max_digits
        self.decimal_places = decimal_places
        kwargs.setdefault("max_length", 512)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        kwargs["max_digits"] = self.max_digits
        kwargs["decimal_places"] = self.decimal_places
        return name, path, args, kwargs

    def from_db_value(self, value, expression, connection):
        return self.to_python(value)

    def to_python(self, value):
        if value is None or value == "":
            return None
        if isinstance(value, Decimal):
            return value
        if isinstance(value, (int, float)):
            return Decimal(str(value))
        raw = str(value)
        try:
            decrypted = _fernet().decrypt(raw.encode()).decode()
            return Decimal(decrypted)
        except (InvalidToken, ValueError, TypeError, InvalidOperation):
            try:
                return Decimal(raw)
            except InvalidOperation:
                return None

    def get_prep_value(self, value):
        if value is None or value == "":
            return None
        if isinstance(value, Decimal):
            plain = format(value, "f")
        else:
            plain = str(value)
        return encrypt_plain(plain)
