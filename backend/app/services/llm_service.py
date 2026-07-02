from groq import Groq
from app.core.config import settings
from app.models.schemas import ContractSummary, RedlineReport
from typing import List, Dict, Optional
import json
import logging
from app.utils.json_repair import safe_parse_llm_json

logger = logging.getLogger(__name__)

_groq_client: Optional[Groq] = None


def get_groq_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=settings.groq_api_key)
    return _groq_client


# ── System prompts ────────────────────────────────────────────────

LEGAL_SYSTEM_PROMPT = """You are an expert legal analyst and contract review specialist with deep expertise in corporate law, contract drafting, and risk assessment. 

Your analysis must:
- Be precise, objective, and legally accurate
- Cite specific clause locations when possible  
- Flag risks clearly with severity levels (high/medium/low) //error
- Provide actionable recommendations
- Never speculate beyond the document's content
- Always distinguish between what the document says vs. standard practice

Format all structured outputs as valid JSON only — no markdown, no preamble."""

CONTRACT_ANALYSIS_PROMPT = """Analyse the following contract document and return a JSON object matching this exact structure:

{{
  "contract_type": "string (e.g. NDA, Service Agreement, Employment Contract)",
  "parties": ["list of party names"],
  "effective_date": "string or null",
  "term_duration": "string or null",
  "governing_law": "string or null",
  "key_obligations": ["list of main obligations"],
  "overall_risk": "high|medium|low",
  "risk_score": 0.0,
  "flagged_clauses": [
    {{
      "clause_type": "string",
      "excerpt": "short quote from document",
      "risk_level": "high|medium|low",
      "explanation": "why this is risky",
      "page_number": null,
      "recommendation": "what to change"
    }}
  ],
  "missing_standard_clauses": ["list of clauses that should be present but aren't"],
  "executive_summary": "2-3 sentence summary for a senior lawyer"
}}

CONTRACT TEXT:
{contract_text}"""

REDLINE_PROMPT = """Review this contract and generate redline suggestions as a JSON object:

{{
  "total_redlines": 0,
  "must_have_changes": 0,
  "redlines": [
    {{
      "clause_type": "string",
      "original_text": "exact text from contract",
      "suggested_text": "your proposed replacement text",
      "reason": "legal justification",
      "priority": "must-have|recommended|optional"
    }}
  ],
  "negotiation_summary": "brief summary of key negotiation points"
}}

Focus on: liability caps, indemnification, IP ownership, termination rights, governing law, dispute resolution.
{playbook_context}

CONTRACT TEXT:
{contract_text}"""

QA_PROMPT = """You are a legal research assistant. Answer the question in clear, plain prose.

Rules:
- Answer directly and conversationally — do NOT return JSON, lists, or structured data
- Ground every claim in the provided excerpts only — do not speculate
- Cite page numbers inline naturally, e.g. "According to page 7..."
- If the answer is not in the excerpts, say so clearly
- Keep the answer focused and concise

RELEVANT CONTRACT EXCERPTS:
{context}

QUESTION: {question}

Answer in plain prose:"""


# ── Analysis functions ────────────────────────────────────────────

def analyse_contract(full_text: str) -> dict:
    """
    Full contract analysis — extracts parties, risks, flagged clauses.
    Uses the larger model for best accuracy.
    """
    client = get_groq_client()

    # Truncate if too long for context window (llama-3.3-70b = 128k tokens)
    # ~4 chars per token, leave room for prompt overhead
    max_chars = 30_000
    if len(full_text) > max_chars:
        full_text = full_text[:max_chars] + "\n\n[Document truncated for analysis]"
        logger.warning("Contract text truncated for analysis")

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": LEGAL_SYSTEM_PROMPT},
            {"role": "user", "content": CONTRACT_ANALYSIS_PROMPT.format(
                contract_text=full_text
            )},
        ],
        temperature=0.1,   # low temp for consistent, precise legal output
        max_tokens=4096,
    )

    raw = response.choices[0].message.content.strip()
    tokens_used = response.usage.total_tokens

    # Strip any accidental markdown fences
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = safe_parse_llm_json(raw)
    result["_tokens_used"] = tokens_used
    result["_model"] = settings.groq_model
    return result


def generate_redlines(full_text: str, playbook_context: str = "") -> dict:
    """
    Generate redline suggestions against standard playbook.
    """
    client = get_groq_client()

    playbook_section = ""
    if playbook_context:
        playbook_section = f"\nCUSTOM PLAYBOOK INSTRUCTIONS:\n{playbook_context}"

    max_chars = 25_000
    if len(full_text) > max_chars:
        full_text = full_text[:max_chars] + "\n\n[Document truncated]"

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {"role": "system", "content": LEGAL_SYSTEM_PROMPT},
            {"role": "user", "content": REDLINE_PROMPT.format(
                contract_text=full_text,
                playbook_context=playbook_section,
            )},
        ],
        temperature=0.1,
        max_tokens=4096,
    )

    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    result = safe_parse_llm_json(raw)

    result["_tokens_used"] = response.usage.total_tokens
    result["_model"] = settings.groq_model
    return result


def answer_legal_question(question: str, context_chunks: List[Dict]) -> tuple[str, int]:
    client = get_groq_client()

    context_parts = []
    for chunk in context_chunks:
        context_parts.append(
            f"[Page {chunk['page_number']}, relevance: {chunk['score']}]\n{chunk['text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    response = client.chat.completions.create(
        model=settings.groq_model_fast,
        messages=[
            {
                "role": "system",
                "content": "You are a legal research assistant. Answer questions in clear, plain prose. Never return JSON or structured data. Always cite page numbers inline."
            },
            {
                "role": "user",
                "content": QA_PROMPT.format(context=context, question=question)
            },
        ],
        temperature=0.2,
        max_tokens=1024,
    )

    answer = response.choices[0].message.content.strip()
    return answer, response.usage.total_tokens