"""Generate interview questions grounded in JD + optional resume context."""

from __future__ import annotations

import logging
import re

from app.services.llm_client import generate_json, is_llm_available

logger = logging.getLogger(__name__)

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
    Prefers Groq → Gemini → deterministic templates.
    """
    has_resume = bool(resume_context and resume_context.strip())

    if is_llm_available():
        try:
            llm_questions = _generate_with_llm(
                role_title=role_title,
                company_name=company_name,
                seniority=seniority,
                required_skills=required_skills,
                preferred_skills=preferred_skills,
                jd_text=jd_text,
                resume_context=resume_context,
                has_resume=has_resume,
            )
            if llm_questions:
                return llm_questions
            logger.warning("LLM interview generation unavailable; using template fallback")
        except Exception as exc:
            logger.warning("LLM interview generation error: %s; using template fallback", exc)

    return _heuristic_questions(
        role_title=role_title,
        company_name=company_name,
        seniority=seniority,
        required_skills=required_skills,
        preferred_skills=preferred_skills,
        jd_text=jd_text,
        resume_context=resume_context,
    )


def _generate_with_llm(
    *,
    role_title: str,
    company_name: str | None,
    seniority: str,
    required_skills: list[str],
    preferred_skills: list[str],
    jd_text: str,
    resume_context: str | None,
    has_resume: bool,
) -> list[dict[str, str]] | None:
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
- Exactly 10 questions total:
  - 4 TECHNICAL (role-specific tech/skills from the JD{', verified against resume claims' if has_resume else ''})
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
        return None

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
        return None

    return cleaned[:12]


def _heuristic_questions(
    *,
    role_title: str,
    company_name: str | None,
    seniority: str,
    required_skills: list[str],
    preferred_skills: list[str],
    jd_text: str,
    resume_context: str | None,
) -> list[dict[str, str]]:
    """Deterministic questions so interview prep still works without Gemini."""
    company = (company_name or "the company").strip() or "the company"
    skills = [s.strip() for s in required_skills if s and s.strip()][:6]
    if len(skills) < 3:
        skills.extend([s.strip() for s in preferred_skills if s and s.strip()])
    skills = _dedupe(skills)[:6]
    while len(skills) < 3:
        skills.append(f"core skills for {role_title}")

    projects = _extract_resume_lines(resume_context, "Projects")
    experience = _extract_resume_lines(resume_context, "Experience")
    anchors = projects or experience
    while len(anchors) < 3:
        anchors.append(f"a recent project relevant to {role_title}")

    tech = [
        f"Walk me through how you would design a solution for the {role_title} role at {company} using {skills[0]}.",
        f"What tradeoffs have you made when using {skills[1]} in production, and how would that apply here?",
        f"How would you debug a production issue involving {skills[2]} in a system like the one described in this JD?",
    ]
    behavioral = [
        f"Tell me about a time you had to ramp up quickly on unfamiliar tech for a {seniority or 'mid-level'} role.",
        f"Describe a disagreement with a teammate about technical approach and how you resolved it.",
        f"How do you prioritize work when multiple stakeholders need something from a {role_title}?",
    ]
    project = [
        f"Looking at {anchors[0]}, what would you reuse or change for this {role_title} role?",
        f"How does {anchors[1]} demonstrate skills this JD asks for?",
        f"Pick {anchors[2]} and explain the hardest technical decision you made and why.",
    ]

    # Light JD keyword spice when skills list is generic
    keywords = _jd_keywords(jd_text)
    if keywords and "core skills" in skills[0]:
        tech[0] = (
            f"How would you apply {keywords[0]} day-to-day as a {role_title} at {company}?"
        )

    out: list[dict[str, str]] = []
    for prompt in tech:
        out.append({"category": "TECHNICAL", "prompt": prompt})
    for prompt in behavioral:
        out.append({"category": "BEHAVIORAL", "prompt": prompt})
    for prompt in project:
        out.append({"category": "PROJECT", "prompt": prompt})
    return out


def _extract_resume_lines(resume_context: str | None, heading: str) -> list[str]:
    if not resume_context:
        return []
    lines = resume_context.splitlines()
    collecting = False
    found: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.lower().startswith(heading.lower()):
            collecting = True
            continue
        if collecting and re.match(r"^[A-Za-z][A-Za-z ]+:\s*$", stripped):
            break
        if collecting and stripped.startswith(("-", "•", "*")):
            text = stripped.lstrip("-•* ").strip()
            if text:
                found.append(text[:120])
        elif collecting and stripped:
            found.append(stripped[:120])
        if len(found) >= 3:
            break
    return found


def _jd_keywords(jd_text: str) -> list[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9+.#-]{2,}", jd_text or "")
    stop = {
        "the",
        "and",
        "for",
        "with",
        "you",
        "will",
        "our",
        "this",
        "that",
        "from",
        "have",
        "experience",
        "years",
        "team",
        "work",
        "role",
        "job",
        "ability",
        "strong",
        "using",
        "including",
    }
    out: list[str] = []
    seen: set[str] = set()
    for t in tokens:
        key = t.lower()
        if key in stop or key in seen:
            continue
        seen.add(key)
        out.append(t)
        if len(out) >= 5:
            break
    return out


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def generate_answer_outline(
    *,
    question: str,
    category: str,
    role_title: str,
    jd_text: str,
    resume_context: str | None = None,
) -> str:
    """On-demand answer outline. Uses resume when available so tips stay personal."""
    has_resume = bool(resume_context and resume_context.strip())

    if is_llm_available():
        outline = _outline_with_llm(
            question=question,
            category=category,
            role_title=role_title,
            jd_text=jd_text,
            resume_context=resume_context,
            has_resume=has_resume,
        )
        if outline:
            return outline
        logger.warning("LLM outline unavailable; using template fallback")

    return _heuristic_outline(
        question=question,
        category=category,
        role_title=role_title,
        has_resume=has_resume,
    )


def _outline_with_llm(
    *,
    question: str,
    category: str,
    role_title: str,
    jd_text: str,
    resume_context: str | None,
    has_resume: bool,
) -> str | None:
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
        return None

    outline = data.get("answerOutline")
    if not isinstance(outline, str) or not outline.strip():
        return None

    return outline.strip()


def _heuristic_outline(
    *,
    question: str,
    category: str,
    role_title: str,
    has_resume: bool,
) -> str:
    structure = (
        "STAR (Situation → Task → Action → Result)"
        if category.upper() == "BEHAVIORAL"
        else "Context → Approach → Tradeoffs → Outcome"
    )
    resume_tip = (
        "Pull one concrete example from your resume; name the project and your role."
        if has_resume
        else "Use a real example; if you lack one, say how you would approach it for this role."
    )
    return "\n".join(
        [
            f"- **What they want:** Clear thinking for a {role_title}, not a memorized speech.",
            f"- **Structure:** {structure}",
            f"- **Question focus:** {question[:220]}",
            "- **Talking points:**",
            "  - Restate the problem in your own words",
            "  - Share your approach and why you chose it",
            "  - Call out one tradeoff or risk",
            "  - Mention a measurable result or learning ([metric] if needed)",
            f"- **Tip:** {resume_tip}",
        ]
    )
