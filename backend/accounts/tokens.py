from datetime import datetime, timezone

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import RevokedToken


def revoke(token: RefreshToken) -> None:
    expires_at = datetime.fromtimestamp(token["exp"], tz=timezone.utc)
    RevokedToken.objects.get_or_create(jti=token["jti"], defaults={"expires_at": expires_at})


def load_refresh(raw: str) -> RefreshToken:
    """Parse and verify a refresh token, rejecting revoked ones."""
    token = RefreshToken(raw)
    if RevokedToken.objects.filter(jti=token["jti"]).exists():
        raise TokenError("Token is blacklisted")
    return token
