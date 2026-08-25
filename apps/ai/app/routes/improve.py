from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies.internal_auth import verify_internal_secret
from app.services.bullet_rewrite import rewrite_bullets

router = APIRouter(dependencies=[Depends(verify_internal_secret)])


class ExperienceEntry(BaseModel):
    title: str | None = None
    company: str | None = None
    bullets: list[str] = Field(default_factory=list)


class RewriteBulletsRequest(BaseModel):
    roleTitle: str = Field(min_length=1, max_length=200)
    requiredSkills: list[str] = Field(default_factory=list)
    preferredSkills: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    experience: list[ExperienceEntry] = Field(default_factory=list)


@router.post("/bullets")
def rewrite_bullets_route(body: RewriteBulletsRequest):
    """Rewrite resume experience bullets to match a JD. Called by Express only."""
    try:
        suggestions = rewrite_bullets(
            role_title=body.roleTitle,
            required_skills=body.requiredSkills,
            preferred_skills=body.preferredSkills,
            keywords=body.keywords,
            experience=[e.model_dump() for e in body.experience],
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Bullet rewrite failed: {exc}") from exc

    return {"suggestions": suggestions}
