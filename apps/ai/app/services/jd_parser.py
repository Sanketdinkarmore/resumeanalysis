import re
from typing import Any

# Skills we look for in JD text (same vocabulary as resume parser for matching)
KNOWN_SKILLS = [
    "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#",
    "Bash", "SQL", "React", "React Native", "Next.js", "Node.js", "Express",
    "Express.js", "FastAPI", "Django", "Flask", "PostgreSQL", "MySQL", "MongoDB",
    "Redis", "Oracle", "DynamoDB", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "Git", "CI/CD", "GraphQL", "REST", "Tailwind", "HTML", "CSS", "Nginx",
    "Jenkins", "JWT", "Microservices", "Prisma", "Postman", "Agile", "Scrum",
    "Lambda", "S3", "EC2", "RDS", "Kafka", "RabbitMQ", "Terraform", "Ansible",
    "Spring", "Angular", "Vue", "Selenium", "Jest", "Linux", "NoSQL",
]

SENIORITY_PATTERNS = [
    (re.compile(r"\b(principal|staff)\b", re.I), "staff"),
    (re.compile(r"\b(lead|tech\s+lead|team\s+lead)\b", re.I), "lead"),
    (re.compile(r"\b(senior|sr\.?)\b", re.I), "senior"),
    (re.compile(r"\b(mid[\s\-]?level|intermediate)\b", re.I), "mid"),
    (re.compile(r"\b(junior|jr\.?|entry[\s\-]?level)\b", re.I), "junior"),
    (re.compile(r"\b(intern|internship)\b", re.I), "intern"),
]

REQUIRED_SECTION_RE = re.compile(
    r"(required\s+skills?|must[\s\-]?have|requirements?|qualifications?|"
    r"what\s+you.?ll\s+need|you\s+must\s+have)",
    re.I,
)
PREFERRED_SECTION_RE = re.compile(
    r"(preferred\s+skills?|nice[\s\-]?to[\s\-]?have|bonus|good\s+to\s+have|"
    r"plus\s+points?|preferred\s+qualifications?)",
    re.I,
)
RESPONSIBILITY_SECTION_RE = re.compile(
    r"(responsibilities|what\s+you.?ll\s+do|about\s+the\s+role|role\s+overview|"
    r"the\s+job|day[\s\-]?to[\s\-]?day)",
    re.I,
)


def parse_job_description(raw_text: str) -> dict[str, Any]:
    """Extract structured JD entities (heuristic + optional Gemini)."""
    text = raw_text.strip()
    if not text:
        return _empty_result()

    found_skills = _find_skills(text)
    required, preferred = _split_required_preferred(text, found_skills)
    keywords = _extract_keywords(text, found_skills)
    seniority = _detect_seniority(text)
    responsibilities = _extract_bullets_near(text, RESPONSIBILITY_SECTION_RE)
    qualifications = _extract_bullets_near(text, REQUIRED_SECTION_RE)

    # If no explicit required section, treat all found skills as required
    if not required and found_skills:
        required = found_skills[:]

    # Leftover found skills that aren't required/preferred still help keyword coverage
    leftover = [s for s in found_skills if s not in required and s not in preferred]
    keywords = _dedupe(keywords + leftover)[:20]

    result = {
        "requiredSkills": _dedupe(required),
        "preferredSkills": _dedupe([s for s in preferred if s not in required]),
        "responsibilities": responsibilities[:12],
        "qualifications": qualifications[:12],
        "seniority": seniority,
        "keywords": keywords,
        "rawExtract": {
            "parser": "jd-heuristic-v1",
            "charCount": len(text),
            "skillsFound": found_skills,
            "llmEnriched": False,
        },
    }

    from app.services.llm_enrich import enrich_jd_parse

    return enrich_jd_parse(result, text)


