import logging
import re
import time
from typing import Any

from app.config import settings
from app.services.json_utils import parse_json_object

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore

# Prefer distinct free-tier models (different RPM buckets). Skip retired IDs.
MODEL_CANDIDATES = (
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
)


def is_gemini_available() -> bool:
    return bool(settings.gemini_api_key) and genai is not None


# Back-compat alias used by older imports
def is_llm_available() -> bool:
    return is_gemini_available()


def generate_json(prompt: str, *, max_output_tokens: int = 4096) -> dict[str, Any] | None:
    """
    Call Gemini and parse a JSON object from the response.
    Returns None on any failure so callers can fall back.
    """
    if not is_gemini_available():
        return None

    models = [settings.gemini_model, *MODEL_CANDIDATES]
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
        for attempt in range(2):
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
                    break
                parsed = parse_json_object(text)
                if parsed is not None:
                    logger.info("Gemini model %s succeeded", model_name)
                    return parsed
                break
            except Exception as exc:
                last_error = exc
                msg = str(exc)
                logger.warning("Gemini model %s failed: %s", model_name, exc)
                if attempt == 0 and _is_rate_limited(msg):
                    delay = _retry_seconds(msg)
                    logger.info("Rate limited on %s; retrying in %.1fs", model_name, delay)
                    time.sleep(delay)
                    continue
                break

    if last_error:
        logger.warning("All Gemini model attempts failed")
    return None


def _is_rate_limited(message: str) -> bool:
    lower = message.lower()
    return (
        "429" in message
        or "resourceexhausted" in lower.replace(" ", "")
        or "quota" in lower
        or "rate limit" in lower
        or "rate-limit" in lower
        or "ratelimit" in lower
    )


def _retry_seconds(message: str) -> float:
    match = re.search(r"[Rr]etry in ([0-9]+(?:\.[0-9]+)?)s", message)
    if match:
        return min(max(float(match.group(1)) + 0.5, 1.0), 30.0)
    return 20.0
