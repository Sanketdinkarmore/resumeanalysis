import re
from typing import Any

import pymupdf


SECTION_HEADERS = {
    "summary": re.compile(
        r"^(professional\s+)?(summary|profile|about\s+me|objective)\s*$",
        re.I,
    ),
    "skills": re.compile(
        r"^((technical\s+)?skills|core\s+competencies)\s*$",
        re.I,
    ),
    "experience": re.compile(
        r"^(professional\s+)?(experience|work\s+experience|employment)\s*$",
        re.I,
    ),
    "education": re.compile(r"^(education|academic)\s*$", re.I),
    "projects": re.compile(r"^(projects|personal\s+projects)\s*$", re.I),
    "certifications": re.compile(
        r"^(certifications?(\s*&\s*achievements?)?|licenses?)\s*$",
        re.I,
    ),
}

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")
LINKEDIN_RE = re.compile(r"(https?://(?:www\.)?linkedin\.com/\S+)", re.I)
GITHUB_RE = re.compile(r"(https?://(?:www\.)?github\.com/\S+)", re.I)
BULLET_RE = re.compile(r"^[\-•●\*]\s*|^\d+\.\s*")
CATEGORY_LABEL_RE = re.compile(
    r"^(Languages|Frontend|Backend|Databases|Cloud\s*&\s*DevOps|Data\s*/\s*ML|Practices|"
    r"Frameworks|Tools|Libraries|Soft\s+Skills)\s*:\s*",
    re.I,
)

COMMON_SKILLS = [
    "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#",
    "Bash", "SQL", "React", "React Native", "Next.js", "Node.js", "Express",
    "Express.js", "FastAPI", "Django", "Flask", "PostgreSQL", "MySQL", "MongoDB",
    "Redis", "Oracle", "DynamoDB", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "Git", "CI/CD", "GraphQL", "REST", "REST APIs", "Tailwind", "Tailwind CSS",
    "HTML", "HTML5", "CSS", "CSS3", "Nginx", "Jenkins", "JWT", "Microservices",
    "Scikit-learn", "Pandas", "Streamlit", "TF-IDF", "Prisma", "Postman", "Agile",
    "Scrum", "Lambda", "S3", "EC2", "RDS", "VPC", "API Gateway", "CloudWatch",
]


def parse_resume_pdf(pdf_bytes: bytes) -> dict[str, Any]:
    """Extract structured resume data from PDF bytes (heuristic + optional Gemini)."""
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    pages_text = [page.get_text("text") for page in doc]
    full_text = "\n".join(pages_text)
    doc.close()

    lines = [ln.strip() for ln in full_text.splitlines() if ln.strip()]
    sections = _split_sections(lines)

    contact = _extract_contact(full_text, lines)
    summary = _join_section(sections.get("summary", []))
    skills = _extract_skills(sections.get("skills", []), full_text)
    experience = _extract_experience(sections.get("experience", []))
    education = _extract_education(sections.get("education", []))
    projects = _extract_bullet_items(sections.get("projects", []))
    certifications = _extract_bullet_items(sections.get("certifications", []))

    result = {
        "contact": contact,
        "summary": summary or None,
        "skills": skills,
        "experience": experience,
        "education": education,
        "projects": projects,
        "certifications": certifications,
        "rawExtract": {
            "fullText": full_text,
            "pageCount": len(pages_text),
            "parser": "pymupdf-heuristic-v2",
            "llmEnriched": False,
        },
    }

    # Optional Gemini enrichment — same schema, falls back silently if LLM fails
    from app.services.llm_enrich import enrich_resume_parse

    return enrich_resume_parse(result, full_text)


def _split_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for line in lines:
        matched = False
        for name, pattern in SECTION_HEADERS.items():
            if pattern.match(line):
                current = name
                sections.setdefault(current, [])
                matched = True
                break
        if not matched and current:
            sections[current].append(line)

    return sections


def _extract_contact(full_text: str, lines: list[str]) -> dict[str, Any]:
    contact: dict[str, Any] = {"name": None, "email": None, "phone": None, "links": []}

    email = EMAIL_RE.search(full_text)
    if email:
        contact["email"] = email.group(0)

    phone = PHONE_RE.search(full_text[:500])
    if phone:
        contact["phone"] = phone.group(0).strip()

    for pattern in (LINKEDIN_RE, GITHUB_RE):
        match = pattern.search(full_text)
        if match:
            contact["links"].append(match.group(1))

    if lines:
        first = lines[0]
        if not EMAIL_RE.search(first) and len(first) < 60:
            contact["name"] = first

    return contact