def _empty_result() -> dict[str, Any]:
    return {
        "requiredSkills": [],
        "preferredSkills": [],
        "responsibilities": [],
        "qualifications": [],
        "seniority": "unknown",
        "keywords": [],
        "rawExtract": {"parser": "jd-heuristic-v1", "charCount": 0},
    }


def _find_skills(text: str) -> list[str]:
    found: list[str] = []
    for skill in KNOWN_SKILLS:
        if re.search(rf"\b{re.escape(skill)}\b", text, re.I):
            found.append(skill)
    return _dedupe(found)


def _split_required_preferred(text: str, all_skills: list[str]) -> tuple[list[str], list[str]]:
    """Skills appearing near 'required' vs 'preferred' section headers."""
    lines = text.splitlines()
    required: list[str] = []
    preferred: list[str] = []
    mode: str | None = None

    for line in lines:
        if REQUIRED_SECTION_RE.search(line):
            mode = "required"
            continue
        if PREFERRED_SECTION_RE.search(line):
            mode = "preferred"
            continue
        if RESPONSIBILITY_SECTION_RE.search(line) and mode:
            # Leaving skills sections into responsibilities
            if "skill" not in line.lower() and "qualification" not in line.lower():
                mode = None
            continue

        line_skills = [s for s in all_skills if re.search(rf"\b{re.escape(s)}\b", line, re.I)]
        # Only harvest skills from bullet/list-looking lines, not long prose
        if not line_skills:
            continue
        if not (
            line.strip().startswith(("-", "•", "●", "*"))
            or re.match(r"^\d+\.", line.strip())
            or len(line) < 80
        ):
            continue
        if mode == "required":
            required.extend(line_skills)
        elif mode == "preferred":
            preferred.extend(line_skills)

    return _dedupe(required), _dedupe(preferred)


def _detect_seniority(text: str) -> str:
    # Check first 500 chars (title area) more heavily
    head = text[:500]
    for pattern, level in SENIORITY_PATTERNS:
        if pattern.search(head):
            return level
    for pattern, level in SENIORITY_PATTERNS:
        if pattern.search(text):
            return level
    return "unknown"


def _extract_keywords(text: str, skills: list[str]) -> list[str]:
    """Extra keywords that help scoring but aren't always in the skill list."""
    extra_patterns = [
        "microservices", "distributed systems", "system design", "scalability",
        "CI/CD", "REST", "agile", "scrum", "devops", "cloud-native",
        "authentication", "authorization", "observability", "monitoring",
        "unit testing", "integration testing", "API design", "data structures",
        "algorithms", "ownership", "production", "deployment",
    ]
    skill_lower = {s.lower() for s in skills}
    keywords: list[str] = []
    for kw in extra_patterns:
        if kw.lower() in skill_lower:
            continue
        if re.search(rf"\b{re.escape(kw)}\b", text, re.I):
            keywords.append(kw)
    return keywords


def _extract_bullets_near(text: str, header_re: re.Pattern[str]) -> list[str]:
    lines = text.splitlines()
    collecting = False
    bullets: list[str] = []

    for line in lines:
        stripped = line.strip()
        if header_re.search(stripped):
            collecting = True
            continue
        if collecting:
            # Stop at next major header-looking line
            if (
                stripped.isupper()
                and len(stripped) < 40
                and not stripped.startswith(("-", "•", "●", "*"))
            ):
                break
            if PREFERRED_SECTION_RE.search(stripped) and not header_re.search(stripped):
                break
            if stripped.startswith(("-", "•", "●", "*")) or re.match(r"^\d+\.", stripped):
                bullet = re.sub(r"^[\-•●\*]\s*|\d+\.\s*", "", stripped).strip()
                if bullet:
                    bullets.append(bullet)
            elif stripped and len(bullets) < 3 and len(stripped) > 20:
                bullets.append(stripped)

    return bullets


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        key = item.lower().strip()
        if key and key not in seen:
            seen.add(key)
            result.append(item)
    return result
