from fastapi import FastAPI

from app.routes.health import router as health_router
from app.routes.interview import router as interview_router
from app.routes.parse import router as parse_router

app = FastAPI(
    title="Job & Resume Intelligence — AI Service",
    description="Internal service for PDF parsing, NLP extraction, and LLM-assisted features.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(health_router, tags=["health"])
app.include_router(parse_router, prefix="/parse", tags=["parse"])
app.include_router(interview_router, prefix="/interview", tags=["interview"])
