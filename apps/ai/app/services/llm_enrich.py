"""
Optional Gemini enrichment on top of heuristic parsers.

Rules:
- Never invent skills, jobs, or experience not present in the source text
- Always keep the same output schema Express already expects
- If Gemini fails or is unavailable, return the heuristic result unchanged
"""

from __future__ import annotations

from typing import Any

from app.services.gemini_client import generate_json, is_llm_available


def enrich_resume_parse(heuristic: dict[str, Any], full_text: str) -> dict[str, Any]:
    if not is_llm_available() or not full_text.strip():
        return heuristic

    prompt = f"""
You are a resume parsing engine. Extract structured data ONLY from the resume text below.
Do NOT invent skills, jobs, companies, dates, metrics, or experience that are not clearly present.
If a field is unclear, use null / empty arrays.

Return JSON with exactly this shape:
{{
  "contact": {{"name": string|null, "email": string|null, "phone": string|null, "links": string[]}},
  "summary": string|null,
  "skills": string[],
  "experience": [
    {{
      "company": string,
      "title": string,
      "startDate": string,
      "endDate": string,
      "bullets": [{{"id": string, "text": string}}]
    }}
  ],
  "education": [{{"text": string}}],
  "projects": [{{"text": string}}],
  "certifications": [{{"text": string}}]
}}

Skills rules:
- Return clean individual skill names (e.g. "React", "Node.js", "AWS")
- Do NOT include category labels like "Frontend:" or "Languages:"
- Prefer concise canonical names that would appear in a job description

Experience rules:
- Group bullets under the correct job
- Put job title in "title", company in "company"
- Keep bullet text faithful to the resume (no rewriting metrics)

RESUME TEXT:
\"\"\"
{full_text[:12000]}
\"\"\"
"""

    llm = generate_json(prompt)
    if not llm or not isinstance(llm, dict):
        return heuristic

    return _merge_resume(heuristic, llm)


def enrich_jd_parse(heuristic: dict[str, Any], raw_text: str) -> dict[str, Any]:
    if not is_llm_available() or not raw_text.strip():
        return heuristic

    prompt = f"""
You are a job-description parsing engine. Extract structured data ONLY from the JD text below.
Do NOT invent skills or requirements that are not present.
If the JD does not distinguish required vs preferred, put core skills in requiredSkills and leave preferredSkills empty or lightly filled from "nice to have" language.

Return JSON with exactly this shape:
{{
  "requiredSkills": string[],
  "preferredSkills": string[],
  "responsibilities": string[],
  "qualifications": string[],
  "seniority": "intern"|"junior"|"mid"|"senior"|"lead"|"staff"|"unknown",
  "keywords": string[]
}}

Skills rules:
- Clean individual names preferred by ATS matchers: "React" (not "React.js"), "Express", "REST", "JWT", "HTML", "CSS"
- Split cloud services separately: include both "AWS" and "EC2", "S3", etc. when present
- Do NOT include category labels like "Frontend:" or "Languages:"
- Do NOT invent skills

JOB DESCRIPTION TEXT:
\"\"\"
{raw_text[:12000]}
\"\"\"
"""

    llm = generate_json(prompt)
    if not llm or not isinstance(llm, dict):
        return heuristic

    return _merge_jd(heuristic, llm)


