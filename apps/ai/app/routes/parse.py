from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.dependencies.internal_auth import verify_internal_secret
from app.services.jd_parser import parse_job_description
from app.services.resume_parser import parse_resume_pdf

router = APIRouter(dependencies=[Depends(verify_internal_secret)])

MAX_PDF_BYTES = 5 * 1024 * 1024


class ParseJdRequest(BaseModel):
    rawText: str = Field(min_length=50, max_length=20000)


@router.post("/resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Extract structured data from a resume PDF.
    Called by Express after upload — not by the browser.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    pdf_bytes = await file.read()

    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    try:
        parsed = parse_resume_pdf(pdf_bytes)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse PDF: {exc}") from exc

    return {"parsed": parsed}


@router.post("/job-description")
async def parse_jd(body: ParseJdRequest):
    """
    Extract skills/keywords/seniority from pasted JD text.
    Called by Express after JD create — not by the browser.
    """
    try:
        parsed = parse_job_description(body.rawText)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse JD: {exc}") from exc

    return {"parsed": parsed}
