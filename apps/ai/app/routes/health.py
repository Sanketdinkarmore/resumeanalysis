from app.config import settings
from app.services import gemini_client, groq_client
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ai",
        "groq_configured": groq_client.is_groq_available(),
        "gemini_configured": gemini_client.is_gemini_available(),
        "llm_configured": groq_client.is_groq_available()
        or gemini_client.is_gemini_available(),
    }
