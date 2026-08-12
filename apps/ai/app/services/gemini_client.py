import json
import logging
import re
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore

# Prefer configured model, then known working aliases
MODEL_CANDIDATES = (
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash-lite",
)


def is_llm_available() -> bool:
    return bool(settings.gemini_api_key) and genai is not None


def generate_json(prompt: str, *, max_output_tokens: int = 4096) -> dict[str, Any] | None:
    """
    Call Gemini and parse a JSON object from the response.
    Returns None on any failure so callers can fall back to heuristics.
    """
    if not is_llm_available():
        return None

    models = [settings.gemini_model, *MODEL_CANDIDATES]
    # preserve order, unique
    seen: set[str] = set()
    ordered_models = []
    for name in models:
        if name and name not in seen:
            seen.add(name)
            ordered_models.append(name)

    last_error: Exception | None = None

    try:
        genai.configure(api_key=settings.gemini_api_key)
    except Exception as exc:
        logger.warning("Gemini configure failed: %s", exc)
        return None

    for model_name in ordered_models:
        try:
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": max_output_tokens,
                    "response_mime_type": "application/json",
                },
            )
            response = model.generate_content(prompt)
            text = (response.text or "").strip()
            if not text:
                continue
            parsed = _parse_json(text)
            if parsed is not None:
                return parsed
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini model %s failed: %s", model_name, exc)
            continue

    if last_error:
        logger.warning("All Gemini model attempts failed; using heuristic fallback")
    return None


def _parse_json(text: str) -> dict[str, Any] | None:
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group(0))
            return data if isinstance(data, dict) else None
        except json.JSONDecodeError:
            return None