def _join_section(lines: list[str]) -> str:
    return " ".join(lines).strip()


def _extract_skills(section_lines: list[str], full_text: str) -> list[str]:
    """Prefer clean skill names that match JD skill strings for scoring."""
    candidates: list[str] = []

    if section_lines:
        raw = " ".join(section_lines)
        # Strip category labels like "Frontend:" / "Cloud & DevOps:"
        raw = CATEGORY_LABEL_RE.sub(" ", raw)
        raw = re.sub(
            r"\b(Languages|Frontend|Backend|Databases|Cloud\s*&\s*DevOps|Data\s*/\s*ML|Practices)\s*:\s*",
            " ",
            raw,
            flags=re.I,
        )
        parts = re.split(r"[,•●|·;/]", raw)
        for part in parts:
            cleaned = part.strip()
            cleaned = re.sub(r"\s+", " ", cleaned)
            # Drop trailing category glue / parentheses leftovers
            cleaned = cleaned.strip("() ")
            if 1 < len(cleaned) < 40 and not cleaned.lower().endswith(":"):
                candidates.append(cleaned)

    # Always merge known skills found in full text (fixes messy PDF layout)
    for skill in COMMON_SKILLS:
        if re.search(rf"\b{re.escape(skill)}\b", full_text, re.I):
            candidates.append(skill)

    return _normalize_skill_list(candidates)


def _normalize_skill_list(items: list[str]) -> list[str]:
    """Collapse aliases so scoring matches JD skill names cleanly."""
    aliases = {
        "express.js": "Express",
        "node.js": "Node.js",
        "next.js": "Next.js",
        "react.js": "React",
        "reactjs": "React",
        "tailwind css": "Tailwind",
        "html5": "HTML",
        "css3": "CSS",
        "rest api design": "REST",
        "rest apis": "REST",
        "rest api": "REST",
        "jwt authentication": "JWT",
        "ci/cd": "CI/CD",
    }

    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        key = item.lower().strip()
        canonical = aliases.get(key, item.strip())
        canon_key = canonical.lower()
        if canon_key not in seen and len(canonical) > 1:
            seen.add(canon_key)
            result.append(canonical)

    return result


def _extract_experience(section_lines: list[str]) -> list[dict[str, Any]]:
    if not section_lines:
        return []

    entries: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    date_re = re.compile(
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[–\-—]\s*"
        r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|Present",
        re.I,
    )

    for line in section_lines:
        if BULLET_RE.match(line) or line.startswith("●"):
            bullet = BULLET_RE.sub("", line).lstrip("●").strip()
            if current and bullet:
                current["bullets"].append({"id": f"b{len(current['bullets'])}", "text": bullet})
            continue

        # Continuation of previous bullet (wrapped line without bullet marker)
        if current and current["bullets"] and not date_re.search(line) and len(line) < 120:
            if line[0].islower() or line.endswith("."):
                last = current["bullets"][-1]
                last["text"] = f"{last['text']} {line}".strip()
                continue

        date_match = date_re.search(line)
        title_line = date_re.sub("", line).strip() if date_match else line

        if date_match or _looks_like_job_title(title_line):
            if current:
                entries.append(current)
            dates = date_match.group(0) if date_match else ""
            current = {
                "company": "",
                "title": title_line,
                "startDate": dates,
                "endDate": "",
                "bullets": [],
            }
            continue

        if current and not current["company"]:
            current["company"] = line
            continue

        if current:
            entries.append(current)
        current = {
            "company": line,
            "title": "",
            "startDate": "",
            "endDate": "",
            "bullets": [],
        }

    if current:
        entries.append(current)

    return entries[:10]


def _looks_like_job_title(line: str) -> bool:
    title_keywords = ("developer", "engineer", "intern", "analyst", "architect", "manager")
    lower = line.lower()
    return any(k in lower for k in title_keywords) and len(line) < 80


def _extract_education(section_lines: list[str]) -> list[dict[str, Any]]:
    return [{"text": line} for line in section_lines[:8]]


def _extract_bullet_items(section_lines: list[str]) -> list[dict[str, Any]]:
    items = []
    for line in section_lines:
        text = BULLET_RE.sub("", line).lstrip("●").strip()
        if text:
            items.append({"text": text})
    return items[:15]
