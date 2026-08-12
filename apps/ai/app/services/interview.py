"""Generate interview questions grounded in JD + optional resume context."""

from __future__ import annotations

from app.services.gemini_client import generate_json, is_llm_available

VALID_CATEGORIES = {"TECHNICAL", "BEHAVIORAL", "PROJECT"}


def generate_interview_questions(
    *,
    role_title: str,
    company_name: str | None,
    seniority: str,
    required_skills: list[str],
    preferred_skills: list[str],
    jd_text: str,
    resume_context: str | None = None,
) -> list[dict[str, str]]:
    """
    Returns list of { category, prompt }.
    When resume_context is provided, questions are grounded in JD + resume
    (what a recruiter would ask after shortlisting this candidate).
    """
    if not is_llm_available():
        raise ValueError("Gemini is not configured — set GEMINI_API_KEY to generate interview questions")

    has_resume = bool(resume_context and resume_context.strip())

    grounding = (
        "Ground questions in BOTH the job description AND the candidate resume.\n"
        "Simulate a recruiter who shortlisted this resume for this role.\n"
        "- TECHNICAL: probe JD-required skills the resume claims (ask for depth / tradeoffs)\n"
        "- BEHAVIORAL: tie soft-skill probes to real roles/internships on the resume\n"
        "- PROJECT: ask about specific projects/experience bullets from the resume, "
        "framed against this JD's needs\n"
        "Do NOT invent resume projects or metrics that are not present.\n"
        "Do NOT ask about stacks absent from both JD and resume."
        if has_resume
        else "Ground questions ONLY in the job description (no resume provided).\n"
        "Do NOT invent unrelated stacks."
    )

    project_rule = (
        "3 PROJECT questions that reference concrete resume projects/experience "
        "and connect them to this JD"
        if has_resume
        else "3 PROJECT / scenario questions tied to JD responsibilities"
    )

    resume_block = (
        f"""
CANDIDATE RESUME (parsed summary — use this):
\"\"\"
{resume_context[:7000]}
\"\"\"
"""
        if has_resume
        else "\n(No resume provided — JD-only questions.)\n"
    )

    prompt = f"""
You are an interview coach for software engineering candidates.
{grounding}

Return JSON:
{{
  "questions": [
    {{ "category": "TECHNICAL"|"BEHAVIORAL"|"PROJECT", "prompt": string }}
  ]
}}

Rules:
- Exactly 9 questions total:
  - 3 TECHNICAL (role-specific tech/skills from the JD{', verified against resume claims' if has_resume else ''})
  - 3 BEHAVIORAL (calibrated to seniority: {seniority}{'; anchored in resume experience' if has_resume else ''})
  - {project_rule}
- Questions must feel like a real screening / interview for THIS role
- Keep each prompt to 1-2 sentences
- category must be exactly TECHNICAL, BEHAVIORAL, or PROJECT

Role: {role_title}
Company: {company_name or "N/A"}
Seniority: {seniority}
Required skills: {", ".join(required_skills) or "N/A"}
Preferred skills: {", ".join(preferred_skills) or "N/A"}

JOB DESCRIPTION:
\"\"\"
{jd_text[:7000]}
\"\"\"
{resume_block}
"""

    data = generate_json(prompt, max_output_tokens=3500)
    if not data or not isinstance(data.get("questions"), list):
        raise ValueError("Failed to generate interview questions from Gemini")

    cleaned: list[dict[str, str]] = []
    for item in data["questions"]:
        if not isinstance(item, dict):
            continue
        category = str(item.get("category") or "").upper().strip()
        text = str(item.get("prompt") or "").strip()
        if category not in VALID_CATEGORIES or not text:
            continue
        cleaned.append({"category": category, "prompt": text})

    if len(cleaned) < 6:
        raise ValueError("Gemini returned too few valid interview questions")

    return cleaned[:12]


def generate_answer_outline(
    *,
    question: str,
    category: str,
    role_title: str,
    jd_text: str,
    resume_context: str | None = None,
) -> str:
    """On-demand answer outline. Uses resume when available so tips stay personal."""
    if not is_llm_available():
        raise ValueError("Gemini is not configured — set GEMINI_API_KEY")

    has_resume = bool(resume_context and resume_context.strip())
    resume_guidance = (
        "Prefer talking points the candidate can support from THEIR resume below. "
        "Do not invent projects/metrics not present; use [metric] only if missing."
        if has_resume
        else "Do NOT invent fake experience — use placeholders like [project name] / [metric] when needed."
    )

    resume_block = (
        f"""
CANDIDATE RESUME:
\"\"\"
{resume_context[:5000]}
\"\"\"
"""
        if has_resume
        else ""
    )

    prompt = f"""
You are an interview coach. Create a concise answer outline for the candidate.
Do NOT write a full scripted monologue. Give structured talking points.
{resume_guidance}

Return JSON:
{{
  "answerOutline": string
}}

Format the outline as short markdown bullets:
- What the interviewer wants
- Structure (e.g. STAR for behavioral)
- 4-7 talking points
- Optional follow-up tip

Category: {category}
Role: {role_title}
Question: {question}

JD CONTEXT:
\"\"\"
{jd_text[:3500]}
\"\"\"
{resume_block}
"""

    data = generate_json(prompt, max_output_tokens=2000)
    if not data:
        raise ValueError("Failed to generate answer outline from Gemini")

    outline = data.get("answerOutline")
    if not isinstance(outline, str) or not outline.strip():
        raise ValueError("Gemini returned an empty answer outline")

    return outline.strip()
