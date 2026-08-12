from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies.internal_auth import verify_internal_secret
from app.services.interview import generate_answer_outline, generate_interview_questions

router = APIRouter(dependencies=[Depends(verify_internal_secret)])


class GenerateQuestionsRequest(BaseModel):
    roleTitle: str = Field(min_length=1, max_length=200)
    companyName: str | None = None
    seniority: str = "unknown"
    requiredSkills: list[str] = Field(default_factory=list)
    preferredSkills: list[str] = Field(default_factory=list)
    rawText: str = Field(min_length=50, max_length=20000)
    # Compact resume summary for JD+resume grounded questions
    resumeContext: str | None = Field(default=None, max_length=12000)


class AnswerOutlineRequest(BaseModel):
    question: str = Field(min_length=5, max_length=2000)
    category: str = Field(min_length=1, max_length=40)
    roleTitle: str = Field(min_length=1, max_length=200)
    rawText: str = Field(min_length=50, max_length=20000)
    resumeContext: str | None = Field(default=None, max_length=12000)


@router.post("/questions")
def create_questions(body: GenerateQuestionsRequest):
    """Generate JD (+ optional resume) interview questions. Called by Express only."""
    try:
        questions = generate_interview_questions(
            role_title=body.roleTitle,
            company_name=body.companyName,
            seniority=body.seniority,
            required_skills=body.requiredSkills,
            preferred_skills=body.preferredSkills,
            jd_text=body.rawText,
            resume_context=body.resumeContext,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Interview generation failed: {exc}") from exc

    return {"questions": questions}


@router.post("/answer-outline")
def create_answer_outline(body: AnswerOutlineRequest):
    """On-demand answer outline for one question (cost control)."""
    try:
        outline = generate_answer_outline(
            question=body.question,
            category=body.category,
            role_title=body.roleTitle,
            jd_text=body.rawText,
            resume_context=body.resumeContext,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Answer outline failed: {exc}") from exc

    return {"answerOutline": outline}
