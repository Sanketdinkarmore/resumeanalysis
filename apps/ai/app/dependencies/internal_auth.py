from fastapi import Depends, Header, HTTPException

from app.config import settings


async def verify_internal_secret(x_internal_secret: str = Header(...)) -> None:
    """Express must send this header — browser never calls FastAPI directly."""
    if x_internal_secret != settings.internal_api_secret:
        raise HTTPException(status_code=401, detail="Invalid internal secret")