def _merge_resume(base: dict[str, Any], llm: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)

    contact = llm.get("contact")
    if isinstance(contact, dict):
        merged = dict(base.get("contact") or {})
        for key in ("name", "email", "phone"):
            value = contact.get(key)
            if isinstance(value, str) and value.strip():
                merged[key] = value.strip()
        links = contact.get("links")
        if isinstance(links, list) and links:
            merged["links"] = [str(x) for x in links if str(x).strip()]
        out["contact"] = merged

    summary = llm.get("summary")
    if isinstance(summary, str) and summary.strip():
        out["summary"] = summary.strip()

    skills = _string_list(llm.get("skills"))
    if skills:
        # Prefer clean LLM skills; only keep heuristic skills that look clean
        heuristic_skills = [
            s for s in _string_list(base.get("skills")) if _looks_clean_skill(s)
        ]
        out["skills"] = _clean_skill_list(_dedupe(skills + heuristic_skills))
    elif base.get("skills"):
        out["skills"] = _clean_skill_list(_string_list(base.get("skills")))

    experience = llm.get("experience")
    if isinstance(experience, list) and experience:
        cleaned = []
        for idx, item in enumerate(experience):
            if not isinstance(item, dict):
                continue
            bullets_in = item.get("bullets") if isinstance(item.get("bullets"), list) else []
            bullets = []
            for b_idx, bullet in enumerate(bullets_in):
                if isinstance(bullet, dict) and isinstance(bullet.get("text"), str):
                    text = bullet["text"].strip()
                elif isinstance(bullet, str):
                    text = bullet.strip()
                else:
                    continue
                if text:
                    bullets.append({"id": f"b{b_idx}", "text": text})
            cleaned.append(
                {
                    "company": str(item.get("company") or "").strip(),
                    "title": str(item.get("title") or "").strip(),
                    "startDate": str(item.get("startDate") or "").strip(),
                    "endDate": str(item.get("endDate") or "").strip(),
                    "bullets": bullets,
                }
            )
        if cleaned:
            out["experience"] = cleaned

    for field in ("education", "projects", "certifications"):
        items = llm.get(field)
        if isinstance(items, list) and items:
            cleaned_items = []
            for item in items:
                if isinstance(item, dict) and isinstance(item.get("text"), str) and item["text"].strip():
                    cleaned_items.append({"text": item["text"].strip()})
                elif isinstance(item, str) and item.strip():
                    cleaned_items.append({"text": item.strip()})
            if cleaned_items:
                out[field] = cleaned_items

    raw = dict(out.get("rawExtract") or {})
    raw["parser"] = "pymupdf+gemini-v1"
    raw["llmEnriched"] = True
    out["rawExtract"] = raw
    return out


def _merge_jd(base: dict[str, Any], llm: dict[str, Any]) -> dict[str, Any]:
    out = dict(base)

    required = _string_list(llm.get("requiredSkills"))
    preferred = _string_list(llm.get("preferredSkills"))
    keywords = _string_list(llm.get("keywords"))
    responsibilities = _string_list(llm.get("responsibilities"))
    qualifications = _string_list(llm.get("qualifications"))
    seniority = llm.get("seniority")

    if required:
        out["requiredSkills"] = _dedupe(required)
    if preferred:
        # Keep preferred free of required duplicates
        req_set = {s.lower() for s in out.get("requiredSkills", [])}
        out["preferredSkills"] = [s for s in _dedupe(preferred) if s.lower() not in req_set]
    if keywords:
        out["keywords"] = _dedupe(keywords + _string_list(base.get("keywords")))[:25]
    if responsibilities:
        out["responsibilities"] = responsibilities[:15]
    if qualifications:
        out["qualifications"] = qualifications[:15]
    if isinstance(seniority, str) and seniority.strip():
        allowed = {"intern", "junior", "mid", "senior", "lead", "staff", "unknown"}
        level = seniority.strip().lower()
        out["seniority"] = level if level in allowed else out.get("seniority", "unknown")

    raw = dict(out.get("rawExtract") or {})
    raw["parser"] = "jd-heuristic+gemini-v1"
    raw["llmEnriched"] = True
    out["rawExtract"] = raw
    return out


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _looks_clean_skill(skill: str) -> bool:
    s = skill.strip()
    if not s or len(s) > 40:
        return False
    # Reject glued/broken fragments from PDF heuristics
    if s.count(" ") >= 3 and "(" not in s:
        return False
    if any(bad in s for bad in (":", "Frontend", "Backend", "Languages", "Databases")):
        return False
    if s.endswith("(") or s.endswith("+") or s.endswith(","):
        return False
    return True


def _clean_skill_list(items: list[str]) -> list[str]:
    cleaned: list[str] = []
    for item in items:
        if not _looks_clean_skill(item):
            continue
        # Split accidental compounds like "CSS3 Node.js"
        if " " in item and all(len(p) > 1 for p in item.split()):
            parts = [p.strip(" ,/") for p in item.replace("/", " ").split() if p.strip(" ,/")]
            # Only split if it looks like two tech tokens, not a phrase like "REST API design"
            if len(parts) == 2 and all(p[:1].isupper() or "." in p for p in parts):
                cleaned.extend(parts)
                continue
        cleaned.append(item)
    return _dedupe(cleaned)


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        key = item.lower().strip()
        if key and key not in seen:
            seen.add(key)
            result.append(item.strip())
    return result
