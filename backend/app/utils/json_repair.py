import json
import re
import logging

logger = logging.getLogger(__name__)


def safe_parse_llm_json(raw: str) -> dict:
    """
    Parse JSON from LLM output, fixing common mistakes models make:
    - markdown code fences (```json ... ```)
    - trailing commas before } or ]
    - leading/trailing whitespace or stray text before/after the JSON object

    Raises json.JSONDecodeError if repair is not possible.
    """
    text = raw.strip()

    # Strip markdown fences
    if text.startswith("```"):
        text = text.split("```")[1] if text.count("```") >= 2 else text.lstrip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    # Extract just the JSON object if there's stray text around it
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]

    # Try parsing as-is first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Fix trailing commas: ,} or ,]
    repaired = re.sub(r",\s*([}\]])", r"\1", text)

    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        logger.error(f"JSON repair failed. Raw text: {text[:300]}...")
        raise e