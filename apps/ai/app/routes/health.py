from app.config import settings
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai",
        "llm_configured": bool(settings.gemini_api_key),
    }
